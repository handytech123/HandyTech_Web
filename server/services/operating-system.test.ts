import assert from "node:assert/strict";
import { normalizeAddress, normalizePhone } from "./operating-system-normalization";

assert.equal(normalizePhone("(314) 555-0123"), "3145550123");
assert.equal(normalizePhone(null), "");
assert.equal(
  normalizeAddress({ street: " 123  Main St ", city: " St. Louis ", state: "MO", zip: "63101" }),
  "123 main st|st. louis|mo|63101",
);
assert.notEqual(
  normalizeAddress({ street: "123 Main St", city: "St. Louis", state: "MO", zip: "63101" }),
  normalizeAddress({ street: "123 Main St", city: "St. Louis", state: "MO", zip: "63102" }),
);

console.log("Operating-system normalization tests passed");
