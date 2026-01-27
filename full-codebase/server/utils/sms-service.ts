// @ts-ignore - Twilio ESM type resolution issue with package.json exports
import twilio from 'twilio';

export class SMSService {
  private client: ReturnType<typeof twilio> | null = null;
  private fromNumber: string;
  private adminNumber: string;
  private isConfigured: boolean = false;

  constructor() {
    this.fromNumber = process.env.TWILIO_FROM || '';
    this.adminNumber = process.env.ADMIN_SMS_TO || '';

    if (
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      this.fromNumber &&
      this.adminNumber
    ) {
      try {
        this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        this.isConfigured = true;
        console.log('✓ SMS Service initialized with Twilio');
      } catch (error) {
        console.error('SMS Service initialization failed:', error);
        this.isConfigured = false;
      }
    } else {
      console.log('SMS Service not configured - missing Twilio credentials');
    }
  }

  async sendAdminAlert(subject: string, message: string): Promise<boolean> {
    if (!this.isConfigured || !this.client) {
      console.log('[SMS] Skipped - service not configured');
      return false;
    }

    try {
      const body = `${subject}\n\n${message}`.slice(0, 1500); // SMS length limit
      
      const result = await this.client.messages.create({
        body,
        from: this.fromNumber,
        to: this.adminNumber
      });

      console.log(`✓ SMS sent successfully: ${result.sid}`);
      return true;
    } catch (error) {
      console.error('Failed to send SMS:', error);
      return false;
    }
  }

  async sendHandoffAlert(sessionId: string, customerMessage: string): Promise<boolean> {
    const subject = 'HandyTech - Live Chat Handoff Requested';
    const message = `Customer requested human assistance in chat session ${sessionId}\n\nLatest message: "${customerMessage.slice(0, 200)}..."`;
    
    return await this.sendAdminAlert(subject, message);
  }

  async sendAppointmentAlert(appointmentData: {
    name: string;
    phone: string;
    email: string;
    address?: string;
    description: string;
    preferred: string;
  }): Promise<boolean> {
    const subject = 'HandyTech - New Appointment Request';
    const message = `New appointment request received:

Name: ${appointmentData.name}
Phone: ${appointmentData.phone}
Email: ${appointmentData.email}
${appointmentData.address ? `Address: ${appointmentData.address}` : ''}
Preferred Time: ${appointmentData.preferred}
Description: ${appointmentData.description}`;

    return await this.sendAdminAlert(subject, message);
  }

  isServiceConfigured(): boolean {
    return this.isConfigured;
  }
}

// Export singleton instance
export const smsService = new SMSService();