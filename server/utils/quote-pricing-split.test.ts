import assert from "node:assert/strict";
import { extractExplicitQuotePricing } from "./quote-pricing-split";

assert.deepEqual(
  extractExplicitQuotePricing("Fixed Labor: $4,000.00\nEstimated Materials: $900.00"),
  { labor: 4000, materials: 900 },
);
assert.deepEqual(
  extractExplicitQuotePricing("Labor cost - $1,275\nMaterials allowance is $225.50"),
  { labor: 1275, materials: 225.5 },
);
assert.deepEqual(
  extractExplicitQuotePricing("Labor and standard materials included. Project price: $1,050"),
  { labor: null, materials: null },
);

console.log("Quote pricing split tests passed");

