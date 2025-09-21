# REPLIT DEPLOYMENT APP - START HERE

## 🤖 AUTOMATION INSTRUCTIONS

**This document is designed for Replit deployment automation apps. Follow these steps in EXACT order.**

**⚠️ CRITICAL: Do NOT skip steps. Validate each step before proceeding to the next.**

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### ✅ STEP 0: Verify Prerequisites

**Run these commands first and verify output:**

```bash
# Check Node.js version (must be 20.x)
node --version
# Expected output: v20.x.x

# Check npm is available
npm --version
# Expected output: version number

# Check required files exist
ls package.json server/index.ts shared/schema.ts
# Expected output: All three files should be listed
```

**🛑 STOP: If any check fails, DO NOT PROCEED**

---

## 🗂️ REQUIRED FILE STRUCTURE

**Verify these files exist BEFORE starting deployment:**

```
PROJECT_ROOT/
├── package.json                    ✅ REQUIRED
├── server/
│   ├── index.ts                    ✅ REQUIRED
│   ├── routes.ts                   ✅ REQUIRED
│   ├── storage.ts                  ✅ REQUIRED
│   └── db.ts                       ✅ REQUIRED
├── shared/
│   └── schema.ts                   ✅ REQUIRED
├── client/
│   ├── src/
│   │   ├── App.tsx                 ✅ REQUIRED
│   │   └── main.tsx                ✅ REQUIRED
│   └── index.html                  ✅ REQUIRED
├── drizzle.config.ts               ✅ REQUIRED
├── vite.config.ts                  ✅ REQUIRED
├── tsconfig.json                   ✅ REQUIRED
└── deploy.json                     ✅ REQUIRED (this file)
```

**Command to verify structure:**
```bash
find . -name "package.json" -o -name "index.ts" -o -name "schema.ts" -o -name "App.tsx"
```

**Expected output:** Should list all 4 files

---

## 🚀 DEPLOYMENT STEPS

### 📊 STEP 1: Create PostgreSQL Database

**Action:** Create database and get connection string

**Commands to run:**
```bash
# Use Replit database creation tool or PostgreSQL provider
# This step is provider-specific - use Replit's database setup
```

**Required output:** 
- DATABASE_URL in format: `postgresql://username:password@hostname:port/database`

**Validation command:**
```bash
echo $DATABASE_URL | grep "postgresql://"
```

**Expected output:** postgresql://... (connection string)

**🛑 STOP: DATABASE_URL must be set before continuing**

---

### 🔐 STEP 2: Set Environment Variables

**Action:** Configure all required environment variables

**REQUIRED VARIABLES (must set ALL of these):**

```bash
# Database (from Step 1)
export DATABASE_URL="postgresql://username:password@hostname:port/database"

# Security (generate strong values)
export SESSION_SECRET="your-secure-32-plus-character-session-secret-key"
export ADMIN_PASSWORD="SecureAdminPassword123!"

# Email Configuration
export ADMIN_EMAIL="contact@handytech-solutions.com"
export SMTP_HOST="smtp.ionos.com"
export SMTP_USER="contact@handytech-solutions.com"
export SMTP_PASS="your-email-password"

# Google Calendar Integration
export GOOGLE_CLIENT_ID="123456789-abc123def456.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="GOCSPX-abc123def456789012345"
export GOOGLE_REDIRECT_URI="https://yourdomain.com/api/admin/google/callback"
```

**Validation commands:**
```bash
# Verify each variable is set
echo "DATABASE_URL: $DATABASE_URL"
echo "SESSION_SECRET length: $(echo -n $SESSION_SECRET | wc -c)"
echo "ADMIN_PASSWORD: $ADMIN_PASSWORD"
echo "ADMIN_EMAIL: $ADMIN_EMAIL"
echo "SMTP_HOST: $SMTP_HOST"
echo "GOOGLE_CLIENT_ID: $GOOGLE_CLIENT_ID"
```

**Expected validation results:**
- DATABASE_URL: Should show postgresql:// connection string
- SESSION_SECRET length: Should be 32 or higher
- All other variables: Should display the values you set

**🛑 STOP: All required variables must be set before continuing**

---

### 📦 STEP 3: Install Dependencies

**Action:** Install Node.js packages

**Commands to run:**
```bash
npm ci
```

**Validation commands:**
```bash
# Check if node_modules exists
ls node_modules | head -5

# Verify key packages installed
npm list express drizzle-orm @tanstack/react-query
```

**Expected output:**
- node_modules directory should exist
- Key packages should be listed without errors

**🛑 STOP: Dependencies must install successfully before continuing**

---

### 🗄️ STEP 4: Setup Database Schema

**Action:** Push database schema to PostgreSQL

**Commands to run:**
```bash
npm run db:push
```

**Validation commands:**
```bash
# Verify no errors in schema push
echo "Exit code: $?"
```

**Expected output:**
- Exit code: 0 (success)
- No error messages about schema conflicts

**🛑 STOP: Database schema must be created successfully before continuing**

---

### 🏗️ STEP 5: Build Application

**Action:** Build React frontend and prepare production files

**Commands to run:**
```bash
npm run build
```

**Validation commands:**
```bash
# Check build output exists
ls dist/
ls dist/public/

# Verify key build files
ls dist/public/index.html dist/public/assets/
```

**Expected output:**
- dist/ directory should exist
- dist/public/ should contain index.html and assets/ folder

**🛑 STOP: Build must complete successfully before continuing**

---

### 🚀 STEP 6: Start Application

**Action:** Start the Node.js server

**Commands to run:**
```bash
npm start
```

**🔄 Wait 30 seconds for application to start**

**Validation commands:**
```bash
# Test health endpoint (try multiple methods)
curl -f http://localhost:5000/api/health || wget -q --spider http://localhost:5000/api/health

# Alternative validation
nc -zv localhost 5000
```

**Expected output:**
- Health check should return success
- Port 5000 should be accessible

**🛑 STOP: Application must be running on port 5000 before continuing**

---

## ✅ POST-DEPLOYMENT VALIDATION

### 🧪 STEP 7: Comprehensive Testing

**Run these tests in order:**

#### Test 1: Health Check
```bash
curl -f http://localhost:5000/api/health
```
**Expected:** Status 200, "healthy" response

#### Test 2: Admin Portal Access
```bash
curl -I http://localhost:5000/admin
```
**Expected:** Status 200

#### Test 3: API Endpoints
```bash
curl -f http://localhost:5000/api/customers
```
**Expected:** JSON array (may be empty: [])

#### Test 4: Database Connection
```bash
curl -f http://localhost:5000/api/services
```
**Expected:** JSON array with services

**🛑 STOP: All tests must pass for successful deployment**

---

## 🎯 SUCCESS CRITERIA

**✅ Deployment is successful when ALL of the following are true:**

1. **Health Check Passes:** `curl http://localhost:5000/api/health` returns 200
2. **Admin Portal Accessible:** `curl -I http://localhost:5000/admin` returns 200
3. **Database Connected:** API endpoints return valid JSON
4. **No Error Messages:** Application starts without errors
5. **Environment Variables Set:** All required variables are configured
6. **Files Built:** dist/public/ contains built React app

---

## 🚨 FAILURE TROUBLESHOOTING

### If STEP 1 (Database) fails:
```bash
echo "Check DATABASE_URL format:"
echo $DATABASE_URL
echo "Should start with postgresql://"
```

### If STEP 2 (Environment Variables) fails:
```bash
echo "Check all required variables are set:"
env | grep -E "(DATABASE_URL|SESSION_SECRET|ADMIN_PASSWORD|ADMIN_EMAIL|SMTP_HOST|GOOGLE_CLIENT_ID)"
```

### If STEP 3 (Dependencies) fails:
```bash
echo "Check Node.js version:"
node --version
echo "Clear npm cache and retry:"
npm cache clean --force
npm ci
```

### If STEP 4 (Database Schema) fails:
```bash
echo "Check database connection:"
npm run db:push --verbose
echo "Verify DATABASE_URL is correct"
```

### If STEP 5 (Build) fails:
```bash
echo "Check TypeScript compilation:"
npx tsc --noEmit
echo "Clear build cache:"
rm -rf dist/
npm run build
```

### If STEP 6 (Start Application) fails:
```bash
echo "Check application logs:"
npm start 2>&1 | head -20
echo "Verify port 5000 is not in use:"
lsof -i :5000
```

---

## 📞 SUPPORT INFORMATION

**If deployment fails after following ALL steps:**

1. **Check Application Logs:**
   ```bash
   npm start > app.log 2>&1 &
   tail -f app.log
   ```

2. **Verify Environment:**
   ```bash
   echo "Node.js: $(node --version)"
   echo "npm: $(npm --version)"
   echo "Environment variables count: $(env | grep -c '=')"
   ```

3. **Health Check Details:**
   ```bash
   curl -v http://localhost:5000/api/health
   ```

**Application Details:**
- **Name:** HandyTech Solutions v6.0.0
- **Port:** 5000
- **Health Endpoint:** `/api/health`
- **Admin Portal:** `/admin`
- **Database:** PostgreSQL required

---

## 🎉 DEPLOYMENT COMPLETE

**If all validation steps pass, your HandyTech Solutions application is successfully deployed!**

**Next steps:**
1. Access admin portal at `http://localhost:5000/admin`
2. Configure Google Calendar integration
3. Test email notifications
4. Set up SSL certificate for production

**🚀 Your professional handyman services platform is now running!**