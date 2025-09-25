import { Router } from "express";
import { getOAuth2Client, saveTokens } from "../utils/google.js";
const r = Router();

// TODO: attach admin auth middleware if available
// r.use(requireAdmin);

// Step 1: kick off OAuth
r.get("/auth", (_req, res) => {
  const oAuth2Client = getOAuth2Client();
  const scopes = ["https://www.googleapis.com/auth/calendar.events"];
  const url = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes
  });
  res.redirect(url);
});

// Step 2: callback
r.get("/callback", async (req, res) => {
  try {
    const oAuth2Client = getOAuth2Client();
    const { code } = req.query;
    const { tokens } = await oAuth2Client.getToken(String(code));
    saveTokens(tokens);
    res.status(200).send("Google Calendar connected for contact@handytech-solutions.com! You can close this tab.");
  } catch (e) {
    console.error("Google OAuth failed:", e);
    res.status(500).send("Google auth failed. Check server logs.");
  }
});

export default r;