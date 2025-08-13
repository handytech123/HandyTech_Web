// Test script to create a sample appointment and demonstrate reminder system
import fetch from 'node-fetch';

const baseUrl = 'http://localhost:5000';

async function createTestAppointment() {
  // Create appointment 25 hours from now (so 24-hour reminder will be ready)
  const appointmentDate = new Date();
  appointmentDate.setHours(appointmentDate.getHours() + 25);

  const appointmentData = {
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.johnson@email.com",
    phone: "(555) 987-6543",
    serviceType: "Smart Home Technology Installation",
    appointmentDate: appointmentDate.toISOString(),
    appointmentTime: "2:00 PM",
    notes: "Test appointment for reminder system demonstration"
  };

  try {
    const response = await fetch(`${baseUrl}/api/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(appointmentData),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Successfully created test appointment:', result);
      return result;
    } else {
      console.error('❌ Failed to create appointment:', result);
      return null;
    }
  } catch (error) {
    console.error('❌ Error creating appointment:', error);
    return null;
  }
}

async function checkPendingReminders() {
  try {
    const response = await fetch(`${baseUrl}/api/admin/reminders/pending`);
    const reminders = await response.json();
    
    console.log(`📧 Found ${reminders.length} pending reminders:`);
    reminders.forEach(reminder => {
      console.log(`  - ${reminder.reminderType} for appointment #${reminder.appointmentId}`);
      console.log(`    Scheduled: ${new Date(reminder.reminderTime).toLocaleString()}`);
      console.log(`    Status: ${reminder.emailStatus}`);
    });
    
    return reminders;
  } catch (error) {
    console.error('❌ Error checking reminders:', error);
    return [];
  }
}

async function testReminderSystem() {
  console.log('🚀 Testing Appointment Reminder System');
  console.log('=====================================');
  
  // Create test appointment
  const appointment = await createTestAppointment();
  if (!appointment) {
    return;
  }
  
  // Wait a moment for reminders to be created
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Check pending reminders
  console.log('\n📋 Checking pending reminders...');
  const reminders = await checkPendingReminders();
  
  if (reminders.length > 0) {
    console.log('\n✅ Reminder system is working correctly!');
    console.log('The following reminders have been automatically scheduled:');
    reminders.forEach(reminder => {
      const timeUntil = new Date(reminder.reminderTime) - new Date();
      const hoursUntil = Math.round(timeUntil / (1000 * 60 * 60));
      console.log(`  - ${reminder.reminderType}: ${hoursUntil} hours from now`);
    });
  } else {
    console.log('\n⚠️  No reminders found. This might mean:');
    console.log('   - The appointment is too close (less than 30 minutes away)');
    console.log('   - There was an issue creating the reminders');
  }
}

// Run the test
testReminderSystem().catch(console.error);