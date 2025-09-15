import { storage } from './storage';
import { EmailService } from './utils/mail';
import type { Appointment } from '../shared/schema';

export class ReminderScheduler {
  private emailService: EmailService;
  private isRunning: boolean = false;
  private intervalId?: NodeJS.Timeout;

  constructor() {
    this.emailService = new EmailService();
  }

  // FIXED: Robust appointment date/time parser that handles multiple formats
  private parseAppointmentDateTime(appointment: Appointment): Date | null {
    try {
      // Prefer startTimestamptz if available (most reliable)
      if (appointment.startTimestamptz) {
        return new Date(appointment.startTimestamptz);
      }

      // Extract appointment date
      const appointmentDateStr = appointment.appointmentDate instanceof Date 
        ? appointment.appointmentDate.toISOString().split('T')[0] 
        : String(appointment.appointmentDate).split('T')[0];
      
      // Parse appointment time - handle both 24-hour (HH:MM) and 12-hour (H:MM AM/PM) formats
      const timeStr = appointment.appointmentTime.trim();
      
      // Check if it's 12-hour format (contains AM/PM)
      if (/\s*(AM|PM)\s*$/i.test(timeStr)) {
        // 12-hour format: "10:00 AM" or "2:30 PM"
        const [timePart, meridiem] = timeStr.split(/\s+/);
        const [hours, minutes] = timePart.split(':');
        let hour24 = parseInt(hours, 10);
        const min = parseInt(minutes || '0', 10);
        
        if (meridiem.toUpperCase() === 'PM' && hour24 !== 12) {
          hour24 += 12;
        } else if (meridiem.toUpperCase() === 'AM' && hour24 === 12) {
          hour24 = 0;
        }
        
        // Create date with converted 24-hour format
        const appointmentDateTime = new Date(`${appointmentDateStr}T${hour24.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00`);
        return appointmentDateTime;
      } else if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
        // 24-hour format: "10:00" or "14:30"
        const appointmentDateTime = new Date(`${appointmentDateStr}T${timeStr}:00`);
        return appointmentDateTime;
      } else {
        console.error(`Invalid time format for appointment ${appointment.id}: "${timeStr}"`);
        return null;
      }
      
    } catch (error) {
      console.error(`Failed to parse appointment date/time for appointment ${appointment.id}:`, error);
      return null;
    }
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
        // FIXED: Use robust date/time parsing that handles multiple formats
        const appointmentDateTime = this.parseAppointmentDateTime(appointment);
        
        if (!appointmentDateTime) {
          console.error(`Failed to parse appointment date/time for appointment ${appointment.id} - skipping reminder checks`);
          continue;
        }
        
        const timeDiff = appointmentDateTime.getTime() - now.getTime();
        const hoursUntilAppointment = timeDiff / (1000 * 60 * 60);
        
        console.log(`Appointment ${appointment.id}: ${hoursUntilAppointment.toFixed(1)} hours until appointment`);
        
        // FIXED: 24-hour reminder (send between 23.5 and 24.5 hours before)
        // Only send if appointment is still scheduled and reminder hasn't been sent
        if (hoursUntilAppointment >= 23.5 && hoursUntilAppointment <= 24.5 && 
            appointment.status === 'scheduled' && 
            !appointment.reminder24hSent) {
          console.log(`Sending 24-hour reminder for appointment ${appointment.id}`);
          const emailSent = await this.send24HourReminder(appointment);
          
          // FIXED: Only mark as sent if email was successfully delivered
          if (emailSent) {
            await storage.markReminder24hSent(appointment.id);
            console.log(`24-hour reminder marked as sent for appointment ${appointment.id}`);
          } else {
            console.warn(`24-hour reminder email failed for appointment ${appointment.id} - will retry next cycle`);
          }
        }
        
        // FIXED: 2-hour reminder (send between 1.5 and 2.5 hours before)
        // Only send if appointment is still scheduled and reminder hasn't been sent
        else if (hoursUntilAppointment >= 1.5 && hoursUntilAppointment <= 2.5 && 
                 appointment.status === 'scheduled' && 
                 !appointment.reminder2hSent) {
          console.log(`Sending 2-hour reminder for appointment ${appointment.id}`);
          const emailSent = await this.send2HourReminder(appointment);
          
          // FIXED: Only mark as sent if email was successfully delivered
          if (emailSent) {
            await storage.markReminder2hSent(appointment.id);
            console.log(`2-hour reminder marked as sent for appointment ${appointment.id}`);
          } else {
            console.warn(`2-hour reminder email failed for appointment ${appointment.id} - will retry next cycle`);
          }
        }
        
        // FIXED: Follow-up email (send 24 hours after appointment)
        // Send for completed or cancelled appointments that haven't had follow-up sent
        else if (hoursUntilAppointment <= -23.5 && hoursUntilAppointment >= -24.5 && 
                 ['completed', 'cancelled'].includes(appointment.status) && 
                 !appointment.followUpSent) {
          console.log(`Sending follow-up email for appointment ${appointment.id}`);
          const emailSent = await this.sendFollowUpEmail(appointment);
          
          // FIXED: Only mark as sent if email was successfully delivered
          if (emailSent) {
            await storage.markFollowUpSent(appointment.id);
            console.log(`Follow-up email marked as sent for appointment ${appointment.id}`);
          } else {
            console.warn(`Follow-up email failed for appointment ${appointment.id} - will retry next cycle`);
          }
        }
      }
    } catch (error) {
      console.error('Error in reminder scheduler:', error);
    }
  }

  private async send24HourReminder(appointment: Appointment): Promise<boolean> {
    try {
      // Get customer information
      const customer = await storage.getCustomerByEmail(appointment.email);
      const customerName = customer ? `${customer.firstName} ${customer.lastName}` : `${appointment.firstName} ${appointment.lastName}`;

      // FIXED: Return boolean success status from email service
      const emailSent = await this.emailService.send24HourReminder({
        customerName,
        customerEmail: appointment.email,
        appointmentDate: new Date(appointment.appointmentDate).toDateString(),
        appointmentTime: appointment.appointmentTime,
        serviceType: appointment.serviceType,
        description: appointment.notes || undefined
      });

      if (emailSent) {
        console.log(`24-hour reminder successfully sent for appointment ${appointment.id}`);
      }
      
      return emailSent;
    } catch (error) {
      console.error(`Failed to send 24-hour reminder for appointment ${appointment.id}:`, error);
      return false;
    }
  }

  private async send2HourReminder(appointment: Appointment): Promise<boolean> {
    try {
      // Get customer information
      const customer = await storage.getCustomerByEmail(appointment.email);
      const customerName = customer ? `${customer.firstName} ${customer.lastName}` : `${appointment.firstName} ${appointment.lastName}`;

      // FIXED: Return boolean success status from email service
      const emailSent = await this.emailService.send2HourReminder({
        customerName,
        customerEmail: appointment.email,
        appointmentDate: new Date(appointment.appointmentDate).toDateString(),
        appointmentTime: appointment.appointmentTime,
        serviceType: appointment.serviceType,
        description: appointment.notes || undefined
      });

      if (emailSent) {
        console.log(`2-hour reminder successfully sent for appointment ${appointment.id}`);
      }
      
      return emailSent;
    } catch (error) {
      console.error(`Failed to send 2-hour reminder for appointment ${appointment.id}:`, error);
      return false;
    }
  }

  private async sendFollowUpEmail(appointment: Appointment): Promise<boolean> {
    try {
      // Get customer information
      const customer = await storage.getCustomerByEmail(appointment.email);
      const customerName = customer ? `${customer.firstName} ${customer.lastName}` : `${appointment.firstName} ${appointment.lastName}`;

      // FIXED: Return boolean success status from email service
      const emailSent = await this.emailService.sendFollowUpEmail({
        customerName,
        customerEmail: appointment.email,
        appointmentDate: new Date(appointment.appointmentDate).toDateString(),
        appointmentTime: appointment.appointmentTime,
        serviceType: appointment.serviceType,
        description: appointment.notes || undefined
      });

      if (emailSent) {
        console.log(`Follow-up email successfully sent for appointment ${appointment.id}`);
      }
      
      return emailSent;
    } catch (error) {
      console.error(`Failed to send follow-up email for appointment ${appointment.id}:`, error);
      return false;
    }
  }
}

// Create and export a singleton instance
export const reminderScheduler = new ReminderScheduler();