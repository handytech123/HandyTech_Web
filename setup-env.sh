#!/bin/bash

# HandyTech Solutions - Environment Setup Script for VPS Deployment
# Run this script on your VPS to create the .env file with production settings

echo "Setting up environment variables for HandyTech Solutions..."

# Create .env file with production configuration
cat > .env << 'EOF'
# Production Environment Configuration
NODE_ENV=production
PORT=3000

# Database Configuration
DATABASE_URL=postgresql://handytech_user:your_secure_password@localhost:5432/handytech_db

# API Keys (Replace with your actual keys)
OPENAI_API_KEY=your_openai_api_key
ADMIN_PASSWORD=your_admin_password
BREVO_API_KEY=your_brevo_api_key

# Email Configuration
FROM_EMAIL=contact@handytechsolutions.com
REPLY_TO_EMAIL=info@handytechsolutions.com

# Session Configuration
SESSION_SECRET=your_session_secret_key_here

# Optional: Domain configuration
DOMAIN=your-domain.com
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