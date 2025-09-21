/**
 * Comprehensive environment variable validation for application startup
 * Validates all required and optional environment variables with detailed guidance
 */

interface EnvironmentConfig {
  name: string;
  required: boolean;
  production_only?: boolean;
  validation?: (value: string) => boolean;
  description: string;
  example?: string;
  security_critical?: boolean;
}

/**
 * Complete list of environment variables used by the application
 */
const ENVIRONMENT_VARIABLES: EnvironmentConfig[] = [
  // Database Configuration (Critical)
  {
    name: 'DATABASE_URL',
    required: true,
    security_critical: true,
    description: 'PostgreSQL database connection string',
    example: 'postgresql://username:password@hostname:port/database',
    validation: (value) => value.startsWith('postgresql://') || value.startsWith('postgres://')
  },

  // Security Configuration (Critical)
  {
    name: 'SESSION_SECRET',
    required: true,
    security_critical: true,
    description: 'Secret key for session encryption (minimum 32 characters)',
    validation: (value) => value.length >= 32
  },
  {
    name: 'JWT_SECRET',
    required: true,
    security_critical: true,
    description: 'Secret key for JWT token signing (minimum 32 characters)',
    validation: (value) => value.length >= 32
  },
  {
    name: 'ADMIN_USERNAME',
    required: true,
    security_critical: true,
    description: 'Username for admin panel access',
    validation: (value) => value.length >= 3
  },
  {
    name: 'ADMIN_PASS',
    required: true,
    security_critical: true,
    description: 'Password for admin panel access (should be strong)',
    validation: (value) => value.length >= 8
  },

  // Email Configuration (Required for business operations)
  {
    name: 'ADMIN_EMAIL',
    required: true,
    description: 'Administrative contact email address',
    example: 'admin@yourbusiness.com',
    validation: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  },
  {
    name: 'SMTP_HOST',
    required: true,
    description: 'SMTP server hostname for sending emails',
    example: 'smtp.gmail.com'
  },
  {
    name: 'SMTP_USER',
    required: true,
    description: 'SMTP username/email for authentication',
    validation: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  },
  {
    name: 'SMTP_PASS',
    required: true,
    security_critical: true,
    description: 'SMTP password for email authentication'
  },

  // Google Calendar Integration (Required for appointment sync)
  {
    name: 'GOOGLE_CLIENT_ID',
    required: true,
    description: 'Google OAuth2 client ID for calendar integration',
    example: '123456789-abc123def456.apps.googleusercontent.com'
  },
  {
    name: 'GOOGLE_CLIENT_SECRET',
    required: true,
    security_critical: true,
    description: 'Google OAuth2 client secret for calendar integration'
  },
  {
    name: 'GOOGLE_REDIRECT_URI',
    required: true,
    description: 'Google OAuth2 redirect URI for callback',
    example: 'https://yourdomain.com/api/admin/google/callback'
  },

  // Optional Configuration
  {
    name: 'GOOGLE_CALENDAR_ID',
    required: false,
    description: 'Specific Google Calendar ID to sync appointments (uses primary if not set)'
  },
  {
    name: 'ALLOWED_ORIGINS',
    required: false,
    production_only: true,
    description: 'Comma-separated list of allowed CORS origins for production',
    example: 'https://yourdomain.com,https://app.yourdomain.com'
  },
  {
    name: 'OPENAI_API_KEY',
    required: false,
    security_critical: true,
    description: 'OpenAI API key for AI-powered features'
  },
  {
    name: 'BREVO_API_KEY',
    required: false,
    security_critical: true,
    description: 'Brevo (Sendinblue) API key for email automation'
  },
  {
    name: 'TZ',
    required: false,
    description: 'Timezone for the application (defaults to UTC)',
    example: 'America/New_York'
  },
  {
    name: 'PORT',
    required: false,
    description: 'Port for the application to run on (defaults to 5000)',
    validation: (value) => !isNaN(parseInt(value)) && parseInt(value) > 0
  }
];

/**
 * Validates all environment variables and provides detailed error reporting
 */
export async function validateEnvironmentVariables(): Promise<void> {
  console.log('\n🔧 Validating environment variables...\n');
  
  const isProduction = process.env.NODE_ENV === 'production';
  const errors: string[] = [];
  const warnings: string[] = [];
  const securityIssues: string[] = [];
  
  let validatedCount = 0;
  let requiredCount = 0;
  
  for (const config of ENVIRONMENT_VARIABLES) {
    const value = process.env[config.name];
    const isRequired = config.required && (!config.production_only || isProduction);
    
    if (isRequired) {
      requiredCount++;
    }
    
    // Check if required variable is missing or empty
    if (isRequired && (!value || value.trim() === '')) {
      errors.push(
        `❌ ${config.name}: ${config.description}${config.example ? ` (example: ${config.example})` : ''}`
      );
      continue;
    }
    
    // Skip validation for optional variables that aren't set
    if (!isRequired && !value) {
      continue;
    }
    
    // Validate the value if validation function is provided
    if (value && config.validation && !config.validation(value)) {
      if (isRequired) {
        errors.push(
          `❌ ${config.name}: Invalid format. ${config.description}${config.example ? ` (example: ${config.example})` : ''}`
        );
      } else {
        warnings.push(
          `⚠️  ${config.name}: Invalid format, may cause issues. ${config.description}`
        );
      }
      continue;
    }
    
    // Security validation for production
    if (isProduction && config.security_critical && value) {
      if (value.length < 16 && !config.validation) {
        securityIssues.push(
          `🔒 ${config.name}: Appears too short for production security (${value.length} characters)`
        );
      }
    }
    
    if (value) {
      validatedCount++;
      console.log(`  ✅ ${config.name}: ${config.security_critical ? '[REDACTED]' : 'Set'} - ${config.description}`);
    }
  }
  
  // Report validation results
  console.log(`\n📊 Environment Validation Summary:`);
  console.log(`  ✅ ${validatedCount} variables validated successfully`);
  console.log(`  📋 ${requiredCount} required variables checked`);
  
  // Handle errors (fatal)
  if (errors.length > 0) {
    console.error(`\n🚨 ENVIRONMENT VALIDATION FAILED 🚨\n`);
    console.error(`Missing or invalid required environment variables (${errors.length}):\n`);
    errors.forEach(error => console.error(`  ${error}`));
    
    console.error(`\n🔧 Setup Instructions:`);
    console.error(`1. Create a .env file in your project root (or set environment variables)`);
    console.error(`2. Add the missing variables listed above`);
    console.error(`3. Restart the application`);
    
    if (isProduction) {
      console.error(`\n🏭 Production Deployment:`);
      console.error(`- Ensure all secrets are properly secured`);
      console.error(`- Use strong, randomly generated values for security-critical variables`);
      console.error(`- Never commit .env files or secrets to version control`);
    }
    
    console.error(`\n📖 For detailed setup instructions, see:`);
    console.error(`- REPLIT_DEPLOYMENT_INSTRUCTIONS.md (for Replit deployments)`);
    console.error(`- IONOS_DEPLOYMENT_INSTRUCTIONS.md (for IONOS deployments)`);
    
    throw new Error(
      `Environment validation failed: ${errors.length} required variables are missing or invalid. ` +
      'Please check the console output above for detailed instructions.'
    );
  }
  
  // Handle warnings (non-fatal)
  if (warnings.length > 0) {
    console.warn(`\n⚠️  Environment Warnings (${warnings.length}):`);
    warnings.forEach(warning => console.warn(`  ${warning}`));
    console.warn(`  These may cause functionality issues but won't prevent startup\n`);
  }
  
  // Handle security issues (warnings in development, more serious in production)
  if (securityIssues.length > 0) {
    const logLevel = isProduction ? console.error : console.warn;
    const prefix = isProduction ? '🚨' : '⚠️';
    
    logLevel(`\n${prefix} Security Concerns (${securityIssues.length}):`);
    securityIssues.forEach(issue => logLevel(`  ${issue}`));
    
    if (isProduction) {
      logLevel(`  Consider using longer, more secure values for production deployment\n`);
    } else {
      console.warn(`  These are warnings in development but should be addressed before production\n`);
    }
  }
  
  console.log(`✅ Environment variable validation completed successfully\n`);
}

/**
 * Get a summary of current environment configuration (for debugging)
 */
export function getEnvironmentSummary(): object {
  const isProduction = process.env.NODE_ENV === 'production';
  const summary: any = {
    environment: isProduction ? 'production' : 'development',
    database_configured: !!process.env.DATABASE_URL,
    email_configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
    google_calendar_configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    security_variables_set: !!(process.env.SESSION_SECRET && process.env.JWT_SECRET),
    admin_configured: !!(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD),
    total_variables_set: ENVIRONMENT_VARIABLES.filter(config => !!process.env[config.name]).length
  };
  
  return summary;
}