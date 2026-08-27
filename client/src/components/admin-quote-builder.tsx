import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, Loader2, Plus, Send, Sparkles, Trash2 } from "lucide-react";
import type { Quote } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type LineItem = { description: string; quantity: number; rate: number };
type SavedProposal = { quoteNumber: string; lineItems: LineItem[]; discount: number; taxRate: number; subtotal: number; tax: number; total: number; notes?: string; validUntil: string; status: string; sentAt: string; viewedAt?: string; respondedAt?: string; signerName?: string };

export default function AdminQuoteBuilder({ quote }: { quote: Quote }) {
  const [open, setOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [viewingSaved, setViewingSaved] = useState(false);
  const [items, setItems] = useState<LineItem[]>([
    { description: quote.serviceNeeded || "Labor and services", quantity: 1, rate: 0 },
  ]);
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [validDays, setValidDays] = useState(14);
  const [notes, setNotes] = useState("Materials or work outside the listed scope require customer approval before proceeding.");
  const [roughNotes, setRoughNotes] = useState([quote.serviceNeeded, quote.message].filter(Boolean).join("\n"));
  const [aiSubtotal, setAiSubtotal] = useState(0);
  const [detailLevel, setDetailLevel] = useState<"concise" | "detailed">("detailed");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: savedProposal } = useQuery<SavedProposal>({
    queryKey: ["/api/admin/quotes", quote.id, "proposal"],
    queryFn: async () => {
      const response = await fetch(`/api/admin/quotes/${quote.id}/proposal`, { credentials: "include" });
      if (response.status === 404) return undefined as unknown as SavedProposal;
      if (!response.ok) throw new Error("Generated quote could not be loaded");
      return response.json();
    },
    retry: false,
  });

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + Math.max(0, item.quantity) * Math.max(0, item.rate), 0);
    const afterDiscount = Math.max(0, subtotal - Math.max(0, discount));
    const tax = afterDiscount * Math.max(0, taxRate) / 100;
    return { subtotal, tax, total: afterDiscount + tax };
  }, [items, discount, taxRate]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/admin/quotes/${quote.id}/send`, "POST", {
        lineItems: items,
        discount,
        taxRate,
        validDays,
        notes,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/quotes", quote.id, "proposal"] });
      setOpen(false);
      toast({ title: "Quote sent", description: `The finished quote was emailed to ${quote.email}.` });
    },
    onError: (error: Error) => toast({ title: "Quote not sent", description: error.message, variant: "destructive" }),
  });

  const aiDraftMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/admin/quotes/${quote.id}/ai-draft`, "POST", {
        roughNotes,
        detailLevel,
        existingItems: items,
        currentNotes: notes,
        ...(aiSubtotal > 0 ? { targetSubtotal: aiSubtotal } : {}),
      });
      return response.json() as Promise<{ lineItems: LineItem[]; scopeNotes: string; usedSubtotal: number }>;
    },
    onSuccess: (draft) => {
      setItems(draft.lineItems);
      setNotes(draft.scopeNotes);
      setAiSubtotal(draft.usedSubtotal);
      toast({ title: "AI draft and pricing ready", description: `$${draft.usedSubtotal.toFixed(2)} was distributed across the line items. Review everything before sending.` });
    },
    onError: (error: Error) => toast({ title: "Draft not generated", description: error.message, variant: "destructive" }),
  });

  const updateItem = (index: number, field: keyof LineItem, value: string) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index
      ? { ...item, [field]: field === "description" ? value : Number(value) }
      : item));
  };

  const ready = items.length > 0 && items.every((item) => item.description.trim() && item.quantity > 0 && item.rate >= 0) && totals.total > 0;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) { setShowPreview(false); setViewingSaved(false); } }}>
      <div className="flex flex-wrap gap-2">
        <DialogTrigger asChild><Button size="sm" onClick={() => setViewingSaved(false)}><Send className="mr-2 h-4 w-4" />Build &amp; Send Quote</Button></DialogTrigger>
        {savedProposal && <Button type="button" size="sm" variant="outline" onClick={() => { setViewingSaved(true); setShowPreview(true); setOpen(true); }}><Eye className="mr-2 h-4 w-4" />View Generated Quote</Button>}
      </div>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Build Quote for {quote.firstName} {quote.lastName}</DialogTitle>
          <DialogDescription>{quote.email} · {quote.phone || "No phone provided"}. Nothing sends until you press the final button.</DialogDescription>
        </DialogHeader>

        {!showPreview ? <div className="space-y-5">
          <div className="space-y-3 rounded-xl border border-sky-200 bg-sky-50/70 p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 text-sky-700" />
              <div>
                <h3 className="font-semibold text-slate-950">AI Quote Assistant</h3>
                <p className="text-sm text-slate-600">Paste a ChatGPT Project summary or dictate rough job notes. If the price is written in the message, AI will use it and distribute it across the line items. It never sends the quote.</p>
              </div>
            </div>
            <Textarea rows={5} value={roughNotes} onChange={(event) => setRoughNotes(event.target.value)} placeholder="Example: Repair two drywall holes, protect floors, match texture, customer supplies paint..." />
            <div className="max-w-xs">
              <Label htmlFor={`ai-subtotal-${quote.id}`}>Subtotal override ($) <span className="font-normal text-slate-500">optional</span></Label>
              <Input id={`ai-subtotal-${quote.id}`} type="number" min="0.01" step="0.01" value={aiSubtotal || ""} onChange={(event) => setAiSubtotal(Number(event.target.value))} placeholder="Example: 1850.00" />
              <p className="mt-1 text-xs text-slate-500">Leave blank to use pricing written in the message. Enter a value here only to override it.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                Writing style
                <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={detailLevel} onChange={(event) => setDetailLevel(event.target.value as "concise" | "detailed")}>
                  <option value="detailed">Detailed</option>
                  <option value="concise">Concise</option>
                </select>
              </label>
              <Button type="button" onClick={() => aiDraftMutation.mutate()} disabled={roughNotes.trim().length < 3 || aiDraftMutation.isPending}>
                {aiDraftMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {aiDraftMutation.isPending ? "Writing Draft..." : "Generate Full Quote Draft"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_90px_120px_42px] gap-2 text-xs font-semibold uppercase text-muted-foreground">
              <span>Description</span><span>Qty/Hours</span><span>Rate</span><span />
            </div>
            {items.map((item, index) => (
              <div className="grid grid-cols-[1fr_90px_120px_42px] gap-2" key={index}>
                <Input value={item.description} onChange={(event) => updateItem(index, "description", event.target.value)} placeholder="Labor, materials, or service" />
                <Input type="number" min="0.01" step="0.25" value={item.quantity} onChange={(event) => updateItem(index, "quantity", event.target.value)} />
                <Input type="number" min="0" step="0.01" value={item.rate} onChange={(event) => updateItem(index, "rate", event.target.value)} />
                <Button type="button" size="icon" variant="ghost" aria-label="Remove line item" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setItems((current) => [...current, { description: "", quantity: 1, rate: 0 }])}><Plus className="mr-2 h-4 w-4" />Add Line Item</Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div><Label>Discount ($)</Label><Input type="number" min="0" step="0.01" value={discount} onChange={(event) => setDiscount(Number(event.target.value))} /></div>
            <div><Label>Tax (%)</Label><Input type="number" min="0" step="0.01" value={taxRate} onChange={(event) => setTaxRate(Number(event.target.value))} /></div>
            <div><Label>Valid for (days)</Label><Input type="number" min="1" max="90" value={validDays} onChange={(event) => setValidDays(Number(event.target.value))} /></div>
          </div>

          <div><Label>Scope, exclusions, or payment notes</Label><Textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} /></div>

          <div className="ml-auto w-full max-w-sm space-y-1 rounded-lg bg-slate-50 p-4 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>${totals.subtotal.toFixed(2)}</span></div>
            {discount > 0 && <div className="flex justify-between"><span>Discount</span><span>-${discount.toFixed(2)}</span></div>}
            {totals.tax > 0 && <div className="flex justify-between"><span>Tax</span><span>${totals.tax.toFixed(2)}</span></div>}
            <div className="flex justify-between border-t pt-2 text-lg font-bold"><span>Total</span><span>${totals.total.toFixed(2)}</span></div>
          </div>

          <Button className="w-full" disabled={!ready} onClick={() => setShowPreview(true)}>
            <Eye className="mr-2 h-4 w-4" />Preview Customer Quote
          </Button>
        </div> : <div className="space-y-5">
          <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
            <div className="bg-slate-950 px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div><div className="text-2xl font-bold">HandyTech Solutions</div><div className="text-sm text-sky-200">Professional home improvement &amp; repair</div></div>
                <div className="text-right"><div className="text-xs uppercase tracking-widest text-sky-200">Service Quote</div><div className="font-semibold">{viewingSaved ? savedProposal?.quoteNumber : "Preview"}</div></div>
              </div>
            </div>
            <div className="space-y-6 p-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-blue-700">Prepared for</div>
                  <div className="mt-2 text-xl font-bold text-slate-950">{quote.firstName} {quote.lastName}</div>
                  <div className="text-sm text-slate-600">{quote.email}</div>
                  {quote.phone && <div className="text-sm text-slate-600">{quote.phone}</div>}
                  {[quote.street, quote.city, quote.state, quote.zip].filter(Boolean).length > 0 && <div className="mt-2 text-sm text-slate-600">{[quote.street, quote.city, [quote.state, quote.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</div>}
                </div>
                <div className="sm:text-right"><div className="text-xs font-bold uppercase tracking-wider text-blue-700">Quote details</div><div className="mt-2 text-sm text-slate-700">Issued {viewingSaved && savedProposal ? new Date(savedProposal.sentAt).toLocaleDateString() : new Date().toLocaleDateString()}</div><div className="text-sm text-slate-600">{viewingSaved && savedProposal ? `Valid through ${new Date(savedProposal.validUntil).toLocaleDateString()}` : `Valid for ${validDays} days`}</div>{viewingSaved && savedProposal && <Badge className="mt-2">{savedProposal.status}</Badge>}</div>
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <div className="grid min-w-[600px] grid-cols-[1fr_70px_100px_110px] gap-2 bg-slate-100 px-4 py-3 text-xs font-bold uppercase text-slate-600"><span>Description</span><span className="text-right">Qty</span><span className="text-right">Rate</span><span className="text-right">Amount</span></div>
                {(viewingSaved && savedProposal ? savedProposal.lineItems : items).map((item, index) => <div key={index} className="grid min-w-[600px] grid-cols-[1fr_70px_100px_110px] gap-2 border-t px-4 py-3 text-sm"><span className="font-medium text-slate-900">{item.description}</span><span className="text-right text-slate-600">{item.quantity}</span><span className="text-right text-slate-600">${item.rate.toFixed(2)}</span><span className="text-right font-semibold">${(item.quantity * item.rate).toFixed(2)}</span></div>)}
              </div>

              <div className="ml-auto w-full max-w-sm space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>${(viewingSaved && savedProposal ? savedProposal.subtotal : totals.subtotal).toFixed(2)}</span></div>
                {(viewingSaved && savedProposal ? savedProposal.discount : discount) > 0 && <div className="flex justify-between"><span>Discount</span><span>-${(viewingSaved && savedProposal ? savedProposal.discount : discount).toFixed(2)}</span></div>}
                {(viewingSaved && savedProposal ? savedProposal.tax : totals.tax) > 0 && <div className="flex justify-between"><span>Tax</span><span>${(viewingSaved && savedProposal ? savedProposal.tax : totals.tax).toFixed(2)}</span></div>}
                <div className="flex justify-between border-t pt-2 text-xl font-bold"><span>Total</span><span>${(viewingSaved && savedProposal ? savedProposal.total : totals.total).toFixed(2)}</span></div>
              </div>

              {(viewingSaved && savedProposal ? savedProposal.notes : notes) && <div className="rounded-lg bg-slate-50 p-4"><div className="text-xs font-bold uppercase tracking-wider text-slate-600">Scope and notes</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{viewingSaved && savedProposal ? savedProposal.notes : notes}</p></div>}
              <p className="text-xs text-slate-500">This admin preview shows what the customer will receive. The final version also includes its quote number, downloadable PDF, approval controls, and electronic-signature section.</p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" onClick={() => viewingSaved ? setOpen(false) : setShowPreview(false)}><ArrowLeft className="mr-2 h-4 w-4" />{viewingSaved ? "Close" : "Back to Edit"}</Button>
            {viewingSaved && savedProposal ? <Button asChild><a href={`/api/admin/quotes/${quote.id}/proposal/pdf`} target="_blank" rel="noreferrer"><Eye className="mr-2 h-4 w-4" />View PDF</a></Button> : <Button disabled={sendMutation.isPending} onClick={() => sendMutation.mutate()}><Send className="mr-2 h-4 w-4" />{sendMutation.isPending ? "Sending..." : `Send $${totals.total.toFixed(2)} Quote to Customer`}</Button>}
          </div>
        </div>}
      </DialogContent>
    </Dialog>
  );
}
