import crypto from "node:crypto";

export type HomeDepotMail = {
  messageId: string;
  from: string;
  replyTo?: string | null;
  subject: string;
  text: string;
  receivedAt: Date;
};

export type ParsedHomeDepotMail = {
  externalJobId: string | null;
  customerName: string | null;
  service: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  customerTimeframe: string | null;
  customerNotes: string | null;
  leadCostPoints: number | null;
  portalUrl: string | null;
};

const clean = (value?: string | null) => String(value || "").replace(/\r/g, "").replace(/[ \t]+/g, " ").trim();
const field = (text: string, label: string, next: string[]) => {
  const stop = next.map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return clean(text.match(new RegExp(`${label}\\s*:?\\s*(.+?)(?=\\n(?:${stop})\\s*:|$)`, "is"))?.[1]);
};

export function isHomeDepotReferralMail(mail: Pick<HomeDepotMail, "from" | "subject" | "text">): boolean {
  const identity = `${mail.from} ${mail.subject} ${mail.text.slice(0, 2000)}`.toLowerCase();
  const senderTrusted = /@(homedepot\.com|proreferral\.com)\b/.test(mail.from.toLowerCase());
  return senderTrusted && /(pro referral|home depot).*(lead|job|message)|(lead|job|message).*(pro referral|home depot)/i.test(identity);
}

export function parseHomeDepotMail(mail: HomeDepotMail): ParsedHomeDepotMail {
  const text = clean(mail.text).replace(/\s*(Job ID|Service|Location|Customer Timeframe|Customer notes|Lead cost|Respond by)\s*:/gi, "\n$1: ");
  const url = text.match(/https:\/\/[^\s<>"']*(?:proreferral|homedepot)[^\s<>"']*/i)?.[0]?.replace(/[).,]+$/, "") || null;
  const location = field(text, "Location", ["Service", "Customer Timeframe", "Customer notes", "Lead cost", "Respond by"]);
  const zip = location.match(/\b\d{5}(?:-\d{4})?\b/)?.[0] || null;
  const state = location.match(/\b([A-Z]{2})\s+\d{5}/i)?.[1]?.toUpperCase() || null;
  const city = clean(location.replace(/,?\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?.*$/i, "")) || null;
  const jobId = field(text, "Job ID", ["Service", "Location", "Customer Timeframe", "Customer notes", "Lead cost"])
    || text.match(/\b(?:Job|Lead)\s*(?:ID|#)\s*:?\s*([A-Z0-9-]{2,120})/i)?.[1]
    || null;
  const service = field(text, "Service", ["Location", "Customer Timeframe", "Customer notes", "Lead cost", "Respond by"]) || null;
  const customerName = field(text, "Customer", ["Job ID", "Service", "Location", "Customer Timeframe", "Customer notes"])
    || text.match(/(?:NEW|POTENTIAL)\s+([A-Z][A-Za-z' -]{1,100}?)(?:\s+Received|\s+Job status)/i)?.[1]
    || null;
  const pointText = field(text, "Lead cost", ["Respond by", "Customer notes"]);
  return {
    externalJobId: jobId ? clean(jobId) : null,
    customerName: customerName ? clean(customerName) : null,
    service: service ? clean(service) : null,
    city,
    state,
    zip,
    customerTimeframe: field(text, "Customer Timeframe", ["Customer notes", "Lead cost", "Respond by"]) || null,
    customerNotes: field(text, "Customer notes", ["Lead cost", "Respond by"]) || null,
    leadCostPoints: Number(pointText.match(/\d+/)?.[0]) || null,
    portalUrl: url,
  };
}

export function stableMailId(mail: Pick<HomeDepotMail, "messageId" | "from" | "subject" | "receivedAt">): string {
  if (clean(mail.messageId)) return clean(mail.messageId).slice(0, 500);
  return crypto.createHash("sha256").update(`${mail.from}|${mail.subject}|${mail.receivedAt.toISOString()}`).digest("hex");
}

export type ReferralRule = {
  servicePattern: string;
  enabled: boolean;
  responseMode: "draft" | "trusted";
  responseTemplate: string;
  maxLeadCostPoints?: number | null;
  allowedZipPrefixes?: string[] | null;
  excludedTerms?: string[] | null;
  minimumScore: number;
};

export function evaluateReferralRule(rule: ReferralRule, lead: ParsedHomeDepotMail, score: number) {
  const text = `${lead.service || ""} ${lead.customerNotes || ""}`.toLowerCase();
  const matchesService = new RegExp(rule.servicePattern, "i").test(lead.service || "");
  const reasons: string[] = [];
  if (!rule.enabled) reasons.push("Rule is disabled");
  if (!matchesService) reasons.push("Service does not match the rule");
  if (score < rule.minimumScore) reasons.push("Lead score is below the rule minimum");
  if (rule.maxLeadCostPoints != null && (lead.leadCostPoints == null || lead.leadCostPoints > rule.maxLeadCostPoints)) reasons.push("Lead point cost is unavailable or above the limit");
  if (rule.allowedZipPrefixes?.length && (!lead.zip || !rule.allowedZipPrefixes.some((prefix) => lead.zip!.startsWith(prefix)))) reasons.push("ZIP code is outside the approved list");
  if (rule.excludedTerms?.some((term) => text.includes(term.toLowerCase()))) reasons.push("Lead contains an excluded term");
  return { approved: reasons.length === 0, reasons };
}

export function renderReferralResponse(template: string, values: { customerName: string; service: string }) {
  return template.replaceAll("{{customer_name}}", values.customerName).replaceAll("{{service}}", values.service).trim();
}
