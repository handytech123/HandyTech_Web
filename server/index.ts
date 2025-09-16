import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupSecurity, rlPublic, useCSRF, sanitizeInput } from "./security";
import { reminderScheduler } from "./reminder-scheduler";
import { seedEssentialData } from "./utils/seed-data";

/**
 * Validates critical environment variables on startup
 * Ensures the application doesn't start with missing security configuration
 */
async function validateStartupEnvironment(): Promise<void> {
  try {
    // Import auth module which will validate auth-related env vars
    await import('./utils/auth.js');
    log('✓ Environment variables validated successfully');
  } catch (error) {
    console.error('\n🚨 STARTUP FAILED - ENVIRONMENT CONFIGURATION ERROR 🚨\n');
    console.error((error as Error).message);
    console.error('\nApplication startup aborted for security reasons.\n');
    process.exit(1);
  }
}

const app = express();

// Apply comprehensive security middleware first
setupSecurity(app);

// Basic body parsing middleware (after security setup)
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Apply input sanitization after body parsing so it can sanitize req.body
app.use(sanitizeInput);

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
  // Validate environment variables before starting server
  await validateStartupEnvironment();
  
  // Seed essential data (availability rules, etc.)
  await seedEssentialData();
  
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
