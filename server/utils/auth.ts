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
  const required = ['JWT_SECRET', 'ADMIN_USERNAME', 'ADMIN_PASSWORD'];
  const missing = required.filter(key => !process.env[key] || process.env[key]!.trim() === '');
  
  if (missing.length > 0) {
    throw new Error(
      `CRITICAL SECURITY ERROR: Missing required environment variables: ${missing.join(', ')}\n` +
      'These must be set for secure authentication:\n' +
      '- JWT_SECRET: A strong random secret for signing JWT tokens (at least 32 characters)\n' +
      '- ADMIN_USERNAME: The admin username for accessing the admin panel\n' +
      '- ADMIN_PASSWORD: A strong password for admin authentication\n\n' +
      'Please set these environment variables and restart the application.'
    );
  }
  
  // Additional validation for JWT_SECRET strength
  if (process.env.JWT_SECRET!.length < 32) {
    throw new Error(
      'CRITICAL SECURITY ERROR: JWT_SECRET must be at least 32 characters long for security.\n' +
      'Please use a strong, randomly generated secret.'
    );
  }
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