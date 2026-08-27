import { storage } from './storage';
import { EmailService } from './utils/mail';
import type { Appointment } from '../shared/schema';
import { smsService } from './utils/sms-service';
import { createEvent, findEventByAppointmentId } from './utils/google.js';

export class ReminderScheduler {
  private emailService: EmailService;
  private isRunning: boolean = false;
  private intervalId?: NodeJS.Timeout;
  private checkInProgress = false;

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
    if (this.checkInProgress) {
      console.log('Reminder and calendar recovery check is already running');
      return;
    }
    this.checkInProgress = true;
    try {
      console.log('Checking for appointment reminders...');
      
      const now = new Date();
      const appointments = await storage.getAllAppointments();
      const [reviews, emailCampaigns] = await Promise.all([
        storage.getAllReviews(),
        storage.getAllEmailCampaigns(),
      ]);
      const reviewedCustomerIds = new Set(reviews.map((review) => review.customerId));
      const reviewRequestedCustomerIds = new Set(
        appointments
          .filter((appointment) => appointment.status === 'completed' && appointment.followUpSent && appointment.customerId)
          .map((appointment) => appointment.customerId as number)
      );
      for (const campaign of emailCampaigns) {
        if (campaign.campaignType === 'review_request') reviewRequestedCustomerIds.add(campaign.customerId);
      }
      
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
        
        const isActiveAppointment = ['scheduled', 'confirmed'].includes(appointment.status);

        // Recover calendar synchronization after a temporary Google outage or
        // authorization lapse. The private appointment property lets us find an
        // event created just before a database update failed, preventing duplicates.
        if (hoursUntilAppointment > 0 &&
            ['scheduled', 'confirmed', 'in-progress'].includes(appointment.status) &&
            !appointment.googleEventId) {
          try {
            const street = appointment.street && appointment.street !== "Not provided"
              ? appointment.street
              : appointment.address && appointment.address !== "Not provided" ? appointment.address : "";
            const city = appointment.city && appointment.city !== "Not provided" ? appointment.city : "";
            const state = appointment.state && appointment.state !== "Not provided" ? appointment.state : "";
            const zip = appointment.zip && appointment.zip !== "Not provided" ? appointment.zip : "";
            const serviceAddress = [street, [city, [state, zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")]
              .filter(Boolean).join(", ");
            const existingEvent = await findEventByAppointmentId(appointment.id);
            const event = existingEvent || await createEvent({
              summary: `${appointment.bookingType === "consultation" ? "CONSULTATION" : "SERVICE"} — ${appointment.firstName} ${appointment.lastName} — ${appointment.serviceType}`,
              description: [
                `Customer: ${appointment.firstName} ${appointment.lastName}`,
                appointment.phone ? `Phone: ${appointment.phone}` : null,
                appointment.email ? `Email: ${appointment.email}` : null,
                serviceAddress ? `Service address: ${serviceAddress}` : null,
                appointment.notes ? `Notes: ${appointment.notes}` : null,
                `HandyTech appointment ID: ${appointment.id}`,
              ].filter(Boolean).join('\n'),
              location: serviceAddress || undefined,
              start: appointmentDateTime,
              end: appointment.endTimestamptz
                ? new Date(appointment.endTimestamptz)
                : new Date(appointmentDateTime.getTime() + 60 * 60 * 1000),
              attendees: [],
              appointmentId: appointment.id,
            });
            if (event.id) {
              await storage.updateAppointmentGoogleEventId(appointment.id, event.id);
              console.log(`Google Calendar recovery synced appointment ${appointment.id}`);
            }
          } catch (calendarError) {
            console.warn(`Google Calendar recovery deferred for appointment ${appointment.id}:`, calendarError instanceof Error ? calendarError.message : calendarError);
          }
        }

        // Send once during the 24-to-2-hour window. This catches up safely if the
        // server was restarting at the exact 24-hour mark.
        if (hoursUntilAppointment > 2 && hoursUntilAppointment <= 24 &&
            isActiveAppointment &&
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
        
        // Send once during the final two hours before the appointment.
        else if (hoursUntilAppointment > 0 && hoursUntilAppointment <= 2 &&
                 isActiveAppointment &&
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
        
        // Follow up only after completed work. Cancelled/no-show appointments must
        // never receive the same review request as a completed customer.
        else if (hoursUntilAppointment <= -24 &&
                 appointment.status === 'completed' &&
                 (!appointment.customerId || (!reviewedCustomerIds.has(appointment.customerId) && !reviewRequestedCustomerIds.has(appointment.customerId))) &&
                 !appointment.followUpSent) {
          console.log(`Sending follow-up email for appointment ${appointment.id}`);
          const emailSent = await this.sendFollowUpEmail(appointment);
          
          // FIXED: Only mark as sent if email was successfully delivered
          if (emailSent) {
            await storage.markFollowUpSent(appointment.id);
            if (appointment.customerId) reviewRequestedCustomerIds.add(appointment.customerId);
            console.log(`Follow-up email marked as sent for appointment ${appointment.id}`);
          } else {
            console.warn(`Follow-up email failed for appointment ${appointment.id} - will retry next cycle`);
          }
        }
      }
    } catch (error) {
      console.error('Error in reminder scheduler:', error);
    } finally {
      this.checkInProgress = false;
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
        if (appointment.smsConsent && appointment.phone) {
          await smsService.sendAppointmentReminder(
            appointment.phone,
            new Date(appointment.appointmentDate).toLocaleDateString('en-US', { timeZone: 'America/Chicago' }),
            appointment.appointmentTime
          );
        }
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
        if (appointment.smsConsent && appointment.phone) {
          await smsService.sendAppointmentReminder(
            appointment.phone,
            new Date(appointment.appointmentDate).toLocaleDateString('en-US', { timeZone: 'America/Chicago' }),
            appointment.appointmentTime
          );
        }
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
