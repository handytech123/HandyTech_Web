import { storage } from "../storage";
import { checkDatabaseHealth, withDatabaseRetry } from "./database-error-handling";

/**
 * Seeds essential data required for the application to function
 * This ensures availability rules exist for appointment booking
 */
export async function seedEssentialData(): Promise<void> {
  try {
    console.log("🌱 Starting essential data seeding process...");
    
    // First, check database health
    console.log("🏥 Checking database health before seeding...");
    const healthCheck = await checkDatabaseHealth();
    if (!healthCheck.healthy) {
      throw new Error(`Database health check failed: ${healthCheck.error}`);
    }
    console.log(`✅ Database health check passed (${healthCheck.latency}ms)`);
    
    // Use retry logic for checking existing rules
    console.log("🔍 Checking for existing essential data...");
    const existingRules = await withDatabaseRetry(
      () => storage.getActiveAvailabilityRules(),
      'seedEssentialData_getActiveRules',
      undefined,
      { phase: 'check_existing_rules' }
    );
    
    if (existingRules.length === 0) {
      console.log("📝 No availability rules found. Seeding default rules...");
      
      // Create default Monday-Friday, 8:00 AM - 4:00 PM availability
      const defaultRules = [
        { weekday: 1, startTime: "08:00", endTime: "16:00", active: true }, // Monday
        { weekday: 2, startTime: "08:00", endTime: "16:00", active: true }, // Tuesday  
        { weekday: 3, startTime: "08:00", endTime: "16:00", active: true }, // Wednesday
        { weekday: 4, startTime: "08:00", endTime: "16:00", active: true }, // Thursday
        { weekday: 5, startTime: "08:00", endTime: "16:00", active: true }, // Friday
      ];
      
      // Seed each rule with retry logic and individual error handling
      let seededCount = 0;
      for (let i = 0; i < defaultRules.length; i++) {
        const rule = defaultRules[i];
        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][rule.weekday];
        
        try {
          await withDatabaseRetry(
            () => storage.createAvailabilityRule(rule),
            `seedEssentialData_createRule_${dayName}`,
            undefined,
            { rule, dayName, index: i + 1, total: defaultRules.length }
          );
          seededCount++;
          console.log(`  ✅ Created availability rule for ${dayName} (${rule.startTime}-${rule.endTime})`);
        } catch (error) {
          console.error(`  ❌ Failed to create availability rule for ${dayName}:`, error);
          // Continue with other rules even if one fails
        }
      }
      
      console.log(`✅ Successfully seeded ${seededCount}/${defaultRules.length} availability rules`);
      
      if (seededCount === 0) {
        throw new Error('Failed to seed any availability rules - application may not function properly');
      } else if (seededCount < defaultRules.length) {
        console.warn(`⚠️ Only ${seededCount}/${defaultRules.length} availability rules were created - some appointment slots may not be available`);
      }
      
    } else {
      console.log(`✅ Found ${existingRules.length} existing availability rules`);
      
      // Log existing rules for verification (only in development)
      if (process.env.NODE_ENV === 'development') {
        const rulesInfo = existingRules.map(rule => {
          const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][rule.weekday];
          return `${dayName}: ${rule.startTime}-${rule.endTime}`;
        }).join(', ');
        console.log(`📋 Active rules: ${rulesInfo}`);
      }
    }
    
    console.log("✅ Essential data seeding completed successfully");
    
  } catch (error) {
    console.error("🚨 Critical error during essential data seeding:");
    console.error({
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    });
    
    // Provide actionable guidance
    console.error("\n💡 Troubleshooting steps:");
    console.error("1. Ensure database connection is stable");
    console.error("2. Verify availability_rules table exists (run: npm run db:push)");
    console.error("3. Check database permissions for INSERT operations");
    console.error("4. Review database logs for constraint violations");
    
    throw new Error(`Essential data seeding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}