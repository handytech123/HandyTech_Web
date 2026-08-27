interface AppointmentReminderData {
  customerName: string;
  customerEmail: string;
  appointmentDate: string;
  appointmentTime: string;
  serviceType: string;
  description?: string;
}

export class BrevoEmailService {
  private apiInstance: any;
  private isConfigured: boolean = false;
  
  constructor() {
    this.isConfigured = !!process.env.BREVO_API_KEY;
    
    if (this.isConfigured) {
      try {
        // Use dynamic import to handle ES module compatibility
        this.initializeBrevo();
      } catch (error) {
        console.error('Failed to initialize Brevo service:', error);
        this.isConfigured = false;
      }
    } else {
      console.log('Brevo API key not provided - email reminders will be skipped');
    }
  }

  private async initializeBrevo() {
    try {
      const SibApiV3Sdk = await import('sib-api-v3-sdk') as any;
      const defaultClient = SibApiV3Sdk.default.ApiClient.instance;
      const apiKey = defaultClient.authentications['api-key'];
      apiKey.apiKey = process.env.BREVO_API_KEY;
      this.apiInstance = new SibApiV3Sdk.default.TransactionalEmailsApi();
      console.log('Brevo email service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Brevo service:', error);
      this.isConfigured = false;
    }
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
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

  async sendAppointmentConfirmation(data: AppointmentReminderData): Promise<boolean> {
    if (!this.isConfigured || !this.apiInstance) {
      console.log('Brevo not configured, skipping confirmation email');
      return false;
    }

    try {
      const SibApiV3Sdk = await import('sib-api-v3-sdk') as any;
      const sendSmtpEmail = new SibApiV3Sdk.default.SendSmtpEmail();
      
      sendSmtpEmail.subject = `Appointment Confirmed - HandyTech Solutions`;
      sendSmtpEmail.to = [{ email: data.customerEmail, name: data.customerName }];
      sendSmtpEmail.sender = { email: 'service@handytech-solutions.com', name: 'HandyTech Solutions' };
      
      sendSmtpEmail.htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #2769BE; color: white; padding: 20px; text-align: center;">
            <h1>HandyTech Solutions</h1>
            <h2>Appointment Confirmed!</h2>
          </div>
          
          <div style="padding: 20px; background-color: #f9f9f9;">
            <p>Dear ${data.customerName},</p>
            
            <p>Your appointment has been successfully scheduled! Here are the details:</p>
            
            <div style="background-color: white; padding: 15px; border-left: 4px solid #2769BE; margin: 20px 0;">
              <p><strong>Date:</strong> ${this.formatDate(data.appointmentDate)}</p>
              <p><strong>Time:</strong> ${this.formatTime(data.appointmentTime)}</p>
              <p><strong>Service:</strong> ${data.serviceType}</p>
              ${data.description ? `<p><strong>Description:</strong> ${data.description}</p>` : ''}
            </div>
            
            <p>We'll send you reminder emails as your appointment approaches. If you need to reschedule or have any questions, please call us at <strong>(314) 325-4575</strong>.</p>
            
            <p>Thank you for choosing HandyTech Solutions!</p>
            
            <p>Best regards,<br>
            The HandyTech Solutions Team<br>
            Missouri's Trusted Handyman Service</p>
          </div>
        </div>
      `;

      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('Appointment confirmation email sent successfully');
      return true;
    } catch (error) {
      console.error('Failed to send confirmation email:', error);
      return false;
    }
  }

  async send24HourReminder(data: AppointmentReminderData): Promise<boolean> {
    if (!this.apiInstance) {
      console.log('Brevo not configured, skipping 24-hour reminder');
      return false;
    }

    try {
      const SibApiV3Sdk = await import('sib-api-v3-sdk') as any;
      const sendSmtpEmail = new SibApiV3Sdk.default.SendSmtpEmail();
      
      sendSmtpEmail.subject = `Reminder: HandyTech Appointment ${this.formatDate(data.appointmentDate)} at ${this.formatTime(data.appointmentTime)}`;
      sendSmtpEmail.to = [{ email: data.customerEmail, name: data.customerName }];
      sendSmtpEmail.sender = { email: 'service@handytech-solutions.com', name: 'HandyTech Solutions' };
      
      sendSmtpEmail.htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #2769BE; color: white; padding: 20px; text-align: center;">
            <h1>HandyTech Solutions</h1>
            <h2>Appointment Reminder</h2>
          </div>
          
          <div style="padding: 20px; background-color: #f9f9f9;">
            <p>Hi ${data.customerName},</p>
            
            <p>Just a friendly reminder about your upcoming HandyTech appointment.</p>
            
            <div style="background-color: white; padding: 15px; border-left: 4px solid #2769BE; margin: 20px 0;">
              <p><strong>Date:</strong> ${this.formatDate(data.appointmentDate)}</p>
              <p><strong>Time:</strong> ${this.formatTime(data.appointmentTime)}</p>
              <p><strong>Service:</strong> ${data.serviceType}</p>
            </div>
            
            <p>Our technician will arrive within a 30-minute window of your scheduled time. Please ensure someone is available to provide access to the work area.</p>
            
            <p>If you need to reschedule, please call us at <strong>(314) 325-4575</strong> as soon as possible.</p>
            
            <p>We're looking forward to helping you tomorrow!</p>
            
            <p>Best regards,<br>
            The HandyTech Solutions Team</p>
          </div>
        </div>
      `;

      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('24-hour reminder email sent successfully');
      return true;
    } catch (error) {
      console.error('Failed to send 24-hour reminder:', error);
      return false;
    }
  }

  async send2HourReminder(data: AppointmentReminderData): Promise<boolean> {
    if (!this.apiInstance) {
      console.log('Brevo not configured, skipping 2-hour reminder');
      return false;
    }

    try {
      const SibApiV3Sdk = await import('sib-api-v3-sdk') as any;
      const sendSmtpEmail = new SibApiV3Sdk.default.SendSmtpEmail();
      
      sendSmtpEmail.subject = `Reminder: HandyTech Appointment Today at ${this.formatTime(data.appointmentTime)}`;
      sendSmtpEmail.to = [{ email: data.customerEmail, name: data.customerName }];
      sendSmtpEmail.sender = { email: 'service@handytech-solutions.com', name: 'HandyTech Solutions' };
      
      sendSmtpEmail.htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #2769BE; color: white; padding: 20px; text-align: center;">
            <h1>HandyTech Solutions</h1>
            <h2>Appointment Later Today</h2>
          </div>
          
          <div style="padding: 20px; background-color: #f9f9f9;">
            <p>Hi ${data.customerName},</p>
            
            <p>This is a reminder that your appointment is scheduled for today at <strong>${this.formatTime(data.appointmentTime)}</strong>.</p>
            <p style="background:#eff6ff;border-radius:6px;padding:12px;"><strong>This is not an on-my-way alert.</strong> We will contact you separately if the schedule changes.</p>
            
            <div style="background-color: white; padding: 15px; border-left: 4px solid #2769BE; margin: 20px 0;">
              <p><strong>Scheduled Start:</strong> ${this.formatTime(data.appointmentTime)}</p>
              <p><strong>Arrival Window:</strong> From the scheduled start time up to 30 minutes afterward</p>
              <p><strong>Service:</strong> ${data.serviceType}</p>
            </div>
            
            <p>Please ensure:</p>
            <ul>
              <li>Someone is available to provide access</li>
              <li>The work area is accessible</li>
              <li>Any pets are secured</li>
            </ul>
            
            <p>Our technician will call if there are any delays. For urgent matters, call us at <strong>(314) 325-4575</strong>.</p>
            
            <p>Thank you for choosing HandyTech Solutions!</p>
            
            <p>Best regards,<br>
            The HandyTech Solutions Team</p>
          </div>
        </div>
      `;

      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('2-hour reminder email sent successfully');
      return true;
    } catch (error) {
      console.error('Failed to send 2-hour reminder:', error);
      return false;
    }
  }

  async sendFollowUpEmail(data: AppointmentReminderData): Promise<boolean> {
    if (!this.apiInstance) {
      console.log('Brevo not configured, skipping follow-up email');
      return false;
    }

    try {
      const SibApiV3Sdk = await import('sib-api-v3-sdk') as any;
      const sendSmtpEmail = new SibApiV3Sdk.default.SendSmtpEmail();
      
      sendSmtpEmail.subject = `How Was Your HandyTech Service?`;
      sendSmtpEmail.to = [{ email: data.customerEmail, name: data.customerName }];
      sendSmtpEmail.sender = { email: 'service@handytech-solutions.com', name: 'HandyTech Solutions' };
      
      sendSmtpEmail.htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #2769BE; color: white; padding: 20px; text-align: center;">
            <h1>HandyTech Solutions</h1>
            <h2>Thank You!</h2>
          </div>
          
          <div style="padding: 20px; background-color: #f9f9f9;">
            <p>Hi ${data.customerName},</p>
            
            <p>Thank you for choosing HandyTech Solutions for your recent <strong>${data.serviceType}</strong> service!</p>
            
            <p>We hope you're completely satisfied with the work completed. Your feedback means the world to us and helps us continue providing excellent service to our Missouri community.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="/leave-review" style="background-color: #2769BE; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Leave a Review</a>
            </div>
            
            <p>For any follow-up questions or future service needs, don't hesitate to reach out:</p>
            <ul>
              <li><strong>Phone:</strong> (314) 325-4575</li>
              <li><strong>Website:</strong> handytech-solutions.com</li>
            </ul>
            
            <p>We appreciate your business and look forward to serving you again!</p>
            
            <p>Best regards,<br>
            The HandyTech Solutions Team<br>
            Missouri's Trusted Handyman Service</p>
          </div>
        </div>
      `;

      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('Follow-up email sent successfully');
      return true;
    } catch (error) {
      console.error('Failed to send follow-up email:', error);
      return false;
    }
  }
}
