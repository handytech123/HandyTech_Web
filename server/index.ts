import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupSecurity, rlPublic, useCSRF, useSession, sanitizeInput } from "./security";
import { reminderScheduler } from "./reminder-scheduler";
import { seedEssentialData } from "./utils/seed-data";
import { runProductionMigration } from "./utils/migrate-production";
import { validateDatabaseConnection } from "./utils/database-validation";
import { validateEnvironmentVariables } from "./utils/environment-validation";
import { validateUploadConfiguration } from "./utils/upload";
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { storage } from "./storage";
import path from "path";
import { OpenAI } from "openai";
import { notificationService } from "./utils/notification-service";

const app = express();

// CRITICAL: Health check endpoints MUST be first to bypass all middleware and work in all environments
app.get(['/health', '/healthz'], (req, res) => {
  res.set('Cache-Control', 'no-store').type('text/plain').send('OK');
});

app.head(['/health', '/healthz'], (req, res) => {
  res.set('Cache-Control', 'no-store').type('text/plain').send('');
});

app.get(['/api/health', '/readyz'], (req, res) => {
  res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }).json({ status: "healthy" });
});

app.head(['/api/health', '/readyz'], (req, res) => {
  res.set('Cache-Control', 'no-store').type('text/plain').send('');
});

// Apply comprehensive security middleware first
setupSecurity(app);

// Basic body parsing middleware (after security setup)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb', parameterLimit: 100 }));

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

// Rate-limit API traffic, not HTML pages or static assets. Applying this to
// every request causes a single browser page load (with many JS chunks,
// images, and fonts) to consume the entire allowance and lock the user out.
app.use('/api', rlPublic);

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
  
  // Run production compatibility migration (safe, idempotent)
  await runProductionMigration();

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
      origin: process.env.ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean) || ['https://handytech-solutions.com', 'https://www.handytech-solutions.com'],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Reuse the Express session for Socket.IO so privileged real-time actions
  // are authorized by the same server-side admin session as the HTTP API.
  io.engine.use(useSession as any);

  // Socket.IO connection handling for AI-powered chat with human handoff
  io.on('connection', (socket) => {
    log(`Socket connected: ${socket.id}`);
    
    // Handle different roles
    const role = socket.handshake.auth?.role || 'visitor';

    if (role === 'admin' && (socket.request as any).session?.isAdmin !== true) {
      console.warn(`[SECURITY] Rejected unauthorized admin socket: ${socket.id}`);
      socket.disconnect(true);
      return;
    }
    
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

          // Capture contact details naturally supplied during the conversation so
          // the admin handoff screen becomes a useful lead record.
          const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase();
          const phone = text.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/)?.[0];
          const name = text.match(/(?:my name is|i'm|i am|this is|call me)\s+([a-z][a-z' -]{1,60})/i)?.[1]?.trim();
          if (email || phone || name) {
            await storage.updateChatConversationCustomer(
              convId,
              conversation.customerId ?? null,
              name || conversation.customerName || undefined,
              email || conversation.customerEmail || undefined,
              phone || conversation.customerPhone || undefined,
            );
          }
          
          // Check for human handoff request
          if (/human|agent|representative|person|live/i.test(text)) {
            await storage.updateChatConversationStatus(convId, 'pending_handoff');
            socket.emit('bot:message', { text: "I’ve alerted Lou that you’d like personal help. Please share your name and the best phone number or email if you haven’t already." });
            
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

      // Handle conversation termination when customer leaves website
      socket.on('visitor:terminate', async ({ convId }) => {
        try {
          // Mark conversation as terminated and remove from admin view
          await storage.updateChatConversationStatus(convId, 'terminated');
          
          // Notify admins that conversation ended
          socket.to('admin-room').emit('conversation:terminated', { 
            conversationId: convId,
            timestamp: new Date()
          });
          
          log(`Conversation terminated: ${convId}`);
        } catch (error) {
          console.error('Failed to terminate conversation:', error);
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
    const focusedFallback = () => {
      const lastMessage = history.at(-1)?.content.toLowerCase() || "";
      if (/spark|burning|smoke|gas smell|flood|electrocut|fire/.test(lastMessage)) return "Please stop and move to a safe location. If it is safe to do so, shut off the affected power or water source, then call the appropriate emergency service or licensed emergency professional; Lou can help with follow-up repairs afterward.";
      if (/price|cost|estimate|quote/.test(lastMessage)) return "I can help you request an accurate quote. Please share a short project description and your city, or use the Request Quote button below.";
      if (/schedule|book|appointment|available/.test(lastMessage)) return "You can choose an available appointment using the Book Service button below. If you prefer, tell me the project type first and I’ll help you choose the right service.";
      if (/area|location|serve|zip/.test(lastMessage)) return "HandyTech serves the St. Louis, Missouri area. Share your city or ZIP code and Lou can confirm coverage for your address.";
      if (/electrical|outlet|switch|light|fan|breaker/.test(lastMessage)) return "HandyTech handles several electrical installation and replacement projects. What item needs work, and is this a replacement or a new installation?";
      if (/plumb|faucet|toilet|sink|dishwasher|disposal|leak/.test(lastMessage)) return "HandyTech handles common fixture and appliance plumbing projects. What is the item, and is there an active leak or water damage now?";
      if (/smart|camera|thermostat|doorbell|wifi|network|theater|tv/.test(lastMessage)) return "Smart-home and technology installation is a HandyTech specialty. What equipment do you have, and what would you like installed or configured?";
      if (/paint|drywall|wall|room|remodel/.test(lastMessage)) return "Tell me which room or surface needs work and roughly how large the project is. Lou can confirm the scope and prepare a quote after reviewing those details.";
      if (/hello|\bhi\b|hey|help/.test(lastMessage)) return "I can help you book service, request a quote, check the service area, or connect with Lou. What kind of project are you working on?";
      return "Thanks for the details. Please share your name, city, and the best phone number or email so Lou can follow up, or use one of the options below.";
    };

    try {
      if (!process.env.OPENAI_API_KEY) {
        return focusedFallback();
      }
      
      const openai = new OpenAI({ 
        apiKey: process.env.OPENAI_API_KEY?.trim()
      });
      
      const activeServices = (await storage.getAllServices())
        .filter((service) => service.isActive)
        .map((service) => `${service.name}${service.description ? ` — ${service.description}` : ""}`)
        .join("\n");

      const systemPrompt = `You are the HandyTech Project Assistant for HandyTech Solutions LLC, a family-owned handyman and smart-home business serving the St. Louis, Missouri area.

YOUR ONLY GOALS:
1. Identify the customer's project and urgency.
2. Collect their name, phone or email, service address, and a short project description naturally, without repeating questions already answered.
3. Direct them to https://handytech-solutions.com/#scheduler to book or https://handytech-solutions.com/#contact to request a quote.
4. Offer a human handoff whenever the customer asks, appears frustrated, or the answer is uncertain.

STRICT RULES:
- Keep replies concise: normally 2-4 short sentences and at most one question.
- Never invent pricing, availability, licensing, warranties, service areas, or policies.
- Never claim an appointment is booked; only the booking form confirms appointments.
- Do not diagnose dangerous electrical, gas, structural, fire, flooding, or medical situations. Tell the customer to stop, move to safety, shut off power/water only if safe, and call the appropriate emergency professional.
- Do not provide exact estimates. Explain that HandyTech confirms scope and pricing after reviewing project details.
- Only describe services in the ACTIVE SERVICES list. If a service is not listed, say Lou will confirm whether it is a fit.
- Do not say you are human. Identify yourself as HandyTech's project assistant when relevant.

ACTIVE SERVICES:
${activeServices || "Service list is temporarily unavailable; ask the customer to request a quote."}

HANDOFF:
If the customer requests Lou, a person, a human, or an agent, respond briefly that Lou has been alerted and ask for their preferred contact method.`;
      
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.slice(-16)
        ]
      });
      
      return response.choices[0].message.content?.trim() || "I'm here to help! What can I do for you today?";
    } catch (error) {
      console.error('OpenAI error:', error);
      return focusedFallback();
    }
  }
  
  async function notifyAdminOfHandoff(convId: string, message: string) {
    try {
      await notificationService.notifyHandoffRequest(convId, message);
      console.log(`Chat handoff notification sent: ${convId}`);
    } catch (error) {
      console.error('Notification error:', error);
    }
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = status >= 500 ? "Internal Server Error" : (err.message || "Request failed");
    console.error('[SERVER_ERROR]', err instanceof Error ? err.stack || err.message : err);
    if (!res.headersSent) res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, httpServer);
  } else {
    serveStatic(app);
  }

  // In production, only Nginx on the same VPS may reach the Node service.
  const port = 5000;
  const host = process.env.NODE_ENV === 'production' ? '127.0.0.1' : '0.0.0.0';
  httpServer.listen({
    port,
    host,
    reusePort: true,
  }, () => {
    log(`serving on ${host}:${port}`);
    log('✓ Socket.IO enabled for real-time chat handoff');
    
    // Start the appointment reminder scheduler
    reminderScheduler.start();
    log('✓ Appointment reminder scheduler started');
  });
})();
