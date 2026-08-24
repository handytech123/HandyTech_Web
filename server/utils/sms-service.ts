// @ts-ignore - Twilio ESM type resolution issue with package.json exports
import twilio from 'twilio';

export class SMSService {
  private client: ReturnType<typeof twilio> | null = null;
  private fromNumber: string;
  private adminNumber: string;
  private isConfigured: boolean = false;
  private customerMessagingEnabled: boolean = false;

  constructor() {
    this.fromNumber = process.env.TWILIO_FROM || '';
    this.adminNumber = process.env.ADMIN_SMS_TO || '';
    this.customerMessagingEnabled = process.env.TWILIO_CUSTOMER_MESSAGING_ENABLED === 'true';

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

  private normalizeUsNumber(phone: string): string | null {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    return phone.startsWith('+') && digits.length >= 10 ? `+${digits}` : null;
  }

  async sendCustomerMessage(phone: string, message: string): Promise<boolean> {
    if (!this.customerMessagingEnabled) {
      console.log('[SMS] Customer message skipped - approval switch is disabled');
      return false;
    }
    if (!this.isConfigured || !this.client) return false;
    const to = this.normalizeUsNumber(phone);
    if (!to) {
      console.warn('[SMS] Customer message skipped - invalid phone number');
      return false;
    }
    try {
      const result = await this.client.messages.create({ body: message.slice(0, 1500), from: this.fromNumber, to });
      console.log(`Customer SMS sent successfully: ${result.sid}`);
      return true;
    } catch (error) {
      console.error('Failed to send customer SMS:', error);
      return false;
    }
  }

  sendAppointmentConfirmation(phone: string, date: string, time: string): Promise<boolean> {
    return this.sendCustomerMessage(phone, `HandyTech Solutions: Your appointment is scheduled for ${date} at ${time}. Message frequency varies. Msg & data rates may apply. Reply HELP for help or STOP to unsubscribe.`);
  }

  sendAppointmentReminder(phone: string, date: string, time: string): Promise<boolean> {
    return this.sendCustomerMessage(phone, `HandyTech Solutions reminder: Your appointment is ${date} at ${time}. Reply HELP for help or STOP to unsubscribe.`);
  }

  sendRescheduleConfirmation(phone: string, date: string, time: string): Promise<boolean> {
    return this.sendCustomerMessage(phone, `HandyTech Solutions: Your appointment has been rescheduled to ${date} at ${time}. Reply HELP for help or STOP to unsubscribe.`);
  }

  sendCancellationConfirmation(phone: string, date: string, time: string): Promise<boolean> {
    return this.sendCustomerMessage(phone, `HandyTech Solutions: Your appointment for ${date} at ${time} has been cancelled. Reply HELP for help or STOP to unsubscribe.`);
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
