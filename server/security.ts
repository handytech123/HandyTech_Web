import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import csrf from "csrf";
import type { Request, Response, NextFunction, Express } from "express";
import { pool } from "./db";

// CSRF tokens manager - modern approach using 'csrf' package
const tokens = new csrf();

// Helmet middleware for security headers
export const useHelmet = helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      // Production: Remove 'unsafe-inline' and use nonces/hashes for scripts
      scriptSrc: process.env.NODE_ENV === "production" 
        ? ["'self'"] // More restrictive for production
        : ["'self'", "'unsafe-inline'"], // Allow inline scripts in development
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      // Production hardening
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  }
});

/**
 * Validates and parses CORS origins from environment variables
 * Prevents wildcard patterns in production for security
 */
function getProductionCorsOrigins(): string[] {
  const allowedOrigins = process.env.ALLOWED_ORIGINS;
  
  if (!allowedOrigins) {
    throw new Error(
      'ALLOWED_ORIGINS environment variable is required in production. ' +
      'Set it to a comma-separated list of allowed domains (e.g., "https://yourdomain.com,https://app.yourdomain.com")'
    );
  }
  
  const origins = allowedOrigins.split(',').map(origin => origin.trim());
  
  // Validate no wildcards in production
  const hasWildcards = origins.some(origin => origin.includes('*'));
  if (hasWildcards) {
    throw new Error(
      'Wildcard origins are not allowed in production for security reasons. ' +
      'ALLOWED_ORIGINS must contain specific domains only.'
    );
  }
  
  return origins;
}

// CORS middleware - environment-aware origin restrictions with security validation
export const useCORS = cors({
  origin: process.env.NODE_ENV === 'production' 
    ? getProductionCorsOrigins()
    : [
        // Development origins - wildcards allowed for dev flexibility
        /^http:\/\/localhost:\d+$/,
        /^https:\/\/.*\.replit\.dev$/,
        /^https:\/\/.*\.repl\.co$/
      ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token"]
});

// Cookie parser middleware
export const useCookies = cookieParser();

/**
 * Creates production-ready session store using PostgreSQL
 * Falls back to MemoryStore only in development
 */
function createSessionStore() {
  if (process.env.NODE_ENV === 'production') {
    // Production: Use PostgreSQL session store for persistence and scalability
    const PgSession = connectPgSimple(session);
    return new PgSession({
      pool: pool as any, // connect-pg-simple expects pg Pool type
      tableName: 'session', // Will auto-create table if it doesn't exist
      schemaName: 'public',
      createTableIfMissing: true,
      // Session cleanup configuration
      pruneSessionInterval: 60 * 15, // Clean expired sessions every 15 minutes
      errorLog: console.error
    });
  } else {
    // Development: MemoryStore for simplicity (not suitable for production)
    console.warn('[SECURITY] Using MemoryStore for sessions in development mode');
    return undefined; // Will use default MemoryStore
  }
}

// Session middleware with secure httpOnly cookies and production-ready storage
export const useSession = session({
  name: "ht.sid",
  secret: process.env.SESSION_SECRET || "fallback-dev-secret-change-in-production",
  store: createSessionStore(),
  resave: false,
  saveUninitialized: false,
  rolling: true, // Reset expiration on activity
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 8, // 8 hours
  }
});

// CSRF middleware using modern 'csrf' package
export function useCSRF(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF for GET requests and some safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF for API endpoints that don't use sessions (like webhooks)
  if (req.path.startsWith('/api/webhooks/') || req.path.startsWith('/api/calendly/webhook')) {
    return next();
  }

  const secret = (req.session as any)?.csrfSecret;
  const token = req.headers['x-csrf-token'] as string || req.body?._csrf;

  if (!secret) {
    return res.status(403).json({ 
      error: "CSRF_MISSING_SECRET",
      message: "CSRF secret not found. Please refresh and try again." 
    });
  }

  if (!token) {
    return res.status(403).json({ 
      error: "CSRF_MISSING_TOKEN",
      message: "CSRF token required for this request." 
    });
  }

  if (!tokens.verify(secret, token)) {
    return res.status(403).json({ 
      error: "CSRF_INVALID_TOKEN",
      message: "Invalid CSRF token. Please refresh and try again." 
    });
  }

  next();
}

// Rate limiting configurations
export const rlPublic = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per window per IP
  message: {
    error: "RATE_LIMIT_EXCEEDED",
    message: "Too many requests from this IP, please try again later."
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

export const rlSensitive = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // 60 requests per window per IP
  message: {
    error: "RATE_LIMIT_EXCEEDED",
    message: "Too many sensitive requests from this IP, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiting for authentication attempts
export const rlAuth = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Only 10 login attempts per window per IP
  message: {
    error: "AUTH_RATE_LIMIT_EXCEEDED",
    message: "Too many authentication attempts, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin authentication middleware using cookie sessions
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // Check if session exists and has admin flag
  if (req.session && (req.session as any).isAdmin === true) {
    return next();
  }

  return res.status(401).json({ 
    error: "ADMIN_AUTH_REQUIRED",
    message: "Administrator authentication required for this resource."
  });
}

// Middleware to ensure session has CSRF secret
export function ensureCSRFSecret(req: Request, res: Response, next: NextFunction) {
  if (!(req.session as any)?.csrfSecret) {
    (req.session as any).csrfSecret = tokens.secretSync();
  }
  next();
}

// Helper function to attach CSRF route to Express app
export function attachCsrfRoute(app: Express) {
  // CSRF token endpoint - must be called before making POST/PUT/DELETE requests
  app.get("/api/csrf", ensureCSRFSecret, (req: Request, res: Response) => {
    const secret = (req.session as any)?.csrfSecret;
    
    if (!secret) {
      return res.status(500).json({ 
        error: "CSRF_SECRET_ERROR",
        message: "Unable to generate CSRF token" 
      });
    }

    const csrfToken = tokens.create(secret);
    
    res.json({ 
      csrfToken,
      message: "Include this token in x-csrf-token header for POST/PUT/DELETE requests"
    });
  });
}

// Security headers middleware for API responses
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
}

// Request logging middleware for security monitoring
export function securityLogging(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const ip = req.ip || req.connection.remoteAddress;
    
    // Log suspicious patterns
    if (res.statusCode === 401 || res.statusCode === 403) {
      console.warn(`[SECURITY] ${req.method} ${req.path} - ${res.statusCode} from ${ip} in ${duration}ms`);
    }
    
    // Log rate limiting
    if (res.statusCode === 429) {
      console.warn(`[RATE_LIMIT] ${req.method} ${req.path} - Rate limited ${ip} in ${duration}ms`);
    }
  });
  
  next();
}

// Input sanitization helper
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  // Basic XSS prevention - strip dangerous HTML tags and scripts
  function sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/on\w+\s*=/gi, ''); // Remove inline event handlers
    }
    if (typeof value === 'object' && value !== null) {
      const sanitized: any = Array.isArray(value) ? [] : {};
      for (const key in value) {
        sanitized[key] = sanitizeValue(value[key]);
      }
      return sanitized;
    }
    return value;
  }
  
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  
  next();
}

// Comprehensive security middleware setup helper
export function setupSecurity(app: Express) {
  // Trust proxy for rate limiting (important for Replit)
  app.set('trust proxy', 1);
  
  // Apply security middleware in correct order
  app.use(securityLogging);
  app.use(useHelmet);
  app.use(useCORS);
  app.use(useCookies);
  app.use(useSession);
  app.use(ensureCSRFSecret);
  app.use(securityHeaders);
  // Note: sanitizeInput moved to index.ts after express.json() so it can sanitize req.body
  
  // Attach CSRF route
  attachCsrfRoute(app);
  
  console.log('[SECURITY] Security middleware initialized successfully');
}

// Export types for TypeScript support
export interface SecureRequest extends Request {
  admin?: {
    username: string;
    isAdmin: true;
  };
}

export interface SecureSession {
  isAdmin?: boolean;
  csrfSecret?: string;
}