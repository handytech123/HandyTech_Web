import assert from "node:assert/strict";
import { evaluateReferralRule, isHomeDepotReferralMail, parseHomeDepotMail, renderReferralResponse, stableMailId } from "./home-depot-mail.js";

const mail = {
  messageId: "<lead-1042@proreferral.com>",
  from: "notifications@proreferral.com",
  replyTo: "customer-relay@proreferral.com",
  subject: "New Home Depot Pro Referral lead",
  receivedAt: new Date("2026-09-18T14:00:00Z"),
  text: "Customer: Mary Johnson\nJob ID: HD-1042\nService: Furniture Assembly\nLocation: St. Louis, MO 63109\nCustomer Timeframe: Ready this week\nCustomer notes: Assemble two cabinets\nLead cost: 35 points\nhttps://proreferral.homedepot.com/dashboard/leads/HD-1042",
};
assert.equal(isHomeDepotReferralMail(mail), true);
const lead = parseHomeDepotMail(mail);
assert.deepEqual({ id: lead.externalJobId, name: lead.customerName, service: lead.service, zip: lead.zip, points: lead.leadCostPoints }, { id: "HD-1042", name: "Mary Johnson", service: "Furniture Assembly", zip: "63109", points: 35 });
assert.equal(stableMailId(mail), mail.messageId);
const decision = evaluateReferralRule({ servicePattern: "assembly", enabled: true, responseMode: "trusted", responseTemplate: "Hi {{customer_name}}", maxLeadCostPoints: 40, allowedZipPrefixes: ["631"], excludedTerms: ["gas line"], minimumScore: 70 }, lead, 85);
assert.equal(decision.approved, true);
assert.equal(evaluateReferralRule({ servicePattern: "assembly", enabled: true, responseMode: "trusted", responseTemplate: "x", maxLeadCostPoints: 20, minimumScore: 70 }, lead, 85).approved, false);
assert.equal(renderReferralResponse("Hi {{customer_name}}, we can review your {{service}} project.", { customerName: "Mary", service: "assembly" }), "Hi Mary, we can review your assembly project.");
console.log("Home Depot mail automation tests passed");
