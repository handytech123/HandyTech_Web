import nodemailer from 'nodemailer';
import type { Appointment } from '../../shared/schema.js';
import { getServiceById, type Service } from './services.js';

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
  // Enhanced service details
  serviceName: string | null;
  serviceDescription: string | null;
  suggestedHours: number | null;
  serviceCategory: string | null;
}

interface SubscriptionCancellationEmailData {
  to: string;
  customerName: string;
  planType: string;
  cancellationType: 'immediate' | 'end_of_period';
  endDate: Date | null;
  cancellationReason?: string;
}

interface SubscriptionReactivationEmailData {
  to: string;
  customerName: string;
  planType: string;
  nextBillingDate: Date;
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

  private createAppointmentEmailData(appointment: Appointment): AppointmentEmailData {
    // Look up service details if serviceId is provided
    let serviceDetails: Service | null = null;
    if (appointment.serviceId) {
      try {
        serviceDetails = getServiceById(appointment.serviceId);
      } catch (error) {
        console.warn(`Failed to lookup service details for serviceId ${appointment.serviceId}:`, error);
      }
    }

    return {
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
      sequence: appointment.sequence || 0,
      // Enhanced service details from catalog
      serviceName: serviceDetails?.name || null,
      serviceDescription: serviceDetails?.description || null,
      suggestedHours: serviceDetails?.suggestedHours || null,
      serviceCategory: serviceDetails?.category || null,
    };
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

  private createEnhancedSubject(appointmentData: AppointmentEmailData, formattedDate: string, formattedTime: string, prefix: string = ''): string {
    const serviceName = appointmentData.serviceName || appointmentData.serviceType;
    const durationText = appointmentData.suggestedHours ? ` (${appointmentData.suggestedHours}h)` : '';
    
    return `${prefix}${this.businessName}: ${serviceName} — ${formattedDate} at ${formattedTime}${durationText}`;
  }

  private getServiceDetailsHtml(appointmentData: AppointmentEmailData): string {
    const serviceName = appointmentData.serviceName || appointmentData.serviceType;
    
    let serviceHtml = `<p style="margin: 0 0 10px 0;"><strong>Service:</strong> ${serviceName}</p>`;
    
    if (appointmentData.serviceDescription) {
      serviceHtml += `<p style="margin: 0 0 10px 0;"><strong>Details:</strong> ${appointmentData.serviceDescription}</p>`;
    }
    
    if (appointmentData.suggestedHours) {
      serviceHtml += `<p style="margin: 0 0 10px 0;"><strong>Duration:</strong> ${appointmentData.suggestedHours} hour${appointmentData.suggestedHours > 1 ? 's' : ''}</p>`;
    }
    
    return serviceHtml;
  }

  private generateIcsContent(appointment: AppointmentEmailData, method: 'REQUEST' | 'CANCEL' = 'REQUEST'): string {
    const now = new Date();
    const startDate = appointment.startTimestamptz || new Date(`${appointment.appointmentDate.toISOString().split('T')[0]}T${appointment.appointmentTime}:00`);
    
    // Calculate end date based on priority: endTimestamptz > suggestedHours > default 2 hours
    let endDate: Date;
    if (appointment.endTimestamptz) {
      endDate = appointment.endTimestamptz;
    } else if (appointment.suggestedHours && appointment.suggestedHours > 0) {
      endDate = new Date(startDate.getTime() + (appointment.suggestedHours * 60 * 60 * 1000));
    } else {
      endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000)); // Default 2 hours fallback
    }

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
      `SUMMARY:${this.businessName} - ${appointment.serviceName || appointment.serviceType}`,
      `DESCRIPTION:Service: ${appointment.serviceName || appointment.serviceType}${appointment.serviceDescription ? `\\nDetails: ${appointment.serviceDescription}` : ''}${appointment.suggestedHours ? `\\nDuration: ${appointment.suggestedHours} hour${appointment.suggestedHours > 1 ? 's' : ''}` : ''}\\nCustomer: ${appointment.firstName} ${appointment.lastName}\\nPhone: ${appointment.phone || 'N/A'}\\nEmail: ${appointment.email}${appointment.notes ? `\\nNotes: ${appointment.notes}` : ''}`,
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
      const appointmentData = this.createAppointmentEmailData(appointment);

      const formattedDate = this.formatDate(appointmentData.appointmentDate);
      const formattedTime = this.formatTime(appointmentData.appointmentTime);
      const rescheduleUrl = `${this.baseUrl}/reschedule/${rescheduleToken}`;

      const subject = this.createEnhancedSubject(appointmentData, formattedDate, formattedTime);

      const content = `
        <h2 style="color: #BB0000; margin-bottom: 20px;">Appointment Confirmed!</h2>
        
        <p>Dear ${appointmentData.firstName},</p>
        
        <p>Your appointment has been successfully scheduled! Here are the details:</p>
        
        <div style="background-color: white; padding: 20px; border-left: 4px solid #BB0000; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0 0 10px 0;"><strong>Date:</strong> ${formattedDate}</p>
          <p style="margin: 0 0 10px 0;"><strong>Time:</strong> ${formattedTime}</p>
          ${this.getServiceDetailsHtml(appointmentData)}
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
      const appointmentData = this.createAppointmentEmailData(appointment);
      appointmentData.sequence = (appointmentData.sequence || 0) + 1; // Increment sequence for calendar update

      const newFormattedDate = this.formatDate(appointmentData.appointmentDate);
      const newFormattedTime = this.formatTime(appointmentData.appointmentTime);
      const oldFormattedDateTime = this.formatDateTime(oldStart);

      const subject = this.createEnhancedSubject(appointmentData, newFormattedDate, newFormattedTime, 'Rescheduled: ');

      const content = `
        <h2 style="color: #BB0000; margin-bottom: 20px;">Appointment Rescheduled</h2>
        
        <p>Dear ${appointmentData.firstName},</p>
        
        <p>Your appointment has been successfully rescheduled. Here are your updated details:</p>
        
        <div style="background-color: white; padding: 20px; border-left: 4px solid #BB0000; margin: 20px 0; border-radius: 5px;">
          <h3 style="color: #BB0000; margin-top: 0;">New Appointment Details</h3>
          <p style="margin: 0 0 10px 0;"><strong>Date:</strong> ${newFormattedDate}</p>
          <p style="margin: 0 0 10px 0;"><strong>Time:</strong> ${newFormattedTime}</p>
          ${this.getServiceDetailsHtml(appointmentData)}
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
      const appointmentData = this.createAppointmentEmailData(appointment);

      const formattedDate = this.formatDate(appointmentData.appointmentDate);
      const formattedTime = this.formatTime(appointmentData.appointmentTime);

      const subject = this.createEnhancedSubject(appointmentData, formattedDate, formattedTime, 'New Appointment: ');

      const content = `
        <h2 style="color: #BB0000; margin-bottom: 20px;">New Appointment Scheduled</h2>
        
        <p>A new appointment has been scheduled and requires your attention.</p>
        
        <div style="background-color: white; padding: 20px; border-left: 4px solid #BB0000; margin: 20px 0; border-radius: 5px;">
          <h3 style="color: #BB0000; margin-top: 0;">Appointment Details</h3>
          <p style="margin: 0 0 10px 0;"><strong>Appointment ID:</strong> ${appointmentData.id}</p>
          <p style="margin: 0 0 10px 0;"><strong>Date:</strong> ${formattedDate}</p>
          <p style="margin: 0 0 10px 0;"><strong>Time:</strong> ${formattedTime}</p>
          ${this.getServiceDetailsHtml(appointmentData)}
          <p style="margin: 0 0 10px 0;"><strong>Source:</strong> ${appointment.source || 'manual'}</p>
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

  async sendAdminRescheduleNotification(appointment: Appointment, oldStart: Date, oldEnd: Date): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('Email service not configured, skipping admin reschedule notification');
      return false;
    }

    try {
      const appointmentData = this.createAppointmentEmailData(appointment);
      appointmentData.sequence = (appointmentData.sequence || 0) + 1; // Increment sequence for calendar update

      const newFormattedDate = this.formatDate(appointmentData.appointmentDate);
      const newFormattedTime = this.formatTime(appointmentData.appointmentTime);
      const oldFormattedDateTime = this.formatDateTime(oldStart);

      const serviceName = appointmentData.serviceName || appointmentData.serviceType;
      const subject = `RESCHEDULE ALERT: ${serviceName} — ${appointmentData.firstName} ${appointmentData.lastName}`;

      const content = `
        <h2 style="color: #FF8800; margin-bottom: 20px;">⚠️ Appointment Rescheduled by Customer</h2>
        
        <p>A customer has rescheduled their appointment. Please update your calendar and adjust your schedule accordingly.</p>
        
        <div style="background-color: white; padding: 20px; border-left: 4px solid #FF8800; margin: 20px 0; border-radius: 5px;">
          <h3 style="color: #FF8800; margin-top: 0;">🕒 New Schedule</h3>
          <p style="margin: 0 0 10px 0;"><strong>Appointment ID:</strong> ${appointmentData.id}</p>
          <p style="margin: 0 0 10px 0;"><strong>New Date:</strong> ${newFormattedDate}</p>
          <p style="margin: 0 0 10px 0;"><strong>New Time:</strong> ${newFormattedTime}</p>
          ${this.getServiceDetailsHtml(appointmentData)}
        </div>
        
        <div style="background-color: #f9f9f9; padding: 20px; border-left: 4px solid #999; margin: 20px 0; border-radius: 5px;">
          <h3 style="color: #666; margin-top: 0;">📅 Previous Schedule</h3>
          <p style="margin: 0; color: #666; text-decoration: line-through;"><strong>Was:</strong> ${oldFormattedDateTime}</p>
        </div>
        
        <div style="background-color: white; padding: 20px; border-left: 4px solid #007700; margin: 20px 0; border-radius: 5px;">
          <h3 style="color: #007700; margin-top: 0;">Customer Information</h3>
          <p style="margin: 0 0 10px 0;"><strong>Name:</strong> ${appointmentData.firstName} ${appointmentData.lastName}</p>
          <p style="margin: 0 0 10px 0;"><strong>Email:</strong> <a href="mailto:${appointmentData.email}">${appointmentData.email}</a></p>
          <p style="margin: 0 0 10px 0;"><strong>Phone:</strong> ${appointmentData.phone ? `<a href="tel:${appointmentData.phone}">${appointmentData.phone}</a>` : 'Not provided'}</p>
          ${appointmentData.notes ? `<p style="margin: 0;"><strong>Notes:</strong> ${appointmentData.notes}</p>` : ''}
        </div>
        
        <div style="background-color: #e8f4fd; padding: 20px; border-left: 4px solid #0066cc; margin: 20px 0; border-radius: 5px;">
          <h3 style="color: #0066cc; margin-top: 0;">📋 Action Required</h3>
          <ul style="margin: 10px 0; padding-left: 20px; color: #0066cc;">
            <li>Update your personal calendar with the new appointment time</li>
            <li>Adjust your travel schedule if necessary</li>
            <li>Confirm you can accommodate the new time slot</li>
            <li>Contact customer if there are any conflicts: <a href="mailto:${appointmentData.email}">${appointmentData.email}</a></li>
          </ul>
        </div>
        
        <p>An updated calendar invite is attached to help you update your calendar. The customer has also received a confirmation email with the new appointment details.</p>
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
      console.log(`Admin reschedule notification email sent to ${this.adminEmail}`);
      return true;
    } catch (error) {
      console.error('Failed to send admin reschedule notification email:', error);
      return false;
    }
  }

  async sendMagicLinkEmail(params: { to: string; customerName: string; magicLink: string }): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('Email service not configured, skipping magic link email');
      return false;
    }

    try {
      const { to, customerName, magicLink } = params;
      const subject = `${this.businessName}: Sign in to your customer portal`;

      const content = `
        <h2 style="color: #BB0000; margin-bottom: 20px;">Sign in to Your Customer Portal</h2>
        
        <p>Dear ${customerName},</p>
        
        <p>You requested access to your HandyTech Solutions customer portal. Click the secure link below to sign in:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${magicLink}" style="background-color: #BB0000; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">Sign In to Portal</a>
        </div>
        
        <div style="background-color: #f0f0f0; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #BB0000; margin-top: 0; font-size: 16px;">What you can do in your portal:</h3>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>View your upcoming appointments</li>
            <li>Reschedule appointments when needed</li>
            <li>Update your contact information</li>
            <li>Review your service history</li>
          </ul>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          <strong>Security Notice:</strong> This link will expire in 30 minutes and can only be used once. 
          If you didn't request this sign-in link, you can safely ignore this email.
        </p>
        
        <p style="color: #666; font-size: 14px;">
          Having trouble? You can also copy and paste this link into your browser:<br>
          <a href="${magicLink}" style="color: #BB0000; word-break: break-all;">${magicLink}</a>
        </p>
      `;

      const htmlEmail = this.getEmailTemplate(content);

      const mailOptions = {
        from: `"${this.businessName}" <${this.fromEmail}>`,
        to: to,
        subject: subject,
        html: htmlEmail,
        headers: {
          'X-Mailer': `${this.businessName} Customer Portal`,
          'X-Priority': '1',
          'List-Unsubscribe': `<mailto:${this.fromEmail}?subject=Unsubscribe>`
        }
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Magic link email sent to ${to}`);
      return true;
    } catch (error) {
      console.error('Failed to send magic link email:', error);
      return false;
    }
  }

  async sendSubscriptionCancellationConfirmation(data: SubscriptionCancellationEmailData): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('Email service not configured, skipping subscription cancellation email');
      return false;
    }

    try {
      const planTypeDisplay = data.planType.charAt(0).toUpperCase() + data.planType.slice(1);
      const isImmediate = data.cancellationType === 'immediate';
      
      const subject = `${this.businessName}: Subscription Cancellation Confirmed`;

      const content = `
        <h2 style="color: #BB0000; margin-bottom: 20px;">Subscription Cancellation Confirmed</h2>
        
        <p>Dear ${data.customerName},</p>
        
        <p>We've successfully processed your subscription cancellation request. Here are the details:</p>
        
        <div style="background-color: white; padding: 20px; border-left: 4px solid #BB0000; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0 0 10px 0;"><strong>Plan:</strong> ${planTypeDisplay} Maintenance Plan</p>
          <p style="margin: 0 0 10px 0;"><strong>Cancellation Type:</strong> ${isImmediate ? 'Immediate' : 'End of Billing Period'}</p>
          ${data.endDate ? `<p style="margin: 0 0 10px 0;"><strong>Service End Date:</strong> ${this.formatDate(data.endDate)}</p>` : ''}
          ${data.cancellationReason ? `<p style="margin: 0;"><strong>Reason:</strong> ${data.cancellationReason}</p>` : ''}
        </div>
        
        ${isImmediate 
          ? `<p>Your subscription has been cancelled immediately. You will no longer receive maintenance services or be charged for this plan.</p>`
          : `<p>Your subscription will remain active until ${data.endDate ? this.formatDate(data.endDate) : 'your next billing date'}. You'll continue to receive maintenance services until then, and no further charges will occur.</p>`
        }
        
        <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #BB0000; margin-top: 0;">What's Next?</h3>
          <p style="margin: 0 0 10px 0;">• You'll receive confirmation of your final service date</p>
          <p style="margin: 0 0 10px 0;">• Any scheduled maintenance visits will be ${isImmediate ? 'cancelled' : 'completed through your service end date'}</p>
          <p style="margin: 0;">• You can reactivate your subscription anytime within 30 days</p>
        </div>
        
        <p>We're sorry to see you go! If there's anything we could have done better, please reply to this email and let us know.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${this.baseUrl}/portal" style="background-color: #BB0000; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Access Customer Portal</a>
        </div>
        
        <p>Thank you for being a valued customer. If you need any assistance or want to discuss your maintenance needs, please don't hesitate to contact us.</p>
      `;

      const htmlEmail = this.getEmailTemplate(content);

      const mailOptions = {
        from: `"${this.businessName}" <${this.fromEmail}>`,
        to: data.to,
        subject: subject,
        html: htmlEmail,
        headers: {
          'X-Mailer': `${this.businessName} Subscription Management`,
          'List-Unsubscribe': `<mailto:${this.fromEmail}?subject=Unsubscribe>`
        }
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Subscription cancellation email sent to ${data.to}`);
      return true;
    } catch (error) {
      console.error('Failed to send subscription cancellation email:', error);
      return false;
    }
  }

  async sendSubscriptionReactivationConfirmation(data: SubscriptionReactivationEmailData): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('Email service not configured, skipping subscription reactivation email');
      return false;
    }

    try {
      const planTypeDisplay = data.planType.charAt(0).toUpperCase() + data.planType.slice(1);
      
      const subject = `${this.businessName}: Welcome Back! Subscription Reactivated`;

      const content = `
        <h2 style="color: #BB0000; margin-bottom: 20px;">Welcome Back!</h2>
        
        <p>Dear ${data.customerName},</p>
        
        <p>Great news! Your subscription has been successfully reactivated. We're excited to continue providing you with excellent maintenance services.</p>
        
        <div style="background-color: white; padding: 20px; border-left: 4px solid #BB0000; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0 0 10px 0;"><strong>Plan:</strong> ${planTypeDisplay} Maintenance Plan</p>
          <p style="margin: 0 0 10px 0;"><strong>Status:</strong> Active</p>
          <p style="margin: 0;"><strong>Next Billing Date:</strong> ${this.formatDate(data.nextBillingDate)}</p>
        </div>
        
        <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h3 style="color: #28a745; margin-top: 0;">Your Plan Benefits</h3>
          ${data.planType === 'basic' ? `
            <p style="margin: 0 0 5px 0;">• Annual maintenance inspection</p>
            <p style="margin: 0 0 5px 0;">• Priority customer support</p>
            <p style="margin: 0;">• 10% discount on repairs</p>
          ` : data.planType === 'professional' ? `
            <p style="margin: 0 0 5px 0;">• Bi-annual maintenance inspections</p>
            <p style="margin: 0 0 5px 0;">• Emergency service calls</p>
            <p style="margin: 0 0 5px 0;">• 15% discount on repairs</p>
            <p style="margin: 0;">• Preventive maintenance alerts</p>
          ` : `
            <p style="margin: 0 0 5px 0;">• Quarterly maintenance inspections</p>
            <p style="margin: 0 0 5px 0;">• 24/7 emergency support</p>
            <p style="margin: 0 0 5px 0;">• 20% discount on all services</p>
            <p style="margin: 0 0 5px 0;">• Comprehensive system monitoring</p>
            <p style="margin: 0;">• Annual equipment upgrades</p>
          `}
        </div>
        
        <p>Your first maintenance visit will be scheduled soon. We'll contact you to arrange a convenient time that works with your schedule.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${this.baseUrl}/portal" style="background-color: #BB0000; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Manage Your Subscription</a>
        </div>
        
        <p>Thank you for choosing ${this.businessName} for your maintenance needs. We look forward to continuing to serve you!</p>
      `;

      const htmlEmail = this.getEmailTemplate(content);

      const mailOptions = {
        from: `"${this.businessName}" <${this.fromEmail}>`,
        to: data.to,
        subject: subject,
        html: htmlEmail,
        headers: {
          'X-Mailer': `${this.businessName} Subscription Management`,
          'List-Unsubscribe': `<mailto:${this.fromEmail}?subject=Unsubscribe>`
        }
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Subscription reactivation email sent to ${data.to}`);
      return true;
    } catch (error) {
      console.error('Failed to send subscription reactivation email:', error);
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