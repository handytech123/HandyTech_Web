import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// DATABASE_URL validation will be handled by the database validation module during startup
// This check ensures we don't create a pool with undefined connection string
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is not set. " +
    "Please ensure you have provisioned a database and DATABASE_URL is configured. " +
    "Expected format: postgresql://username:password@hostname:port/database"
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });