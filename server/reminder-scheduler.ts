import { storage } from './storage';
import { BrevoEmailService } from './brevo-service';

export class ReminderScheduler {
  private emailService: BrevoEmailService;
  private isRunning: boolean = false;
  private intervalId?: NodeJS.Timeout;

  constructor() {
    this.emailService = new BrevoEmailService();
  }

  start() {
    if (this.isRunning) {
      console.log('Reminder scheduler is already running');
      return;
    }

    console.log('Starting appointment reminder scheduler...');
    this.isRunning = true;
    
    // Check for reminders every 15 minutes
    this.intervalId = setInterval(() => {
      this.checkAndSendReminders();
    }, 15 * 60 * 1000); // 15 minutes

    // Run initial check
    this.checkAndSendReminders();
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping appointment reminder scheduler...');
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private async checkAndSendReminders() {
    try {
      console.log('Checking for appointment reminders...');
      
      const now = new Date();
      const appointments = await storage.getAllAppointments();
      
      for (const appointment of appointments) {
        // Skip if appointment is not scheduled
        if (appointment.status !== 'scheduled') {
          continue;
        }

        const appointmentDateTime = new Date(`${appointment.preferredDate}T${appointment.preferredTime}`);
        const timeDiff = appointmentDateTime.getTime() - now.getTime();
        
        // Convert to hours
        const hoursUntilAppointment = timeDiff / (1000 * 60 * 60);
        
        // 24-hour reminder (send between 23.5 and 24.5 hours before)
        if (hoursUntilAppointment >= 23.5 && hoursUntilAppointment <= 24.5) {
          console.log(`Sending 24-hour reminder for appointment ${appointment.id}`);
          await this.send24HourReminder(appointment);
        }
        
        // 2-hour reminder (send between 1.5 and 2.5 hours before)
        else if (hoursUntilAppointment >= 1.5 && hoursUntilAppointment <= 2.5) {
          console.log(`Sending 2-hour reminder for appointment ${appointment.id}`);
          await this.send2HourReminder(appointment);
        }
        
        // Follow-up email (send 24 hours after appointment)
        else if (hoursUntilAppointment <= -23.5 && hoursUntilAppointment >= -24.5 && appointment.status === 'completed') {
          console.log(`Sending follow-up email for appointment ${appointment.id}`);
          await this.sendFollowUpEmail(appointment);
        }
      }
    } catch (error) {
      console.error('Error in reminder scheduler:', error);
    }
  }

  private async send24HourReminder(appointment: any) {
    try {
      // Get customer information
      const customer = await storage.getCustomerByEmail(appointment.email);
      const customerName = customer ? `${customer.firstName} ${customer.lastName}` : `${appointment.firstName} ${appointment.lastName}`;

      await this.emailService.send24HourReminder({
        customerName,
        customerEmail: appointment.email,
        appointmentDate: appointment.preferredDate,
        appointmentTime: appointment.preferredTime,
        serviceType: appointment.serviceType,
        description: appointment.description
      });

      console.log(`24-hour reminder sent for appointment ${appointment.id}`);
    } catch (error) {
      console.error(`Failed to send 24-hour reminder for appointment ${appointment.id}:`, error);
    }
  }

  private async send2HourReminder(appointment: any) {
    try {
      // Get customer information
      const customer = await storage.getCustomerByEmail(appointment.email);
      const customerName = customer ? `${customer.firstName} ${customer.lastName}` : `${appointment.firstName} ${appointment.lastName}`;

      await this.emailService.send2HourReminder({
        customerName,
        customerEmail: appointment.email,
        appointmentDate: appointment.preferredDate,
        appointmentTime: appointment.preferredTime,
        serviceType: appointment.serviceType,
        description: appointment.description
      });

      console.log(`2-hour reminder sent for appointment ${appointment.id}`);
    } catch (error) {
      console.error(`Failed to send 2-hour reminder for appointment ${appointment.id}:`, error);
    }
  }

  private async sendFollowUpEmail(appointment: any) {
    try {
      // Get customer information
      const customer = await storage.getCustomerByEmail(appointment.email);
      const customerName = customer ? `${customer.firstName} ${customer.lastName}` : `${appointment.firstName} ${appointment.lastName}`;

      await this.emailService.sendFollowUpEmail({
        customerName,
        customerEmail: appointment.email,
        appointmentDate: appointment.preferredDate,
        appointmentTime: appointment.preferredTime,
        serviceType: appointment.serviceType,
        description: appointment.description
      });

      console.log(`Follow-up email sent for appointment ${appointment.id}`);
    } catch (error) {
      console.error(`Failed to send follow-up email for appointment ${appointment.id}:`, error);
    }
  }
}

// Create and export a singleton instance
export const reminderScheduler = new ReminderScheduler();