#!/bin/bash

# HandyTech Solutions - Environment Setup Script for VPS Deployment
# Run this script on your VPS to create the .env file with production settings

echo "Setting up environment variables for HandyTech Solutions..."

# Prompt for database password
echo "Enter your PostgreSQL password for handytech_user:"
read -s DB_PASSWORD

# Create .env file with production configuration
cat > .env << EOF
# Production Environment Configuration
NODE_ENV=production
PORT=3000

# Database Configuration
DATABASE_URL=postgresql://handytech_user:${DB_PASSWORD}@localhost:5432/handytech_db

# API Keys (Your actual production keys)
OPENAI_API_KEY=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
BREVO_API_KEY=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

# Admin Authentication
ADMIN_PASSWORD=HandyTech2024!

# Email Configuration
FROM_EMAIL=contact@handytechsolutions.com
REPLY_TO_EMAIL=info@handytechsolutions.com

# Session Security
SESSION_SECRET=HandyTech_SecureSession_2024_VPS_Production_Key_Missouri

# Domain Configuration (Update with your actual domain)
DOMAIN=handytechsolutions.com

# Additional Security Settings
SECURE_COOKIES=true
TRUST_PROXY=true

# VPS-specific settings
USE_VPS_DB=true
EOF

echo "✅ .env file created successfully!"
echo ""
echo "🔧 IMPORTANT: You must update the following values in .env:"
echo "   1. DATABASE_URL - Replace 'your_secure_password' with your actual PostgreSQL password"
echo "   2. OPENAI_API_KEY - Add your OpenAI API key for chatbot functionality"
echo "   3. ADMIN_PASSWORD - Set your admin dashboard password"
echo "   4. BREVO_API_KEY - Add your Brevo API key for email reminders"
echo "   5. SESSION_SECRET - Generate a secure random string"
echo "   6. FROM_EMAIL and REPLY_TO_EMAIL - Update with your business email"
echo "   7. DOMAIN - Update with your actual domain name"
echo ""
echo "📝 To edit the .env file:"
echo "   nano .env"
echo ""
echo "🔒 Security Note: Keep your .env file secure and never commit it to version control!"

# Set proper permissions for .env file
chmod 600 .env

echo "✅ Environment setup complete!"