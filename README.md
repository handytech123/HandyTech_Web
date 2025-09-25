# HandyTech Solutions - Professional Handyman Services Platform

## Overview

HandyTech Solutions is a comprehensive full-stack web application for professional handyman services. Features include appointment scheduling, customer management, AI-powered chatbot, automated email notifications, and complete business management tools.

## Quick Start

### Prerequisites
- Node.js 20.x or higher
- PostgreSQL database
- Git

### Installation

1. **Clone the repository:**
```bash
git clone <your-repository-url>
cd handytech-solutions
```

2. **Install dependencies:**
```bash
npm ci
```

3. **Environment setup:**
```bash
cp .env.template .env
# Edit .env with your actual secrets (see Environment Variables section)
```

4. **Database setup:**
```bash
npm run db:push
```

5. **Build and start:**
```bash
npm run build
npm start
```

## Environment Variables

### Required Secrets
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key (32+ characters)
- `ADMIN_PASS` - Admin dashboard password
- `ADMIN_EMAIL` - Business email address
- `SMTP_HOST` - Email server (e.g., smtp.ionos.com)
- `SMTP_USER` - Email username
- `SMTP_PASS` - Email password
- `GOOGLE_CLIENT_ID` - Google Calendar OAuth ID
- `GOOGLE_CLIENT_SECRET` - Google Calendar OAuth secret
- `GOOGLE_REDIRECT_URI` - OAuth callback URL

### Optional Secrets
- `OPENAI_API_KEY` - For AI chatbot functionality
- `BREVO_API_KEY` - For email automation
- `TWILIO_*` - For SMS notifications

See `.env.template` for complete list and examples.

## Deployment

### Replit Deployment
Use the included `deploy.json` configuration:
1. Upload project to Replit
2. Set environment variables in Replit Secrets
3. Run deployment commands in order

### VPS/Server Deployment
1. Set up Node.js 20.x and PostgreSQL
2. Configure environment variables
3. Run build and start commands
4. Set up reverse proxy (nginx recommended)

## Features

### Admin Dashboard
- Complete appointment management
- Customer relationship management
- Quote and review management
- Live chat administration
- Google Calendar integration
- Email campaign management

### Customer Portal
- Magic link authentication
- Profile management
- Service history tracking
- Appointment scheduling
- Maintenance plan subscriptions

### AI Chatbot
- OpenAI-powered customer service
- Intelligent handoff to live agents
- Draggable interface
- Real-time conversation management

### Email System
- Automated appointment notifications
- Calendar attachment generation
- Reminder emails (24h and 2h)
- Professional SMTP integration

## Security

- Enterprise cookie-based authentication
- CSRF protection
- PostgreSQL session storage
- Security headers (Helmet)
- Rate limiting
- Input sanitization

## Technology Stack

### Backend
- Node.js with Express.js
- PostgreSQL with Drizzle ORM
- Socket.IO for real-time features
- Nodemailer for email delivery

### Frontend
- React 18 with TypeScript
- Vite build system
- TanStack Query for state management
- Tailwind CSS with Ohio State Buckeyes branding
- Shadcn/ui components

## Support

For deployment assistance or technical support, contact the development team.

## License

Proprietary - HandyTech Solutions Business Application