import * as twilio from "twilio";

const sid = process.env.TWILIO_SID;
const token = process.env.TWILIO_TOKEN;
const from = process.env.TWILIO_FROM;     // e.g. +13145551234
const to = process.env.ALERT_TO_SMS;      // your cell

const client = sid && token ? twilio(sid, token) : null;

export async function sendSMS(body: string) {
  if (!client || !from || !to) {
    console.warn("[SMS] Skipped (missing TWILIO_* or ALERT_TO_SMS)");
    return { skipped: true };
  }
  const msg = await client.messages.create({ to, from, body });
  return { sid: msg.sid };
}