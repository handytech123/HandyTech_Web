# 🚀 DEPLOY NOW - HandyTech Solutions

## Quick Deploy to Your VPS (74.2.8.149.78)

### Step 1: Upload Files to Server
Transfer these files to your VPS:
- `handytech-deployment.tar.gz`
- `server-setup.sh` 
- `quick-deploy.sh`

### Step 2: Connect to Your VPS
```bash
ssh root@74.2.8.149.78
# Password: Savannah2
```

### Step 3: One-Command Setup
```bash
# Run server setup (installs Node.js, PostgreSQL, Nginx, PM2)
chmod +x server-setup.sh && ./server-setup.sh

# Create application directory and extract
mkdir -p /var/www/handytech-solutions
cd /var/www/handytech-solutions
tar -xzf ~/handytech-deployment.tar.gz

# Deploy application
chmod +x quick-deploy.sh && ./quick-deploy.sh
```

### Step 4: Configure Environment Variables
Edit the environment file:
```bash
nano /var/www/handytech-solutions/.env.production
```

Add your OpenAI API key:
```
OPENAI_API_KEY=your_actual_openai_key_here
```

### Step 5: Restart and Test
```bash
pm2 restart handytech-solutions
```

### ✅ Your Website Will Be Live At:
- **http://74.2.8.149.78**
- **Admin Portal:** http://74.2.8.149.78/admin
- **Login:** handytech / Savannah2

### 🔥 All Features Working:
- ✅ AI Chatbot with OpenAI
- ✅ Appointment Scheduling
- ✅ Admin Dashboard
- ✅ Customer Portal
- ✅ Clickable Phone/Email
- ✅ Mobile Responsive
- ✅ Database Integration

**Total Deploy Time: ~5 minutes**