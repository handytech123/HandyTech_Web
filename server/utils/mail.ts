import nodemailer from 'nodemailer';
import type { Appointment } from '../../shared/schema.js';

interface EmailAttachment {
  filename: string;
  content: string;
  contentType: string;
}

interface AppointmentEmailData {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  serviceType: string;
  appointmentDate: Date;
  appointmentTime: string;
  startTimestamptz: Date | null;
  endTimestamptz: Date | null;
  notes: string | null;
  sequence: number;
}

export class EmailService {
  private transporter!: nodemailer.Transporter;
  private fromEmail: string;
  private adminEmail: string;
  private businessName: string;
  private businessPhone: string;
  private baseUrl: string;
  private isConfigured: boolean = false;

  constructor() {
    this.fromEmail = process.env.FROM_EMAIL || 'service@handytech-solutions.com';
    this.adminEmail = process.env.ADMIN_EMAIL || 'admin@handytech-solutions.com';
    this.businessName = process.env.BUSINESS_NAME || 'HandyTech Solutions';
    this.businessPhone = process.env.BUSINESS_PHONE || '(314) 325-4575';
    this.baseUrl = process.env.PUBLIC_BASE_URL || 'https://handytech-solutions.com';

    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.log('SMTP configuration not complete - emails will be skipped');
      console.log('Missing:', {
        host: !smtpHost,
        user: !smtpUser,
        password: !smtpPass
      });
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // true for 465 (SMTPS), false for other ports (STARTTLS)
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        requireTLS: true, // Require TLS encryption
        connectionTimeout: 60000, // 60 seconds
        greetingTimeout: 30000, // 30 seconds
        socketTimeout: 60000 // 60 seconds
      });

      this.isConfigured = true;
      console.log('Email service initialized successfully with secure SMTP');
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      this.isConfigured = false;
    }
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private formatTime(timeString: string): string {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  private formatDateTime(date: Date): string {
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    });
  }

  private generateIcsContent(appointment: AppointmentEmailData, method: 'REQUEST' | 'CANCEL' = 'REQUEST'): string {
    const now = new Date();
    const startDate = appointment.startTimestamptz || new Date(`${appointment.appointmentDate.toISOString().split('T')[0]}T${appointment.appointmentTime}:00`);
    const endDate = appointment.endTimestamptz || new Date(startDate.getTime() + (2 * 60 * 60 * 1000)); // Default 2 hours

    // Format dates for ICS (YYYYMMDDTHHMMSSZ) - keep proper UTC format with Z suffix
    const formatIcsDateUTC = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const uid = `appointment-${appointment.id}@handytech-solutions.com`;
    const dtstamp = formatIcsDateUTC(now);
    const dtstart = formatIcsDateUTC(startDate);
    const dtend = formatIcsDateUTC(endDate);

    // Use proper UTC format without VTIMEZONE - simpler and more reliable
    // Calendar clients will convert UTC times to user's local timezone automatically
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//HandyTech Solutions//EN',
      'METHOD:' + method,
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtstart}`, // Use proper UTC time with Z suffix
      `DTEND:${dtend}`,     // Use proper UTC time with Z suffix
      `SUMMARY:${this.businessName} - ${appointment.serviceType}`,
      `DESCRIPTION:Service: ${appointment.serviceType}\\nCustomer: ${appointment.firstName} ${appointment.lastName}\\nPhone: ${appointment.phone || 'N/A'}\\nEmail: ${appointment.email}${appointment.notes ? `\\nNotes: ${appointment.notes}` : ''}`,
      `LOCATION:Customer Location`,
      `ORGANIZER;CN=${this.businessName}:mailto:${this.fromEmail}`,
      `ATTENDEE;CN=${appointment.firstName} ${appointment.lastName};RSVP=TRUE:mailto:${appointment.email}`,
      `SEQUENCE:${appointment.sequence || 0}`,
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    return icsContent;
  }

  private createIcsAttachment(appointment: AppointmentEmailData, method: 'REQUEST' | 'CANCEL' = 'REQUEST'): EmailAttachment {
    const icsContent = this.generateIcsContent(appointment, method);
    return {
      filename: 'appointment.ics',
      content: icsContent,
      contentType: `text/calendar; charset=utf-8; method=${method}; name=appointment.ics`
    };
  }

  private getEmailTemplate(content: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background-color: #BB0000; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">${this.businessName}</h1>
          <p style="margin: 5px 0 0 0; font-size: 16px;">Missouri's Trusted Handyman Service</p>
        </div>
        
        <div style="padding: 30px 20px; background-color: #f9f9f9;">
          ${content}
        </div>
        
        <div style="background-color: #333333; color: #ffffff; padding: 20px; text-align: center; font-size: 14px;">
          <p style="margin: 0 0 10px 0;"><strong>${this.businessName}</strong></p>
          <p style="margin: 0 0 5px 0;">Phone: ${this.businessPhone}</p>
          <p style="margin: 0;">Email: ${this.fromEmail}</p>
        </div>
      </div>
    `;
  }

  async sendAppointmentConfirmation(appointment: Appointment, rescheduleToken: string): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('Email service not configured, skipping appointment confirmation');
      return false;
    }

    try {
      const appointmentData: AppointmentEmailData = {
        id: appointment.id,
        firstName: appointment.firstName,
        lastName: appointment.lastName,
        email: appointment.email,
        phone: appointment.phone,
        serviceType: appointment.serviceType,
        appointmentDate: new Date(appointment.appointmentDate),
        appointmentTime: appointment.appointmentTime,
        startTimestamptz: appointment.startTimestamptz,
        endTimestamptz: appointment.endTimestamptz,
        notes: appointment.notes,
        sequence: appointment.sequence || 0
      };

      const formattedDate = this.formatDate(appointmentData.appointmentDate);
      const formattedTime = this.formatTime(appointmentData.appointmentTime);
      const rescheduleUrl = `${this.baseUrl}/reschedule/${rescheduleToken}`;

      const subject = `${this.businessName}: ${appointmentData.serviceType} — ${formattedDate} at ${formattedTime}`;

      const content = `
        <h2 style="color: #BB0000; margin-bottom: 20px;">Appointment Confirmed!</h2>
        
        <p>Dear ${appointmentData.firstName},</p>
        
        <p>Your appointment has been successfully scheduled! Here are the details:</p>
        
        <div style="background-color: white; padding: 20px; border-left: 4px solid #BB0000; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0 0 10px 0;"><strong>Date:</strong> ${formattedDate}</p>
          <p style="margin: 0 0 10px 0;"><strong>Time:</strong> ${formattedTime}</p>
          <p style="margin: 0 0 10px 0;"><strong>Service:</strong> ${appointmentData.serviceType}</p>
          ${appointmentData.notes ? `<p style="margin: 0;"><strong>Notes:</strong> ${appointmentData.notes}</p>` : ''}
        </div>
        
        <p>A calendar invite has been attached to this email for your convenience.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${rescheduleUrl}" style="background-color: #BB0000; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reschedule Appointment</a>
        </div>
        
        <p>Our technician will arrive within a 30-minute window of your scheduled time. We'll send you reminder emails as your appointment approaches.</p>
        
        <p><strong>To cancel:</strong> Please call us at ${this.businessPhone}</p>
        
        <p>Thank you for choosing ${this.businessName}!</p>
        
        <p>Best regards,<br>
        The ${this.businessName} Team</p>
      `;

      const htmlContent = this.getEmailTemplate(content);
      const icsAttachment = this.createIcsAttachment(appointmentData, 'REQUEST');

      const mailOptions = {
        from: `"${this.businessName}" <${this.fromEmail}>`,
        to: appointmentData.email,
        subject: subject,
        html: htmlContent,
        attachments: [{
          filename: icsAttachment.filename,
          content: icsAttachment.content,
          contentType: icsAttachment.contentType
        }]
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Appointment confirmation email sent to ${appointmentData.email}`);
      return true;
    } catch (error) {
      console.error('Failed to send appointment confirmation email:', error);
      return false;
    }
  }

  async sendRescheduleConfirmation(appointment: Appointment, oldStart: Date, oldEnd: Date): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('Email service not configured, skipping reschedule confirmation');
      return false;
    }

    try {
      const appointmentData: AppointmentEmailData = {
        id: appointment.id,
        firstName: appointment.firstName,
        lastName: appointment.lastName,
        email: appointment.email,
        phone: appointment.phone,
        serviceType: appointment.serviceType,
        appointmentDate: new Date(appointment.appointmentDate),
        appointmentTime: appointment.appointmentTime,
        startTimestamptz: appointment.startTimestamptz,
        endTimestamptz: appointment.endTimestamptz,
        notes: appointment.notes,
        sequence: (appointment.sequence || 0) + 1 // Increment sequence for calendar update
      };

      const newFormattedDate = this.formatDate(appointmentData.appointmentDate);
      const newFormattedTime = this.formatTime(appointmentData.appointmentTime);
      const oldFormattedDateTime = this.formatDateTime(oldStart);

      const subject = `${this.businessName}: Appointment Rescheduled — ${newFormattedDate} at ${newFormattedTime}`;

      const content = `
        <h2 style="color: #BB0000; margin-bottom: 20px;">Appointment Rescheduled</h2>
        
        <p>Dear ${appointmentData.firstName},</p>
        
        <p>Your appointment has been successfully rescheduled. Here are your updated details:</p>
        
        <div style="background-color: white; padding: 20px; border-left: 4px solid #BB0000; margin: 20px 0; border-radius: 5px;">
          <h3 style="color: #BB0000; margin-top: 0;">New Appointment Details</h3>
          <p style="margin: 0 0 10px 0;"><strong>Date:</strong> ${newFormattedDate}</p>
          <p style="margin: 0 0 10px 0;"><strong>Time:</strong> ${newFormattedTime}</p>
          <p style="margin: 0 0 10px 0;"><strong>Service:</strong> ${appointmentData.serviceType}</p>
          ${appointmentData.notes ? `<p style="margin: 0;"><strong>Notes:</strong> ${appointmentData.notes}</p>` : ''}
        </div>
        
        <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #666;"><strong>Previous appointment:</strong> ${oldFormattedDateTime}</p>
        </div>
        
        <p>An updated calendar invite has been attached to this email. Your calendar should automatically update with the new time.</p>
        
        <p>Need to reschedule again? You can use the same reschedule link from your original confirmation email, or call us at ${this.businessPhone}.</p>
        
        <p>Thank you for choosing ${this.businessName}!</p>
        
        <p>Best regards,<br>
        The ${this.businessName} Team</p>
      `;

      const htmlContent = this.getEmailTemplate(content);
      const icsAttachment = this.createIcsAttachment(appointmentData, 'REQUEST');

      const mailOptions = {
        from: `"${this.businessName}" <${this.fromEmail}>`,
        to: appointmentData.email,
        subject: subject,
        html: htmlContent,
        attachments: [{
          filename: icsAttachment.filename,
          content: icsAttachment.content,
          contentType: icsAttachment.contentType
        }]
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Reschedule confirmation email sent to ${appointmentData.email}`);
      return true;
    } catch (error) {
      console.error('Failed to send reschedule confirmation email:', error);
      return false;
    }
  }

  async sendAdminNotification(appointment: Appointment): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('Email service not configured, skipping admin notification');
      return false;
    }

    try {
      const appointmentData: AppointmentEmailData = {
        id: appointment.id,
        firstName: appointment.firstName,
        lastName: appointment.lastName,
        email: appointment.email,
        phone: appointment.phone,
        serviceType: appointment.serviceType,
        appointmentDate: new Date(appointment.appointmentDate),
        appointmentTime: appointment.appointmentTime,
        startTimestamptz: appointment.startTimestamptz,
        endTimestamptz: appointment.endTimestamptz,
        notes: appointment.notes,
        sequence: appointment.sequence || 0
      };

      const formattedDate = this.formatDate(appointmentData.appointmentDate);
      const formattedTime = this.formatTime(appointmentData.appointmentTime);

      const subject = `New Appointment: ${appointmentData.serviceType} — ${formattedDate} at ${formattedTime}`;

      const content = `
        <h2 style="color: #BB0000; margin-bottom: 20px;">New Appointment Scheduled</h2>
        
        <p>A new appointment has been scheduled and requires your attention.</p>
        
        <div style="background-color: white; padding: 20px; border-left: 4px solid #BB0000; margin: 20px 0; border-radius: 5px;">
          <h3 style="color: #BB0000; margin-top: 0;">Appointment Details</h3>
          <p style="margin: 0 0 10px 0;"><strong>Appointment ID:</strong> ${appointmentData.id}</p>
          <p style="margin: 0 0 10px 0;"><strong>Date:</strong> ${formattedDate}</p>
          <p style="margin: 0 0 10px 0;"><strong>Time:</strong> ${formattedTime}</p>
          <p style="margin: 0 0 10px 0;"><strong>Service:</strong> ${appointmentData.serviceType}</p>
          <p style="margin: 0 0 10px 0;"><strong>Source:</strong> ${appointment.source || 'manual'}</p>
          ${appointment.calendlyEventId ? `<p style="margin: 0 0 10px 0;"><strong>Calendly Event ID:</strong> ${appointment.calendlyEventId}</p>` : ''}
        </div>
        
        <div style="background-color: white; padding: 20px; border-left: 4px solid #007700; margin: 20px 0; border-radius: 5px;">
          <h3 style="color: #007700; margin-top: 0;">Customer Information</h3>
          <p style="margin: 0 0 10px 0;"><strong>Name:</strong> ${appointmentData.firstName} ${appointmentData.lastName}</p>
          <p style="margin: 0 0 10px 0;"><strong>Email:</strong> <a href="mailto:${appointmentData.email}">${appointmentData.email}</a></p>
          <p style="margin: 0 0 10px 0;"><strong>Phone:</strong> ${appointmentData.phone ? `<a href="tel:${appointmentData.phone}">${appointmentData.phone}</a>` : 'Not provided'}</p>
          ${appointmentData.notes ? `<p style="margin: 0;"><strong>Notes:</strong> ${appointmentData.notes}</p>` : ''}
        </div>
        
        <p>A calendar invite has been attached for easy scheduling. Please add this appointment to your calendar and prepare for the scheduled service.</p>
        
        <p>You can contact the customer directly using the information provided above.</p>
      `;

      const htmlContent = this.getEmailTemplate(content);
      const icsAttachment = this.createIcsAttachment(appointmentData, 'REQUEST');

      const mailOptions = {
        from: `"${this.businessName}" <${this.fromEmail}>`,
        to: this.adminEmail,
        subject: subject,
        html: htmlContent,
        attachments: [{
          filename: icsAttachment.filename,
          content: icsAttachment.content,
          contentType: icsAttachment.contentType
        }]
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Admin notification email sent to ${this.adminEmail}`);
      return true;
    } catch (error) {
      console.error('Failed to send admin notification email:', error);
      return false;
    }
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('Email service not configured');
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('Email service connection verified');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}

// Export a singleton instance
export const emailService = new EmailService();