# HandyTech Solutions - Replit Deployment Guide

## 🚀 Deploy Your Professional Website with Custom Domain

Your HandyTech Solutions website is ready to go live on Replit with your custom domain **handytech-solutions.com**!

## Step 1: Deploy on Replit

1. **Click the Deploy Button**
   - In your Replit workspace, click the **"Deploy"** button in the header
   - Choose **"Autoscale Deployments"** for automatic scaling based on traffic
   - Configure your deployment settings:
     - **Machine Type**: Recommended for web applications
     - **Run Command**: `npm start` (already configured in package.json)

2. **Deploy Your Application**
   - Click **"Deploy"** to start the deployment process
   - Wait for the deployment to complete (usually 2-5 minutes)
   - Your website will be available at a Replit-provided URL

## Step 2: Link Your Custom Domain

1. **Access Deployment Settings**
   - Go to the **"Deployments"** tab in your workspace
   - Click on **"Settings"**

2. **Add Your Domain**
   - Click **"Link a domain"**
   - Enter: `handytech-solutions.com`
   - Also add: `www.handytech-solutions.com` (recommended)

3. **Get DNS Records**
   - Replit will provide you with:
     - **A Record IP address** (replace 209.46.125.246 with this)
     - **TXT Record** for domain verification

## Step 3: Update Domain DNS Settings

1. **Access Your Domain Registrar**
   - Log into where you purchased handytech-solutions.com
   - Navigate to DNS management/settings

2. **Update DNS Records**
   - **Replace the current A record** (209.46.125.246) with the **new Replit IP**
   - **Add the TXT record** provided by Replit for verification
   - **For www subdomain**: Create CNAME record pointing to your main domain

3. **DNS Configuration Example**
   ```
   Type: A
   Name: @
   Value: [Replit-provided IP address]
   TTL: 3600

   Type: A  
   Name: www
   Value: [Replit-provided IP address]
   TTL: 3600

   Type: TXT
   Name: @
   Value: [Replit-provided verification string]
   TTL: 3600
   ```

## Step 4: Wait for DNS Propagation

- **Propagation Time**: 5 minutes to 24 hours (usually under 1 hour)
- **Check Status**: Use tools like `dig handytech-solutions.com` or online DNS checkers
- **Verification**: Replit will automatically verify once DNS propagates

## Step 5: Configure Environment Variables (If Needed)

In your Replit deployment settings, add these environment variables:

```env
NODE_ENV=production
PORT=5000

# Database (Replit provides DATABASE_URL automatically)
DATABASE_URL=[automatically provided by Replit]

# Sessions (generate a strong secret)
SESSION_SECRET=your_very_secure_session_secret_here_make_it_long_and_random

# OpenAI (optional - for chatbot feature)
OPENAI_API_KEY=your_openai_api_key_here
```

## Step 6: Verify Deployment

Once DNS propagates, your website will be live at:
- `https://handytech-solutions.com`
- `https://www.handytech-solutions.com`

## ✅ What You Get After Deployment

✅ **Professional HandyTech Solutions website** with custom domain  
✅ **Automatic SSL certificates** (HTTPS secure)  
✅ **Global CDN** for fast loading worldwide  
✅ **Automatic scaling** based on traffic  
✅ **Database integration** with PostgreSQL  
✅ **Admin dashboard** at `/admin`  
✅ **Customer portal** at `/customer-portal`  
✅ **AI chatbot** for customer service  
✅ **Appointment scheduling** system  
✅ **Review management** system  
✅ **Quote request handling**  

## 🎉 Your Professional Website is Live!

Once DNS updates, visitors to **handytech-solutions.com** will see your complete professional handyman website with all React functionality working perfectly!

## Troubleshooting

**If domain doesn't work after 24 hours:**
1. Check DNS records are correct in your domain registrar
2. Verify A record points to Replit-provided IP
3. Ensure TXT record is added for verification
4. Contact your domain registrar for DNS support

**For technical support:**
- Check Replit deployment logs in the Deployments tab
- Verify environment variables are set correctly
- Test the Replit-provided URL first before custom domain