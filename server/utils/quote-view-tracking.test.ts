import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const routes = fs.readFileSync(path.join(process.cwd(), "server/routes.ts"), "utf8");
const page = fs.readFileSync(path.join(process.cwd(), "client/src/pages/quote-proposal.tsx"), "utf8");
const loadStart = routes.indexOf('app.get("/api/quote-proposals/:token"');
const viewStart = routes.indexOf('app.post("/api/quote-proposals/:token/view"');
const pdfStart = routes.indexOf('app.get("/api/quote-proposals/:token/pdf"');

assert.ok(loadStart >= 0 && viewStart > loadStart && pdfStart > viewStart, "Quote view routes are missing or out of order");
const loadRoute = routes.slice(loadStart, viewStart);
const viewRoute = routes.slice(viewStart, pdfStart);
assert.ok(!loadRoute.includes('status: "viewed"'), "Loading quote data must not record a customer view");
assert.ok(viewRoute.includes('eq(quoteProposals.status, "sent")'), "View recording must atomically transition only a sent quote");
assert.ok(viewRoute.includes("recordedView"), "View recording must suppress duplicate notifications");
assert.ok(page.includes("document.visibilityState"), "Customer page must verify that the quote is visible");
assert.ok(page.includes("document.hasFocus()"), "Customer page must verify that the quote has focus");
assert.ok(page.includes("}, 2500)"), "Customer page must remain visible before recording a view");
assert.ok(page.includes("/view`"), "Customer page must call the dedicated view endpoint");

console.log("Quote view tracking tests passed");
