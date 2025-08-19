import fetch from 'node-fetch';

interface EmailParams {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  fromName?: string;
  fromEmail?: string;
}

interface BrevoResponse {
  messageId?: string;
  error?: string;
}

class BrevoEmailService {
  private apiKey: string;
  private baseUrl = 'https://api.brevo.com/v3';
  private defaultFromEmail: string;
  private defaultFromName: string;

  constructor() {
    this.apiKey = process.env.BREVO_API_KEY || '';
    this.defaultFromEmail = 'noreply@handytech-solutions.com';
    this.defaultFromName = 'HandyTech Solutions';
    
    if (!this.apiKey) {
      throw new Error('BREVO_API_KEY environment variable is required');
    }
  }

  async sendEmail(params: EmailParams): Promise<BrevoResponse> {
    try {
      const emailData = {
        sender: {
          name: params.fromName || this.defaultFromName,
          email: params.fromEmail || this.defaultFromEmail
        },
        to: [
          {
            email: params.to
          }
        ],
        subject: params.subject,
        htmlContent: params.htmlContent,
        textContent: params.textContent || this.stripHtml(params.htmlContent)
      };

      const response = await fetch(`${this.baseUrl}/smtp/email`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': this.apiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify(emailData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Brevo API error:', errorData);
        return { error: `Failed to send email: ${response.status} ${response.statusText}` };
      }

      const result = await response.json() as any;
      return { messageId: result.messageId };
    } catch (error: any) {
      console.error('Email sending error:', error);
      return { error: `Failed to send email: ${error?.message || 'Unknown error'}` };
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  // Generate appointment reminder email templates
  generateReminderEmail(appointment: any, reminderType: string): { subject: string; htmlContent: string } {
    const customerName = `${appointment.firstName} ${appointment.lastName}`;
    const appointmentDate = new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const appointmentTime = appointment.appointmentTime;

    let subject: string;
    let timeMessage: string;

    switch (reminderType) {
      case '24_hours':
        subject = `Reminder: Your HandyTech appointment tomorrow at ${appointmentTime}`;
        timeMessage = 'tomorrow';
        break;
      case '2_hours':
        subject = `Reminder: Your HandyTech appointment in 2 hours`;
        timeMessage = 'in 2 hours';
        break;
      case '30_minutes':
        subject = `Final Reminder: Your HandyTech appointment in 30 minutes`;
        timeMessage = 'in 30 minutes';
        break;
      default:
        subject = `Reminder: Your HandyTech appointment`;
        timeMessage = 'soon';
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background-color: #BB0000; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .appointment-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #BB0000; }
          .footer { padding: 15px; text-align: center; font-size: 12px; color: #666; }
          .button { display: inline-block; padding: 10px 20px; background-color: #BB0000; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>HandyTech Solutions</h1>
          <p>Professional Handyman Services</p>
        </div>
        
        <div class="content">
          <h2>Appointment Reminder</h2>
          <p>Hello ${customerName},</p>
          
          <p>This is a friendly reminder that you have an appointment with HandyTech Solutions <strong>${timeMessage}</strong>.</p>
          
          <div class="appointment-details">
            <h3>Appointment Details:</h3>
            <p><strong>Service:</strong> ${appointment.serviceType}</p>
            <p><strong>Date:</strong> ${appointmentDate}</p>
            <p><strong>Time:</strong> ${appointmentTime}</p>
            ${appointment.phone ? `<p><strong>Contact:</strong> ${appointment.phone}</p>` : ''}
            ${appointment.notes ? `<p><strong>Notes:</strong> ${appointment.notes}</p>` : ''}
          </div>
          
          <p>Our technician will arrive promptly at the scheduled time. Please ensure someone is available at the service location.</p>
          
          <p>If you need to reschedule or have any questions, please contact us as soon as possible.</p>
          
          <div style="text-align: center;">
            <a href="tel:+1555-123-4567" class="button">Call Us: (555) 123-4567</a>
          </div>
        </div>
        
        <div class="footer">
          <p>HandyTech Solutions - Your Trusted Handyman Service</p>
          <p>Missouri-based • Home Depot Pro Contractor</p>
          <p>This is an automated reminder. Please do not reply to this email.</p>
        </div>
      </body>
      </html>
    `;

    return { subject, htmlContent };
  }
}

export const emailService = new BrevoEmailService();