import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, Home, Plus, ShieldCheck, UserPlus, FileText } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ReferralLead } from "@shared/schema";

const emptyLead = { externalJobId: "", customerName: "", service: "", city: "", state: "MO", zip: "", customerTimeframe: "Project planning", customerNotes: "", leadCostPoints: 40, portalUrl: "" };

export default function HomeDepotLeadsManager({ onOpenQuotes }: { onOpenQuotes: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyLead);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: leads = [] } = useQuery<ReferralLead[]>({ queryKey: ["/api/admin/referral-leads"] });
  const { data: connection } = useQuery<any>({ queryKey: ["/api/admin/referral-leads/connection"] });
  const copySetupKey = async () => {
    try {
      const response = await fetch("/api/admin/referral-leads/connector-setup", { credentials: "include", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Setup key is unavailable");
      await navigator.clipboard.writeText(data.connectorKey);
      toast({ title: "Connector key copied", description: "Paste it into the HandyTech extension Options page on this PC." });
    } catch (error) {
      toast({ title: "Connector key not copied", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    }
  };
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/referral-leads"] });
  const save = useMutation({ mutationFn: async () => (await apiRequest("/api/admin/referral-leads", "POST", form)).json(), onSuccess: () => { refresh(); setOpen(false); setForm(emptyLead); toast({ title: "Lead saved", description: "Duplicate protection and fit scoring were applied." }); }, onError: (e: Error) => toast({ title: "Lead not saved", description: e.message, variant: "destructive" }) });
  const createCustomer = useMutation({ mutationFn: async (id: number) => (await apiRequest(`/api/admin/referral-leads/${id}/create-customer`, "POST", {})).json(), onSuccess: refresh, onError: (e: Error) => toast({ title: "Customer not created", description: e.message, variant: "destructive" }) });
  const createQuote = useMutation({ mutationFn: async (id: number) => (await apiRequest(`/api/admin/referral-leads/${id}/create-quote`, "POST", {})).json(), onSuccess: () => { refresh(); queryClient.invalidateQueries({ queryKey: ["/api/quotes"] }); onOpenQuotes(); toast({ title: "Quote draft created" }); }, onError: (e: Error) => toast({ title: "Quote not created", description: e.message, variant: "destructive" }) });

  return <div className="space-y-4">
    <Card><CardHeader><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="flex items-center gap-2"><Home className="h-5 w-5 text-orange-600"/>Home Depot Leads</CardTitle><CardDescription>Review opportunities before spending referral points, then move accepted work into your customer and quote workflow.</CardDescription></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={copySetupKey}><Copy className="mr-2 h-4 w-4"/>Copy setup key</Button><Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4"/>Add lead</Button></div></div></CardHeader><CardContent><div className="flex items-start gap-3 rounded-lg border bg-amber-50 p-3 text-sm"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"/><div><p className="font-semibold">Observation mode · no automatic point spending or customer messages</p><p className="text-muted-foreground">{connection?.message || "Checking the secure portal connection…"}</p></div></div></CardContent></Card>
    {leads.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground">No Home Depot leads have been imported yet.</CardContent></Card> : <div className="grid gap-3">{leads.map(lead => <Card key={lead.id}><CardContent className="p-4"><div className="flex flex-col gap-4 lg:flex-row lg:justify-between"><div className="min-w-0 space-y-2"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{lead.customerName}</h3><Badge variant={lead.score >= 75 ? "default" : "secondary"}>{lead.score}% fit</Badge><Badge variant="outline">{lead.status}</Badge></div><p className="font-medium">{lead.service} · {[lead.city, lead.state, lead.zip].filter(Boolean).join(", ")}</p><p className="text-sm text-muted-foreground">Job {lead.externalJobId}{lead.leadCostPoints != null ? ` · ${lead.leadCostPoints} points` : ""}</p>{lead.customerNotes && <p className="max-w-3xl whitespace-pre-wrap text-sm">{lead.customerNotes}</p>}<div className="flex flex-wrap gap-1">{lead.scoreReasons?.map(reason => <Badge key={reason} variant="secondary">{reason}</Badge>)}</div></div><div className="flex shrink-0 flex-wrap content-start gap-2">{lead.portalUrl && <Button variant="outline" asChild><a href={lead.portalUrl} target="_blank" rel="noreferrer">Open portal <ExternalLink className="ml-2 h-4 w-4"/></a></Button>}<Button variant="outline" onClick={() => createCustomer.mutate(lead.id)} disabled={!!lead.customerId}><UserPlus className="mr-2 h-4 w-4"/>{lead.customerId ? "Customer linked" : "Create customer"}</Button><Button onClick={() => createQuote.mutate(lead.id)} disabled={!lead.customerId || !!lead.quoteId}><FileText className="mr-2 h-4 w-4"/>{lead.quoteId ? "Quote created" : "Create quote"}</Button></div></div></CardContent></Card>)}</div>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Add Home Depot lead</DialogTitle><DialogDescription>Copy the information shown in Pro Referral. Saving the same Job ID again updates the lead instead of creating a duplicate.</DialogDescription></DialogHeader><div className="grid gap-3 sm:grid-cols-2"><Input placeholder="Home Depot Job ID" value={form.externalJobId} onChange={e => setForm({...form, externalJobId:e.target.value})}/><Input placeholder="Customer name" value={form.customerName} onChange={e => setForm({...form, customerName:e.target.value})}/><Input placeholder="Service" value={form.service} onChange={e => setForm({...form, service:e.target.value})}/><Input placeholder="Timeframe" value={form.customerTimeframe} onChange={e => setForm({...form, customerTimeframe:e.target.value})}/><Input placeholder="City" value={form.city} onChange={e => setForm({...form, city:e.target.value})}/><div className="grid grid-cols-2 gap-2"><Input placeholder="State" value={form.state} onChange={e => setForm({...form, state:e.target.value})}/><Input placeholder="ZIP" value={form.zip} onChange={e => setForm({...form, zip:e.target.value})}/></div><Input type="number" placeholder="Point cost" value={form.leadCostPoints} onChange={e => setForm({...form, leadCostPoints:Number(e.target.value)})}/><Input placeholder="Portal URL" value={form.portalUrl} onChange={e => setForm({...form, portalUrl:e.target.value})}/><Textarea className="sm:col-span-2" rows={6} placeholder="Customer notes and project details" value={form.customerNotes} onChange={e => setForm({...form, customerNotes:e.target.value})}/><Button className="sm:col-span-2" onClick={() => save.mutate()} disabled={save.isPending || !form.externalJobId || !form.customerName || !form.service}>{save.isPending ? "Saving…" : "Save and score lead"}</Button></div></DialogContent></Dialog>
  </div>;
}
