import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

interface AdminPayload {
  username: string;
  isAdmin: true;
  iat?: number;
  exp?: number;
}

/**
 * Validates that all required environment variables are present
 * Throws an error with specific missing variables if any are not set
 */
function validateRequiredEnvVars(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Base requirements for all environments
  const required = ['JWT_SECRET', 'ADMIN_USERNAME', 'ADMIN_PASSWORD'];
  
  // Additional requirements for production
  if (isProduction) {
    required.push('SESSION_SECRET');
    // Note: ALLOWED_ORIGINS is optional - fallback CORS configuration will be used if not set
  }
  
  const missing = required.filter(key => !process.env[key] || process.env[key]!.trim() === '');
  
  if (missing.length > 0) {
    const envSpecific = isProduction ? 'production' : 'development';
    throw new Error(
      `CRITICAL SECURITY ERROR: Missing required environment variables for ${envSpecific}: ${missing.join(', ')}\n` +
      'These must be set for secure authentication:\n' +
      '- JWT_SECRET: A strong random secret for signing JWT tokens (at least 32 characters)\n' +
      '- ADMIN_USERNAME: The admin username for accessing the admin panel\n' +
      '- ADMIN_PASSWORD: A strong password for admin authentication\n' +
      (isProduction ? '\nProduction-specific requirements:\n' +
        '- SESSION_SECRET: A strong random secret for session encryption (at least 32 characters)\n' : '') +
      '\nPlease set these environment variables and restart the application.'
    );
  }
  
  // Additional validation for JWT_SECRET strength
  if (process.env.JWT_SECRET!.length < 32) {
    throw new Error(
      'CRITICAL SECURITY ERROR: JWT_SECRET must be at least 32 characters long for security.\n' +
      'Please use a strong, randomly generated secret.'
    );
  }
  
  // Additional validation for production SESSION_SECRET
  if (isProduction && process.env.SESSION_SECRET!.length < 32) {
    throw new Error(
      'CRITICAL SECURITY ERROR: SESSION_SECRET must be at least 32 characters long for production security.\n' +
      'Please use a strong, randomly generated secret.'
    );
  }
  
  // Validate ALLOWED_ORIGINS in production (if set)
  if (isProduction && process.env.ALLOWED_ORIGINS) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS;
    const origins = allowedOrigins.split(',').map(origin => origin.trim());
    
    // Note: Wildcard validation for CORS origins is handled in security.ts
    
    // Validate HTTPS in production
    const hasInsecureOrigins = origins.some(origin => origin.startsWith('http:') && !origin.includes('localhost'));
    if (hasInsecureOrigins) {
      console.warn(
        'SECURITY WARNING: Some ALLOWED_ORIGINS use HTTP instead of HTTPS in production.\n' +
        'Consider using HTTPS for better security.'
      );
    }
  }
  // Note: ALLOWED_ORIGINS fallback warnings are handled in the CORS configuration
}

// Validate environment variables on module load
validateRequiredEnvVars();

// JWT secret from environment variable (required)
const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Admin credentials from environment variables (required)
export const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME!,
  password: process.env.ADMIN_PASSWORD!
};

/**
 * Generate a JWT token for admin authentication
 */
export function generateAdminToken(username: string): string {
  const payload: AdminPayload = {
    username,
    isAdmin: true
  };
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'handytech-solutions',
    audience: 'admin-panel'
  } as jwt.SignOptions);
}

/**
 * Verify and decode a JWT token
 */
export function verifyAdminToken(token: string): AdminPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'handytech-solutions',
      audience: 'admin-panel'
    }) as AdminPayload;
    
    // Ensure the token has admin privileges
    if (!decoded.isAdmin) {
      return null;
    }
    
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Authentication middleware for admin routes
 */
export function authenticateAdmin(req: Request, res: Response, next: NextFunction): void {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'No valid authorization token provided'
      });
      return;
    }
    
    const token = authHeader.substring(7); // Remove "Bearer " prefix
    
    // Verify the token
    const decoded = verifyAdminToken(token);
    
    if (!decoded) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
      return;
    }
    
    // Add admin info to request object for use in route handlers
    (req as any).admin = decoded;
    
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
}