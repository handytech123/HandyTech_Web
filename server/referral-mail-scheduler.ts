import { ImapFlow } from "imapflow";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { EmailService } from "./utils/mail";
import { evaluateReferralRule, isHomeDepotReferralMail, parseHomeDepotMail, renderReferralResponse, stableMailId, type HomeDepotMail, type ReferralRule } from "./utils/home-depot-mail";
import { scoreHomeDepotLead } from "./utils/home-depot-leads";
import { mirrorReferralAsRequest } from "./services/operating-system";

const address = (value: any) => { const item = Array.isArray(value) ? value[0] : value; return item?.address ? String(item.address).trim().toLowerCase() : ""; };
const decodeQuotedPrintable = (value: string) => value.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/gi, (_match, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
function readableMessage(source: Buffer) {
  const raw = source.toString("utf8");
  const base64Parts = Array.from(raw.matchAll(/Content-Transfer-Encoding:\s*base64[\s\S]*?\r?\n\r?\n([A-Za-z0-9+/=\r\n]+?)(?=\r?\n--|$)/gi)).map((match) => { try { return Buffer.from(match[1].replace(/\s/g, ""), "base64").toString("utf8"); } catch { return ""; } });
  return `${decodeQuotedPrintable(raw)}\n${base64Parts.join("\n")}`.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&");
}
function safeReplyAddress(value?: string | null) {
  const email = String(value || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /no-?reply|do-?not-?reply|mailer-daemon/i.test(email)) return null;
  return email;
}

export class ReferralMailScheduler {
  private interval?: NodeJS.Timeout;
  private running = false;
  private email = new EmailService();
  start() {
    if (this.interval || process.env.HOME_DEPOT_MAIL_AUTOMATION_ENABLED === "false") return;
    if (!(process.env.IMAP_USER || process.env.SMTP_USER) || !(process.env.IMAP_PASS || process.env.SMTP_PASS)) { console.log("Home Depot mailbox automation inactive: IMAP credentials unavailable"); return; }
    const minutes = Math.max(2, Number(process.env.HOME_DEPOT_MAIL_POLL_MINUTES || 5));
    this.interval = setInterval(() => void this.poll(), minutes * 60_000);
    setTimeout(() => void this.poll(), 20_000);
    console.log(`Home Depot mailbox automation started (${minutes}-minute polling)`);
  }
  async poll() {
    if (this.running) return;
    this.running = true;
    const client = new ImapFlow({ host: process.env.IMAP_HOST || "imap.ionos.com", port: Number(process.env.IMAP_PORT || 993), secure: process.env.IMAP_SECURE !== "false", auth: { user: process.env.IMAP_USER || process.env.SMTP_USER || "", pass: process.env.IMAP_PASS || process.env.SMTP_PASS || "" }, logger: false, connectionTimeout: 30_000, greetingTimeout: 15_000, socketTimeout: 60_000 });
    try {
      await client.connect();
      await client.mailboxOpen(process.env.IMAP_INBOX_FOLDER || "INBOX", { readOnly: true });
      const since = new Date(Date.now() - Math.max(1, Number(process.env.HOME_DEPOT_MAIL_LOOKBACK_DAYS || 7)) * 86_400_000);
      const searchResult = await client.search({ since }, { uid: true });
      const uids = Array.isArray(searchResult) ? searchResult : [];
      for (const uid of uids.slice(-200)) {
        const message: any = await client.fetchOne(uid, { envelope: true, source: true }, { uid: true });
        if (!message?.source || !message.envelope) continue;
        const mail: HomeDepotMail = { messageId: String(message.envelope.messageId || ""), from: address(message.envelope.from), replyTo: address(message.envelope.replyTo) || null, subject: String(message.envelope.subject || ""), text: readableMessage(message.source), receivedAt: message.envelope.date || new Date() };
        if (isHomeDepotReferralMail(mail)) await this.process(mail);
      }
    } catch (error) { console.error("Home Depot mailbox poll failed:", error); }
    finally { if (client.usable) await client.logout().catch(() => undefined); this.running = false; }
  }
  private async process(mail: HomeDepotMail) {
    const messageId = stableMailId(mail);
    const inserted = await db.execute(sql`INSERT INTO inbound_mail_events(message_id,sender,reply_to,subject,received_at,raw_excerpt,status) VALUES (${messageId},${mail.from},${mail.replyTo || null},${mail.subject},${mail.receivedAt},${mail.text.slice(0, 8000)},'received') ON CONFLICT(message_id) DO NOTHING RETURNING id`);
    const eventId = Number((inserted as any).rows?.[0]?.id || 0); if (!eventId) return;
    try {
      const parsed = parseHomeDepotMail(mail);
      await db.execute(sql`UPDATE inbound_mail_events SET parsed_payload=${JSON.stringify(parsed)}::jsonb,updated_at=NOW() WHERE id=${eventId}`);
      if (!parsed.externalJobId || !parsed.customerName || !parsed.service) {
        const payload = { subject: mail.subject, parsed, missing: [!parsed.externalJobId && "job_id", !parsed.customerName && "customer_name", !parsed.service && "service"].filter(Boolean) };
        const action = await db.execute(sql`INSERT INTO automation_actions(action_type,entity_type,entity_id,risk_level,proposed_payload,status,prepared_by) VALUES ('review_referral_email','inbound_mail_event',${String(eventId)},'low',${JSON.stringify(payload)}::jsonb,'prepared','mailbox') RETURNING id`);
        await db.execute(sql`UPDATE inbound_mail_events SET status='needs_review',automation_action_id=${Number((action as any).rows?.[0]?.id)},processed_at=NOW(),updated_at=NOW() WHERE id=${eventId}`); return;
      }
      const rating = scoreHomeDepotLead({ ...parsed, externalJobId: parsed.externalJobId, customerName: parsed.customerName, service: parsed.service });
      const leadResult = await db.execute(sql`INSERT INTO referral_leads(provider,external_job_id,customer_name,service,city,state,zip,customer_timeframe,customer_notes,lead_cost_points,portal_url,status,score,score_reasons,last_synced_at,updated_at) VALUES ('home_depot',${parsed.externalJobId},${parsed.customerName},${parsed.service},${parsed.city},${parsed.state},${parsed.zip},${parsed.customerTimeframe},${parsed.customerNotes},${parsed.leadCostPoints},${parsed.portalUrl},${rating.recommendation === "strong_match" ? "reviewing" : rating.recommendation === "pass" ? "passed" : "new"},${rating.score},${rating.reasons},NOW(),NOW()) ON CONFLICT(external_job_id) DO UPDATE SET customer_name=EXCLUDED.customer_name,service=EXCLUDED.service,city=COALESCE(EXCLUDED.city,referral_leads.city),state=COALESCE(EXCLUDED.state,referral_leads.state),zip=COALESCE(EXCLUDED.zip,referral_leads.zip),customer_timeframe=COALESCE(EXCLUDED.customer_timeframe,referral_leads.customer_timeframe),customer_notes=COALESCE(EXCLUDED.customer_notes,referral_leads.customer_notes),lead_cost_points=COALESCE(EXCLUDED.lead_cost_points,referral_leads.lead_cost_points),portal_url=COALESCE(EXCLUDED.portal_url,referral_leads.portal_url),score=EXCLUDED.score,score_reasons=EXCLUDED.score_reasons,last_synced_at=NOW(),updated_at=NOW() RETURNING *`);
      const lead = (leadResult as any).rows[0]; const requestId = await mirrorReferralAsRequest(lead);
      const rulesResult = await db.execute(sql`SELECT * FROM referral_automation_rules WHERE enabled=true ORDER BY id`); const rules = ((rulesResult as any).rows || []) as any[];
      const matched = rules.find((candidate) => { try { return new RegExp(candidate.service_pattern, "i").test(parsed.service!); } catch { return false; } });
      let actionId: number | null = null; let status = "imported";
      if (matched) {
        const rule: ReferralRule = { servicePattern: matched.service_pattern, enabled: matched.enabled, responseMode: matched.response_mode, responseTemplate: matched.response_template, minimumScore: matched.minimum_score, maxLeadCostPoints: matched.max_lead_cost_points, allowedZipPrefixes: matched.allowed_zip_prefixes, excludedTerms: matched.excluded_terms };
        const decision = evaluateReferralRule(rule, parsed, rating.score); const recipient = safeReplyAddress(mail.replyTo); const body = renderReferralResponse(rule.responseTemplate, { customerName: parsed.customerName, service: parsed.service });
        const proposed = { eventId, requestId, ruleId: matched.id, recipient, subject: `Re: ${mail.subject}`, body, decision };
        const actionResult = await db.execute(sql`INSERT INTO automation_actions(action_type,entity_type,entity_id,risk_level,proposed_payload,status,prepared_by) VALUES ('respond_to_referral','referral_lead',${String(lead.id)},'medium',${JSON.stringify(proposed)}::jsonb,${decision.approved && rule.responseMode === "trusted" && recipient ? "approved" : "prepared"},'mailbox') RETURNING id`); actionId = Number((actionResult as any).rows?.[0]?.id);
        if (decision.approved && rule.responseMode === "trusted" && recipient) { await this.email.sendReferralAutomationResponse({ recipient, subject: `Re: ${mail.subject}`, body, messageId: messageId.startsWith("<") ? messageId : null }); await db.execute(sql`UPDATE automation_actions SET status='executed',approved_by='trusted_rule',approved_at=NOW(),executed_at=NOW(),outcome='sent',updated_at=NOW() WHERE id=${actionId}`); status = "responded"; } else status = "response_prepared";
      }
      await db.execute(sql`UPDATE inbound_mail_events SET status=${status},referral_lead_id=${Number(lead.id)},request_id=${requestId || null},automation_action_id=${actionId},processed_at=NOW(),updated_at=NOW() WHERE id=${eventId}`);
      if (requestId) await db.execute(sql`INSERT INTO activity_events(request_id,entity_type,entity_id,event_type,summary,channel,direction,visibility,metadata,occurred_at) VALUES (${requestId},'inbound_mail_event',${String(eventId)},'referral_email_received','Home Depot referral email imported','email','inbound','internal',${JSON.stringify({ messageId, status })}::jsonb,${mail.receivedAt})`);
    } catch (error) { await db.execute(sql`UPDATE inbound_mail_events SET status='failed',error=${error instanceof Error ? error.message.slice(0, 2000) : "Unknown processing error"},processed_at=NOW(),updated_at=NOW() WHERE id=${eventId}`); throw error; }
  }
}
export const referralMailScheduler = new ReferralMailScheduler();
