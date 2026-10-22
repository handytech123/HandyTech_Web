import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type LineItem = { description: string; quantity: number; rate: number };
export type EditableInvoice = {
  id: number;
  invoiceNumber: string;
  customerId: number;
  quoteProposalId?: number | null;
  status: string;
  amountPaid: number;
  lineItems: LineItem[];
  discount: number;
  taxRate: number;
  depositRequired: number;
  paymentUrl?: string | null;
  dueDate: string | Date;
  notes?: string | null;
  terms?: string | null;
};

const money = (value: number) => Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
const dateInputValue = (value: string | Date) => new Date(value).toISOString().slice(0, 10);

export default function InvoiceEditorDialog({ invoice, onClose, onSaved }: { invoice: EditableInvoice | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [items, setItems] = useState<LineItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [depositRequired, setDepositRequired] = useState(0);
  const [paymentUrl, setPaymentUrl] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");

  useEffect(() => {
    if (!invoice) return;
    setItems((invoice.lineItems || []).map((item) => ({ ...item, quantity: Number(item.quantity), rate: Number(item.rate) })));
    setDiscount(Number(invoice.discount || 0));
    setTaxRate(Number(invoice.taxRate || 0));
    setDepositRequired(Number(invoice.depositRequired || 0));
    setPaymentUrl(invoice.paymentUrl || "");
    setDueDate(dateInputValue(invoice.dueDate));
    setNotes(invoice.notes || "");
    setTerms(invoice.terms || "Payment is due by the date shown above.");
  }, [invoice]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.rate || 0), 0);
    const taxable = Math.max(0, subtotal - discount);
    const tax = taxable * taxRate / 100;
    return { subtotal, tax, total: taxable + tax };
  }, [items, discount, taxRate]);

  const save = useMutation({
    mutationFn: async () => {
      if (!invoice) throw new Error("Choose an invoice to edit.");
      return (await apiRequest(`/api/admin/invoices/${invoice.id}`, "PUT", {
        customerId: invoice.customerId,
        quoteProposalId: invoice.quoteProposalId || null,
        lineItems: items,
        discount,
        taxRate,
        depositRequired,
        paymentUrl,
        dueDate: new Date(`${dueDate}T12:00:00`).toISOString(),
        notes,
        terms,
      })).json();
    },
    onSuccess: () => {
      onSaved();
      onClose();
      toast({ title: "Invoice updated", description: invoice?.status === "draft" ? "The draft is ready to preview and send." : "The secure customer copy now shows these changes. Resend the invoice if the customer should be notified." });
    },
    onError: (error: Error) => toast({ title: "Invoice not updated", description: error.message, variant: "destructive" }),
  });

  const invalid = !invoice || !dueDate || items.length === 0 || items.some((item) => !item.description.trim() || Number(item.quantity) <= 0 || Number(item.rate) < 0) || totals.total <= 0 || totals.total + 0.005 < Number(invoice?.amountPaid || 0) || depositRequired < 0 || depositRequired > totals.total;

  return <Dialog open={!!invoice} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="max-h-[94vh] w-[calc(100vw-1rem)] max-w-3xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Edit {invoice?.invoiceNumber}</DialogTitle>
        <DialogDescription>
          Change the customer-facing line items, amount, due date, notes, or payment terms. Recorded payments are protected.
        </DialogDescription>
      </DialogHeader>
      {invoice && <div className="space-y-5">
        {invoice.status !== "draft" && <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">This invoice has already been sent. Saving updates the customer&apos;s secure invoice immediately. Use Resend afterward when you want to notify the customer.</div>}
        {Number(invoice.amountPaid) > 0 && <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">Payments recorded: <strong>{money(invoice.amountPaid)}</strong>. The revised total cannot be lower than this amount.</div>}
        <div>
          <div className="mb-2 flex items-center justify-between gap-2"><Label>Line items</Label><Button type="button" size="sm" variant="outline" onClick={() => setItems([...items, { description: "", quantity: 1, rate: 0 }])}><Plus className="mr-1 h-3 w-3"/>Add item</Button></div>
          <div className="space-y-3">{items.map((item, index) => <div key={index} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_90px_120px_36px]">
            <Input className="sm:col-span-1" value={item.description} onChange={(event) => setItems(items.map((current, i) => i === index ? { ...current, description: event.target.value } : current))} placeholder="Work performed or material"/>
            <div><Label className="text-xs sm:sr-only">Quantity</Label><Input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => setItems(items.map((current, i) => i === index ? { ...current, quantity: Number(event.target.value) } : current))}/></div>
            <div><Label className="text-xs sm:sr-only">Rate</Label><Input type="number" min="0" step="0.01" value={item.rate} onChange={(event) => setItems(items.map((current, i) => i === index ? { ...current, rate: Number(event.target.value) } : current))}/></div>
            <Button type="button" size="icon" variant="ghost" disabled={items.length === 1} onClick={() => setItems(items.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4"/></Button>
          </div>)}</div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><Label>Discount</Label><Input type="number" min="0" step="0.01" value={discount} onChange={(event) => setDiscount(Number(event.target.value))}/></div>
          <div><Label>Tax rate %</Label><Input type="number" min="0" max="30" step="0.01" value={taxRate} onChange={(event) => setTaxRate(Number(event.target.value))}/></div>
          <div><Label>Due date</Label><Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)}/></div>
        </div>
        <div className="rounded-lg bg-slate-50 p-4 text-right"><div>Subtotal: {money(totals.subtotal)}</div>{discount > 0 && <div>Discount: -{money(discount)}</div>}<div>Tax: {money(totals.tax)}</div><div className="mt-2 text-xl font-bold">Total: {money(totals.total)}</div></div>
        <div className="grid gap-3 sm:grid-cols-2"><div><Label>Deposit requested</Label><Input type="number" min="0" max={totals.total} step="0.01" value={depositRequired} onChange={(event) => setDepositRequired(Number(event.target.value))}/></div><div><Label>Payment link (optional)</Label><Input type="url" value={paymentUrl} onChange={(event) => setPaymentUrl(event.target.value)} placeholder="https://..."/></div></div>
        <div><Label>Customer notes</Label><Textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)}/></div>
        <div><Label>Payment terms</Label><Textarea rows={3} value={terms} onChange={(event) => setTerms(event.target.value)}/></div>
        <Button className="w-full" disabled={invalid || save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Saving Changes…" : "Save Invoice Changes"}</Button>
      </div>}
    </DialogContent>
  </Dialog>;
}
