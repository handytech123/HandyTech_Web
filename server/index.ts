import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupSecurity, rlPublic, useCSRF, sanitizeInput } from "./security";
import { reminderScheduler } from "./reminder-scheduler";
import { seedEssentialData } from "./utils/seed-data";
import { validateDatabaseConnection } from "./utils/database-validation";
import { validateEnvironmentVariables } from "./utils/environment-validation";
import { validateUploadConfiguration } from "./utils/upload";
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
  const server = await registerRoutes(app);

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
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Start the appointment reminder scheduler
    reminderScheduler.start();
    log('✓ Appointment reminder scheduler started');
  });
})();
