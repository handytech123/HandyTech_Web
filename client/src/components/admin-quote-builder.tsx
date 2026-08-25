import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Send, Trash2 } from "lucide-react";
import type { Quote } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type LineItem = { description: string; quantity: number; rate: number };

export default function AdminQuoteBuilder({ quote }: { quote: Quote }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<LineItem[]>([
    { description: quote.serviceNeeded || "Labor and services", quantity: 1, rate: 0 },
  ]);
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [validDays, setValidDays] = useState(14);
  const [notes, setNotes] = useState("Materials or work outside the listed scope require customer approval before proceeding.");
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      setOpen(false);
      toast({ title: "Quote sent", description: `The finished quote was emailed to ${quote.email}.` });
    },
    onError: (error: Error) => toast({ title: "Quote not sent", description: error.message, variant: "destructive" }),
  });

  const updateItem = (index: number, field: keyof LineItem, value: string) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index
      ? { ...item, [field]: field === "description" ? value : Number(value) }
      : item));
  };

  const ready = items.length > 0 && items.every((item) => item.description.trim() && item.quantity > 0 && item.rate >= 0) && totals.total > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Send className="mr-2 h-4 w-4" />Build &amp; Send Quote</Button></DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Build Quote for {quote.firstName} {quote.lastName}</DialogTitle>
          <DialogDescription>{quote.email} · {quote.phone || "No phone provided"}. Nothing sends until you press the final button.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
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

          <Button className="w-full" disabled={!ready || sendMutation.isPending} onClick={() => sendMutation.mutate()}>
            <Send className="mr-2 h-4 w-4" />{sendMutation.isPending ? "Sending…" : `Send $${totals.total.toFixed(2)} Quote to Customer`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
