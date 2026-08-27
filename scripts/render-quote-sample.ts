import fs from "node:fs/promises";
import path from "node:path";
import { generateQuotePdfBuffer } from "../server/utils/quote-pdf";

const now = new Date();
const validUntil = new Date(now); validUntil.setDate(validUntil.getDate() + 14);
const quote: any = {
  id: 9999, firstName: "Jordan", lastName: "Customer", email: "jordan@example.com", phone: "314-555-0142",
  street: "123 Sample Street", city: "St. Louis", state: "MO", zip: "63101", serviceNeeded: "Home office improvements",
};
const proposal: any = {
  id: 9999, quoteId: 9999, quoteNumber: "HT-2026-SAMPLE", tokenHash: "", sentAt: now, validUntil,
  lineItems: [
    { description: "Wall preparation and interior painting", quantity: 1, rate: 780 },
    { description: "Custom shelving installation", quantity: 6, rate: 85 },
    { description: "Materials and jobsite protection", quantity: 1, rate: 240 },
  ],
  discount: 100, taxRate: 0, subtotal: 1530, tax: 0, total: 1430,
  notes: "Includes labor, standard materials, surface preparation, and cleanup. Color selection and final scheduling will be confirmed before work begins.",
  status: "sent", viewedAt: null, respondedAt: null, signerName: null, signatureUrl: null, acceptedTerms: false,
  customerMessage: null, decisionIp: null, decisionUserAgent: null, updatedAt: now,
};

const output = path.resolve("output/pdf/handytech-quote-sample.pdf");
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, await generateQuotePdfBuffer(quote, proposal));
console.log(output);
