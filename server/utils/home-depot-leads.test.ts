import assert from "node:assert/strict";
import fs from "node:fs";
import { connectorKeyMatches, scoreHomeDepotLead } from "./home-depot-leads.js";

const strong = scoreHomeDepotLead({ externalJobId: "W-1", customerName: "Test Person", service: "Furniture Assembly", city: "St. Louis", state: "MO", zip: "63101", customerNotes: "Assemble a customer-provided cabinet in the living room.", leadCostPoints: 40 });
assert.equal(strong.recommendation, "strong_match");
assert.ok(strong.score >= 75);
assert.equal(strong.autoClaimEligible, true);

const limitedDetails = scoreHomeDepotLead({ externalJobId: "W-3", customerName: "Test Person", service: "Television Mount", city: "Florissant", state: "MO", zip: "63031", customerNotes: "", leadCostPoints: 40 });
assert.equal(limitedDetails.recommendation, "review");
assert.equal(limitedDetails.autoClaimEligible, true);

const unsafe = scoreHomeDepotLead({ externalJobId: "W-2", customerName: "Test Person", service: "Gas line repair", city: "St. Louis", state: "MO", zip: "63101", customerNotes: "Repair the damaged gas line in the basement.", leadCostPoints: 10 });
assert.equal(unsafe.recommendation, "pass");
assert.ok(unsafe.blockers.some((reason) => reason.includes("specialist")));
assert.equal(unsafe.autoClaimEligible, false);

const key = "a".repeat(48);
assert.equal(connectorKeyMatches(key, key), true);
assert.equal(connectorKeyMatches("wrong", key), false);
assert.equal(connectorKeyMatches(key, "short"), false);

const routesSource = fs.readFileSync("server/routes.ts", "utf8");
const connectorRoute = routesSource.slice(
  routesSource.indexOf('app.post("/api/connectors/home-depot/leads"'),
  routesSource.indexOf('app.patch("/api/admin/referral-leads/:id"'),
);
assert.ok(connectorRoute.includes("autoClaimEligible"));
assert.ok(connectorRoute.includes("alreadyContacted"));
assert.ok(!connectorRoute.includes("mirrorReferralAsRequest"), "Home Depot retrieval must not create Requests");
console.log("Home Depot lead tests passed");
