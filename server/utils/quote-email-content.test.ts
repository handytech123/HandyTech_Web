import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const mailSource = fs.readFileSync(path.join(process.cwd(), "server/utils/mail.ts"), "utf8");
const methodStart = mailSource.indexOf("async sendPreparedQuote");
const customerSendStart = mailSource.indexOf("await this.transporter.sendMail", methodStart);
const adminCopyStart = mailSource.indexOf("try {", customerSendStart);

assert.ok(methodStart >= 0 && customerSendStart > methodStart && adminCopyStart > customerSendStart, "Prepared quote email sections are missing");
const customerEmail = mailSource.slice(customerSendStart, adminCopyStart);
assert.ok(customerEmail.includes("complete scope and pricing"), "Customer email must direct the recipient to review the quote");
assert.ok(!customerEmail.includes("data.total"), "Customer quote email must not expose the quote total");
assert.ok(!customerEmail.includes("estimatedLaborAmount"), "Customer quote email must not expose the labor amount");
assert.ok(!customerEmail.includes("estimatedMaterialAmount"), "Customer quote email must not expose the material amount");
assert.ok(!customerEmail.includes("money("), "Customer quote email must not contain formatted dollar figures");
assert.ok(!customerEmail.includes("<strong>Total:"), "Customer quote email must not contain a visible total label");
assert.ok(mailSource.slice(adminCopyStart).includes("money(data.total)"), "The private admin copy should retain the quote total");

console.log("Quote customer email content tests passed");
