// Demo script to create reminders for existing appointments and show the complete system
import fetch from 'node-fetch';

const baseUrl = 'http://localhost:5000';

async function createRemindersForExistingAppointments() {
  try {
    // Get all appointments
    const response = await fetch(`${baseUrl}/api/appointments`);
    const appointments = await response.json();
    
    console.log('📅 Found appointments:');
    appointments.forEach(apt => {
      const aptDate = new Date(apt.appointmentDate);
      const now = new Date();
      const timeUntil = aptDate - now;
      const hoursUntil = Math.round(timeUntil / (1000 * 60 * 60));
      
      console.log(`  - ${apt.firstName} ${apt.lastName}: ${apt.serviceType}`);
      console.log(`    Date: ${aptDate.toLocaleString()}`);
      console.log(`    Time until: ${hoursUntil} hours\n`);
    });

    // Create reminders for future appointments
    const futureAppointments = appointments.filter(apt => new Date(apt.appointmentDate) > new Date());
    
    console.log(`🔔 Creating reminders for ${futureAppointments.length} future appointments...\n`);
    
    for (const appointment of futureAppointments) {
      try {
        const reminderResponse = await fetch(`${baseUrl}/api/admin/reminders/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appointmentId: appointment.id })
        });
        
        if (reminderResponse.ok) {
          console.log(`✅ Created reminders for appointment #${appointment.id}`);
        } else {
          const error = await reminderResponse.json();
          console.log(`❌ Failed to create reminders for appointment #${appointment.id}:`, error.message);
        }
      } catch (error) {
        console.log(`❌ Error creating reminders for appointment #${appointment.id}:`, error.message);
      }
    }
    
    return futureAppointments.length;
  } catch (error) {
    console.error('❌ Error processing appointments:', error);
    return 0;
  }
}

async function checkPendingReminders() {
  try {
    const response = await fetch(`${baseUrl}/api/admin/reminders/pending`);
    const reminders = await response.json();
    
    console.log(`\n📧 Found ${reminders.length} pending reminders:`);
    reminders.forEach(reminder => {
      const reminderTime = new Date(reminder.reminderTime);
      const now = new Date();
      const timeUntil = reminderTime - now;
      const minutesUntil = Math.round(timeUntil / (1000 * 60));
      
      console.log(`  - ${reminder.reminderType} for appointment #${reminder.appointmentId}`);
      console.log(`    Scheduled: ${reminderTime.toLocaleString()}`);
      console.log(`    Time until send: ${minutesUntil} minutes`);
      console.log(`    Status: ${reminder.emailStatus}\n`);
    });
    
    return reminders;
  } catch (error) {
    console.error('❌ Error checking reminders:', error);
    return [];
  }
}

async function testEmailReminder() {
  try {
    console.log('📨 Testing manual email reminder...');
    
    const response = await fetch(`${baseUrl}/api/admin/reminders/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        appointmentId: 4, // Sarah Johnson's appointment
        reminderType: '24_hours' 
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Manual reminder sent successfully:', result.message);
    } else {
      const error = await response.json();
      console.log('❌ Failed to send manual reminder:', error.message);
    }
  } catch (error) {
    console.error('❌ Error sending manual reminder:', error);
  }
}

async function demonstrateReminderSystem() {
  console.log('🚀 HandyTech Solutions - Appointment Reminder System Demo');
  console.log('========================================================\n');
  
  // Step 1: Create reminders for existing appointments
  const appointmentCount = await createRemindersForExistingAppointments();
  
  if (appointmentCount === 0) {
    console.log('⚠️  No future appointments found to create reminders for.');
    return;
  }
  
  // Step 2: Check pending reminders
  await checkPendingReminders();
  
  // Step 3: Test manual email sending
  await testEmailReminder();
  
  // Step 4: Final status
  console.log('\n✅ Reminder System Demo Complete!');
  console.log('----------------------------------');
  console.log('🔔 Automatic reminders are created for each appointment');
  console.log('📧 Emails are sent 24 hours, 2 hours, and 30 minutes before appointments');
  console.log('🖥️  Admin dashboard provides full control and monitoring');
  console.log('⚙️  Background processing runs every 5 minutes automatically');
  console.log('💡 Uses Brevo API for professional email delivery');
}

// Run the demo
demonstrateReminderSystem().catch(console.error);