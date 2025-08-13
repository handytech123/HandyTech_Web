import { storage } from './storage.js';
import { emailService } from './email-service.js';
import { type Appointment, type InsertAppointmentReminder } from '@shared/schema';

export class AppointmentReminderService {
  
  // Create reminders when a new appointment is scheduled
  async createRemindersForAppointment(appointment: Appointment): Promise<void> {
    try {
      const appointmentDateTime = new Date(appointment.appointmentDate);
      
      // Create 24-hour reminder
      const reminder24h: InsertAppointmentReminder = {
        appointmentId: appointment.id,
        reminderType: '24_hours',
        reminderTime: new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000), // 24 hours before
        emailStatus: 'pending',
        emailContent: null
      };

      // Create 2-hour reminder
      const reminder2h: InsertAppointmentReminder = {
        appointmentId: appointment.id,
        reminderType: '2_hours',
        reminderTime: new Date(appointmentDateTime.getTime() - 2 * 60 * 60 * 1000), // 2 hours before
        emailStatus: 'pending',
        emailContent: null
      };

      // Create 30-minute reminder
      const reminder30m: InsertAppointmentReminder = {
        appointmentId: appointment.id,
        reminderType: '30_minutes',
        reminderTime: new Date(appointmentDateTime.getTime() - 30 * 60 * 1000), // 30 minutes before
        emailStatus: 'pending',
        emailContent: null
      };

      // Only create reminders for future times
      const now = new Date();
      
      if (reminder24h.reminderTime > now) {
        await storage.createAppointmentReminder(reminder24h);
      }
      
      if (reminder2h.reminderTime > now) {
        await storage.createAppointmentReminder(reminder2h);
      }
      
      if (reminder30m.reminderTime > now) {
        await storage.createAppointmentReminder(reminder30m);
      }

      console.log(`Created reminders for appointment ${appointment.id}`);
    } catch (error) {
      console.error('Error creating appointment reminders:', error);
    }
  }

  // Process pending reminders (to be called periodically)
  async processPendingReminders(): Promise<void> {
    try {
      const pendingReminders = await storage.getPendingReminders();
      
      for (const reminder of pendingReminders) {
        await this.sendReminderEmail(reminder);
      }
      
      if (pendingReminders.length > 0) {
        console.log(`Processed ${pendingReminders.length} pending reminders`);
      }
    } catch (error) {
      console.error('Error processing pending reminders:', error);
    }
  }

  private async sendReminderEmail(reminder: any): Promise<void> {
    try {
      // Get the appointment details
      const appointment = await storage.getAppointment(reminder.appointmentId);
      
      if (!appointment) {
        console.error(`Appointment ${reminder.appointmentId} not found for reminder ${reminder.id}`);
        await storage.markReminderSent(reminder.id, 'failed', 'Appointment not found');
        return;
      }

      // Skip if appointment is cancelled
      if (appointment.status === 'cancelled') {
        await storage.markReminderSent(reminder.id, 'skipped', 'Appointment cancelled');
        return;
      }

      // Generate email content
      const { subject, htmlContent } = emailService.generateReminderEmail(appointment, reminder.reminderType);
      
      // Send email
      const result = await emailService.sendEmail({
        to: appointment.email,
        subject,
        htmlContent
      });

      if (result.messageId) {
        await storage.markReminderSent(reminder.id, 'sent', htmlContent);
        console.log(`Sent ${reminder.reminderType} reminder for appointment ${appointment.id} to ${appointment.email}`);
      } else {
        await storage.markReminderSent(reminder.id, 'failed', result.error || 'Unknown error');
        console.error(`Failed to send reminder for appointment ${appointment.id}:`, result.error);
      }
    } catch (error) {
      console.error('Error sending reminder email:', error);
      await storage.markReminderSent(reminder.id, 'failed', (error as any)?.message || 'Unknown error');
    }
  }

  // Clean up reminders for cancelled appointments
  async cleanupReminders(appointmentId: number): Promise<void> {
    try {
      await storage.deleteAppointmentReminders(appointmentId);
      console.log(`Cleaned up reminders for appointment ${appointmentId}`);
    } catch (error) {
      console.error('Error cleaning up reminders:', error);
    }
  }

  // Manual trigger to send a specific reminder type now (for testing)
  async sendManualReminder(appointmentId: number, reminderType: string): Promise<boolean> {
    try {
      const appointment = await storage.getAppointment(appointmentId);
      
      if (!appointment) {
        console.error(`Appointment ${appointmentId} not found`);
        return false;
      }

      const { subject, htmlContent } = emailService.generateReminderEmail(appointment, reminderType);
      
      const result = await emailService.sendEmail({
        to: appointment.email,
        subject,
        htmlContent
      });

      if (result.messageId) {
        console.log(`Manual reminder sent for appointment ${appointmentId}`);
        return true;
      } else {
        console.error(`Failed to send manual reminder:`, result.error);
        return false;
      }
    } catch (error) {
      console.error('Error sending manual reminder:', error);
      return false;
    }
  }
}

export const reminderService = new AppointmentReminderService();