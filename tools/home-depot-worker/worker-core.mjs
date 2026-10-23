export const APPROVED_CATEGORY_PATTERNS = Object.freeze({
  painting: /\b(?:interior|exterior)?\s*paint(?:ing)?\b/i,
  toilet: /\btoilet(?:s)?\b/i,
  drywall: /\b(?:drywall|sheetrock)\b/i,
  door_lock: /\b(?:door\s+lock|deadbolt|lockset|door\s+hardware)\b/i,
});

export function approvedCategory(service, allowed = Object.keys(APPROVED_CATEGORY_PATTERNS)) {
  return allowed.find((category) => APPROVED_CATEGORY_PATTERNS[category]?.test(String(service || ""))) || null;
}

export function firstContactMessage(lead, category) {
  const firstName = String(lead.customerName || "there").trim().split(/\s+/)[0] || "there";
  const location = lead.city ? ` in ${lead.city}` : "";
  const service = category === "door_lock" ? "door-lock" : category;
  return `Hi ${firstName}, this is Lou with HandyTech Solutions. I received your Home Depot request for ${service} work${location}. I'd be glad to help. Could you send a few details or photos of the project and let me know what days or times work best for you?`;
}

export function shouldClaim({ lead, serverResult, config, state }) {
  if (!config.automaticClaiming) return { allowed: false, reason: "automatic claiming is off" };
  if (state.claimedIds.includes(lead.externalJobId)) return { allowed: false, reason: "already claimed" };
  if (lead.leadCostPoints == null) return { allowed: false, reason: "point cost is not visible" };
  if (lead.leadCostPoints > config.maximumPointsPerLead) return { allowed: false, reason: "point limit exceeded" };
  if (!serverResult.autoClaimEligible || serverResult.lead.score < config.minimumFitScore) return { allowed: false, reason: "server eligibility checks require review" };
  return { allowed: true, reason: "eligible" };
}

export function defaultState() {
  return { version: 1, processedIds: [], claimedIds: [], messagedIds: [], lastHeartbeatAt: null };
}
