# HandyTech Solutions - Gallery Upload Analysis Files
# Created: January 27, 2026

## ISSUE DESCRIPTION:
1. Gallery images show "Image Not Found" after upload
2. Image preview may not display in upload dialog

## KEY FILES INCLUDED:

1. admin.tsx (100KB) - Frontend admin dashboard
   - Lines 1100-1400: Gallery upload component with:
     - handleFileSelect() - File selection and preview generation
     - uploadMutation - XHR upload with progress tracking
     - Image preview state management
   
2. upload.ts (16KB) - Backend upload processing
   - Image validation and security checks
   - Sharp image processing (resize, WebP conversion)
   - File storage with date-based paths
   - URL generation: /uploads/YYYY/MM/filename.webp

3. index.ts (15KB) - Express server setup
   - Lines 115-134: Static file serving for /uploads/
   - Security headers configuration

4. routes.ts (124KB) - API routes
   - POST /api/admin/gallery - Upload handler
   - Uses handleImageUpload middleware

5. schema.ts (19KB) - Database schema
   - project_gallery table with image_url field

## DATABASE STATE:
- Gallery item exists with image_url: /uploads/2025/09/xxx_large.webp
- File exists on local server at server/public/uploads/2025/09/

## VERIFIED WORKING LOCALLY:
- curl http://localhost:5000/uploads/2025/09/xxx.webp returns HTTP 200

## SUSPECTED ISSUE:
On VPS deployment:
- Nginx may not be proxying /uploads/ correctly
- OR uploads directory doesn't exist on VPS
- OR files weren't deployed to VPS

## VPS CONFIGURATION:
- Server: nginx/1.24.0 (Ubuntu) at 74.208.149.78
- App runs via PM2 on port 5000
- Nginx reverse proxy to Node.js app
