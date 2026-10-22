import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CircleAlert, FileText, MapPin, Plus, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import RequestActions from "@/components/request-actions";
import AdminQuoteBuilder from "@/components/admin-quote-builder";
import QuoteFollowUpDialog from "@/components/quote-follow-up-dialog";
import AddressAutocomplete from "@/components/address-autocomplete";
import type { Quote } from "@shared/schema";

type RequestRow = {
  id: number;
  request_number: string;
  title?: string;
  customer_description: string;
  status: string;
  source: string;
  request_kind?: string;
  legacy_type?: string;
  next_action?: string;
  received_at: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  quote_number?: string;
  quote_total?: string | number;
  activity_count: number;
};
type Workspace = {
  request: any;
  activity: any[];
  estimates: any[];
  appointments: any[];
  media: any[];
  proposals: any[];
  jobs: any[];
  properties: any[];
};
type Preflight = {
  enabled: boolean;
  sourceCounts: Record<string, number>;
  requirement: string;
};
const statuses = [
  "new",
  "reviewing",
  "needs_information",
  "needs_site_visit",
  "visit_scheduled",
  "visit_complete",
  "ready_to_estimate",
  "proposal_ready",
  "proposal_sent",
  "awaiting_customer",
  "approved",
  "declined",
  "duplicate",
  "closed",
];
const label = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (x) => x.toUpperCase());

export default function RequestsManager({
  customers,
  onLegacyNavigate,
  onOpenJob,
  openRequestId,
  initialContactId,
}: {
  customers: Array<{
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    company?: string | null;
    street?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  }>;
  onLegacyNavigate?: (tab: string) => void;
  onOpenJob?: (jobId: number) => void;
  openRequestId?: number | null;
  initialContactId?: number | null;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selected, setSelected] = useState<number | null>(null);
  const [requestSearch,setRequestSearch]=useState("");
  const [requestTypeFilter,setRequestTypeFilter]=useState("all");
  const [requestStatusFilter,setRequestStatusFilter]=useState("open");
  useEffect(() => {
    if (openRequestId) setSelected(openRequestId);
  }, [openRequestId]);
  const [newOpen, setNewOpen] = useState(false);
  const [contactId, setContactId] = useState("");
  useEffect(()=>{if(initialContactId){setContactId(String(initialContactId));setContactMode("existing");setNewOpen(true);}},[initialContactId]);
  const [contactMode, setContactMode] = useState<"existing" | "new">("existing");
  const [contactSearch, setContactSearch] = useState("");
  const [newContact, setNewContact] = useState({ firstName:"",lastName:"",email:"",phone:"",company:"",street:"",city:"",state:"MO",zip:"" });
  const [requestKind, setRequestKind] = useState("consultation");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [preferredContact, setPreferredContact] = useState("call");
  const [smsConsent, setSmsConsent] = useState(false);
  const [propertyType, setPropertyType] = useState("home");
  const [timeframe, setTimeframe] = useState("flexible");
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [budgetRange, setBudgetRange] = useState("");
  const [bestContactTime, setBestContactTime] = useState("");
  const [quoteToBuild, setQuoteToBuild] = useState<Quote | null>(null);
  const { data: preflight } = useQuery<Preflight>({
    queryKey: ["/api/admin/os/preflight"],
  });
  const { data: requests = [] } = useQuery<RequestRow[]>({
    queryKey: ["/api/admin/os/requests"],
    enabled: preflight?.enabled === true,
  });
  const { data: workspace } = useQuery<Workspace>({
    queryKey: ["request-workspace", selected],
    enabled: !!selected && preflight?.enabled === true,
    queryFn: async () => {
      const r = await fetch(`/api/admin/os/requests/${selected}`, {
        credentials: "include",
      });
      if (!r.ok) throw new Error("Request could not be loaded");
      return r.json();
    },
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["/api/admin/os/requests"] });
    qc.invalidateQueries({ queryKey: ["/api/admin/os/today"] });
    if (selected)
      qc.invalidateQueries({ queryKey: ["request-workspace", selected] });
  };
  const prepareQuote = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await apiRequest(`/api/admin/os/requests/${requestId}/quote-builder`, "POST", {});
      return response.json() as Promise<Quote>;
    },
    onSuccess: (quote) => setQuoteToBuild(quote),
    onError: (error: Error) => toast({ title: "Quote builder could not open", description: error.message, variant: "destructive" }),
  });
  const openExistingQuote = useMutation({
    mutationFn: async (quoteId: number) => {
      const response = await fetch("/api/quotes", { credentials: "include" });
      if (!response.ok) throw new Error("The quote could not be opened.");
      const allQuotes = await response.json() as Quote[];
      const existingQuote = allQuotes.find((item) => item.id === quoteId);
      if (!existingQuote) throw new Error("The original quote could not be found.");
      return existingQuote;
    },
    onSuccess: setQuoteToBuild,
    onError: (error: Error) => toast({ title: "Quote not opened", description: error.message, variant: "destructive" }),
  });
  const update = useMutation({
    mutationFn: ({
      id,
      status,
      nextAction,
    }: {
      id: number;
      status: string;
      nextAction?: string;
    }) =>
      apiRequest(`/api/admin/os/requests/${id}`, "PATCH", {
        status,
        nextAction,
      }),
    onSuccess: refresh,
  });
  const convertConsultation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/os/requests/${id}/convert-to-job-request`, "POST", {}),
    onSuccess: () => { refresh(); toast({ title: "Converted to quote / job request", description: "Estimating and the professional quote workflow are now available." }); },
    onError: (error: Error) => toast({ title: "Request not converted", description: error.message, variant: "destructive" }),
  });
  const createJob = useMutation({
    mutationFn: async ({ requestId, proposalId }: { requestId: number; proposalId: number }) =>
      (await apiRequest(`/api/admin/os/requests/${requestId}/proposals/${proposalId}/create-job`, "POST", {})).json(),
    onSuccess: (job) => {
      refresh();
      qc.invalidateQueries({ queryKey: ["/api/admin/operations/jobs"] });
      onOpenJob?.(Number(job.id));
      toast({ title: "Job ready", description: "The Request is resolved and the Job opened here without leaving your place." });
    },
    onError: (error: Error) => toast({ title: "Job not created", description: error.message, variant: "destructive" }),
  });
  const recordVerbalAcceptance = useMutation({
    mutationFn: async ({ requestId, proposalId }: { requestId: number; proposalId: number }) =>
      (await apiRequest(`/api/admin/os/requests/${requestId}/proposals/${proposalId}/verbal-acceptance`, "POST", {})).json(),
    onSuccess: (result) => {
      refresh();
      qc.invalidateQueries({ queryKey: ["/api/admin/operations/jobs"] });
      onOpenJob?.(Number(result.job?.id));
      toast({ title: "Verbal acceptance recorded", description: "The Request is resolved and its Job opened here. No electronic signature was collected." });
    },
    onError: (error: Error) => toast({ title: "Acceptance not recorded", description: error.message, variant: "destructive" }),
  });
  const assignProperty = useMutation({
    mutationFn: (propertyId: number) =>
      apiRequest(`/api/admin/os/requests/${selected}/property`, "PATCH", {
        propertyId,
      }),
    onSuccess: () => {
      refresh();
      toast({ title: "Request Property updated" });
    },
  });
  const create = useMutation({
    mutationFn: () =>
      apiRequest("/api/admin/os/requests", "POST", {
        contactId: contactMode === "existing" ? Number(contactId) : undefined,
        newContact: contactMode === "new" ? newContact : undefined,
        requestKind,
        title,
        description,
        source: "manual",
        intakeDetails: { preferredContact, smsConsent: preferredContact === "text" ? smsConsent : false, propertyType, timeframe, isAuthorized, budgetRange: budgetRange || undefined, bestContactTime: bestContactTime || undefined },
      }),
    onSuccess: async (response) => {
      const createdRequest = await response.json();
      refresh();
      setNewOpen(false);
      setSelected(createdRequest.id);
      setContactId("");
      setContactMode("existing"); setContactSearch(""); setNewContact({ firstName:"",lastName:"",email:"",phone:"",company:"",street:"",city:"",state:"MO",zip:"" });
      setRequestKind("consultation");
      setTitle("");
      setDescription("");
      setPreferredContact("call"); setSmsConsent(false); setPropertyType("home"); setTimeframe("flexible"); setIsAuthorized(true); setBudgetRange(""); setBestContactTime("");
      setDescription("");
      toast({ title: "Request created" });
    },
  });
  const normalizedSearch = contactSearch.trim().toLowerCase();
  const matchingContacts = customers.filter((contact) => !normalizedSearch || [contact.firstName,contact.lastName,contact.email,contact.phone,contact.company].filter(Boolean).join(" ").toLowerCase().includes(normalizedSearch)).slice(0,12);
  const closedStatuses=new Set(["declined","duplicate","closed"]);
  const visibleRequests=requests.filter(request=>{
    const kind=request.request_kind||(request.legacy_type==="consultation"?"consultation":"job_request");
    if(requestTypeFilter!=="all"&&kind!==requestTypeFilter)return false;
    if(requestStatusFilter==="open"&&closedStatuses.has(request.status))return false;
    if(requestStatusFilter==="closed"&&!closedStatuses.has(request.status))return false;
    if(requestStatusFilter!=="all"&&requestStatusFilter!=="open"&&requestStatusFilter!=="closed"&&request.status!==requestStatusFilter)return false;
    const needle=requestSearch.trim().toLowerCase();
    return !needle||[request.request_number,request.title,request.customer_description,request.first_name,request.last_name,request.email,request.phone,request.street,request.city].filter(Boolean).join(" ").toLowerCase().includes(needle);
  });
  const openNewRequest = (kind = "consultation") => {
    setRequestKind(kind);
    setNewOpen(true);
  };

  if (preflight && !preflight.enabled)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Requests are staged safely</CardTitle>
          <CardDescription>
            The lifecycle workspace is installed but activation is blocked until
            the production inventory, dry run, backup, and reconciliation gates
            pass.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-amber-50 p-4 text-sm text-amber-900">
            <CircleAlert className="mb-2 h-5 w-5" />
            {preflight.requirement}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => onLegacyNavigate?.("quotes")}
            >
              Open legacy quotes
            </Button>
            <Button
              variant="outline"
              onClick={() => onLegacyNavigate?.("consultations")}
            >
              Open consultations
            </Button>
            <Button
              variant="outline"
              onClick={() => onLegacyNavigate?.("home-depot")}
            >
              Open referrals
            </Button>
          </div>
        </CardContent>
      </Card>
    );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Requests</CardTitle>
            <CardDescription>
              Every potential piece of work, regardless of intake channel.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => openNewRequest("consultation")}>
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
            <Button onClick={() => openNewRequest("job_request")}>
              <FileText className="mr-2 h-4 w-4" />
              Create Quote
            </Button>
          </div>
        </CardHeader>
      </Card>
      <Card><CardContent className="grid gap-3 p-4 md:grid-cols-3"><Input value={requestSearch} onChange={e=>setRequestSearch(e.target.value)} placeholder="Search customer, request, address, or phone"/><Select value={requestTypeFilter} onValueChange={setRequestTypeFilter}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All request types</SelectItem><SelectItem value="consultation">Consultations</SelectItem><SelectItem value="job_request">Quote / job requests</SelectItem><SelectItem value="service_request">Service requests</SelectItem></SelectContent></Select><Select value={requestStatusFilter} onValueChange={setRequestStatusFilter}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="open">Open requests</SelectItem><SelectItem value="all">All statuses</SelectItem><SelectItem value="new">New</SelectItem><SelectItem value="needs_information">Needs information</SelectItem><SelectItem value="visit_scheduled">Scheduled</SelectItem><SelectItem value="proposal_sent">Proposal sent</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="closed">Closed / declined / duplicate</SelectItem></SelectContent></Select></CardContent></Card>
      <div className="grid gap-3">
        {visibleRequests.map((request) => (
          <Card
            key={request.id}
            className="cursor-pointer transition hover:border-blue-400"
            onClick={() => setSelected(request.id)}
          >
            <CardContent className="p-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>{request.request_number}</strong>
                    {request.quote_number && (
                      <Badge className="bg-blue-700 text-white">
                        Quote {request.quote_number}
                        {request.quote_total != null
                          ? ` · ${Number(request.quote_total).toLocaleString("en-US", { style: "currency", currency: "USD" })}`
                          : ""}
                      </Badge>
                    )}
                    <Badge variant="secondary">{label(request.status)}</Badge>
                    <Badge variant="outline">{label(request.request_kind || (request.legacy_type === "consultation" ? "consultation" : "job_request"))}</Badge>
                    <Badge variant="outline">{request.source}</Badge>
                  </div>
                  <h3 className="mt-1 font-semibold">
                    {request.title || "Service request"}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {request.customer_description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <UserRound className="h-3.5 w-3.5" />
                      {[request.first_name, request.last_name]
                        .filter(Boolean)
                        .join(" ") ||
                        request.company ||
                        "Unresolved contact"}
                    </span>
                    {request.street && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {request.street}, {request.city}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-sm">
                  <p className="font-medium">
                    Next: {request.next_action || "Review request"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(request.received_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {!visibleRequests.length && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No Requests match these filters.
            </CardContent>
          </Card>
        )}
      </div>
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{requestKind === "job_request" ? "Create Quote" : "New Request"}</DialogTitle>
            <DialogDescription>
              {requestKind === "job_request"
                ? "Select the customer and enter the work requested. The professional quote builder opens from the new Request."
                : "Start repeat or manually received work without recreating the Contact."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
            <Button type="button" variant={contactMode === "existing" ? "default" : "ghost"} onClick={()=>setContactMode("existing")}>Existing Contact</Button>
            <Button type="button" variant={contactMode === "new" ? "default" : "ghost"} onClick={()=>{setContactMode("new");setContactId("");}}>New Contact</Button>
          </div>
          {contactMode === "existing" ? <div className="space-y-2">
            <Input value={contactSearch} onChange={(event)=>setContactSearch(event.target.value)} placeholder="Search name, phone, or email first" />
            <Select value={contactId} onValueChange={setContactId}>
              <SelectTrigger><SelectValue placeholder={normalizedSearch ? "Choose the matching Contact" : "Select Contact"} /></SelectTrigger>
              <SelectContent>{matchingContacts.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.firstName} {c.lastName} · {c.phone || c.email}</SelectItem>)}</SelectContent>
            </Select>
            {normalizedSearch && matchingContacts.length === 0 && <Button type="button" variant="outline" className="w-full" onClick={()=>{setContactMode("new");setNewContact(current=>({...current,email:contactSearch.includes("@")?contactSearch:current.email,phone:/\d/.test(contactSearch)?contactSearch:current.phone}));}}>No match — create a new Contact</Button>}
          </div> : <div className="space-y-3 rounded-lg border p-3">
            <p className="text-sm font-medium">Contact information</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input value={newContact.firstName} onChange={e=>setNewContact({...newContact,firstName:e.target.value})} placeholder="First name" />
              <Input value={newContact.lastName} onChange={e=>setNewContact({...newContact,lastName:e.target.value})} placeholder="Last name" />
              <Input type="email" value={newContact.email} onChange={e=>setNewContact({...newContact,email:e.target.value})} placeholder="Email" />
              <Input type="tel" value={newContact.phone} onChange={e=>setNewContact({...newContact,phone:e.target.value})} placeholder="Phone" />
              <Input className="sm:col-span-2" value={newContact.company} onChange={e=>setNewContact({...newContact,company:e.target.value})} placeholder="Company (optional)" />
            </div>
            <p className="text-sm font-medium">Service property</p>
            <AddressAutocomplete value={newContact.street} onChange={street=>setNewContact({...newContact,street})} onAddressSelect={address=>setNewContact({...newContact,street:address.street,city:address.city,state:address.state,zip:address.zip})} placeholder="Start typing the service address" />
            <div className="grid grid-cols-5 gap-2"><Input className="col-span-2" value={newContact.city} onChange={e=>setNewContact({...newContact,city:e.target.value})} placeholder="City" /><Input value={newContact.state} onChange={e=>setNewContact({...newContact,state:e.target.value})} placeholder="State" /><Input className="col-span-2" value={newContact.zip} onChange={e=>setNewContact({...newContact,zip:e.target.value})} placeholder="ZIP" /></div>
            <p className="text-xs text-muted-foreground">The system checks both phone and email again before creating a duplicate.</p>
          </div>}
          <div><p className="mb-1 text-sm font-medium">Request type</p><Select value={requestKind} onValueChange={setRequestKind}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="consultation">Consultation request</SelectItem><SelectItem value="job_request">Quote / job request</SelectItem><SelectItem value="service_request">Service appointment request</SelectItem></SelectContent></Select></div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What does the customer need?"
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            placeholder="Customer's description in their own words"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div><p className="mb-1 text-sm font-medium">Preferred contact</p><Select value={preferredContact} onValueChange={setPreferredContact}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="call">Phone call</SelectItem><SelectItem value="text">Text message</SelectItem><SelectItem value="email">Email</SelectItem></SelectContent></Select></div>
            <div><p className="mb-1 text-sm font-medium">Property type</p><Select value={propertyType} onValueChange={setPropertyType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="home">Home</SelectItem><SelectItem value="rental">Rental property</SelectItem><SelectItem value="business">Business</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
            <div><p className="mb-1 text-sm font-medium">Desired timeframe</p><Select value={timeframe} onValueChange={setTimeframe}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="urgent">Urgent</SelectItem><SelectItem value="two_weeks">Within two weeks</SelectItem><SelectItem value="one_month">Within one month</SelectItem><SelectItem value="flexible">Flexible</SelectItem></SelectContent></Select></div>
            <div><p className="mb-1 text-sm font-medium">Approximate budget (optional)</p><Input value={budgetRange} onChange={(event) => setBudgetRange(event.target.value)} /></div>
            <div className="sm:col-span-2"><p className="mb-1 text-sm font-medium">Best contact time (optional)</p><Input value={bestContactTime} onChange={(event) => setBestContactTime(event.target.value)} /></div>
          </div>
          {preferredContact === "text" && <label className="flex items-start gap-3 rounded-lg border p-3 text-sm"><Checkbox checked={smsConsent} onCheckedChange={(checked)=>setSmsConsent(checked===true)} /><span>The customer agreed to receive appointment-related text messages.</span></label>}
          <label className="flex items-start gap-3 rounded-lg border p-3 text-sm"><Checkbox checked={isAuthorized} onCheckedChange={(checked) => setIsAuthorized(checked === true)} /><span>Customer owns the property or is authorized to request this work.</span></label>
          <Button
            disabled={
              (contactMode === "existing" ? !contactId : !newContact.firstName || !newContact.lastName || !newContact.email || !newContact.phone || !newContact.street || !newContact.city || !newContact.state || !newContact.zip) ||
              title.length < 2 ||
              description.length < 2 ||
              !isAuthorized ||
              (preferredContact === "text" && !smsConsent) ||
              create.isPending
            }
            onClick={() => create.mutate()}
          >
            {requestKind === "job_request" ? "Continue to Quote" : "Create Request"}
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => { if (!open) { setSelected(null); setQuoteToBuild(null); } }}
      >
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {workspace?.request?.request_number || "Request"} ·{" "}
              {workspace?.request?.title}
            </DialogTitle>
            <DialogDescription>
              {workspace?.request?.customer_description}
            </DialogDescription>
          </DialogHeader>
          {workspace && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Contact</p>
                  <strong>
                    {workspace.request.contact?.first_name}{" "}
                    {workspace.request.contact?.last_name}
                  </strong>
                  <a className="block break-all text-sm text-blue-700 hover:underline" href={`mailto:${workspace.request.contact?.email}`}>{workspace.request.contact?.email || "No email recorded"}</a>
                  <a className="block text-sm text-blue-700 hover:underline" href={`tel:${workspace.request.contact?.phone}`}>{workspace.request.contact?.phone || "No phone recorded"}</a>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Property</p>
                  {workspace.properties.length ? <Select value={workspace.request.property?.id ? String(workspace.request.property.id) : undefined} onValueChange={(value)=>assignProperty.mutate(Number(value))}><SelectTrigger className="mt-1 h-auto min-h-10 text-left"><SelectValue placeholder="Select the service Property"/></SelectTrigger><SelectContent>{workspace.properties.map((property)=><SelectItem key={property.id} value={String(property.id)}>{[property.street,property.city,property.state,property.zip].filter(Boolean).join(", ")}</SelectItem>)}</SelectContent></Select> : <><strong>Not resolved</strong><p className="text-sm text-muted-foreground">No migrated Property is available for this Contact.</p></>}
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Next action</p>
                  <strong>
                    {workspace.request.next_action || "Review request"}
                  </strong>
                </div>
              </div>
              <section className="rounded-xl border-2 border-slate-900 bg-slate-950 p-4 text-white">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">Next step</p>
                {(() => {
                  const accepted = workspace.proposals.find((proposal) => proposal.status === "accepted");
                  const waiting = workspace.proposals.find((proposal) => ["sent", "viewed"].includes(proposal.status));
                  const draft = workspace.proposals.find((proposal) => proposal.status === "draft");
                  const job = workspace.jobs[0];
                  if (workspace.request.request_kind === "consultation") return <div className="mt-2"><h3 className="text-lg font-semibold">Contact and schedule the consultation</h3><p className="text-sm text-slate-300">Use Request tools below to schedule it. Convert it to a quote request only after the consultation leads to proposed work.</p></div>;
                  if (draft) return <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h3 className="text-lg font-semibold">Finish the quote</h3><p className="text-sm text-slate-300">Complete and send {draft.quote_number} before creating a Job.</p></div><Button variant="secondary" className="shrink-0" onClick={() => prepareQuote.mutate(workspace.request.id)} disabled={prepareQuote.isPending}>{prepareQuote.isPending ? "Opening..." : "Edit Quote Draft"}</Button></div>;
                  if (waiting) return <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h3 className="text-lg font-semibold">Waiting for the quote decision</h3><p className="text-sm text-slate-300">If the customer accepted verbally, use that action on the exact quote below. Otherwise, follow up or wait for their online response.</p></div>{job && <Button variant="secondary" className="shrink-0" onClick={() => onOpenJob?.(Number(job.id))}>Open Job <ArrowRight className="ml-2 h-4 w-4" /></Button>}</div>;
                  if (accepted && !job) return <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h3 className="text-lg font-semibold">Create the Job from {accepted.quote_number}</h3><p className="text-sm text-slate-300">This quote is accepted and ready to become active work.</p></div><Button variant="secondary" className="shrink-0" disabled={createJob.isPending} onClick={() => createJob.mutate({ requestId: workspace.request.id, proposalId: accepted.id })}>{createJob.isPending ? "Creating Job..." : "Create Job"}</Button></div>;
                  if (job) return <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h3 className="text-lg font-semibold">Continue this work in the Job</h3><p className="text-sm text-slate-300">Scheduling, invoices, payments, costs, photos, and completion are managed in the Job.</p></div><Button variant="secondary" className="shrink-0" onClick={() => onOpenJob?.(Number(job.id))}>Open Job <ArrowRight className="ml-2 h-4 w-4" /></Button></div>;
                  return <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h3 className="text-lg font-semibold">Prepare the customer quote</h3><p className="text-sm text-slate-300">The Request is ready for a professional scope and price.</p></div><Button variant="secondary" className="shrink-0" onClick={() => prepareQuote.mutate(workspace.request.id)} disabled={prepareQuote.isPending || !workspace.request.contact?.email}>{prepareQuote.isPending ? "Opening..." : "Build Professional Quote"}</Button></div>;
                })()}
              </section>
              <section className="rounded-xl border-2 border-blue-200 bg-blue-50/40 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div><h3 className="font-semibold">Existing quotes for this Request</h3><p className="text-sm text-muted-foreground">View the customer copy or create an editable revision here.</p></div>
                  <Badge variant="outline">{workspace.proposals.length} quote{workspace.proposals.length === 1 ? "" : "s"}</Badge>
                </div>
                <div className="space-y-3">
                  {workspace.proposals.map((proposal, proposalIndex) => <div key={`request-quote-${proposal.id}`} className={`rounded-lg border bg-white p-3 text-sm ${proposal.status === "accepted" ? "border-emerald-500 ring-1 ring-emerald-200" : ""}`}>
                    <div className="flex flex-wrap items-start justify-between gap-2"><div><strong className="text-base">{proposal.quote_number}</strong><p className="font-medium">{proposal.service_needed || workspace.request.title}</p></div><div className="text-right"><Badge className="capitalize">{label(proposal.status)}</Badge><p className="mt-1 text-lg font-semibold">{Number(proposal.total || 0).toLocaleString("en-US",{style:"currency",currency:"USD"})}</p></div></div>
                    {workspace.proposals.length > 1 && <p className="mt-1 text-xs font-medium text-blue-800">Quote {proposalIndex + 1} of {workspace.proposals.length} — actions below affect only this quote</p>}
                    <p className="mt-1 text-xs text-muted-foreground">{proposal.sent_at ? `Created ${new Date(proposal.sent_at).toLocaleString()}` : "Draft"}{proposal.viewed_at ? ` · Viewed ${new Date(proposal.viewed_at).toLocaleString()}` : ""}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" asChild><a href={`/api/admin/quotes/${proposal.quote_id}/proposal/pdf`} target="_blank" rel="noreferrer">View Quote</a></Button>
                      {proposal.status === "draft" ? <Button size="sm" onClick={() => prepareQuote.mutate(workspace.request.id)} disabled={prepareQuote.isPending}>Edit Quote Draft</Button> : <Button size="sm" onClick={() => openExistingQuote.mutate(proposal.quote_id)} disabled={openExistingQuote.isPending}>{openExistingQuote.isPending ? "Opening..." : "Correct Quote"}</Button>}
                      {proposal.status === "accepted" && (() => {
                        const linkedJob = workspace.jobs.find((job) => Number(job.quote_proposal_id) === Number(proposal.id));
                        return linkedJob
                          ? <Button size="sm" onClick={() => onOpenJob?.(Number(linkedJob.id))}>Open Job</Button>
                          : <Button size="sm" onClick={() => createJob.mutate({ requestId: workspace.request.id, proposalId: proposal.id })} disabled={createJob.isPending}>{createJob.isPending ? "Creating Job..." : "Create Job"}</Button>;
                      })()}
                      {["sent", "viewed"].includes(proposal.status) && <Button size="sm" variant="outline" className="border-emerald-600 text-emerald-800 hover:bg-emerald-50" onClick={() => recordVerbalAcceptance.mutate({ requestId: workspace.request.id, proposalId: proposal.id })} disabled={recordVerbalAcceptance.isPending}>{recordVerbalAcceptance.isPending && recordVerbalAcceptance.variables?.proposalId === proposal.id ? "Recording This Quote..." : "Record Verbal Acceptance & Create Job"}</Button>}
                      <QuoteFollowUpDialog quoteId={proposal.quote_id} quoteNumber={proposal.quote_number} email={workspace.request.contact?.email} phone={workspace.request.contact?.phone}/>
                    </div>
                  </div>)}
                  {!workspace.proposals.length && workspace.request.request_kind !== "consultation" && <div className="rounded-lg border bg-white p-4"><p className="mb-3 text-sm text-muted-foreground">No quote has been created for this Request yet.</p><Button className="w-full sm:w-auto" onClick={() => prepareQuote.mutate(workspace.request.id)} disabled={prepareQuote.isPending || !workspace.request.contact?.email}><FileText className="mr-2 h-4 w-4" />{prepareQuote.isPending ? "Opening Quote Builder..." : "Build Professional Quote"}</Button></div>}
                </div>
              </section>
              {workspace.request.intake_details && Object.keys(workspace.request.intake_details).length > 0 && (
                <section className="rounded-lg border bg-slate-50 p-4">
                  <h3 className="mb-3 font-semibold">Customer intake</h3>
                  <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(workspace.request.intake_details).filter(([, value]) => value !== null && value !== undefined && value !== "").map(([key, value]) => (
                      <div key={key}><p className="text-xs text-muted-foreground">{label(key.replace(/([a-z])([A-Z])/g, "$1_$2"))}</p><strong>{typeof value === "boolean" ? (value ? "Yes" : "No") : label(String(value))}</strong></div>
                    ))}
                  </div>
                </section>
              )}
              <div className="flex flex-wrap gap-2">
                <Select
                  value={workspace.request.status}
                  onValueChange={(status) =>
                    update.mutate({ id: workspace.request.id, status })
                  }
                >
                  <SelectTrigger className="w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {label(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {workspace.request.request_kind === "consultation" ? <Button onClick={()=>convertConsultation.mutate(workspace.request.id)} disabled={convertConsultation.isPending}>{convertConsultation.isPending?"Converting...":"Convert to Quote / Job Request"}</Button> : <Button
                  onClick={() => prepareQuote.mutate(workspace.request.id)}
                  disabled={prepareQuote.isPending || !workspace.request.contact?.email}
                >
                  {prepareQuote.isPending ? "Opening Quote Builder..." : "Build Professional Quote"}
                </Button>}
                <Button variant="outline" disabled={!workspace.request.contact?.phone} asChild={!!workspace.request.contact?.phone}>
                  {workspace.request.contact?.phone ? <a href={`tel:${workspace.request.contact.phone}`}>Call Customer</a> : <span>Call Customer</span>}
                </Button>
                <Button variant="outline" className="border-amber-300 text-amber-800" onClick={() => update.mutate({ id: workspace.request.id, status: "declined", nextAction: "No further action" })}>Decline Request</Button>
                <Button variant="outline" onClick={() => update.mutate({ id: workspace.request.id, status: "duplicate", nextAction: "Duplicate — no action" })}>Mark Duplicate</Button>
                {quoteToBuild && (
                  <AdminQuoteBuilder
                    key={quoteToBuild.id}
                    quote={quoteToBuild}
                    initiallyOpen
                    initiallyCorrecting
                    triggerLabel="Reopen Professional Quote"
                    onSchedule={() => onLegacyNavigate?.("appointments")}
                  />
                )}
              </div>
              <details className="rounded-xl border bg-white">
                <summary className="cursor-pointer px-4 py-3 font-semibold">Request tools — notes, customer questions, scheduling, photos, and estimating</summary>
                <div className="border-t p-4"><RequestActions
                  requestId={workspace.request.id}
                  requestKind={workspace.request.request_kind || (workspace.request.legacy_type === "consultation" ? "consultation" : "job_request")}
                  refresh={refresh}
                /></div>
              </details>
              <details className="rounded-xl border bg-white">
                <summary className="cursor-pointer px-4 py-3 font-semibold">Records & history</summary>
                <div className="space-y-5 border-t p-4">
              <section>
                <h3 className="mb-2 font-semibold">Request records</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    ["Site visits", workspace.appointments.length],
                    ["Estimates", workspace.estimates.length],
                    ["Files & photos", workspace.media.length],
                  ].map(([name, count]) => (
                    <div
                      key={String(name)}
                      className="rounded-lg bg-slate-50 p-3"
                    >
                      <span className="text-xs text-muted-foreground">
                        {name}
                      </span>
                      <strong className="block text-xl">{count}</strong>
                    </div>
                  ))}
                </div>
              </section>
              {workspace.estimates.length > 0 && <section>
                <h3 className="mb-2 font-semibold">Internal estimate history</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {workspace.estimates.map((estimate) => <div key={`estimate-${estimate.id}`} className="rounded-lg border p-3 text-sm"><div className="flex justify-between"><strong>Internal estimate v{estimate.version}</strong><Badge variant="outline">{label(estimate.status)}</Badge></div><p className="mt-2">Labor: {Number(estimate.estimated_labor_hours || 0)} hours</p><p>Estimated direct cost: {Number(estimate.estimated_direct_cost || 0).toLocaleString("en-US",{style:"currency",currency:"USD"})}</p><p>Owner-selected price: {estimate.owner_selected_price == null ? "Not set" : Number(estimate.owner_selected_price).toLocaleString("en-US",{style:"currency",currency:"USD"})}</p></div>)}
                </div>
              </section>}
              <section>
                <h3 className="mb-2 font-semibold">Files & photos</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {workspace.media.map((asset) => <a key={asset.id} href={asset.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg border"><img src={asset.url} alt={asset.caption || asset.stage || "Request media"} className="aspect-square w-full object-cover"/><div className="p-2 text-xs"><Badge variant="outline">{label(asset.stage)}</Badge>{asset.caption && <p className="mt-1">{asset.caption}</p>}</div></a>)}
                  {!workspace.media.length && <p className="col-span-full rounded-lg bg-slate-50 p-4 text-sm text-muted-foreground">No files or photos are attached to this Request.</p>}
                </div>
              </section>
              <section>
                <h3 className="mb-2 font-semibold">Scheduled visits & history</h3>
                <div className="space-y-2">
                  {workspace.appointments.map((appointment) => {
                    const start = appointment.start_timestamptz
                      ? new Date(appointment.start_timestamptz).toLocaleString()
                      : [appointment.appointment_date, appointment.appointment_time]
                          .filter(Boolean)
                          .join(" at ");
                    return (
                      <div key={appointment.id} className="flex flex-col justify-between gap-2 rounded-lg border p-3 sm:flex-row sm:items-center">
                        <div>
                          <strong className="text-sm">{appointment.service_type || "Site visit"}</strong>
                          <p className="text-sm text-muted-foreground">{start || "Date not recorded"}</p>
                        </div>
                        <Badge variant="outline">{label(appointment.status)}</Badge>
                      </div>
                    );
                  })}
                  {!workspace.appointments.length && <p className="rounded-lg bg-slate-50 p-4 text-sm text-muted-foreground">No scheduled or historical visits are attached to this Request.</p>}
                </div>
              </section>
              <section>
                <h3 className="mb-2 font-semibold">History</h3>
                <div className="space-y-2">
                  {workspace.activity.map((event) => (
                    <div
                      key={event.id}
                      className="flex justify-between rounded-lg border p-3 text-sm"
                    >
                      <span>{event.summary}</span>
                      <span className="text-muted-foreground">
                        {new Date(event.occurred_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                  {!workspace.activity.length && (
                    <p className="text-sm text-muted-foreground">
                      No activity recorded yet.
                    </p>
                  )}
                </div>
              </section>
                </div>
              </details>
              {workspace.jobs.length > 0 && (
                <Button onClick={() => onOpenJob?.(Number(workspace.jobs[0].id))}>
                  Open Job <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
