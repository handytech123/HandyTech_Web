import PDFDocument from "pdfkit";
import type { Quote, QuoteProposal } from "@shared/schema";
import fs from "node:fs";
import path from "node:path";

const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });
const parseQuoteSections = (notes = "") => {
  const matches = Array.from(notes.matchAll(/^\[([^\]]+)\]\s*\n([\s\S]*?)(?=\n\n\[[^\]]+\]|$)/gm));
  return { structured: matches.length > 0, sections: Object.fromEntries(matches.map((match) => [match[1], match[2].trim()])) as Record<string, string> };
};

export async function generateQuotePdfBuffer(quote: Quote, proposal: QuoteProposal): Promise<Buffer> {
  const doc = new PDFDocument({ size: "LETTER", margin: 48, info: { Title: `${proposal.quoteNumber} - HandyTech Solutions` } });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  const complete = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const slate = "#0F172A";
  const blue = "#2769BE";
  const pale = "#EFF6FF";
  const muted = "#64748B";
  const left = 48;
  const right = 564;
  const quoteContent = parseQuoteSections(proposal.notes || "");
  const fixedProjectPrice = quoteContent.sections["PRICING PRESENTATION"] === "fixed_project";

  doc.rect(0, 0, 612, 116).fill(slate);
  doc.rect(0, 0, 612, 7).fill(blue);
  doc.fillColor("white").font("Helvetica-Bold").fontSize(23).text("HandyTech Solutions", left, 34);
  doc.fillColor("#BAE6FD").font("Helvetica").fontSize(10).text("Professional home improvement & repair", left, 65);
  doc.fillColor("white").font("Helvetica-Bold").fontSize(17).text("SERVICE QUOTE", 390, 35, { width: 174, align: "right" });
  doc.fillColor("#BAE6FD").font("Helvetica").fontSize(10).text(proposal.quoteNumber, 390, 64, { width: 174, align: "right" });

  let y = 142;
  doc.fillColor(slate).font("Helvetica-Bold").fontSize(10).text("PREPARED FOR", left, y);
  doc.font("Helvetica-Bold").fontSize(14).text(`${quote.firstName} ${quote.lastName}`, left, y + 18);
  const address = [quote.street, quote.city, quote.state, quote.zip].filter(Boolean).join(", ");
  doc.fillColor(muted).font("Helvetica").fontSize(9).text(quote.email, left, y + 39);
  if (quote.phone) doc.text(quote.phone, left, y + 52);
  if (address) doc.text(address, left, y + 65, { width: 290 });

  doc.fillColor(slate).font("Helvetica-Bold").fontSize(10).text("QUOTE DETAILS", 386, y, { width: 178, align: "right" });
  doc.fillColor(muted).font("Helvetica").fontSize(9)
    .text(`Issued: ${proposal.sentAt.toLocaleDateString("en-US")}`, 386, y + 20, { width: 178, align: "right" })
    .text(`Valid through: ${proposal.validUntil.toLocaleDateString("en-US")}`, 386, y + 35, { width: 178, align: "right" });

  y = Math.max(244, doc.y + 20);
  const detailSection = (title: string, body?: string) => {
    if (!body) return;
    const bodyHeight = doc.font("Helvetica").fontSize(9).heightOfString(body, { width: right - left - 20, lineGap: 2 });
    const height = bodyHeight + 43;
    if (y + height > 690) { doc.addPage(); y = 54; }
    doc.roundedRect(left, y, right - left, height, 5).fill("#F8FAFC");
    doc.fillColor(blue).font("Helvetica-Bold").fontSize(9).text(title, left + 10, y + 10);
    doc.fillColor(slate).font("Helvetica").fontSize(9).text(body, left + 10, y + 27, { width: right - left - 20, lineGap: 2 });
    y += height + 10;
  };
  if (quoteContent.structured) {
    detailSection("PROJECT OVERVIEW", quoteContent.sections["PROJECT SUMMARY"]);
    detailSection("WHAT IS INCLUDED", quoteContent.sections["INCLUDED WORK"]);
    detailSection("EXCLUSIONS & ASSUMPTIONS", quoteContent.sections["EXCLUSIONS & ASSUMPTIONS"]);
    detailSection("ESTIMATED DURATION", quoteContent.sections["ESTIMATED DURATION"]);
  }
  if (y + 70 > 690) { doc.addPage(); y = 54; }
  doc.roundedRect(left, y, right - left, 28, 4).fill(pale);
  doc.fillColor(slate).font("Helvetica-Bold").fontSize(9).text(fixedProjectPrice ? "PROJECT PHASES INCLUDED IN FIXED PRICE" : "DESCRIPTION", left + 10, y + 10, { width: 265 });
  if (!fixedProjectPrice) doc.text("QTY", 330, y + 10, { width: 45, align: "right" }).text("RATE", 383, y + 10, { width: 75, align: "right" }).text("AMOUNT", 466, y + 10, { width: 88, align: "right" });
  y += 34;

  for (const item of proposal.lineItems) {
    const phaseText = fixedProjectPrice ? [item.description, item.details, item.estimatedHours ? `Approximate labor effort: ${item.estimatedHours}` : "", item.materials ? `Materials included: ${item.materials}` : ""].filter(Boolean).join("\n") : item.description;
    const height = Math.max(29, doc.heightOfString(phaseText, { width: fixedProjectPrice ? 496 : 265 }) + 14);
    if (y + height > 690) { doc.addPage(); y = 54; }
    doc.fillColor(slate).font("Helvetica").fontSize(9).text(phaseText, left + 10, y + 7, { width: fixedProjectPrice ? 496 : 265 });
    if (!fixedProjectPrice) doc.text(String(item.quantity), 330, y + 7, { width: 45, align: "right" }).text(money(item.rate), 383, y + 7, { width: 75, align: "right" }).text(money(item.quantity * item.rate), 466, y + 7, { width: 88, align: "right" });
    doc.strokeColor("#E2E8F0").moveTo(left, y + height).lineTo(right, y + height).stroke();
    y += height;
  }

  y += 10;
  const totalX = 350;
  const totalRow = (label: string, value: string, strong = false) => {
    doc.fillColor(strong ? slate : muted).font(strong ? "Helvetica-Bold" : "Helvetica").fontSize(strong ? 12 : 9)
      .text(label, totalX, y, { width: 100 }).text(value, 456, y, { width: 98, align: "right" });
    y += strong ? 23 : 17;
  };
  totalRow(fixedProjectPrice ? "Fixed project price" : "Subtotal", money(proposal.subtotal));
  if (proposal.discount) totalRow("Discount", `-${money(proposal.discount)}`);
  if (proposal.tax) totalRow(`Tax (${proposal.taxRate}%)`, money(proposal.tax));
  doc.strokeColor(blue).lineWidth(2).moveTo(totalX, y).lineTo(right, y).stroke(); y += 9;
  totalRow("TOTAL INVESTMENT", money(proposal.total), true);

  const closingNotes = quoteContent.structured
    ? [quoteContent.sections["PAYMENT TERMS"] ? `Payment terms: ${quoteContent.sections["PAYMENT TERMS"]}` : "", quoteContent.sections["WORKMANSHIP"] ? `Workmanship: ${quoteContent.sections["WORKMANSHIP"]}` : "", quoteContent.sections["ADDITIONAL NOTES"] || ""].filter(Boolean).join("\n\n")
    : proposal.notes;
  if (closingNotes) {
    if (y > 650) { doc.addPage(); y = 54; }
    doc.fillColor(slate).font("Helvetica-Bold").fontSize(10).text("SCOPE & NOTES", left, y + 8);
    doc.fillColor(muted).font("Helvetica").fontSize(9).text(closingNotes, left, y + 26, { width: right - left, lineGap: 2 });
    y = doc.y + 14;
  }

  if (proposal.status === "accepted" && proposal.signerName) {
    if (y > 610) { doc.addPage(); y = 54; }
    doc.roundedRect(left, y, right - left, 108, 5).fill("#F8FAFC");
    doc.fillColor(slate).font("Helvetica-Bold").fontSize(10).text("CUSTOMER APPROVAL", left + 12, y + 12);
    const signaturePath = proposal.signatureUrl ? path.resolve(process.cwd(), "server/public", proposal.signatureUrl.replace(/^\//, "")) : "";
    if (signaturePath && fs.existsSync(signaturePath)) doc.image(signaturePath, left + 12, y + 31, { fit: [190, 48], valign: "center" });
    doc.fillColor(slate).font("Helvetica-Bold").fontSize(10).text(proposal.signerName, 290, y + 40, { width: 250 });
    doc.fillColor(muted).font("Helvetica").fontSize(8).text(`Electronically approved ${proposal.respondedAt?.toLocaleString("en-US") || ""}`, 290, y + 57, { width: 250 });
    y += 121;
  }

  doc.fillColor(muted).font("Helvetica").fontSize(7.5).text(
    "This quote covers only the listed scope. Changes require approval and may affect price or scheduling. Acceptance authorizes HandyTech Solutions to schedule the work; payment terms remain as stated above or agreed in writing.",
    left, Math.min(y + 5, 684), { width: right - left, align: "center" },
  );
  doc.fillColor(slate).font("Helvetica-Bold").fontSize(8).text("314-325-4575  |  contact@handytech-solutions.com  |  handytech-solutions.com", left, 724, { width: right - left, align: "center" });
  doc.end();
  return complete;
}
