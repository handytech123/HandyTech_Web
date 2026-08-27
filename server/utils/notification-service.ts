import { smsService } from './sms-service';
import { sendHandoffEmail } from '../lib/handoff-mailer';

export class NotificationService {
  /**
   * Send admin notification via both SMS and email
   */
  async notifyAdmin(subject: string, message: string, html?: string): Promise<{
    sms: boolean;
    email: boolean;
  }> {
    const results = {
      sms: false,
      email: false
    };

    // Send SMS notification
    try {
      results.sms = await smsService.sendAdminAlert(subject, message);
    } catch (error) {
      console.error('SMS notification failed:', error);
    }

    // Send email notification
    try {
      const emailResult = await sendHandoffEmail({ subject, text: message, html });
      results.email = !emailResult?.skipped;
    } catch (error) {
      console.error('Email notification failed:', error);
    }

    return results;
  }

  /**
   * Send handoff request notification
   */
  async notifyHandoffRequest(sessionId: string, customerMessage: string): Promise<void> {
    const subject = 'HandyTech - Live Chat Handoff Requested';
    const message = `Customer requested human assistance in chat session ${sessionId}\n\nLatest message: "${customerMessage.slice(0, 200)}..."`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #2769BE;">Live Chat Handoff Requested</h2>
        <p><strong>Session ID:</strong> ${sessionId}</p>
        <p><strong>Customer's Latest Message:</strong></p>
        <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #2769BE; margin: 10px 0;">
          "${customerMessage}"
        </div>
        <p>Please log into the admin portal to respond to this customer.</p>
      </div>
    `;

    await this.notifyAdmin(subject, message, html);
  }

  /**
   * Send appointment request notification
   */
  async notifyAppointmentRequest(appointmentData: {
    convId?: string;
    name: string;
    phone: string;
    email: string;
    address?: string;
    description: string;
    preferred: string;
  }): Promise<void> {
    const subject = 'HandyTech - New Appointment Request';
    const message = `New appointment request received:

${appointmentData.convId ? `Conversation ID: ${appointmentData.convId}` : ''}
Name: ${appointmentData.name}
Phone: ${appointmentData.phone}
Email: ${appointmentData.email}
${appointmentData.address ? `Address: ${appointmentData.address}` : ''}
Preferred Time: ${appointmentData.preferred}
Description: ${appointmentData.description}`;

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #2769BE;">New Appointment Request</h2>
        ${appointmentData.convId ? `<p><strong>Conversation ID:</strong> ${appointmentData.convId}</p>` : ''}
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <tr style="background: #f9f9f9;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Name</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${appointmentData.name}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Phone</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${appointmentData.phone}</td>
          </tr>
          <tr style="background: #f9f9f9;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Email</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${appointmentData.email}</td>
          </tr>
          ${appointmentData.address ? `
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Address</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${appointmentData.address}</td>
          </tr>
          ` : ''}
          <tr style="background: #f9f9f9;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Preferred Time</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${appointmentData.preferred}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; vertical-align: top;">Description</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${appointmentData.description}</td>
          </tr>
        </table>
        <p>Please follow up with this customer as soon as possible.</p>
      </div>
    `;

    await this.notifyAdmin(subject, message, html);
  }
}

// Export singleton instance
export const notificationService = new NotificationService();