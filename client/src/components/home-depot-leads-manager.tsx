import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Copy, Download, ExternalLink, Home, Plus, ShieldCheck, UserPlus } from "lucide-react";
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

type Connection = {
  connected: boolean;
  message: string;
};

export default function HomeDepotLeadsManager({ onOpenRequest }: { onOpenRequest: (requestId: number) => void }) {
  const [open, setOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [form, setForm] = useState(emptyLead);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: leads = [] } = useQuery<ReferralLead[]>({ queryKey: ["/api/admin/referral-leads"] });
  const { data: connection } = useQuery<Connection>({ queryKey: ["/api/admin/referral-leads/connection"] });

  const copySetupKey = async () => {
    try {
      const response = await fetch("/api/admin/referral-leads/connector-setup", { credentials: "include", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Setup key is unavailable");
      await navigator.clipboard.writeText(data.connectorKey);
      toast({ title: "Connector key copied", description: "Paste it into the connector Options page on this PC." });
    } catch (error) {
      toast({ title: "Connector key not copied", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    }
  };
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/referral-leads"] });
  const save = useMutation({ mutationFn: async () => (await apiRequest("/api/admin/referral-leads", "POST", form)).json(), onSuccess: () => { refresh(); setOpen(false); setForm(emptyLead); toast({ title: "Lead saved", description: "A Request was created and duplicate protection was applied." }); }, onError: (error: Error) => toast({ title: "Lead not saved", description: error.message, variant: "destructive" }) });
  const linkContact = useMutation({ mutationFn: async (id: number) => (await apiRequest(`/api/admin/referral-leads/${id}/create-customer`, "POST", {})).json(), onSuccess: () => { refresh(); queryClient.invalidateQueries({ queryKey: ["/api/admin/os/requests"] }); toast({ title: "Contact linked", description: "The existing Request now carries the customer identity." }); }, onError: (error: Error) => toast({ title: "Contact not linked", description: error.message, variant: "destructive" }) });

  return <div className="space-y-4">
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><CardTitle className="flex items-center gap-2"><Home className="h-5 w-5 text-orange-600"/>Home Depot Leads</CardTitle><CardDescription>Import visible Pro Referral opportunities into the Request workflow before spending points.</CardDescription></div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setSetupOpen(true)}><Download className="mr-2 h-4 w-4"/>Set up connector</Button><Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4"/>Add manually</Button></div>
        </div>
      </CardHeader>
      <CardContent><div className="flex items-start gap-3 rounded-lg border bg-amber-50 p-3 text-sm"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"/><div><p className="font-semibold">Observation mode · no automatic point spending or customer messages</p><p className="text-muted-foreground">{connection?.message || "Checking the secure portal connection…"}</p></div></div></CardContent>
    </Card>

    {leads.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground">No Home Depot leads have been imported yet. Install the connector or add one manually.</CardContent></Card> : <div className="grid gap-3">{leads.map((lead) => <Card key={lead.id}><CardContent className="p-4"><div className="flex flex-col gap-4 lg:flex-row lg:justify-between"><div className="min-w-0 space-y-2"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{lead.customerName}</h3><Badge variant={lead.score >= 75 ? "default" : "secondary"}>{lead.score}% fit</Badge><Badge variant="outline">{lead.status}</Badge></div><p className="font-medium">{lead.service} · {[lead.city, lead.state, lead.zip].filter(Boolean).join(", ") || "Location not yet visible"}</p><p className="text-sm text-muted-foreground">Home Depot Job {lead.externalJobId}{lead.leadCostPoints != null ? ` · ${lead.leadCostPoints} points` : ""}</p>{lead.customerNotes && <p className="max-w-3xl whitespace-pre-wrap text-sm">{lead.customerNotes}</p>}<div className="flex flex-wrap gap-1">{lead.scoreReasons?.map((reason) => <Badge key={reason} variant="secondary">{reason}</Badge>)}</div></div><div className="flex shrink-0 flex-wrap content-start gap-2">{lead.portalUrl && <Button variant="outline" asChild><a href={lead.portalUrl} target="_blank" rel="noreferrer">Open portal <ExternalLink className="ml-2 h-4 w-4"/></a></Button>}{!lead.customerId && <Button variant="outline" onClick={() => linkContact.mutate(lead.id)} disabled={!lead.email || linkContact.isPending}><UserPlus className="mr-2 h-4 w-4"/>{lead.email ? "Link Contact" : "Contact hidden"}</Button>}{lead.requestId ? <Button onClick={() => onOpenRequest(lead.requestId!)}>Open Request <ArrowRight className="ml-2 h-4 w-4"/></Button> : <Badge variant="secondary">Request pending</Badge>}</div></div></CardContent></Card>)}</div>}

    <Dialog open={setupOpen} onOpenChange={setSetupOpen}><DialogContent><DialogHeader><DialogTitle>Install the Home Depot connector</DialogTitle><DialogDescription>The connector reads only the Pro Referral lead you open. Your Home Depot password stays in your browser.</DialogDescription></DialogHeader><ol className="list-decimal space-y-3 pl-5 text-sm"><li><a className="font-semibold text-primary underline" href="/api/admin/referral-leads/connector-download">Download the connector</a>, then unzip it to a permanent folder.</li><li>Open <code>chrome://extensions</code> or <code>edge://extensions</code> and enable Developer mode.</li><li>Choose <strong>Load unpacked</strong> and select the unzipped connector folder.</li><li>Open the extension Options page, enter <strong>https://handytech-solutions.com</strong>, and paste the setup key.</li><li>Open an individual Pro Referral lead and select <strong>Import visible lead</strong>.</li></ol><Button variant="outline" onClick={copySetupKey}><Copy className="mr-2 h-4 w-4"/>Copy secure setup key</Button><p className="text-xs text-muted-foreground">If Home Depot reveals contact information after you claim a lead, import it again. The same Job ID updates the existing Request.</p></DialogContent></Dialog>

    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Add Home Depot lead</DialogTitle><DialogDescription>Saving the same Home Depot Job ID again updates the lead instead of creating a duplicate.</DialogDescription></DialogHeader><div className="grid gap-3 sm:grid-cols-2"><Input placeholder="Home Depot Job ID" value={form.externalJobId} onChange={(event) => setForm({...form, externalJobId:event.target.value})}/><Input placeholder="Customer name" value={form.customerName} onChange={(event) => setForm({...form, customerName:event.target.value})}/><Input placeholder="Service" value={form.service} onChange={(event) => setForm({...form, service:event.target.value})}/><Input placeholder="Timeframe" value={form.customerTimeframe} onChange={(event) => setForm({...form, customerTimeframe:event.target.value})}/><Input placeholder="City" value={form.city} onChange={(event) => setForm({...form, city:event.target.value})}/><div className="grid grid-cols-2 gap-2"><Input placeholder="State" value={form.state} onChange={(event) => setForm({...form, state:event.target.value})}/><Input placeholder="ZIP" value={form.zip} onChange={(event) => setForm({...form, zip:event.target.value})}/></div><Input type="number" placeholder="Point cost" value={form.leadCostPoints} onChange={(event) => setForm({...form, leadCostPoints:Number(event.target.value)})}/><Input placeholder="Portal URL" value={form.portalUrl} onChange={(event) => setForm({...form, portalUrl:event.target.value})}/><Textarea className="sm:col-span-2" rows={6} placeholder="Customer notes and project details" value={form.customerNotes} onChange={(event) => setForm({...form, customerNotes:event.target.value})}/><Button className="sm:col-span-2" onClick={() => save.mutate()} disabled={save.isPending || !form.externalJobId || !form.customerName || !form.service}>{save.isPending ? "Saving…" : "Save as Request"}</Button></div></DialogContent></Dialog>
  </div>;
}
