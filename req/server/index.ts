import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupSecurity, rlPublic, useCSRF, sanitizeInput } from "./security";
import { reminderScheduler } from "./reminder-scheduler";
import { seedEssentialData } from "./utils/seed-data";
import { validateDatabaseConnection } from "./utils/database-validation";
import { validateEnvironmentVariables } from "./utils/environment-validation";
import { validateUploadConfiguration } from "./utils/upload";
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import path from "path";

const app = express();

// CRITICAL: Health check endpoints MUST be first to bypass all middleware and work in all environments
app.get(['/health', '/healthz'], (req, res) => {
  res.set('Cache-Control', 'no-store').type('text/plain').send('OK');
});

app.head(['/health', '/healthz'], (req, res) => {
  res.set('Cache-Control', 'no-store').type('text/plain').send('');
});

app.get(['/api/health', '/readyz'], (req, res) => {
  res.set('Cache-Control', 'no-store').json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: process.env.PORT || 5000
  });
});

app.head(['/api/health', '/readyz'], (req, res) => {
  res.set('Cache-Control', 'no-store').type('text/plain').send('');
});

// Apply comprehensive security middleware first
setupSecurity(app);

// Basic body parsing middleware (after security setup)
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Apply input sanitization after body parsing so it can sanitize req.body
app.use(sanitizeInput);

// Ensure CSRF secret exists before CSRF protection
app.use((req, res, next) => {
  if (!(req.session as any)?.csrfSecret) {
    const tokens = require('csrf')();
    (req.session as any).csrfSecret = tokens.secretSync();
  }
  next();
});

// Apply CSRF protection after body parsing but before routes
app.use(useCSRF);

// Apply public rate limiting to all routes
app.use(rlPublic);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Validate all environment variables first (including DATABASE_URL)
    await validateEnvironmentVariables();
    
    // Validate database connection and schema
    await validateDatabaseConnection();
    
    // Validate upload system configuration
    await validateUploadConfiguration();
  } catch (error) {
    console.error('\n🚨 APPLICATION STARTUP FAILED 🚨\n');
    console.error('Startup validation error:', error instanceof Error ? error.message : error);
    console.error('\nApplication startup aborted.\n');
    process.exit(1);
  }
  
  // Seed essential data (availability rules, etc.)
  await seedEssentialData();
  
  // Configure static serving for uploads with security headers
  const uploadsPath = path.join(process.cwd(), 'server', 'public', 'uploads');
  app.use('/uploads', (req, res, next) => {
    // Security headers for uploaded files
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year cache for images
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  }, express.static(uploadsPath, {
    // Security options for static file serving
    dotfiles: 'deny', // Deny access to dotfiles
    index: false, // Disable directory indexing
    redirect: false, // Disable trailing slash redirects
    setHeaders: (res, path) => {
      // Set appropriate MIME types for WebP files
      if (path.endsWith('.webp')) {
        res.setHeader('Content-Type', 'image/webp');
      }
    }
  }));
  
  // Register all application routes (includes CSRF route from setupSecurity)
  const httpServer = await registerRoutes(app);
  
  // Initialize Socket.IO for real-time chat handoff
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',').filter(Boolean) || "*",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Socket.IO connection handling for live chat
  io.on('connection', (socket) => {
    log(`Socket connected: ${socket.id}`);

    // Join admin room for receiving live chat notifications
    socket.on('join-admin', () => {
      socket.join('admin-room');
      log(`Admin joined: ${socket.id}`);
    });

    // Handle admin taking over a chat session
    socket.on('take-session', (sessionId: string) => {
      // Notify admin room that session was taken
      socket.to('admin-room').emit('session-taken', { sessionId, adminId: socket.id });
      
      // Notify customer that admin has joined
      socket.to(`customer-${sessionId}`).emit('admin-joined', {
        message: 'A team member has joined the chat!'
      });
      
      log(`Admin ${socket.id} took over session ${sessionId}`);
    });

    // Handle admin messages to customers
    socket.on('admin-message', ({ sessionId, message }: { sessionId: string; message: string }) => {
      // Send to customer
      socket.to(`customer-${sessionId}`).emit('admin-message', {
        message,
        timestamp: new Date(),
        isAgent: true
      });
      
      log(`Admin message sent to session ${sessionId}`);
    });

    // Handle customer joining a session
    socket.on('join-customer-session', (sessionId: string) => {
      socket.join(`customer-${sessionId}`);
      log(`Customer joined session ${sessionId}`);
      
      // Notify admin room about new customer session
      socket.to('admin-room').emit('new-customer-session', { sessionId });
    });

    // Handle customer messages (when in live mode)
    socket.on('customer-message', ({ sessionId, message }: { sessionId: string; message: string }) => {
      // Send to admin room
      socket.to('admin-room').emit('customer-message', {
        sessionId,
        message,
        timestamp: new Date()
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      log(`Socket disconnected: ${socket.id}`);
      
      // Notify admin room about disconnection
      socket.to('admin-room').emit('admin-disconnected', { adminId: socket.id });
    });
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, httpServer);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  httpServer.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    log('✓ Socket.IO enabled for real-time chat handoff');
    
    // Start the appointment reminder scheduler
    reminderScheduler.start();
    log('✓ Appointment reminder scheduler started');
  });
})();
