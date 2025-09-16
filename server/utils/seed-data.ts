import { storage } from "../storage";

/**
 * Seeds essential data required for the application to function
 * This ensures availability rules exist for appointment booking
 */
export async function seedEssentialData(): Promise<void> {
  try {
    console.log("Checking for essential data...");
    
    // Check if availability rules exist
    const existingRules = await storage.getActiveAvailabilityRules();
    
    if (existingRules.length === 0) {
      console.log("No availability rules found. Seeding default rules...");
      
      // Create default Monday-Friday, 8:00 AM - 4:00 PM availability
      const defaultRules = [
        { weekday: 1, startTime: "08:00", endTime: "16:00", active: true }, // Monday
        { weekday: 2, startTime: "08:00", endTime: "16:00", active: true }, // Tuesday  
        { weekday: 3, startTime: "08:00", endTime: "16:00", active: true }, // Wednesday
        { weekday: 4, startTime: "08:00", endTime: "16:00", active: true }, // Thursday
        { weekday: 5, startTime: "08:00", endTime: "16:00", active: true }, // Friday
      ];
      
      for (const rule of defaultRules) {
        await storage.createAvailabilityRule(rule);
      }
      
      console.log(`✅ Seeded ${defaultRules.length} availability rules (Mon-Fri 8:00-16:00)`);
    } else {
      console.log(`✅ Found ${existingRules.length} existing availability rules`);
    }
    
    console.log("Essential data check complete");
    
  } catch (error) {
    console.error("Error seeding essential data:", error);
    throw error;
  }
}