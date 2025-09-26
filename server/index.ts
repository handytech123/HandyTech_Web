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
import { storage } from "./storage";
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

  // Socket.IO connection handling for AI-powered chat with human handoff
  io.on('connection', (socket) => {
    log(`Socket connected: ${socket.id}`);
    
    // Handle different roles
    const role = socket.handshake.auth?.role || 'visitor';
    
    if (role === 'visitor') {
      // Customer/visitor connection
      const convId = socket.handshake.auth?.convId || `conv_${Math.random().toString(36).slice(2)}_${Date.now()}`;
      socket.join(convId);
      socket.emit('connected', { convId });
      
      // Initialize conversation in database if not exists
      initializeConversation(convId);
      
      socket.on('visitor:message', async ({ text }) => {
        if (!text?.trim()) return;
        
        try {
          // Store user message
          await storage.createChatMessage({
            conversationId: convId,
            role: 'user',
            content: text.trim()
          });
          
          const conversation = await storage.getChatConversation(convId);
          if (!conversation) return;
          
          // Check for human handoff request
          if (/human|agent|representative|person|live/i.test(text)) {
            await storage.updateChatConversationStatus(convId, 'pending_handoff');
            socket.emit('bot:message', { text: "I'm connecting you with a human agent now. Please hold on..." });
            
            // Notify admins
            socket.to('admin-room').emit('handoff:requested', { 
              conversationId: convId,
              customerMessage: text,
              timestamp: new Date()
            });
            
            // Send email/SMS notification
            await notifyAdminOfHandoff(convId, text);
            return;
          }
          
          // AI response if in bot mode OR pending handoff (no human has taken over yet)
          if (conversation.status === 'bot' || conversation.status === 'pending_handoff') {
            const messages = await storage.getChatMessages(convId);
            const chatHistory = messages.map((msg: any) => ({
              role: msg.role === 'assistant' ? 'assistant' as const : 'user' as const,
              content: msg.content
            }));
            
            const aiResponse = await generateAIResponse(chatHistory);
            
            // Store AI response
            await storage.createChatMessage({
              conversationId: convId,
              role: 'assistant',
              content: aiResponse
            });
            
            socket.emit('bot:message', { text: aiResponse });
          } else {
            // Forward to admin if human is handling
            socket.to(`admin:${convId}`).emit('admin:forward', { text, convId });
          }
        } catch (error) {
          console.error('Chat error:', error);
          socket.emit('bot:message', { text: "Sorry, I'm having trouble right now. Please try again." });
        }
      });
      
    } else if (role === 'admin') {
      // Admin connection
      const convId = socket.handshake.auth?.convId;
      socket.join('admin-room');
      if (convId) socket.join(`admin:${convId}`);
      
      socket.on('admin:takeover', async ({ convId }) => {
        try {
          await storage.updateChatConversationStatus(convId, 'human');
          socket.to(convId).emit('bot:message', { text: "You're now chatting with a human agent." });
          log(`Admin ${socket.id} took over conversation ${convId}`);
        } catch (error) {
          console.error('Takeover error:', error);
        }
      });
      
      socket.on('admin:botback', async ({ convId }) => {
        try {
          await storage.updateChatConversationStatus(convId, 'bot');
          socket.to(convId).emit('bot:message', { text: "The AI assistant is back to help you." });
          log(`Admin ${socket.id} returned conversation ${convId} to bot`);
        } catch (error) {
          console.error('Bot return error:', error);
        }
      });
      
      socket.on('admin:message', async ({ convId, text }) => {
        if (!text?.trim()) return;
        
        try {
          // Store admin message
          await storage.createChatMessage({
            conversationId: convId,
            role: 'admin',
            content: text.trim()
          });
          
          // Send to customer
          socket.to(convId).emit('human:message', { text: text.trim() });
          log(`Admin message sent to conversation ${convId}`);
        } catch (error) {
          console.error('Admin message error:', error);
        }
      });
    }

    socket.on('disconnect', () => {
      log(`Socket disconnected: ${socket.id}`);
    });
  });
  
  // Helper functions
  async function initializeConversation(convId: string) {
    try {
      const existing = await storage.getChatConversation(convId);
      if (!existing) {
        await storage.createChatConversation({
          id: convId,
          status: 'bot'
        });
      }
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
    }
  }
  
  async function generateAIResponse(history: Array<{ role: 'user' | 'assistant'; content: string }>) {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return "I'm having trouble connecting to my AI service right now. Would you like to speak with a human agent?";
      }
      
      const { OpenAI } = await import("openai");
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const systemPrompt = `You are HandyChat for HandyTech Solutions, a professional handyman service in Missouri specializing in home improvement and smart technology solutions.

KEY RESPONSIBILITIES:
- Provide expert advice on electrical, plumbing, smart home installations, painting, and general home repairs
- Give accurate time estimates and pricing guidance for common projects  
- Schedule appointments and collect customer information
- Be professional, knowledgeable, and solution-focused

CONVERSATION STYLE:
- Use friendly but professional tone
- Give specific, actionable advice
- Ask clarifying questions to understand the customer's exact needs
- Provide realistic timelines and cost estimates when possible

SERVICES WE OFFER:
- Electrical: outlet installation, ceiling fans, smart switches, circuit breakers
- Plumbing: faucet repair/replacement, toilet fixes, pipe repairs, water heater service
- Smart Home: thermostat installation, security systems, smart lighting, home automation
- General: painting, drywall repair, fixture installation, door/window service

BOOKING PROCESS:
When customer is ready to schedule, collect: name, phone number, address, detailed project description, and preferred time/date.

If customer requests human assistance, respond: "I'm connecting you with our expert technician who can provide specialized help for your project."`;
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.4,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.slice(-12) // Keep last 12 messages for context
        ]
      });
      
      return response.choices[0].message.content?.trim() || "I'm here to help! What can I do for you today?";
    } catch (error) {
      console.error('OpenAI error:', error);
      return "I'm having trouble with my AI right now. Would you like to speak with a human agent?";
    }
  }
  
  async function notifyAdminOfHandoff(convId: string, message: string) {
    try {
      // Email notification (if configured)
      if (process.env.ADMIN_EMAIL) {
        console.log(`Chat handoff requested: ${convId} - ${message}`);
        // Email notification would go here in production
      }
      
      // SMS notification (if configured)
      if (process.env.ALERT_TO_SMS) {
        console.log(`SMS alert: Customer requesting human agent. Conversation: ${convId.slice(-8)}`);
        // SMS notification would go here in production
      }
    } catch (error) {
      console.error('Notification error:', error);
    }
  }

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
