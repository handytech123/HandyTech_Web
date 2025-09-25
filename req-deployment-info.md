# HandyTech Solutions - Complete Deployment Information

## 1) Repo Basics

### File Tree
```
/ (root)
├─ package.json
├─ server/
│  ├─ index.ts (entry point)
│  ├─ routes.ts
│  ├─ db.ts
│  ├─ security.ts
│  ├─ storage.ts
│  ├─ public/ (built frontend assets)
│  └─ utils/
├─ client/ (React frontend source)
├─ shared/
│  └─ schema.ts (Drizzle database schema)
├─ drizzle.config.ts
├─ vite.config.ts
├─ .env.template
└─ dist/ (production build output)
```

## 2) package.json Scripts & Dependencies

### Key Scripts
- `"start": "NODE_ENV=production node dist/index.js"` (production entry)
- `"build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"`
- `"db:push": "drizzle-kit push"` (database migrations)
- `"dev": "NODE_ENV=development tsx server/index.ts"` (development)

### Node Version
- Uses Node.js 20+ (from @types/node: "20.16.11")

### Key Dependencies
- **Framework**: Express.js ^4.21.2
- **Database**: PostgreSQL with Drizzle ORM ^0.39.1
- **Security**: helmet ^8.1.0, csrf ^3.1.0, cors ^2.8.5
- **Sessions**: express-session ^1.18.1, connect-pg-simple ^10.0.0
- **Real-time**: socket.io ^4.8.1, ws ^8.18.0
- **Email**: nodemailer ^7.0.6, sib-api-v3-sdk ^8.5.0
- **AI**: openai ^5.20.0
- **SMS**: twilio ^5.10.0
- **File Handling**: multer ^2.0.2, sharp ^0.34.4
- **Frontend**: React 18, Vite, TanStack Query

## 3) Entry & Build

### Production Entry Command
```bash
node dist/index.js
```

### Build Required
**YES** - Build step required:
```bash
npm run build
```
This builds both React frontend (Vite) and Node.js backend (esbuild)

## 4) Web Server Details

### Port
- **Default**: 5000 (configurable via PORT environment variable)
- **Code**: `const PORT = parseInt(process.env.PORT || "5000")`

### Health Endpoints
- `GET /health` - Simple "OK" response
- `GET /api/health` - JSON with status, timestamp, uptime, port
- `HEAD /health` and `HEAD /api/health` - For load balancer checks

### Static Files
- **Served by Node**: Yes, via Express static middleware
- **Path**: `server/public/` (built frontend assets)
- **Assets**: `/assets/*` for JS/CSS bundles, images, etc.
- **Uploads**: `server/public/uploads/` for user-uploaded files

## 5) Security & Session/CSRF

### Sessions Configuration
```javascript
// PostgreSQL-backed sessions
app.use(session({
  store: new pgSession({
    pool: db,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  }
}));
```

### CSRF Protection
- **Library**: `csrf` ^3.1.0
- **Method**: Session-based CSRF tokens
- **Headers**: `x-csrf-token` required for state-changing operations

### CORS Configuration
```javascript
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://handytech-solutions.com']
    : ['http://localhost:5000', 'http://127.0.0.1:5000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token']
};
```

### HSTS Ready
**YES** - Can enable HSTS immediately via Helmet configuration

## 6) Environment Variables (Complete List)

### REQUIRED
```bash
# Database
DATABASE_URL=postgresql://username:password@hostname:port/database

# Security
SESSION_SECRET=your-session-secret-minimum-32-characters-long
JWT_SECRET=your-jwt-secret-minimum-32-characters-long

# Admin Auth
ADMIN_USERNAME=your-admin-username
ADMIN_PASSWORD=your-secure-admin-password

# Email (SMTP)
ADMIN_EMAIL=contact@handytech-solutions.com
SMTP_HOST=smtp.ionos.com
SMTP_PORT=587
SMTP_USER=contact@handytech-solutions.com
SMTP_PASS=your-email-password
FROM_EMAIL=contact@handytech-solutions.com

# Google Calendar (OAuth)
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_REDIRECT_URI=https://handytech-solutions.com/api/admin/google/callback
```

### OPTIONAL
```bash
# Google Calendar
GOOGLE_CALENDAR_ID=primary

# AI Services
OPENAI_API_KEY=sk-your-openai-api-key

# Email Automation
BREVO_API_KEY=your-brevo-sendinblue-api-key

# SMS (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_FROM=+15551234567
ADMIN_SMS_TO=+15557654321

# Security & CORS
ALLOWED_ORIGINS=https://handytech-solutions.com,https://www.handytech-solutions.com
CSRF_SAME_SITE=lax

# Application
NODE_ENV=production
PORT=5000
TZ=America/Chicago
```

## 7) Database

### Type & ORM
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM ^0.39.1
- **Migration Tool**: Drizzle Kit ^0.30.4

### Migration Command
```bash
npm run db:push
```

### Database Setup Commands
```bash
# Push schema to database
drizzle-kit push

# Or via npm script
npm run db:push
```

### Required Extensions
- Built-in PostgreSQL functions (no additional extensions required)
- Uses standard PostgreSQL data types

### Database Names
**Default OK**: 
- DB: `handydb`
- User: `handy`
- (Application uses DATABASE_URL connection string)

## 8) Realtime / Uploads / Cron

### Socket.IO / WebSockets
- **YES** - Socket.IO ^4.8.1 enabled
- **Default Path**: `/socket.io/`
- **Features**: Live chat, real-time admin notifications

### File Uploads
- **YES** - Multer ^2.0.2 for file handling
- **Target Folder**: `server/public/uploads/`
- **Max Size**: Configurable (default reasonable limits)
- **Types**: Images (PNG, JPG, GIF), documents

### Background Jobs
- **Appointment Reminders**: Scheduled email system (24h and 2h before)
- **Email Campaigns**: Automated follow-up sequences
- **No external cron needed** - handled by Node.js scheduling

## 9) Domains

### Primary Domains
- `handytech-solutions.com` (primary)
- `www.handytech-solutions.com` (www redirect)

### API Subdomain
**NO** - All API endpoints served from main domain at `/api/*` paths

## 10) Deploy Workflow Preference

**CHOICE NEEDED**: Pick one:
- [ ] Manual: git pull → npm ci → npm run build → pm2 restart
- [ ] pm2 deploy: one-line pm2 deploy production
- [ ] GitHub Actions: auto-deploy on push

## 11) Backups & Logs

### DB Backups
**CHOICE NEEDED**:
- [ ] Nightly cron OK? (yes/no)
- [ ] Keep how many days? (suggest: 30 days)

### Logs
**CHOICE NEEDED**:
- [ ] PM2 logrotate OK? (recommended: yes)

## Additional Technical Notes

### Production Build Output
- Frontend assets → `server/public/`
- Backend bundle → `dist/index.js`
- All dependencies bundled (external packages marked as external)

### Security Features
- Rate limiting (multiple tiers)
- Input sanitization
- XSS protection
- Security headers (Helmet)
- Cookie-based authentication
- CSRF protection on all forms

### Business Features
- Appointment scheduling system
- Customer portal with magic link auth
- Admin dashboard
- AI-powered chatbot
- Automated email notifications
- Google Calendar integration
- SMS notifications via Twilio
- File upload handling
- Review management system

### Ready for Production
✅ Health checks configured
✅ Security hardened
✅ Database migrations ready
✅ Environment validation
✅ Error handling comprehensive
✅ Logging implemented
✅ Session management production-ready