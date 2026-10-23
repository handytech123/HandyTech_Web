import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { approvedCategory, defaultState, firstContactMessage, shouldClaim } from "./worker-core.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const dataRoot = path.join(process.env.LOCALAPPDATA || os.homedir(), "HandyTech", "HomeDepotWorker");
const profileRoot = path.join(dataRoot, "chrome-profile");
const auditRoot = path.join(dataRoot, "audit");
const statePath = path.join(dataRoot, "state.json");
const configPath = path.join(root, "config.json");
const dashboardUrl = "https://proreferral.homedepot.com/dashboard/new";
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, "utf8")); } catch { return fallback; }
}

async function writeJsonAtomic(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.building`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temporary, file);
}

function chromeExecutable() {
  const candidates = [
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe"),
    process.env["PROGRAMFILES(X86)"] && path.join(process.env["PROGRAMFILES(X86)"], "Google", "Chrome", "Application", "chrome.exe"),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe"),
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, "Microsoft", "Edge", "Application", "msedge.exe"),
  ].filter(Boolean);
  return candidates;
}

async function api(config, route, options = {}) {
  const response = await fetch(`${config.handyTechSite.replace(/\/$/, "")}${route}`, {
    method: options.method || "GET",
    headers: { "content-type": "application/json", "x-home-depot-connector-key": config.connectorKey },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || `HandyTech returned ${response.status}`);
  return body;
}

async function report(config, outcome, details, externalJobId = null) {
  try { await api(config, "/api/connectors/home-depot/worker-events", { method: "POST", body: { outcome, details, externalJobId } }); }
  catch (error) { console.error("Worker event report failed:", error.message); }
}

function parseLead(text, url) {
  const match = (pattern) => clean(text.match(pattern)?.[1]);
  const location = match(/Location\s+(.+?)(?:Service|Customer Timeframe|Customer notes|$)/i);
  return {
    externalJobId: match(/Job ID\s*([A-Za-z0-9-]+)/i) || url.split("/").filter(Boolean).at(-1),
    customerName: clean(text.split("\n").find((line) => /^[A-Za-z][A-Za-z .'-]{2,60}$/.test(clean(line))) || ""),
    service: match(/Service\s+(.+?)(?:Customer Timeframe|Customer notes|Lead cost|$)/i),
    city: clean(location.replace(/,?\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?.*$/, "")) || null,
    state: location.match(/\b([A-Z]{2})\s+\d{5}/)?.[1] || null,
    zip: location.match(/\b\d{5}(?:-\d{4})?\b/)?.[0] || null,
    customerTimeframe: match(/Customer Timeframe\s+(.+?)(?:Received|Customer Photos|Customer notes|$)/i) || null,
    customerNotes: match(/Customer notes\s+(.+?)(?:Customer Photos|Lead cost|Request Review|$)/i) || null,
    leadCostPoints: Number(match(/Lead cost\s*-?\s*(\d+)\s*points/i)) || null,
    email: text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || null,
    phone: text.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/)?.[0] || null,
    portalUrl: url,
    photoUrls: [],
  };
}

async function extractLead(page) {
  const text = await page.locator("body").innerText();
  const lead = parseLead(text, page.url());
  const headings = await page.locator("h1,h2,h3,h4,[role=heading]").allInnerTexts().catch(() => []);
  const headingName = headings.map(clean).find((value) => value && !/^(?:jobs|schedule|messages|job details|my notes|appointment|home depot|get ready|request review|message)$/i.test(value));
  if (headingName) lead.customerName = headingName.replace(/^(?:selected show number|ready to hire|new|potential)\s+/i, "");
  return lead;
}

async function screenshot(page, leadId, label) {
  await fs.mkdir(auditRoot, { recursive: true });
  const safeId = String(leadId || "unknown").replace(/[^a-z0-9_-]/gi, "-");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  await page.screenshot({ path: path.join(auditRoot, `${timestamp}-${safeId}-${label}.png`), fullPage: true }).catch(() => {});
}

async function visibleButton(page, pattern) {
  const matches = page.getByRole("button", { name: pattern }).or(page.getByRole("link", { name: pattern }));
  for (let index = 0; index < await matches.count(); index += 1) {
    const candidate = matches.nth(index);
    if (await candidate.isVisible().catch(() => false)) return candidate;
  }
  return null;
}

async function revealContact(page) {
  const trigger = await visibleButton(page, /^(?:Show Number|Contact Now)$/i);
  if (!trigger) throw new Error("Home Depot did not show Contact Now or Show Number.");
  await trigger.click();
  await wait(700);
  const confirm = await visibleButton(page, /^(?:Confirm|Yes,? continue|Get contact information|Claim lead|Show Number|Contact Now)$/i);
  if (confirm) await confirm.click();
  await page.waitForFunction(() => /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/i.test(document.body.innerText), null, { timeout: 15000 });
}

async function sendMessage(page, message) {
  const open = await visibleButton(page, /^Message(?:\s+.+)?$/i);
  if (!open) throw new Error("Home Depot did not show the Message control.");
  await open.click();
  const editor = page.locator("textarea:visible,[contenteditable=true]:visible").last();
  await editor.waitFor({ state: "visible", timeout: 10000 });
  await editor.fill(message);
  const dialog = editor.locator("xpath=ancestor::*[@role='dialog' or self::form][1]");
  const scope = await dialog.count() ? dialog : page;
  const send = scope.getByRole("button", { name: /^(?:Send|Send Message)$/i }).last();
  await send.waitFor({ state: "visible", timeout: 5000 });
  await send.click();
  await wait(800);
}

async function processLead(page, url, config, state) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await wait(1000);
  const lead = await extractLead(page);
  if (!lead.externalJobId || !lead.customerName || !lead.service) throw new Error("The page did not contain a complete lead identity.");
  if (state.processedIds.includes(lead.externalJobId)) return;
  await screenshot(page, lead.externalJobId, "reviewed");
  const serverResult = await api(config, "/api/connectors/home-depot/leads", { method: "POST", body: lead });
  const decision = shouldClaim({ lead, serverResult, config, state });
  if (!decision.allowed) {
    state.processedIds.push(lead.externalJobId);
    await report(config, "skipped", `${lead.customerName}: ${decision.reason}`, lead.externalJobId);
    return;
  }
  await revealContact(page);
  const revealed = await extractLead(page);
  const updated = await api(config, "/api/connectors/home-depot/leads", { method: "POST", body: revealed });
  state.claimedIds.push(lead.externalJobId);
  await screenshot(page, lead.externalJobId, "claimed");
  const category = approvedCategory(revealed.service, config.approvedMessageCategories);
  if (config.automaticFirstContact && category && !updated.alreadyContacted && !state.messagedIds.includes(lead.externalJobId)) {
    const message = firstContactMessage(revealed, category);
    await sendMessage(page, message);
    state.messagedIds.push(lead.externalJobId);
    await api(config, `/api/connectors/home-depot/leads/${updated.lead.id}/contact-events`, { method: "POST", body: { channel: "home_depot_message", message } });
    await screenshot(page, lead.externalJobId, "messaged");
  }
  state.processedIds.push(lead.externalJobId);
}

async function discoverLeadUrls(page) {
  if (!page.url().includes("proreferral.homedepot.com")) await page.goto(dashboardUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.goto(dashboardUrl, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
  await wait(1200);
  return page.locator('a[href*="/dashboard/new/"]').evaluateAll((anchors) => [...new Set(anchors.map((anchor) => anchor.href))]);
}

async function main() {
  await fs.mkdir(dataRoot, { recursive: true });
  const config = await readJson(configPath, null);
  if (!config || !config.connectorKey || config.connectorKey.includes("PASTE_")) throw new Error("Set the connectorKey in config.json before starting the worker.");
  const executablePath = (await Promise.all(chromeExecutable().map(async (candidate) => ({ candidate, exists: await fs.access(candidate).then(() => true).catch(() => false) })))).find((item) => item.exists)?.candidate;
  if (!executablePath) throw new Error("Google Chrome or Microsoft Edge was not found.");
  const state = { ...defaultState(), ...(await readJson(statePath, defaultState())) };
  const context = await chromium.launchPersistentContext(profileRoot, { executablePath, headless: false, viewport: null, args: ["--start-maximized"], slowMo: 75 });
  const page = context.pages()[0] || await context.newPage();
  let lastHeartbeat = 0;
  let attentionReported = false;
  process.on("SIGINT", async () => { await writeJsonAtomic(statePath, state); await context.close(); process.exit(0); });
  while (true) {
    try {
      const urls = await discoverLeadUrls(page);
      const authRequired = /\/auth\/|\/error\/401/i.test(page.url()) || /sign in/i.test(await page.locator("body").innerText().catch(() => ""));
      if (authRequired) {
        if (!attentionReported) await report(config, "attention", "Home Depot sign-in or verification is required in the worker browser.");
        attentionReported = true;
      } else {
        attentionReported = false;
        for (const url of urls) {
          if (!state.processedIds.includes(url.split("/").filter(Boolean).at(-1))) {
            try { await processLead(page, url, config, state); }
            catch (error) { await screenshot(page, url.split("/").at(-1), "error"); await report(config, "error", error.message, url.split("/").filter(Boolean).at(-1)); }
            await writeJsonAtomic(statePath, state);
          }
        }
      }
      if (Date.now() - lastHeartbeat > 15 * 60 * 1000) {
        await report(config, "heartbeat", `Worker online; ${state.claimedIds.length} claimed and ${state.messagedIds.length} messaged.`);
        lastHeartbeat = Date.now();
      }
    } catch (error) {
      console.error(new Date().toISOString(), error);
      await report(config, "error", error.message);
    }
    await wait(Math.max(20, Number(config.pollSeconds) || 45) * 1000);
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
