import { Router } from "express";
import { getOAuth2Client, saveTokens } from "../utils/google.js";
import fs from "fs";
import path from "path";
import { google } from "googleapis";
import crypto from "crypto";
const r = Router();
const TOKENS_FILE = path.join(process.cwd(), "server", "data", "google_tokens.json");

r.get("/status", async (_req, res) => {
  if (!fs.existsSync(TOKENS_FILE)) {
    return res.json({ connected: false, message: "Google Calendar is not connected" });
  }
  try {
    const auth = getOAuth2Client();
    const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
    const calendar = google.calendar({ version: "v3", auth });
    const { data } = await calendar.events.list({ calendarId, maxResults: 1, singleEvents: true });
    res.json({ connected: true, calendarId, calendarName: data.summary || (calendarId === "primary" ? "Primary calendar" : calendarId), timeZone: data.timeZone || process.env.TZ || "America/Chicago" });
  } catch (error) {
    console.error("Google Calendar status check failed:", error);
    res.json({ connected: false, message: "Google Calendar authorization needs to be renewed" });
  }
});

// TODO: attach admin auth middleware if available
// r.use(requireAdmin);

// Step 1: kick off OAuth
r.get("/auth", (req, res) => {
  const oAuth2Client = getOAuth2Client();
  const scopes = ["https://www.googleapis.com/auth/calendar.events"];
  const state = crypto.randomBytes(24).toString("hex");
  req.session.googleOAuthState = state;
  const url = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: scopes,
    state
  });
  res.redirect(url);
});

// Step 2: callback
r.get("/callback", async (req, res) => {
  try {
    const oAuth2Client = getOAuth2Client();
    const { code, state } = req.query;
    if (!state || state !== req.session.googleOAuthState) {
      return res.status(403).send("Google authorization could not be verified. Return to the admin calendar and try again.");
    }
    delete req.session.googleOAuthState;
    const { tokens } = await oAuth2Client.getToken(String(code));
    saveTokens(tokens);
    res.status(200).send("Google Calendar connected for contact@handytech-solutions.com! You can close this tab.");
  } catch (e) {
    console.error("Google OAuth failed:", e);
    res.status(500).send("Google auth failed. Check server logs.");
  }
});

export default r;
