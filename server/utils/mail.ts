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
  address: string | null;
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

interface ReviewNotificationEmailData {
  customerName: string;
  customerEmail: string;
  serviceType?: string;
  rating: number;
  title: string;
  content: string;
  submittedAt: Date;
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
    this.fromEmail = process.env.FROM_EMAIL || 'contact@handytech-solutions.com';
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
      address: appointment.address,
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
          ${appointmentData.address ? `<p style="margin: 0 0 10px 0;"><strong>Service Address:</strong> ${appointmentData.address}</p>` : ''}
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
          ${appointmentData.address ? `<p style="margin: 0 0 10px 0;"><strong>Service Address:</strong> ${appointmentData.address}</p>` : ''}
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
          ${appointmentData.address ? `<p style="margin: 0 0 10px 0;"><strong>Service Address:</strong> ${appointmentData.address}</p>` : ''}
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

  async sendReviewNotification(reviewData: ReviewNotificationEmailData): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('Email service not configured, skipping review notification');
      return false;
    }

    try {
      const ratingStars = '★'.repeat(reviewData.rating) + '☆'.repeat(5 - reviewData.rating);
      const formattedDate = this.formatDateTime(reviewData.submittedAt);

      const subject = `New Review Requires Approval - ${reviewData.rating} Star${reviewData.rating !== 1 ? 's' : ''} from ${reviewData.customerName}`;

      const content = `
        <h2 style="color: #BB0000; margin-bottom: 20px;">New Customer Review Submitted</h2>
        
        <p>A new customer review has been submitted and requires your approval.</p>
        
        <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Review Details</h3>
          <p style="margin: 0 0 10px 0;"><strong>Customer:</strong> ${reviewData.customerName}</p>
          <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${reviewData.customerEmail}</p>
          ${reviewData.serviceType ? `<p style="margin: 0 0 10px 0;"><strong>Service:</strong> ${reviewData.serviceType}</p>` : ''}
          <p style="margin: 0 0 10px 0;"><strong>Rating:</strong> ${ratingStars} (${reviewData.rating}/5)</p>
          <p style="margin: 0 0 10px 0;"><strong>Title:</strong> ${reviewData.title}</p>
          <p style="margin: 0 0 10px 0;"><strong>Submitted:</strong> ${formattedDate}</p>
        </div>
        
        <div style="background-color: #fff; padding: 15px; border-left: 4px solid #BB0000; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #333;">Review Content:</h4>
          <p style="margin: 0; font-style: italic;">"${reviewData.content}"</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${this.baseUrl}/admin#reviews" style="background-color: #BB0000; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Review & Approve</a>
        </div>
        
        <p>Please review this submission and approve or reject it through the admin panel.</p>
      `;

      const htmlEmail = this.getEmailTemplate(content);

      const mailOptions = {
        from: `"${this.businessName} Reviews" <${this.fromEmail}>`,
        to: this.adminEmail,
        subject: subject,
        html: htmlEmail,
        headers: {
          'X-Mailer': `${this.businessName} Review System`,
          'X-Priority': '3', // Normal priority
          'X-Review-Rating': reviewData.rating.toString(),
          'X-Customer-Email': reviewData.customerEmail
        }
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Review notification email sent to admin for customer ${reviewData.customerName} (${reviewData.rating} stars)`);
      return true;
    } catch (error) {
      console.error('Failed to send review notification email:', error);
      return false;
    }
  }

  async sendTestEmail(toEmail: string): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('Email service not configured, cannot send test email');
      return false;
    }

    try {
      const content = `
        <h2 style="color: #BB0000; margin-bottom: 20px;">Email Service Test</h2>
        
        <p>This is a test email to verify that the email service is working correctly.</p>
        
        <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Configuration Details</h3>
          <p style="margin: 0 0 10px 0;"><strong>From Email:</strong> ${this.fromEmail}</p>
          <p style="margin: 0 0 10px 0;"><strong>Admin Email:</strong> ${this.adminEmail}</p>
          <p style="margin: 0 0 10px 0;"><strong>Business Name:</strong> ${this.businessName}</p>
          <p style="margin: 0 0 10px 0;"><strong>Sent At:</strong> ${new Date().toISOString()}</p>
        </div>
        
        <p>If you received this email, the email service is functioning properly!</p>
      `;

      const htmlEmail = this.getEmailTemplate(content);

      const mailOptions = {
        from: `"${this.businessName} Test" <${this.fromEmail}>`,
        to: toEmail,
        subject: `${this.businessName} - Email Service Test`,
        html: htmlEmail,
        headers: {
          'X-Mailer': `${this.businessName} Email Test`,
          'X-Test-Email': 'true'
        }
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Test email sent successfully to ${toEmail}`);
      return true;
    } catch (error) {
      console.error('Failed to send test email:', error);
      return false;
    }
  }

  async send24HourReminder(data: { customerName: string; customerEmail: string; appointmentDate: string; appointmentTime: string; serviceType: string; description?: string }): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('Email service not configured, skipping 24-hour reminder');
      return false;
    }

    try {
      const formattedDate = this.formatDate(new Date(data.appointmentDate));
      const formattedTime = this.formatTime(data.appointmentTime);
      
      const content = `
        <h2 style="color: #BB0000; margin-bottom: 20px;">Appointment Reminder</h2>
        
        <p>Hi ${data.customerName},</p>
        
        <p>Just a friendly reminder that your HandyTech appointment is scheduled for <strong>tomorrow</strong>!</p>
        
        <div style="background-color: white; padding: 15px; border-left: 4px solid #BB0000; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Tomorrow:</strong> ${formattedDate}</p>
          <p style="margin: 0 0 10px 0;"><strong>Time:</strong> ${formattedTime}</p>
          <p style="margin: 0 0 10px 0;"><strong>Service:</strong> ${data.serviceType}</p>
          ${data.description ? `<p style="margin: 0 0 10px 0;"><strong>Details:</strong> ${data.description}</p>` : ''}
        </div>
        
        <p>Our technician will arrive within a 30-minute window of your scheduled time. Please ensure someone is available to provide access to the work area.</p>
        
        <p>If you need to reschedule, please call us at <strong>${this.businessPhone}</strong> as soon as possible.</p>
        
        <p>We're looking forward to helping you tomorrow!</p>
      `;

      const htmlEmail = this.getEmailTemplate(content);

      const mailOptions = {
        from: `"${this.businessName}" <${this.fromEmail}>`,
        to: data.customerEmail,
        subject: `Reminder: Your HandyTech Appointment is Tomorrow`,
        html: htmlEmail,
        headers: {
          'X-Mailer': `${this.businessName} Reminder System`,
          'X-Reminder-Type': '24-hour'
        }
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`24-hour reminder email sent successfully to ${data.customerEmail}`);
      return true;
    } catch (error) {
      console.error('Failed to send 24-hour reminder:', error);
      return false;
    }
  }

  async send2HourReminder(data: { customerName: string; customerEmail: string; appointmentDate: string; appointmentTime: string; serviceType: string; description?: string }): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('Email service not configured, skipping 2-hour reminder');
      return false;
    }

    try {
      const formattedTime = this.formatTime(data.appointmentTime);
      
      const content = `
        <h2 style="color: #BB0000; margin-bottom: 20px;">We're On Our Way!</h2>
        
        <p>Hi ${data.customerName},</p>
        
        <p>Our technician will arrive for your appointment in approximately <strong>2 hours</strong>!</p>
        
        <div style="background-color: white; padding: 15px; border-left: 4px solid #BB0000; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Expected Arrival:</strong> ${formattedTime} (within 30 minutes)</p>
          <p style="margin: 0 0 10px 0;"><strong>Service:</strong> ${data.serviceType}</p>
          ${data.description ? `<p style="margin: 0 0 10px 0;"><strong>Details:</strong> ${data.description}</p>` : ''}
        </div>
        
        <p>Please ensure:</p>
        <ul>
          <li>Someone is available to provide access</li>
          <li>The work area is accessible</li>
          <li>Any pets are secured</li>
        </ul>
        
        <p>Our technician will call if there are any delays. For urgent matters, call us at <strong>${this.businessPhone}</strong>.</p>
        
        <p>Thank you for choosing ${this.businessName}!</p>
      `;

      const htmlEmail = this.getEmailTemplate(content);

      const mailOptions = {
        from: `"${this.businessName}" <${this.fromEmail}>`,
        to: data.customerEmail,
        subject: `We'll See You Soon! - HandyTech Arriving in 2 Hours`,
        html: htmlEmail,
        headers: {
          'X-Mailer': `${this.businessName} Reminder System`,
          'X-Reminder-Type': '2-hour'
        }
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`2-hour reminder email sent successfully to ${data.customerEmail}`);
      return true;
    } catch (error) {
      console.error('Failed to send 2-hour reminder:', error);
      return false;
    }
  }

  async sendFollowUpEmail(data: { customerName: string; customerEmail: string; appointmentDate: string; appointmentTime: string; serviceType: string; description?: string }): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('Email service not configured, skipping follow-up email');
      return false;
    }

    try {
      const reviewUrl = `${this.baseUrl}/leave-review`;
      
      const content = `
        <h2 style="color: #BB0000; margin-bottom: 20px;">How Was Your HandyTech Service?</h2>
        
        <p>Hi ${data.customerName},</p>
        
        <p>We hope you're satisfied with the <strong>${data.serviceType}</strong> service we completed for you. Your feedback is important to us!</p>
        
        <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Please take a moment to:</h3>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Rate your experience</li>
            <li>Leave a review of our service</li>
            <li>Let us know how we can improve</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${reviewUrl}" style="background-color: #BB0000; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Leave a Review</a>
        </div>
        
        <p>If you need any additional work or have questions about our service, please don't hesitate to call us at <strong>${this.businessPhone}</strong>.</p>
        
        <p>Thank you for choosing ${this.businessName}! We appreciate your business.</p>
      `;

      const htmlEmail = this.getEmailTemplate(content);

      const mailOptions = {
        from: `"${this.businessName}" <${this.fromEmail}>`,
        to: data.customerEmail,
        subject: `How Was Your HandyTech Service?`,
        html: htmlEmail,
        headers: {
          'X-Mailer': `${this.businessName} Follow-up System`,
          'X-Email-Type': 'follow-up'
        }
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Follow-up email sent successfully to ${data.customerEmail}`);
      return true;
    } catch (error) {
      console.error('Failed to send follow-up email:', error);
      return false;
    }
  }

  getEmailConfig(): object {
    return {
      fromEmail: this.fromEmail,
      adminEmail: this.adminEmail,
      businessName: this.businessName,
      businessPhone: this.businessPhone,
      baseUrl: this.baseUrl,
      isConfigured: this.isConfigured,
      smtpConfigured: {
        host: !!process.env.SMTP_HOST,
        port: !!process.env.SMTP_PORT,
        user: !!process.env.SMTP_USER,
        pass: !!process.env.SMTP_PASS
      }
    };
  }
}

// Export a singleton instance
export const emailService = new EmailService();