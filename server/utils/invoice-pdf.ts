import PDFDocument from "pdfkit";
import type { Customer, Invoice, InvoicePayment } from "@shared/schema";

const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });

export async function generateInvoicePdfBuffer(customer: Customer, invoice: Invoice, payments: InvoicePayment[] = []): Promise<Buffer> {
  const doc = new PDFDocument({ size: "LETTER", margin: 48, info: { Title: `${invoice.invoiceNumber} - HandyTech Solutions` } });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  const complete = new Promise<Buffer>((resolve, reject) => { doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject); });
  const slate = "#0F172A", blue = "#2769BE", pale = "#EFF6FF", muted = "#64748B", left = 48, right = 564;

  doc.rect(0, 0, 612, 116).fill(slate); doc.rect(0, 0, 612, 7).fill(blue);
  doc.fillColor("white").font("Helvetica-Bold").fontSize(23).text("HandyTech Solutions", left, 34);
  doc.fillColor("#BAE6FD").font("Helvetica").fontSize(10).text("Professional home improvement & repair", left, 65);
  doc.fillColor("white").font("Helvetica-Bold").fontSize(18).text("INVOICE", 390, 35, { width: 174, align: "right" });
  doc.fillColor("#BAE6FD").font("Helvetica").fontSize(10).text(invoice.invoiceNumber, 390, 64, { width: 174, align: "right" });

  let y = 142;
  doc.fillColor(slate).font("Helvetica-Bold").fontSize(10).text("BILL TO", left, y);
  doc.fontSize(14).text(`${customer.firstName} ${customer.lastName}`, left, y + 18);
  const address = [customer.street, customer.city, [customer.state, customer.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  doc.fillColor(muted).font("Helvetica").fontSize(9).text(customer.email, left, y + 39);
  if (customer.phone) doc.text(customer.phone, left, y + 52);
  if (address) doc.text(address, left, y + 65, { width: 290 });
  doc.fillColor(slate).font("Helvetica-Bold").fontSize(10).text("INVOICE DETAILS", 386, y, { width: 178, align: "right" });
  doc.fillColor(muted).font("Helvetica").fontSize(9)
    .text(`Issued: ${invoice.issueDate.toLocaleDateString("en-US")}`, 386, y + 20, { width: 178, align: "right" })
    .text(`Due: ${invoice.dueDate.toLocaleDateString("en-US")}`, 386, y + 35, { width: 178, align: "right" })
    .text(`Status: ${invoice.status.toUpperCase()}`, 386, y + 50, { width: 178, align: "right" });

  y = 244; doc.roundedRect(left, y, right - left, 28, 4).fill(pale);
  doc.fillColor(slate).font("Helvetica-Bold").fontSize(9).text("DESCRIPTION", left + 10, y + 10, { width: 265 }).text("QTY", 330, y + 10, { width: 45, align: "right" }).text("RATE", 383, y + 10, { width: 75, align: "right" }).text("AMOUNT", 466, y + 10, { width: 88, align: "right" }); y += 34;
  for (const item of invoice.lineItems) {
    const height = Math.max(29, doc.heightOfString(item.description, { width: 265 }) + 14);
    if (y + height > 690) { doc.addPage(); y = 54; }
    doc.fillColor(slate).font("Helvetica").fontSize(9).text(item.description, left + 10, y + 7, { width: 265 }).text(String(item.quantity), 330, y + 7, { width: 45, align: "right" }).text(money(item.rate), 383, y + 7, { width: 75, align: "right" }).text(money(item.quantity * item.rate), 466, y + 7, { width: 88, align: "right" });
    doc.strokeColor("#E2E8F0").moveTo(left, y + height).lineTo(right, y + height).stroke(); y += height;
  }
  y += 10; const totalX = 350;
  const row = (label: string, value: string, strong = false) => { doc.fillColor(strong ? slate : muted).font(strong ? "Helvetica-Bold" : "Helvetica").fontSize(strong ? 12 : 9).text(label, totalX, y, { width: 100 }).text(value, 456, y, { width: 98, align: "right" }); y += strong ? 23 : 17; };
  row("Subtotal", money(invoice.subtotal)); if (invoice.discount) row("Discount", `-${money(invoice.discount)}`); if (invoice.tax) row(`Tax (${invoice.taxRate}%)`, money(invoice.tax)); row("Paid", `-${money(invoice.amountPaid)}`); doc.strokeColor(blue).lineWidth(2).moveTo(totalX, y).lineTo(right, y).stroke(); y += 9; row("BALANCE DUE", money(Math.max(0, invoice.total - invoice.amountPaid)), true);
  if (payments.length) { doc.fillColor(slate).font("Helvetica-Bold").fontSize(9).text(`${payments.length} payment${payments.length === 1 ? "" : "s"} recorded`, left, y); y += 18; }
  if (invoice.notes) { doc.fillColor(slate).font("Helvetica-Bold").fontSize(10).text("NOTES", left, y + 8); doc.fillColor(muted).font("Helvetica").fontSize(9).text(invoice.notes, left, y + 26, { width: right - left }); y = doc.y + 12; }
  if (invoice.terms) { doc.fillColor(slate).font("Helvetica-Bold").fontSize(10).text("PAYMENT TERMS", left, y + 8); doc.fillColor(muted).font("Helvetica").fontSize(9).text(invoice.terms, left, y + 26, { width: right - left }); }
  doc.fillColor(slate).font("Helvetica-Bold").fontSize(8).text("314-325-4575  |  contact@handytech-solutions.com  |  handytech-solutions.com", left, 724, { width: right - left, align: "center" });
  doc.end(); return complete;
}
