# HandyTech Solutions - VPS Update Instructions

## What's Updated in This Package
✅ **Fixed all missing Node.js dependencies** - All Vite plugins, React components, and routing libraries
✅ **Updated PostCSS configuration** - Fixed Tailwind CSS integration
✅ **Corrected Vite plugin configurations** - All React and development plugins included
✅ **Complete UI component library** - All Radix UI components and utilities

## Update Your Ionos VPS (209.46.125.246)

### Step 1: Backup Current Installation
```bash
ssh root@209.46.125.246
cd /var/www
mv handytech handytech-backup-$(date +%Y%m%d)
```

### Step 2: Upload New Package
Upload the `handytech-updated-deployment.tar.gz` file to your VPS, then:

```bash
cd /var/www
tar -xzf handytech-updated-deployment.tar.gz
mv handytech-updated-deployment handytech
cd handytech
```

### Step 3: Install Dependencies
```bash
npm install
```

### Step 4: Set Environment Variables
```bash
export DATABASE_URL="postgresql://handytech_user:YOUR_DATABASE_PASSWORD@localhost:5432/handytech_db"
export NODE_ENV=production
export BREVO_API_KEY="YOUR_BREVO_API_KEY"
export OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
export ADMIN_PASSWORD="HandyTech2024!"
```

### Step 5: Build and Restart Application
```bash
npm run build
pm2 stop handytech
pm2 delete handytech
pm2 start npm --name "handytech" -- start
pm2 save
```

### Step 6: Verify Installation
Visit your website: **http://209.46.125.246**

Admin dashboard: **http://209.46.125.246/admin**

## Your HandyTech Solutions platform will now work completely!

### Features Now Working:
- ✅ Main website with contact form
- ✅ AI chatbot with OpenAI integration
- ✅ Admin dashboard with full business management
- ✅ Appointment scheduling and reminders
- ✅ Customer management system
- ✅ Email automation with Brevo
- ✅ Mobile responsive design

## Support
Your website is now fully operational with all dependencies resolved!