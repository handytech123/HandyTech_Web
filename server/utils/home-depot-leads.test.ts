import assert from "node:assert/strict";
import { connectorKeyMatches, scoreHomeDepotLead } from "./home-depot-leads.js";

const strong = scoreHomeDepotLead({ externalJobId: "W-1", customerName: "Test Person", service: "Furniture Assembly", city: "St. Louis", state: "MO", zip: "63101", customerNotes: "Assemble a customer-provided cabinet in the living room.", leadCostPoints: 40 });
assert.equal(strong.recommendation, "strong_match");
assert.ok(strong.score >= 75);

const unsafe = scoreHomeDepotLead({ externalJobId: "W-2", customerName: "Test Person", service: "Gas line repair", city: "St. Louis", state: "MO", zip: "63101", customerNotes: "Repair the damaged gas line in the basement.", leadCostPoints: 10 });
assert.equal(unsafe.recommendation, "pass");
assert.ok(unsafe.blockers.some((reason) => reason.includes("specialist")));

const key = "a".repeat(48);
assert.equal(connectorKeyMatches(key, key), true);
assert.equal(connectorKeyMatches("wrong", key), false);
assert.equal(connectorKeyMatches(key, "short"), false);
console.log("Home Depot lead tests passed");
