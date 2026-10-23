const assert = require("node:assert/strict");
const fs = require("node:fs");

const content = fs.readFileSync("tools/home-depot-connector/content.js", "utf8");
const manifest = JSON.parse(fs.readFileSync("tools/home-depot-connector/manifest.json", "utf8"));

assert.equal(manifest.version, "1.2.0");
assert.match(content, /show number\|contact now/i);
assert.match(content, /autoClaimEligible/);
assert.match(content, /leadCostPoints != null/);
assert.doesNotMatch(content, /create-customer|create-quote|\/api\/admin\/os\/requests/);
assert.match(content, /painting/);
assert.match(content, /toilet/);
assert.match(content, /drywall\|sheetrock/);
assert.match(content, /door\\s\+lock/);
assert.match(content, /messagedLeadIds/);
assert.doesNotMatch(content, /send.*sms|send.*email/i);
console.log("Home Depot connector tests passed");
