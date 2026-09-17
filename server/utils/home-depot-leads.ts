import crypto from "crypto";
import { z } from "zod";

export const homeDepotLeadInput = z.object({
  externalJobId: z.string().trim().min(2).max(120),
  customerName: z.string().trim().min(2).max(200),
  email: z.string().trim().email().max(254).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  service: z.string().trim().min(2).max(200),
  city: z.string().trim().max(120).nullable().optional(),
  state: z.string().trim().max(40).nullable().optional(),
  zip: z.string().trim().max(20).nullable().optional(),
  customerTimeframe: z.string().trim().max(200).nullable().optional(),
  customerNotes: z.string().trim().max(6000).nullable().optional(),
  photoUrls: z.array(z.string().url().max(2000)).max(20).optional(),
  leadCostPoints: z.number().int().min(0).max(100000).nullable().optional(),
  responseDueAt: z.coerce.date().nullable().optional(),
  portalUrl: z.string().url().max(2000).nullable().optional(),
});

export type HomeDepotLeadInput = {
  externalJobId: string;
  customerName: string;
  service: string;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  customerTimeframe?: string | null;
  customerNotes?: string | null;
  photoUrls?: string[] | null;
  leadCostPoints?: number | null;
  responseDueAt?: Date | null;
  portalUrl?: string | null;
};

export function scoreHomeDepotLead(input: HomeDepotLeadInput) {
  let score = 40;
  const reasons: string[] = [];
  const blockers: string[] = [];
  const text = `${input.service} ${input.customerNotes || ""}`.toLowerCase();
  const strongFits = ["assembly", "mount", "painting", "drywall", "fixture", "faucet", "toilet", "door", "carpentry", "repair", "installation", "pressure wash", "deck"];
  const specialistWork = ["roof", "foundation", "major structural", "service panel", "gas line", "sewer main", "asbestos", "mold remediation"];

  if (strongFits.some((term) => text.includes(term))) {
    score += 25;
    reasons.push("Matches a core HandyTech service");
  } else {
    blockers.push("Service is not an established automatic match");
  }
  if (input.city && input.zip) {
    score += 10;
    reasons.push("Location is identified");
  } else {
    blockers.push("Location is incomplete");
  }
  if ((input.customerNotes || "").trim().length >= 20) {
    score += 10;
    reasons.push("Project details are available");
  } else {
    blockers.push("Project details are limited");
  }
  if ((input.leadCostPoints ?? 0) <= 40) {
    score += 5;
    reasons.push("Lead cost is at or below 40 points");
  }
  if (/asap|soon|this week|ready/i.test(input.customerTimeframe || "")) {
    score += 10;
    reasons.push("Customer appears ready to schedule");
  }
  if (specialistWork.some((term) => text.includes(term))) {
    score -= 45;
    blockers.push("Possible licensed, hazardous, or specialist work");
  }

  const normalizedScore = Math.max(0, Math.min(100, score));
  return {
    score: normalizedScore,
    reasons: [...reasons, ...blockers],
    recommendation: blockers.length === 0 && normalizedScore >= 75 ? "strong_match" : normalizedScore >= 55 ? "review" : "pass",
    blockers,
  };
}

export function connectorKeyMatches(candidate: unknown, configured = process.env.HOME_DEPOT_CONNECTOR_KEY) {
  configured = configured || homeDepotConnectorKey();
  if (typeof candidate !== "string" || !configured || configured.length < 32) return false;
  const supplied = crypto.createHash("sha256").update(candidate).digest();
  const expected = crypto.createHash("sha256").update(configured).digest();
  return crypto.timingSafeEqual(supplied, expected);
}

export function homeDepotConnectorKey() {
  if (process.env.HOME_DEPOT_CONNECTOR_KEY && process.env.HOME_DEPOT_CONNECTOR_KEY.length >= 32) {
    return process.env.HOME_DEPOT_CONNECTOR_KEY;
  }
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) return "";
  return crypto.createHmac("sha256", secret).update("handytech-home-depot-connector-v1").digest("hex");
}
