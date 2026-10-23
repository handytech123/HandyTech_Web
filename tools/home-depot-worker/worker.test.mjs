import assert from "node:assert/strict";
import { approvedCategory, defaultState, firstContactMessage, shouldClaim } from "./worker-core.mjs";

assert.equal(approvedCategory("Interior Painting"), "painting");
assert.equal(approvedCategory("Toilet Replacement"), "toilet");
assert.equal(approvedCategory("Drywall/Sheetrock Installation"), "drywall");
assert.equal(approvedCategory("Install a new deadbolt"), "door_lock");
assert.equal(approvedCategory("Furniture Assembly"), null);
assert.match(firstContactMessage({ customerName: "Taylor Smith", city: "Florissant" }, "painting"), /^Hi Taylor, this is Lou with HandyTech Solutions\./);
const lead = { externalJobId: "W-1", leadCostPoints: 40 };
const result = { autoClaimEligible: true, lead: { score: 90 } };
const config = { automaticClaiming: true, maximumPointsPerLead: 40, minimumFitScore: 75 };
assert.equal(shouldClaim({ lead, serverResult: result, config, state: defaultState() }).allowed, true);
assert.equal(shouldClaim({ lead: { ...lead, leadCostPoints: 41 }, serverResult: result, config, state: defaultState() }).allowed, false);
assert.equal(shouldClaim({ lead, serverResult: result, config, state: { ...defaultState(), claimedIds: ["W-1"] } }).allowed, false);
console.log("Home Depot worker tests passed");
