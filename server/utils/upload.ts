import multer from "multer";
import sharp from "sharp";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import type { Request, Response, NextFunction } from "express";
import { withDatabaseRetry } from "./database-error-handling";

/**
 * Supported image types and their MIME type mappings
 */
export const SUPPORTED_MIME_TYPES = {
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpeg', 
  'image/png': 'png',
  'image/webp': 'webp'
} as const;

/**
 * Image size configurations for different variants
 */
export const IMAGE_SIZES = {
  thumbnail: { width: 320, quality: 80 },
  medium: { width: 768, quality: 85 },
  large: { width: 1440, quality: 90 }
} as const;

/**
 * Maximum file size (10MB) and dimensions
 */
export const UPLOAD_LIMITS = {
  fileSize: 10 * 1024 * 1024, // 10MB
  maxWidth: 1920,
  maxHeight: 1920
} as const;

/**
 * Upload configuration and security settings
 */
export const UPLOAD_CONFIG = {
  uploadDir: path.join(process.cwd(), 'server', 'public', 'uploads'),
  allowedMimeTypes: Object.keys(SUPPORTED_MIME_TYPES),
  maxFiles: 10, // Maximum files per upload request
  fieldName: 'images' // Form field name for file uploads
} as const;

/**
 * Interface for processed image metadata
 */
export interface ProcessedImage {
  originalName: string;
  secureFilename: string;
  mimeType: string;
  fileSize: number;
  dimensions: {
    width: number;
    height: number;
  };
  sizes: {
    thumbnail: ImageVariant;
    medium: ImageVariant;
    large: ImageVariant;
  };
  uploadPath: string; // Relative path from uploads directory
  createdAt: Date;
}

/**
 * Interface for individual image size variants
 */
export interface ImageVariant {
  filename: string;
  width: number;
  height: number;
  fileSize: number;
  url: string; // Public URL for serving
}

/**
 * Custom error class for upload-related errors
 */
export class UploadError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'UploadError';
  }
}

/**
 * Generate cryptographically secure filename
 */
function generateSecureFilename(): string {
  const timestamp = Date.now();
  const randomHash = crypto.randomBytes(16).toString('hex');
  return `${randomHash}_${timestamp}`;
}

/**
 * Get date-based upload path (YYYY/MM format)
 */
function getDateBasedPath(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return path.join(year.toString(), month);
}

/**
 * Ensure directory exists, create if needed
 */
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch (error) {
    await fs.mkdir(dirPath, { recursive: true });
    console.log(`📁 Created directory: ${dirPath}`);
  }
}

/**
 * Validate image file security and constraints
 */
async function validateImageFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<{ width: number; height: number }> {
  
  // Validate MIME type
  if (!UPLOAD_CONFIG.allowedMimeTypes.includes(mimeType)) {
    throw new UploadError(
      `Unsupported file type. Allowed types: ${UPLOAD_CONFIG.allowedMimeTypes.join(', ')}`,
      'INVALID_MIME_TYPE',
      400,
      { mimeType, fileName: originalName }
    );
  }

  // Validate file size
  if (buffer.length > UPLOAD_LIMITS.fileSize) {
    throw new UploadError(
      `File size exceeds limit of ${UPLOAD_LIMITS.fileSize / (1024 * 1024)}MB`,
      'FILE_TOO_LARGE',
      400,
      { fileSize: buffer.length, fileName: originalName }
    );
  }

  try {
    // Use sharp to validate image and get metadata
    const metadata = await sharp(buffer).metadata();
    
    if (!metadata.width || !metadata.height) {
      throw new UploadError(
        'Invalid image file - unable to read dimensions',
        'INVALID_IMAGE',
        400,
        { fileName: originalName }
      );
    }

    // Note: Removed strict dimension validation to allow large images
    // Sharp will handle resizing during processing

    return { width: metadata.width, height: metadata.height };
    
  } catch (error) {
    if (error instanceof UploadError) {
      throw error;
    }
    
    throw new UploadError(
      'Failed to process image file - file may be corrupted',
      'IMAGE_PROCESSING_FAILED',
      400,
      { fileName: originalName, error: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Process image into multiple sizes with WebP conversion
 */
async function processImageSizes(
  buffer: Buffer,
  baseFilename: string,
  originalDimensions: { width: number; height: number }
): Promise<Record<keyof typeof IMAGE_SIZES, { buffer: Buffer; width: number; height: number; fileSize: number }>> {
  
  const results = {} as Record<keyof typeof IMAGE_SIZES, { buffer: Buffer; width: number; height: number; fileSize: number }>;
  
  for (const [sizeName, config] of Object.entries(IMAGE_SIZES)) {
    try {
      // Calculate dimensions maintaining aspect ratio
      const aspectRatio = originalDimensions.width / originalDimensions.height;
      let targetWidth: number = config.width;
      let targetHeight = Math.round(targetWidth / aspectRatio);

      // Don't upscale images smaller than target size
      if (originalDimensions.width < targetWidth) {
        targetWidth = originalDimensions.width;
        targetHeight = originalDimensions.height;
      }

      // Process image with sharp
      const processedBuffer = await sharp(buffer)
        .resize(targetWidth, targetHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ 
          quality: config.quality,
          effort: 6 // Higher effort for better compression
        })
        .toBuffer();

      results[sizeName as keyof typeof IMAGE_SIZES] = {
        buffer: processedBuffer,
        width: targetWidth,
        height: targetHeight,
        fileSize: processedBuffer.length
      };

      console.log(`✅ Processed ${sizeName} size: ${targetWidth}x${targetHeight} (${processedBuffer.length} bytes)`);
      
    } catch (error) {
      throw new UploadError(
        `Failed to process ${sizeName} size variant`,
        'IMAGE_RESIZE_FAILED',
        500,
        { 
          sizeName, 
          config, 
          error: error instanceof Error ? error.message : String(error) 
        }
      );
    }
  }

  return results;
}

/**
 * Save processed images to disk
 */
async function saveImageFiles(
  processedSizes: Record<keyof typeof IMAGE_SIZES, { buffer: Buffer; width: number; height: number; fileSize: number }>,
  baseFilename: string,
  uploadPath: string
): Promise<Record<keyof typeof IMAGE_SIZES, ImageVariant>> {
  
  const fullUploadPath = path.join(UPLOAD_CONFIG.uploadDir, uploadPath);
  await ensureDirectoryExists(fullUploadPath);
  
  const savedFiles = {} as Record<keyof typeof IMAGE_SIZES, ImageVariant>;
  
  for (const [sizeName, processedImage] of Object.entries(processedSizes)) {
    try {
      const filename = `${baseFilename}_${sizeName}.webp`;
      const filePath = path.join(fullUploadPath, filename);
      
      await fs.writeFile(filePath, processedImage.buffer);
      
      savedFiles[sizeName as keyof typeof IMAGE_SIZES] = {
        filename,
        width: processedImage.width,
        height: processedImage.height,
        fileSize: processedImage.fileSize,
        url: `/uploads/${uploadPath}/${filename}`.replace(/\\/g, '/') // Ensure forward slashes for URLs
      };

      console.log(`💾 Saved ${sizeName}: ${filename} (${processedImage.fileSize} bytes)`);
      
    } catch (error) {
      throw new UploadError(
        `Failed to save ${sizeName} image file`,
        'FILE_SAVE_FAILED',
        500,
        { 
          sizeName, 
          filename: `${baseFilename}_${sizeName}.webp`, 
          error: error instanceof Error ? error.message : String(error) 
        }
      );
    }
  }

  return savedFiles;
}

/**
 * Process a single uploaded image file
 */
export async function processUploadedImage(
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<ProcessedImage> {
  
  console.log(`🔄 Processing image: ${originalName} (${buffer.length} bytes, ${mimeType})`);
  
  try {
    // Validate the image file
    const dimensions = await validateImageFile(buffer, originalName, mimeType);
    
    // Generate secure filename and upload path
    const secureFilename = generateSecureFilename();
    const uploadPath = getDateBasedPath();
    
    // Process image into multiple sizes
    const processedSizes = await processImageSizes(buffer, secureFilename, dimensions);
    
    // Save processed images to disk
    const savedFiles = await saveImageFiles(processedSizes, secureFilename, uploadPath);
    
    const processedImage: ProcessedImage = {
      originalName,
      secureFilename,
      mimeType,
      fileSize: buffer.length,
      dimensions,
      sizes: savedFiles,
      uploadPath,
      createdAt: new Date()
    };

    console.log(`✅ Successfully processed image: ${originalName} -> ${secureFilename}`);
    return processedImage;
    
  } catch (error) {
    console.error(`❌ Failed to process image: ${originalName}`, error);
    
    if (error instanceof UploadError) {
      throw error;
    }
    
    throw new UploadError(
      `Failed to process uploaded image: ${originalName}`,
      'PROCESSING_FAILED',
      500,
      { 
        fileName: originalName, 
        error: error instanceof Error ? error.message : String(error) 
      }
    );
  }
}

/**
 * Configure multer for memory storage with security validation
 */
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: UPLOAD_LIMITS.fileSize,
    files: UPLOAD_CONFIG.maxFiles
  },
  fileFilter: (req, file, callback) => {
    // Validate MIME type
    if (!UPLOAD_CONFIG.allowedMimeTypes.includes(file.mimetype)) {
      return callback(new UploadError(
        `Unsupported file type: ${file.mimetype}. Allowed types: ${UPLOAD_CONFIG.allowedMimeTypes.join(', ')}`,
        'INVALID_MIME_TYPE',
        400,
        { mimeType: file.mimetype, fileName: file.originalname }
      ));
    }

    // Validate filename (basic security check)
    if (!file.originalname || file.originalname.includes('..') || file.originalname.includes('/')) {
      return callback(new UploadError(
        'Invalid filename - security violation detected',
        'INVALID_FILENAME',
        400,
        { fileName: file.originalname }
      ));
    }

    callback(null, true);
  }
});

/**
 * Express middleware to handle image upload processing
 */
export function handleImageUpload(fieldName: string = UPLOAD_CONFIG.fieldName) {
  return [
    uploadMiddleware.array(fieldName, UPLOAD_CONFIG.maxFiles),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const files = req.files as Express.Multer.File[];
        
        if (!files || files.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'NO_FILES_UPLOADED',
            message: 'No image files were uploaded'
          });
        }

        console.log(`📤 Processing ${files.length} uploaded file(s)`);

        // Process all uploaded images
        const processedImages: ProcessedImage[] = [];
        
        for (const file of files) {
          try {
            const processed = await processUploadedImage(file.buffer, file.originalname, file.mimetype);
            processedImages.push(processed);
          } catch (error) {
            console.error(`Failed to process file: ${file.originalname}`, error);
            
            // Clean up any previously processed files before returning error
            if (processedImages.length > 0) {
              await cleanupUploadedFiles(processedImages);
              console.log(`🗑️ Cleaned up ${processedImages.length} previously processed files due to processing failure`);
            }
            
            // Continue processing other files, but track the error
            const uploadError = error instanceof UploadError ? error : new UploadError(
              `Failed to process ${file.originalname}`,
              'PROCESSING_FAILED',
              500
            );

            // Return partial success with error details
            return res.status(400).json({
              success: false,
              error: uploadError.code,
              message: uploadError.message,
              context: uploadError.context,
              processedCount: processedImages.length
            });
          }
        }

        // Attach processed images to request for use in route handler
        (req as any).processedImages = processedImages;
        
        console.log(`✅ Successfully processed all ${processedImages.length} uploaded images`);
        next();
        
      } catch (error) {
        console.error('Upload middleware error:', error);
        
        if (error instanceof UploadError) {
          return res.status(error.statusCode).json({
            success: false,
            error: error.code,
            message: error.message,
            context: error.context
          });
        }

        return res.status(500).json({
          success: false,
          error: 'UPLOAD_MIDDLEWARE_ERROR',
          message: 'An error occurred during file upload processing'
        });
      }
    }
  ];
}

/**
 * Cleanup function to remove uploaded files (for error recovery)
 */
export async function cleanupUploadedFiles(processedImages: ProcessedImage[]): Promise<void> {
  for (const image of processedImages) {
    try {
      const fullUploadPath = path.join(UPLOAD_CONFIG.uploadDir, image.uploadPath);
      
      // Remove all size variants
      for (const sizeVariant of Object.values(image.sizes)) {
        const filePath = path.join(fullUploadPath, sizeVariant.filename);
        try {
          await fs.unlink(filePath);
          console.log(`🗑️ Cleaned up file: ${sizeVariant.filename}`);
        } catch (error) {
          console.warn(`⚠️ Failed to cleanup file: ${sizeVariant.filename}`, error);
        }
      }
    } catch (error) {
      console.error(`Failed to cleanup image: ${image.secureFilename}`, error);
    }
  }
}

/**
 * Helper function to get file URL from upload path and filename
 */
export function getImageUrl(uploadPath: string, filename: string): string {
  return `/uploads/${uploadPath}/${filename}`.replace(/\\/g, '/');
}

/**
 * Helper function to validate upload configuration on startup
 */
export async function validateUploadConfiguration(): Promise<void> {
  try {
    // Ensure upload directory exists
    await ensureDirectoryExists(UPLOAD_CONFIG.uploadDir);
    
    // Test directory permissions
    const testFile = path.join(UPLOAD_CONFIG.uploadDir, '.test_permissions');
    await fs.writeFile(testFile, 'test');
    await fs.unlink(testFile);
    
    console.log('✅ Upload configuration validated successfully');
    console.log(`📁 Upload directory: ${UPLOAD_CONFIG.uploadDir}`);
    console.log(`📏 File size limit: ${UPLOAD_LIMITS.fileSize / (1024 * 1024)}MB`);
    console.log(`🖼️ Max dimensions: ${UPLOAD_LIMITS.maxWidth}x${UPLOAD_LIMITS.maxHeight}px`);
    console.log(`📝 Supported types: ${UPLOAD_CONFIG.allowedMimeTypes.join(', ')}`);
    
  } catch (error) {
    throw new Error(`Upload configuration validation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Optional image upload middleware for forms that may be submitted without photos.
 * The caller controls the lower per-form limit; the global upload limit remains a
 * final safety cap.
 */
export function handleOptionalImageUpload(fieldName: string, maxFiles: number) {
  return [
    uploadMiddleware.array(fieldName, Math.min(maxFiles, UPLOAD_CONFIG.maxFiles)),
    async (req: Request, res: Response, next: NextFunction) => {
      const files = (req.files as Express.Multer.File[] | undefined) || [];
      if (files.length === 0) {
        (req as any).processedImages = [];
        return next();
      }

      const processedImages: ProcessedImage[] = [];
      try {
        for (const file of files) {
          processedImages.push(await processUploadedImage(file.buffer, file.originalname, file.mimetype));
        }
        (req as any).processedImages = processedImages;
        next();
      } catch (error) {
        if (processedImages.length > 0) await cleanupUploadedFiles(processedImages);
        const uploadError = error instanceof UploadError
          ? error
          : new UploadError("Failed to process review photos", "PROCESSING_FAILED", 500);
        res.status(uploadError.statusCode).json({
          success: false,
          error: uploadError.code,
          message: uploadError.message,
        });
      }
    },
  ];
}
