import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST;      // e.g. smtp.sendgrid.net
const port = process.env.SMTP_PORT || 587;
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.FROM_EMAIL || process.env.SMTP_USER;     // fallback to SMTP_USER if FROM_EMAIL not set
const to   = process.env.ALERT_TO_EMAIL; // your inbox

let transporter: nodemailer.Transporter | null = null;
if (host && user && pass) {
  transporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass }
  });
}

export async function sendHandoffEmail({ subject, text, html }: { subject: string; text: string; html?: string }) {
  if (!transporter || !from || !to) {
    console.warn("[Handoff Email] Skipped (missing SMTP_* or ALERT_TO_EMAIL)");
    return { skipped: true };
  }
  const info = await transporter.sendMail({ from, to, subject, text, html });
  return { messageId: info.messageId };
}