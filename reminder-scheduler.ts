import { storage } from './storage.js';
import { reminderService } from './reminder-service.js';

// Create a test appointment to demonstrate the reminder system
export async function createTestAppointment() {
  try {
    // Create a test appointment 25 hours from now
    const testDate = new Date();
    testDate.setHours(testDate.getHours() + 25); // 25 hours from now

    const testAppointment = await storage.createAppointment({
      firstName: "Test",
      lastName: "Customer",
      email: "test@example.com",
      phone: "(555) 123-4567",
      serviceType: "Smart Thermostat Installation",
      appointmentDate: testDate,
      appointmentTime: "2:00 PM",
      notes: "Test appointment for reminder system demo",
    });

    console.log('Created test appointment:', testAppointment);

    // Create reminders for this appointment
    await reminderService.createRemindersForAppointment(testAppointment);
    
    console.log('Created reminders for test appointment');
    return testAppointment;
  } catch (error) {
    console.error('Error creating test appointment:', error);
  }
}

// Function to check reminder status
export async function checkReminderStatus() {
  try {
    const pendingReminders = await storage.getPendingReminders();
    console.log(`Found ${pendingReminders.length} pending reminders`);
    
    if (pendingReminders.length > 0) {
      console.log('Pending reminders:', pendingReminders.map(r => ({
        id: r.id,
        appointmentId: r.appointmentId,
        type: r.reminderType,
        reminderTime: r.reminderTime,
        emailSent: r.emailSent
      })));
    }
    
    return pendingReminders;
  } catch (error) {
    console.error('Error checking reminder status:', error);
    return [];
  }
}