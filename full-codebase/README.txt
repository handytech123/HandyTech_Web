# HandyTech Solutions - Full Codebase
# Missouri-based Handyman Service Business Platform
# Created: January 27, 2026

## TECH STACK:
- Frontend: React + TypeScript + Vite + TailwindCSS + Shadcn/ui
- Backend: Express.js + TypeScript
- Database: PostgreSQL + Drizzle ORM
- Deployment: VPS with Nginx + PM2

## DIRECTORY STRUCTURE:

/client/src/
  /components/     - React components (navigation, forms, widgets)
  /components/ui/  - Shadcn UI primitives (button, dialog, form, etc.)
  /hooks/          - Custom React hooks (auth, toast, mobile)
  /lib/            - Utilities (API client, CSRF, email automation)
  /pages/          - Route pages (home, admin, gallery, portal)
  App.tsx          - Main app with routing
  main.tsx         - Entry point
  index.css        - Global styles (Ohio State Buckeyes theme)

/server/
  index.ts         - Express server setup, Socket.IO, static files
  routes.ts        - All API endpoints (3400+ lines)
  storage.ts       - Database storage layer
  db.ts            - Drizzle database connection
  security.ts      - Auth middleware, CSRF, rate limiting
  /utils/          - Helpers (upload, mail, availability, validation)
  /lib/            - Services (SMS, email handoff)

/shared/
  schema.ts        - Drizzle database schema + Zod validation

## KEY FEATURES:
1. Admin Dashboard (/admin) - Business management
2. Customer Portal (/customer-portal) - Self-service
3. Gallery with Image Upload - Multi-image with before/after
4. AI Chatbot - OpenAI integration with human handoff
5. Appointment Scheduling - Google Calendar sync
6. Maintenance Plans - Subscription management
7. Quote System - Lead capture and tracking
8. Email Automation - Brevo integration

## CURRENT ISSUE:
Gallery images show "Image Not Found" after upload on VPS.
- Images upload successfully to database
- Files saved to /server/public/uploads/YYYY/MM/
- URL pattern: /uploads/2025/09/filename_large.webp
- Works locally, fails on VPS (nginx configuration?)

## DATABASE TABLES:
- users, customers, appointments, quotes
- reviews, maintenance_plans, email_campaigns
- project_gallery, services, service_addons
- availability_rules, blocked_times
- portal_login_tokens, chat_conversations, chat_messages

## ENVIRONMENT VARIABLES NEEDED:
DATABASE_URL, SESSION_SECRET, JWT_SECRET
ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_EMAIL
SMTP_HOST, SMTP_USER, SMTP_PASS
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
OPENAI_API_KEY, BREVO_API_KEY
