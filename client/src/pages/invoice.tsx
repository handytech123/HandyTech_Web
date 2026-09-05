import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { CheckCircle, CreditCard, Download, FileText } from "lucide-react";
import type { Invoice, InvoicePayment } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trackEvent } from "@/lib/analytics";

const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function InvoicePage() {
  const [, params] = useRoute("/invoice/:token");
  const token = params?.token || "";
  const { data, isLoading, error } = useQuery<{ invoice: Invoice; customer: { firstName: string; lastName: string }; payments: InvoicePayment[] }>({
    queryKey: ["invoice", token],
    queryFn: async () => { const response = await fetch(`/api/invoices/${token}`); if (!response.ok) throw new Error("Invoice unavailable"); return response.json(); },
    enabled: !!token,
    retry: false,
  });
  useEffect(() => { if (data?.invoice) trackEvent("invoice_viewed", { invoice_number: data.invoice.invoiceNumber, value: data.invoice.total, currency: "USD" }); }, [data?.invoice?.invoiceNumber]);
  if (isLoading) return <main className="grid min-h-screen place-items-center bg-slate-50"><p>Loading invoice…</p></main>;
  if (error || !data) return <main className="grid min-h-screen place-items-center bg-slate-50 p-6"><Card><CardContent className="p-8 text-center"><FileText className="mx-auto mb-4 h-10 w-10 text-slate-400" /><h1 className="text-xl font-bold">Invoice unavailable</h1><p className="mt-2 text-slate-600">This link is invalid or no longer available. Contact HandyTech Solutions at 314-325-4575.</p></CardContent></Card></main>;
  const { invoice, customer, payments } = data;
  const balance = Math.max(0, invoice.total - invoice.amountPaid);
  const depositDue = Math.max(0, Math.min(balance, invoice.depositRequired - invoice.amountPaid));
  return <main className="min-h-screen bg-slate-50 px-4 py-10"><div className="mx-auto max-w-4xl">
    <div className="rounded-t-xl border-t-[6px] border-brand-primary bg-slate-900 p-7 text-white"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div><h1 className="text-2xl font-bold">HandyTech Solutions</h1><p className="text-sky-200">Professional home improvement &amp; repair</p></div><div className="sm:text-right"><p className="text-xl font-bold">INVOICE</p><p className="text-sky-200">{invoice.invoiceNumber}</p></div></div></div>
    <div className="rounded-b-xl border bg-white p-6 shadow-sm sm:p-8">
      <div className="grid gap-6 sm:grid-cols-2"><div><p className="text-xs font-bold tracking-wide text-slate-500">BILL TO</p><p className="mt-2 text-lg font-bold">{customer.firstName} {customer.lastName}</p></div><div className="sm:text-right"><p>Issued {new Date(invoice.issueDate).toLocaleDateString()}</p><p>Due {new Date(invoice.dueDate).toLocaleDateString()}</p><p className="mt-1 font-semibold capitalize">Status: {invoice.status}</p></div></div>
      <div className="mt-8 overflow-x-auto"><table className="w-full min-w-[540px] text-sm"><thead className="bg-blue-50"><tr><th className="p-3 text-left">Description</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Rate</th><th className="p-3 text-right">Amount</th></tr></thead><tbody>{invoice.lineItems.map((item, index) => <tr key={index} className="border-b"><td className="p-3">{item.description}</td><td className="p-3 text-right">{item.quantity}</td><td className="p-3 text-right">{money(item.rate)}</td><td className="p-3 text-right">{money(item.quantity * item.rate)}</td></tr>)}</tbody></table></div>
      <div className="ml-auto mt-6 max-w-sm space-y-2"><div className="flex justify-between"><span>Subtotal</span><strong>{money(invoice.subtotal)}</strong></div>{invoice.discount > 0 && <div className="flex justify-between"><span>Discount</span><strong>-{money(invoice.discount)}</strong></div>}<div className="flex justify-between"><span>Tax</span><strong>{money(invoice.tax)}</strong></div><div className="flex justify-between"><span>Paid</span><strong>-{money(invoice.amountPaid)}</strong></div><div className="flex justify-between border-t-2 border-brand-primary pt-3 text-xl"><span>Balance due</span><strong>{money(balance)}</strong></div></div>
      {balance === 0 && <div className="mt-8 flex items-center gap-3 rounded-lg bg-emerald-50 p-4 text-emerald-800"><CheckCircle className="h-6 w-6" /><strong>Paid in full — thank you.</strong></div>}
      {balance > 0 && invoice.paymentUrl && <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-5"><div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center"><div><strong>Secure online payment</strong><p className="text-sm text-slate-600">{depositDue > 0 ? `${money(depositDue)} deposit requested` : `${money(balance)} balance due`}</p></div><Button asChild><a href={invoice.paymentUrl} target="_blank" rel="noreferrer"><CreditCard className="mr-2 h-4 w-4"/>Pay securely</a></Button></div></div>}
      {payments.length > 0 && <div className="mt-8"><h2 className="font-bold">Payment history</h2>{payments.map((payment) => <div key={payment.id} className="mt-2 flex justify-between border-b py-2 text-sm"><span>{new Date(payment.paidAt).toLocaleDateString()} · {payment.method.replace("_", " ")}</span><strong>{money(payment.amount)}</strong></div>)}</div>}
      {invoice.notes && <div className="mt-8 rounded-lg bg-slate-50 p-4"><strong>Notes</strong><p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{invoice.notes}</p></div>}{invoice.terms && <div className="mt-4 text-sm text-slate-600"><strong>Payment terms:</strong> {invoice.terms}</div>}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-slate-600">Questions? Call 314-325-4575 or reply to your invoice email.</p><Button asChild variant="outline"><a href={`/api/invoices/${token}/pdf`} target="_blank" rel="noreferrer"><Download className="mr-2 h-4 w-4" />Download PDF</a></Button></div>
    </div>
  </div></main>;
}
