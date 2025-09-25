import fs from "fs";
import path from "path";
import { google } from "googleapis";

const TOKENS_FILE = path.join(process.cwd(), "server", "data", "google_tokens.json");

function getOAuth2Client() {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  if (fs.existsSync(TOKENS_FILE)) {
    client.setCredentials(JSON.parse(fs.readFileSync(TOKENS_FILE, "utf-8")));
  }
  return client;
}

function saveTokens(tokens) {
  const dir = path.dirname(TOKENS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), "utf-8");
}

function calendarClient(auth) {
  return google.calendar({ version: "v3", auth });
}

function toRFC3339(d) {
  return new Date(d).toISOString();
}

async function ensureAuthed() {
  const client = getOAuth2Client();
  const creds = client.credentials || {};
  if (!creds.access_token && !creds.refresh_token) {
    throw new Error("GOOGLE_NOT_CONNECTED");
  }
  return client;
}

async function createEvent({ summary, description, start, end, attendees = [] }) {
  const auth = await ensureAuthed();
  const cal = calendarClient(auth);
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
  const TZ = process.env.TZ || "America/Chicago";
  const { data } = await cal.events.insert({
    calendarId,
    requestBody: {
      summary,
      description,
      start: { dateTime: toRFC3339(start), timeZone: TZ },
      end:   { dateTime: toRFC3339(end),   timeZone: TZ },
      attendees: attendees.map(e => ({ email: e })),
      reminders: { useDefault: true }
    }
  });
  return data; // contains id
}

async function updateEvent(eventId, { summary, description, start, end, attendees = [] }) {
  const auth = await ensureAuthed();
  const cal = calendarClient(auth);
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
  const TZ = process.env.TZ || "America/Chicago";
  const { data } = await cal.events.patch({
    calendarId,
    eventId,
    requestBody: {
      summary,
      description,
      start: { dateTime: toRFC3339(start), timeZone: TZ },
      end:   { dateTime: toRFC3339(end),   timeZone: TZ },
      attendees: attendees.map(e => ({ email: e }))
    }
  });
  return data;
}

async function deleteEvent(eventId) {
  const auth = await ensureAuthed();
  const cal = calendarClient(auth);
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
  await cal.events.delete({ calendarId, eventId });
}

export {
  getOAuth2Client,
  saveTokens,
  createEvent,
  updateEvent,
  deleteEvent
};