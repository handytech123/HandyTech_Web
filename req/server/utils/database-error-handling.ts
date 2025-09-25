// Database error handling - using generic error interface since PostgresError may not be exported

/**
 * Database error codes that can be retried
 */
const RETRYABLE_ERROR_CODES = [
  // Connection errors
  '08000', // connection_exception
  '08003', // connection_does_not_exist  
  '08006', // connection_failure
  '08001', // sqlclient_unable_to_establish_sqlconnection
  '08004', // sqlserver_rejected_establishment_of_sqlconnection
  '57P01', // admin_shutdown
  '57P02', // crash_shutdown
  '57P03', // cannot_connect_now
  // Temporary resource issues
  '53000', // insufficient_resources
  '53100', // disk_full
  '53200', // out_of_memory
  '53300', // too_many_connections
  // Lock timeout
  '55P03', // lock_not_available
  // Serialization failures
  '40001', // serialization_failure
  '40P01', // deadlock_detected
];

/**
 * Database error codes that indicate data/schema issues (non-retryable)
 */
const SCHEMA_ERROR_CODES = [
  '42P01', // undefined_table
  '42703', // undefined_column
  '42883', // undefined_function
  '42P07', // duplicate_table
  '42701', // duplicate_column
];

/**
 * Enhanced database error with context and retry information
 */
export interface DatabaseError extends Error {
  code?: string;
  severity?: string;
  detail?: string;
  hint?: string;
  table?: string;
  column?: string;
  constraint?: string;
  retryable: boolean;
  operation?: string;
  context?: Record<string, any>;
}

/**
 * Configuration for database operation retry behavior
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitter: boolean;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  jitter: true
};

/**
 * Analyzes a database error and determines if it should be retried
 */
export function analyzeDatabaseError(error: any, operation?: string, context?: Record<string, any>): DatabaseError {
  const dbError = error as DatabaseError;
  
  // Copy basic error properties
  dbError.message = error.message || 'Unknown database error';
  dbError.name = error.name || 'DatabaseError';
  dbError.operation = operation;
  dbError.context = context;
  
  // Handle Postgres-specific errors
  if (error instanceof Error && 'code' in error) {
    const pgError = error as any; // Using any since PostgresError may not be exported
    dbError.code = pgError.code;
    dbError.severity = pgError.severity;
    dbError.detail = pgError.detail;
    dbError.hint = pgError.hint;
    dbError.table = pgError.table;
    dbError.column = pgError.column;
    dbError.constraint = pgError.constraint;
  }
  
  // Determine if error is retryable
  dbError.retryable = dbError.code ? RETRYABLE_ERROR_CODES.includes(dbError.code) : false;
  
  // Special handling for connection errors without specific codes
  if (!dbError.code && (
    dbError.message.includes('connection') ||
    dbError.message.includes('timeout') ||
    dbError.message.includes('network') ||
    dbError.message.includes('ECONNREFUSED') ||
    dbError.message.includes('ENOTFOUND') ||
    dbError.message.includes('ETIMEDOUT')
  )) {
    dbError.retryable = true;
    dbError.code = '08000'; // Generic connection exception
  }
  
  return dbError;
}

/**
 * Logs database errors with comprehensive context
 */
export function logDatabaseError(error: DatabaseError, phase: 'attempt' | 'retry' | 'failure' = 'failure'): void {
  const logLevel = phase === 'attempt' ? 'warn' : 'error';
  const icon = phase === 'attempt' ? '⚠️' : phase === 'retry' ? '🔄' : '❌';
  
  console[logLevel](`${icon} Database ${phase}:`, {
    operation: error.operation,
    code: error.code,
    severity: error.severity,
    message: error.message,
    detail: error.detail,
    hint: error.hint,
    table: error.table,
    column: error.column,
    constraint: error.constraint,
    retryable: error.retryable,
    context: error.context,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
  
  // Additional guidance based on error type
  if (SCHEMA_ERROR_CODES.includes(error.code || '')) {
    console.error('💡 Schema issue detected - consider running: npm run db:push');
  } else if (error.code === '53300') {
    console.error('💡 Too many connections - consider implementing connection pooling limits');
  } else if (error.retryable) {
    console.warn('💡 This error might be temporary - operation will be retried');
  }
}

/**
 * Calculates retry delay with exponential backoff and optional jitter
 */
function calculateRetryDelay(attempt: number, config: RetryConfig): number {
  let delay = Math.min(
    config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
    config.maxDelayMs
  );
  
  if (config.jitter) {
    // Add ±25% jitter to prevent thundering herd
    const jitterRange = delay * 0.25;
    delay += (Math.random() - 0.5) * 2 * jitterRange;
  }
  
  return Math.max(delay, 0);
}

/**
 * Executes a database operation with retry logic and comprehensive error handling
 */
export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  context?: Record<string, any>
): Promise<T> {
  let lastError: DatabaseError | null = null;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      console.log(`🔍 Executing ${operationName} (attempt ${attempt}/${config.maxAttempts})`);
      
      const startTime = Date.now();
      const result = await operation();
      const duration = Date.now() - startTime;
      
      if (attempt > 1) {
        console.log(`✅ ${operationName} succeeded after ${attempt} attempts (${duration}ms)`);
      } else {
        console.log(`✅ ${operationName} completed successfully (${duration}ms)`);
      }
      
      return result;
      
    } catch (error) {
      const dbError = analyzeDatabaseError(error, operationName, context);
      lastError = dbError;
      
      if (attempt === 1) {
        logDatabaseError(dbError, 'attempt');
      }
      
      // Don't retry if error is not retryable or we've reached max attempts
      if (!dbError.retryable || attempt >= config.maxAttempts) {
        logDatabaseError(dbError, 'failure');
        throw dbError;
      }
      
      // Calculate delay and retry
      const delay = calculateRetryDelay(attempt, config);
      logDatabaseError(dbError, 'retry');
      console.log(`⏳ Retrying ${operationName} in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached, but just in case
  throw lastError || new Error(`${operationName} failed after ${config.maxAttempts} attempts`);
}

/**
 * Health check function to test database connectivity
 */
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
  try {
    const startTime = Date.now();
    
    // Import db here to avoid circular dependency issues
    const { pool } = await import('../db');
    const client = await pool.connect();
    
    try {
      await client.query('SELECT 1');
      const latency = Date.now() - startTime;
      
      return { healthy: true, latency };
    } finally {
      client.release();
    }
    
  } catch (error) {
    const dbError = analyzeDatabaseError(error, 'health_check');
    return { 
      healthy: false, 
      error: `${dbError.code || 'UNKNOWN'}: ${dbError.message}` 
    };
  }
}

/**
 * Creates a graceful failure wrapper that allows operations to degrade gracefully
 */
export function withGracefulFailure<T>(
  operation: () => Promise<T>,
  fallbackValue: T,
  operationName: string
): Promise<T> {
  return withDatabaseRetry(
    operation,
    operationName,
    { ...DEFAULT_RETRY_CONFIG, maxAttempts: 2 } // Fewer retries for graceful failures
  ).catch(error => {
    console.warn(`⚠️ ${operationName} failed gracefully, using fallback:`, {
      error: error.message,
      fallback: typeof fallbackValue
    });
    return fallbackValue;
  });
}