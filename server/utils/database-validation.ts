import { Pool } from 'pg';

/**
 * Validates DATABASE_URL format and structure
 */
function validateDatabaseUrl(url: string): void {
  try {
    const parsedUrl = new URL(url);
    
    if (!parsedUrl.protocol || !['postgresql:', 'postgres:'].includes(parsedUrl.protocol)) {
      throw new Error('DATABASE_URL must use postgresql:// or postgres:// protocol');
    }
    
    if (!parsedUrl.hostname) {
      throw new Error('DATABASE_URL must include a valid hostname');
    }
    
    if (!parsedUrl.username) {
      throw new Error('DATABASE_URL must include a username');
    }
    
    if (!parsedUrl.password) {
      throw new Error('DATABASE_URL must include a password');
    }
    
    if (!parsedUrl.pathname || parsedUrl.pathname === '/') {
      throw new Error('DATABASE_URL must include a database name');
    }
    
    console.log(`✓ DATABASE_URL format validation passed`);
    
    // Only log detailed connection info in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`  Host: ${parsedUrl.hostname}`);
      console.log(`  Database: ${parsedUrl.pathname.replace('/', '')}`);
      console.log(`  Username: ${parsedUrl.username}`);
    }
    
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`DATABASE_URL format is invalid: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Tests actual database connection and basic functionality
 */
async function testDatabaseConnection(databaseUrl: string, retries: number = 3): Promise<void> {
  let lastError: Error | null = null;
  let validationPool: Pool | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Testing database connection (attempt ${attempt}/${retries})...`);
      
      // Create a dedicated pool for validation
      if (!validationPool) {
        validationPool = new Pool({ connectionString: databaseUrl });
      }
      
      // Test basic connection
      const client = await validationPool.connect();
      console.log(`✓ Database connection established`);
      
      // Test basic query
      const result = await client.query('SELECT 1 as test');
      if (result.rows[0]?.test !== 1) {
        throw new Error('Database query test failed - unexpected result');
      }
      console.log(`✓ Database query test passed`);
      
      // Test database version and info
      const versionResult = await client.query('SELECT version()');
      console.log(`✓ Connected to: ${versionResult.rows[0].version.split(',')[0]}`);
      
      // Test current schema exists
      const schemaResult = await client.query(`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name = 'public'
      `);
      
      if (schemaResult.rows.length === 0) {
        console.warn('⚠ Public schema not found - this may cause issues');
      } else {
        console.log(`✓ Public schema verified`);
      }
      
      client.release();
      console.log(`✅ Database connection test completed successfully`);
      
      // Clean up validation pool
      if (validationPool) {
        await validationPool.end();
      }
      
      return;
      
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Database connection test failed (attempt ${attempt}/${retries}):`, error instanceof Error ? error.message : error);
      
      if (attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // Clean up validation pool even on failure
  if (validationPool) {
    try {
      await validationPool.end();
    } catch (cleanupError) {
      console.error('Error cleaning up validation pool:', cleanupError);
    }
  }
  
  throw new Error(`Database connection failed after ${retries} attempts. Last error: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Tests if required database tables exist and validates critical schema structure
 */
async function validateDatabaseSchema(databaseUrl: string): Promise<void> {
  let schemaPool: Pool | null = null;
  
  try {
    console.log('🔍 Validating database schema and structure...');
    
    schemaPool = new Pool({ connectionString: databaseUrl });
    const client = await schemaPool.connect();
    
    // Check for all essential tables that the application depends on
    const criticalTables = [
      'availability_rules',  // Core for appointment booking
      'appointments',        // Core business logic
      'customers',          // Core business logic 
      'blocked_times'       // Important for scheduling
    ];
    
    const additionalTables = [
      'users',              // Authentication
      'services',           // Service management
      'service_addons',     // Service options
      'reviews',            // Customer feedback
      'quotes',             // Quote management
      'maintenance_plans',  // Customer plans
      'email_campaigns',    // Marketing
      'project_gallery',    // Portfolio
      'portal_login_tokens' // Customer portal
    ];
    
    const allRequiredTables = [...criticalTables, ...additionalTables];
    
    const tableQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name = ANY($1)
    `;
    
    const result = await client.query(tableQuery, [allRequiredTables]);
    const existingTables = result.rows.map(row => row.table_name);
    
    const missingCriticalTables = criticalTables.filter(table => !existingTables.includes(table));
    const missingAdditionalTables = additionalTables.filter(table => !existingTables.includes(table));
    
    // Handle missing critical tables as fatal errors
    if (missingCriticalTables.length > 0) {
      console.error(`🚨 Critical database tables are missing: ${missingCriticalTables.join(', ')}`);
      console.error('❌ Application cannot start without these core tables');
      console.error('\n🔧 Required migration steps:');
      console.error('1. Run database migration: npm run db:push');
      console.error('2. If that fails, try: npm run db:push --force');
      console.error('3. Verify schema matches shared/schema.ts');
      console.error('4. Check database permissions for CREATE TABLE');
      
      throw new Error(
        `Database schema migration required. Missing critical tables: ${missingCriticalTables.join(', ')}. ` +
        'Run "npm run db:push" to create required database structure.'
      );
    }
    
    // Log missing additional tables as warnings (non-fatal)
    if (missingAdditionalTables.length > 0) {
      console.warn(`⚠️  Some optional database tables are missing: ${missingAdditionalTables.join(', ')}`);
      console.warn('   These features may not work fully until schema is updated');
      console.warn('   Run: npm run db:push to create all tables');
    } else {
      console.log(`✅ All application database tables exist (${existingTables.length} tables found)`);
    }
    
    // Validate critical table structures
    await validateTableStructures(client, existingTables);
    
    client.release();
    
  } catch (error) {
    console.error('❌ Database schema validation failed:', error instanceof Error ? error.message : error);
    throw new Error(`Database schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    // Clean up schema pool
    if (schemaPool) {
      try {
        await schemaPool.end();
      } catch (cleanupError) {
        console.error('Error cleaning up schema pool:', cleanupError);
      }
    }
  }
}

/**
 * Validates the structure of critical database tables
 */
async function validateTableStructures(client: any, existingTables: string[]): Promise<void> {
  console.log('🔍 Validating critical table structures...');
  
  // Define expected column structures for critical tables
  const tableStructures = {
    'availability_rules': {
      required: ['id', 'weekday', 'start_time', 'end_time', 'active'],
      critical: true,
      description: 'Appointment scheduling availability'
    },
    'appointments': {
      required: ['id', 'customer_id', 'service_id', 'appointment_date'],
      critical: true,
      description: 'Customer appointment bookings'
    },
    'customers': {
      required: ['id', 'first_name', 'last_name', 'email'],
      critical: true,
      description: 'Customer information'
    },
    'blocked_times': {
      required: ['id', 'start_timestamptz', 'end_timestamptz'],
      critical: false,
      description: 'Schedule blocking'
    }
  };
  
  for (const [tableName, tableInfo] of Object.entries(tableStructures)) {
    if (!existingTables.includes(tableName)) {
      if (tableInfo.critical) {
        console.error(`🚨 Critical table missing: ${tableName}`);
      }
      continue;
    }
    
    try {
      const columnQuery = `
        SELECT column_name, data_type, is_nullable, column_default 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1
        ORDER BY ordinal_position
      `;
      
      const columnResult = await client.query(columnQuery, [tableName]);
      const existingColumns = columnResult.rows.map((row: { column_name: string }) => row.column_name);
      const missingColumns = tableInfo.required.filter(col => !existingColumns.includes(col));
      
      if (missingColumns.length > 0) {
        const errorMsg = `${tableName} table missing required columns: ${missingColumns.join(', ')}`;
        
        if (tableInfo.critical) {
          console.error(`🚨 Critical schema error in ${tableName}:`, errorMsg);
          throw new Error(`Critical table structure invalid: ${errorMsg}`);
        } else {
          console.warn(`⚠️  Schema warning in ${tableName}:`, errorMsg);
        }
      } else {
        console.log(`  ✅ ${tableName} structure validated (${tableInfo.description})`);
      }
      
    } catch (error) {
      const errorMessage = `Failed to validate ${tableName} structure: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      if (tableInfo.critical) {
        console.error(`🚨 Critical validation error:`, errorMessage);
        throw new Error(errorMessage);
      } else {
        console.warn(`⚠️  Structure validation warning:`, errorMessage);
      }
    }
  }
  
  console.log('✅ Database table structure validation completed');
}

/**
 * Comprehensive database validation and connection testing
 * This should be called during application startup before any database operations
 */
export async function validateDatabaseConnection(): Promise<void> {
  console.log('\n🔍 Starting comprehensive database validation...\n');
  
  try {
    // Step 1: Validate environment variable exists
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL environment variable is not set.\n' +
        'Please ensure you have provisioned a database and the DATABASE_URL is configured.\n' +
        'Expected format: postgresql://username:password@hostname:port/database'
      );
    }
    
    // Step 2: Validate DATABASE_URL format
    validateDatabaseUrl(databaseUrl);
    
    // Step 3: Test actual database connection with retries
    await testDatabaseConnection(databaseUrl);
    
    // Step 4: Validate database schema
    await validateDatabaseSchema(databaseUrl);
    
    console.log('\n✅ Database validation completed successfully\n');
    
  } catch (error) {
    console.error('\n🚨 DATABASE VALIDATION FAILED 🚨\n');
    console.error('Error:', error instanceof Error ? error.message : error);
    console.error('\nPossible solutions:');
    console.error('1. Check DATABASE_URL environment variable is correctly set');
    console.error('2. Ensure database is provisioned and accessible');
    console.error('3. Run database migration: npm run db:push');
    console.error('4. Check network connectivity to database host');
    console.error('\nApplication startup aborted due to database issues.\n');
    
    throw error;
  }
}
