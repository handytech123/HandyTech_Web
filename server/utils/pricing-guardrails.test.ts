import assert from "node:assert/strict";
import { calculatePricingGuardrails, marketReferenceFor } from "./pricing-guardrails";

const local = calculatePricingGuardrails({ serviceName: "Drywall patch", proposedPrice: 300, ownerHours: 2.2, helperHours: 0, suppliedMaterialsCost: 40, distanceMiles: 8, includeContingency: false });
assert.deepEqual(local.roundedHours, { owner: 3, helper: 0 });
assert.equal(local.pricing.minimumPrice, 75);
assert.equal(local.pricing.customerMaterials, 46);
assert.equal(local.market.label, "Small drywall patch/repair");

const distant = calculatePricingGuardrails({ serviceName: "Custom repair", proposedPrice: 100, ownerHours: 1, helperHours: 1, suppliedMaterialsCost: 0, distanceMiles: 11, includeContingency: false });
assert.equal(distant.pricing.minimumPrice, 150);
assert.ok(distant.warnings.some((warning) => warning.includes("$150")));

const uncertain = calculatePricingGuardrails({ serviceName: "Custom repair", proposedPrice: 500, ownerHours: 4, helperHours: 0, suppliedMaterialsCost: 50, distanceMiles: 2, includeContingency: true });
assert.ok(uncertain.pricing.contingency > 0);
assert.ok(uncertain.warnings.some((warning) => warning.includes("contingency")));
assert.equal(marketReferenceFor("unknown work").label, "General handyman project");

const large = calculatePricingGuardrails({ serviceName: "Drywall replacement", proposedPrice: 5000, ownerHours: 17, helperHours: 0, suppliedMaterialsCost: 500, distanceMiles: 20, includeContingency: false });
assert.equal(large.market.applicable, false);
assert.equal(large.warnings.some((warning) => warning.includes("public small drywall")), false);

console.log("Pricing guardrail tests passed");
