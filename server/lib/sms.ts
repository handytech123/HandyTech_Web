import nodemailer from "nodemailer";

// Email-to-SMS gateway mapping for major US carriers
const carrierGateways = {
  'verizon': 'vtext.com',
  'att': 'txt.att.net', 
  'tmobile': 'tmomail.net',
  'sprint': 'messaging.sprintpcs.com',
  'boost': 'sms.myboostmobile.com',
  'cricket': 'sms.cricketwireless.net',
  'uscellular': 'email.uscc.net',
  'metro': 'mymetropcs.com'
};

const host = process.env.SMTP_HOST;
const port = process.env.SMTP_PORT || 587;
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.FROM_EMAIL || process.env.SMTP_USER;

// SMS Configuration
const alertPhone = process.env.ALERT_TO_SMS;      // e.g. 3145551234 (no formatting)
const phoneCarrier = process.env.SMS_CARRIER || 'verizon';  // carrier key from above

let transporter: nodemailer.Transporter | null = null;
if (host && user && pass) {
  transporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass }
  });
}

export async function sendSMS(body: string) {
  if (!transporter || !from || !alertPhone) {
    console.warn("[Custom SMS] Skipped (missing SMTP_* or ALERT_TO_SMS)");
    return { skipped: true };
  }
  
  // Get carrier gateway
  const gateway = carrierGateways[phoneCarrier as keyof typeof carrierGateways];
  if (!gateway) {
    console.warn(`[Custom SMS] Unknown carrier: ${phoneCarrier}`);
    return { skipped: true, error: `Unknown carrier: ${phoneCarrier}` };
  }
  
  // Clean phone number (remove any formatting)
  const cleanPhone = alertPhone.replace(/\D/g, '');
  if (cleanPhone.length !== 10) {
    console.warn(`[Custom SMS] Invalid phone number format: ${alertPhone}`);
    return { skipped: true, error: "Phone number must be 10 digits" };
  }
  
  // Construct email-to-SMS address
  const smsEmail = `${cleanPhone}@${gateway}`;
  
  try {
    // SMS messages should be plain text and under 160 characters
    const truncatedBody = body.length > 155 ? body.substring(0, 155) + "..." : body;
    
    const info = await transporter.sendMail({
      from,
      to: smsEmail,
      subject: "", // Most carriers ignore subject for SMS
      text: truncatedBody
    });
    
    console.log(`[Custom SMS] Sent to ${cleanPhone} via ${phoneCarrier} (${gateway})`);
    return { messageId: info.messageId, carrier: phoneCarrier, gateway };
  } catch (error) {
    console.error("[Custom SMS] Send error:", error);
    return { error: error instanceof Error ? error.message : "Send failed" };
  }
}