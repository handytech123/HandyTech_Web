import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

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
 * Tests if required database tables exist
 */
async function validateDatabaseSchema(databaseUrl: string): Promise<void> {
  let schemaPool: Pool | null = null;
  
  try {
    console.log('Validating database schema...');
    
    schemaPool = new Pool({ connectionString: databaseUrl });
    const client = await schemaPool.connect();
    
    // Check for core tables that the app depends on
    const requiredTables = [
      'availability_rules',
      'appointments', 
      'customers',
      'blocked_times'
    ];
    
    const tableQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name = ANY($1)
    `;
    
    const result = await client.query(tableQuery, [requiredTables]);
    const existingTables = result.rows.map(row => row.table_name);
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      console.warn(`⚠ Missing database tables: ${missingTables.join(', ')}`);
      console.warn('  This may indicate schema migration is needed');
      console.warn('  Run: npm run db:push');
    } else {
      console.log(`✓ All required database tables exist`);
    }
    
    // Check availability_rules table structure specifically since it's critical for the app
    if (existingTables.includes('availability_rules')) {
      const columnQuery = `
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'availability_rules'
        ORDER BY ordinal_position
      `;
      
      const columnResult = await client.query(columnQuery);
      const columns = columnResult.rows.map(row => row.column_name);
      const requiredColumns = ['id', 'weekday', 'start_time', 'end_time', 'active'];
      const missingColumns = requiredColumns.filter(col => !columns.includes(col));
      
      if (missingColumns.length > 0) {
        throw new Error(`availability_rules table missing required columns: ${missingColumns.join(', ')}`);
      }
      
      console.log(`✓ availability_rules table structure validated`);
    }
    
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