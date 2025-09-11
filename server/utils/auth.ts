import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

interface AdminPayload {
  username: string;
  isAdmin: true;
  iat?: number;
  exp?: number;
}

// JWT secret from environment variable with fallback
const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Admin credentials from environment variables
export const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME || 'handytech',
  password: process.env.ADMIN_PASSWORD || 'Savannah2'
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