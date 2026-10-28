import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Copy,
  ExternalLink,
  FileText,
  Images,
  MapPin,
  MessageSquare,
  Megaphone,
  Pencil,
  Plus,
  Receipt,
  Send,
  Star,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { createCsrfHeaders } from "@/lib/csrf";
import { useToast } from "@/hooks/use-toast";
import InvoiceEditorDialog, {
  type EditableInvoice,
} from "@/components/invoice-editor-dialog";

type Workspace = {
  project: any;
  quotes: any[];
  appointments: any[];
  invoices: any[];
  expenses: any[];
  changeOrders: any[];
  reviews: any[];
  gallery: any[];
  approvedScopes: any[];
  workLogs: any[];
  closeoutItems: any[];
  activity: any[];
  media: any[];
  financials: {
    originalContract: number;
    approvedChanges: number;
    currentContract: number;
    estimatedCosts: number;
    actualCosts: number;
    billed: number;
    collected: number;
    outstandingReceivables: number;
    unbilledContract: number;
    projectedGrossProfit: number;
    billedGrossProfit: number;
  };
};
const money = (value: number) =>
  Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
const date = (value: any) =>
  value
    ? new Date(value).toLocaleString("en-US", {
        timeZone: "America/Chicago",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not yet";
const status = (value?: string) =>
  String(value || "pending").replaceAll("_", " ");
const marketingCategory = (value?: string) => {
  const text = String(value || "").toLowerCase();
  if (/drywall|sheetrock|wall repair/.test(text)) return "drywall";
  if (/paint|wallpaper|wall covering/.test(text)) return "painting";
  if (/bath|toilet|vanity|shower/.test(text)) return "bathroom";
  if (/door|lock|deadbolt/.test(text)) return "doors";
  if (/deck|pressure wash|outdoor/.test(text)) return "outdoor";
  if (/mount|television|tv/.test(text)) return "mounting";
  if (/assembl/.test(text)) return "assembly";
  return "general";
};
const seoSlug = (value?: string) => String(value || "project").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export default function ProjectWorkspace({
  jobId,
  onClose,
  onNavigate,
  closeLabel = "Close Project",
}: {
  jobId: number | null;
  onClose: () => void;
  onNavigate?: (tab: string) => void;
  closeLabel?: string;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [note, setNote] = useState("");
  const [entryType, setEntryType] = useState("field_note");
  const [worker, setWorker] = useState("");
  const [hours, setHours] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaStage, setMediaStage] = useState("progress");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceDescription, setInvoiceDescription] =
    useState("Progress invoice");
  const [invoiceDue, setInvoiceDue] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  );
  const [scheduleStart, setScheduleStart] = useState("");
  const [scheduleHours, setScheduleHours] = useState("8");
  const [crewHours, setCrewHours] = useState("");
  const [paymentInvoice, setPaymentInvoice] = useState<any | null>(null);
  const [editInvoice, setEditInvoice] = useState<EditableInvoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("check");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const { data, isLoading, isError } = useQuery<Workspace>({
    queryKey: ["project-workspace", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const r = await fetch(`/api/admin/operations/jobs/${jobId}/workspace`, {
        credentials: "include",
      });
      if (!r.ok) throw new Error("Project could not be loaded");
      return r.json();
    },
  });
  const refresh = () =>
    qc.invalidateQueries({ queryKey: ["project-workspace", jobId] });
  const addWork = useMutation({
    mutationFn: () =>
      apiRequest(`/api/admin/operations/jobs/${jobId}/work-logs`, "POST", {
        entryType,
        note,
        workerName: worker || undefined,
        laborHours: hours ? Number(hours) : undefined,
      }),
    onSuccess: () => {
      refresh();
      setNote("");
      setHours("");
      toast({ title: "Work entry saved" });
    },
  });
  const startLabor = useMutation({
    mutationFn: () =>
      apiRequest(`/api/admin/operations/jobs/${jobId}/labor/start`, "POST", {
        workerName: worker,
      }),
    onSuccess: () => {
      refresh();
      toast({ title: "Work timer started" });
    },
  });
  const finishLabor = useMutation({
    mutationFn: (logId: number) =>
      apiRequest(
        `/api/admin/operations/jobs/${jobId}/labor/${logId}/finish`,
        "POST",
        {},
      ),
    onSuccess: () => {
      refresh();
      toast({ title: "Work session recorded" });
    },
  });
  const initCloseout = useMutation({
    mutationFn: () =>
      apiRequest(
        `/api/admin/operations/jobs/${jobId}/closeout/initialize`,
        "POST",
        {},
      ),
    onSuccess: refresh,
  });
  const updateCloseout = useMutation({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) =>
      apiRequest(
        `/api/admin/operations/jobs/${jobId}/closeout/${id}`,
        "PATCH",
        { completed },
      ),
    onSuccess: refresh,
  });
  const completeCloseout = useMutation({
    mutationFn: () =>
      apiRequest(
        `/api/admin/operations/jobs/${jobId}/closeout/complete`,
        "POST",
        {},
      ),
    onSuccess: () => {
      refresh();
      qc.invalidateQueries({ queryKey: ["/api/admin/os/requests"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/os/today"] });
      toast({
        title: "Job closed",
        description:
          "The linked Request is resolved, and the completed Job remains available as permanent business history.",
      });
    },
    onError: (e: Error) =>
      toast({
        title: "Job not ready to close",
        description: e.message,
        variant: "destructive",
      }),
  });
  const addMedia = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      if (mediaFile) form.append("media", mediaFile);
      form.append("stage", mediaStage);
      const headers = await createCsrfHeaders();
      const response = await fetch(
        `/api/admin/operations/jobs/${jobId}/media`,
        { method: "POST", headers, body: form, credentials: "include" },
      );
      if (!response.ok)
        throw new Error(
          (await response.json().catch(() => null))?.message ||
            "Media could not be saved",
        );
      return response.json();
    },
    onSuccess: () => {
      refresh();
      setMediaFile(null);
      toast({ title: "Job media saved" });
    },
  });
  const publishMedia = useMutation({
    mutationFn: (media: any) => {
      const service = String(data?.project?.title || "Completed handyman project");
      const city = String(data?.project?.customer?.city || "St. Louis County");
      const overview = String(data?.quotes?.[0]?.project_overview || media.caption || "").trim();
      return apiRequest(
        `/api/admin/operations/jobs/${jobId}/media/${media.id}/publish`,
        "POST",
        {
          title: `${service} in ${city}`.slice(0, 200),
          description: (overview || `HandyTech Solutions completed this ${service.toLowerCase()} project in ${city}, Missouri. The work was documented through the originating customer Job and completion photos.`).slice(0, 2000),
          category: marketingCategory(service),
          featured: false,
        },
      );
    },
    onSuccess: () => {
      refresh();
      toast({
        title: "Completion photo published",
        description:
          "The Gallery entry remains linked to its originating Job media.",
      });
    },
  });
  const createInvoice = useMutation({
    mutationFn: () =>
      apiRequest(`/api/admin/operations/jobs/${jobId}/invoices`, "POST", {
        description: invoiceDescription,
        amount: Number(invoiceAmount),
        dueDate: `${invoiceDue}T12:00:00`,
        depositRequired: Math.round(Number(invoiceAmount) * 50) / 100,
      }),
    onSuccess: () => {
      refresh();
      setInvoiceAmount("");
      toast({
        title: "Job invoice drafted",
        description: "The invoice includes the required 50% deposit.",
      });
    },
    onError: (e: Error) =>
      toast({
        title: "Invoice not created",
        description: e.message,
        variant: "destructive",
      }),
  });
  const createFromAcceptedQuote = useMutation({
    mutationFn: async () => {
      const accepted = data?.quotes?.find(
        (quote: any) => quote.proposal_status === "accepted",
      );
      if (!accepted)
        throw new Error(
          "An accepted quote is required before creating the invoice.",
        );
      const response = await apiRequest(
        `/api/admin/quotes/${accepted.id}/convert-to-invoice`,
        "POST",
        {},
      );
      return response.json();
    },
    onSuccess: () => {
      refresh();
      qc.invalidateQueries({ queryKey: ["/api/admin/invoices"] });
      toast({
        title: "Invoice prepared from accepted quote",
        description: "Review it below, then send it to the customer.",
      });
    },
    onError: (e: Error) =>
      toast({
        title: "Invoice not created",
        description: e.message,
        variant: "destructive",
      }),
  });
  const sendInvoice = useMutation({
    mutationFn: (invoiceId: number) =>
      apiRequest(`/api/admin/invoices/${invoiceId}/send`, "POST", {}),
    onSuccess: () => {
      refresh();
      qc.invalidateQueries({ queryKey: ["/api/admin/invoices"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/operations/jobs"] });
      toast({
        title: "Invoice sent",
        description:
          "The customer received the secure invoice link and PDF by email.",
      });
    },
    onError: (e: Error) =>
      toast({
        title: "Invoice not sent",
        description: e.message,
        variant: "destructive",
      }),
  });
  const invoiceChangeOrder = useMutation({
    mutationFn: (changeOrderId: number) =>
      apiRequest(
        `/api/admin/operations/change-orders/${changeOrderId}/invoice`,
        "POST",
        { dueDate: `${invoiceDue}T12:00:00` },
      ),
    onSuccess: () => {
      refresh();
      qc.invalidateQueries({ queryKey: ["/api/admin/invoices"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/operations/jobs"] });
      toast({
        title: "Supplemental invoice drafted",
        description:
          "The approved Change Order is now linked to its own invoice.",
      });
    },
    onError: (e: Error) =>
      toast({
        title: "Change Order not invoiced",
        description: e.message,
        variant: "destructive",
      }),
  });
  const recordPayment = useMutation({
    mutationFn: () =>
      apiRequest(`/api/admin/invoices/${paymentInvoice.id}/payments`, "POST", {
        amount: Number(paymentAmount),
        method: paymentMethod,
        reference: paymentReference || undefined,
        paidAt: `${paymentDate}T12:00:00`,
      }),
    onSuccess: () => {
      refresh();
      qc.invalidateQueries({ queryKey: ["/api/admin/invoices"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/operations/jobs"] });
      setPaymentInvoice(null);
      setPaymentAmount("");
      setPaymentReference("");
      toast({
        title: "Payment recorded",
        description:
          "The invoice balance, Job totals, and P&L have been updated.",
      });
    },
    onError: (e: Error) =>
      toast({
        title: "Payment not recorded",
        description: e.message,
        variant: "destructive",
      }),
  });
  const sendReceipt = useMutation({
    mutationFn: (invoiceId: number) =>
      apiRequest(`/api/admin/invoices/${invoiceId}/send-receipt`, "POST", {}),
    onSuccess: () =>
      toast({
        title: "Receipt sent",
        description: "The payment receipt was emailed to the customer.",
      }),
    onError: (e: Error) =>
      toast({
        title: "Receipt not sent",
        description: e.message,
        variant: "destructive",
      }),
  });
  const addSchedule = useMutation({
    mutationFn: () =>
      apiRequest(`/api/admin/operations/jobs/${jobId}/schedule`, "POST", {
        start: new Date(scheduleStart).toISOString(),
        durationHours: Number(scheduleHours),
        crewHours: crewHours ? Number(crewHours) : undefined,
        kind: "work_block",
      }),
    onSuccess: () => {
      refresh();
      setScheduleStart("");
      toast({ title: "Work block scheduled" });
    },
    onError: (e: Error) =>
      toast({
        title: "Work block not scheduled",
        description: e.message,
        variant: "destructive",
      }),
  });
  const requestReview = useMutation({
    mutationFn: async () => {
      if (!data?.project?.customer?.email)
        throw new Error(
          "Add the customer's email address before requesting a review.",
        );
      const customer = data.project.customer;
      const response = await apiRequest(
        "/api/admin/review-requests/send-manual",
        "POST",
        {
          customerName: [customer.first_name, customer.last_name]
            .filter(Boolean)
            .join(" "),
          customerEmail: customer.email,
          serviceType: String(
            data.project.title ||
              data.project.job_number ||
              "HandyTech service",
          ).slice(0, 160),
          personalMessage: `Thank you for choosing HandyTech Solutions for ${data.project.title || "your project"}.`,
        },
      );
      return response.json() as Promise<{
        emailSent: boolean;
        smsSent: boolean;
        smsSkippedReason?: string | null;
      }>;
    },
    onSuccess: (result) => {
      refresh();
      const name = data?.project?.customer?.first_name || "the customer";
      toast({
        title: "Review request sent",
        description:
          result.emailSent && result.smsSent
            ? `The review link was emailed and texted to ${name}.`
            : result.smsSent
              ? `The review link was texted to ${name}.`
              : `The review link was emailed to ${name}. Text not sent: ${result.smsSkippedReason || "no SMS consent or phone number"}.`,
      });
    },
    onError: (e: Error) =>
      toast({
        title: "Review request not sent",
        description: e.message,
        variant: "destructive",
      }),
  });
  const customer = data?.project?.customer;
  const marketingCity = String(customer?.city || "St. Louis County");
  const marketingService = String(data?.project?.title || "handyman project");
  const projectUrl = data?.gallery?.[0]?.id
    ? `https://handytech-solutions.com/projects/${seoSlug(data.gallery[0].title)}`
    : "https://handytech-solutions.com/gallery";
  const googlePostDraft = `Recently completed: ${marketingService} in ${marketingCity}, Missouri. HandyTech Solutions documented the work from the original job through completion. View the project and request help with a similar job: ${projectUrl}`;
  const yelpPostDraft = `New project completed in ${marketingCity}: ${marketingService}. We focus on clear scopes, professional workmanship, and documented results. See more completed work at ${projectUrl}`;
  const copyMarketingText = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    toast({ title: `${label} copied` });
  };
  return (
    <Dialog open={!!jobId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[94vh] max-w-6xl overflow-y-auto p-0">
        <div className="sticky top-0 z-20 border-b bg-slate-950 p-5 text-white">
          <DialogHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <DialogTitle className="text-xl text-white">
                  {data?.project?.job_number || "Job Workspace"} ·{" "}
                  {data?.project?.title || "Loading"}
                </DialogTitle>
                <DialogDescription className="mt-1 text-slate-300">
                  Approved scope, field work, schedule, money, documentation,
                  and closeout.
                </DialogDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {data && (
                  <Badge className="bg-blue-500 text-white">
                    {status(data.project.status)}
                  </Badge>
                )}
                {data && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={
                      requestReview.isPending || !data.project.customer?.email
                    }
                    onClick={() => requestReview.mutate()}
                  >
                    <Star className="mr-2 h-4 w-4" />
                    {requestReview.isPending ? "Sending…" : "Request Review"}
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={onClose}
                >
                  <X className="mr-2 h-4 w-4" />
                  {closeLabel}
                </Button>
              </div>
            </div>
          </DialogHeader>
        </div>
        <div className="p-5">
          {isLoading ? (
            <p className="py-16 text-center text-muted-foreground">
              Loading the Job Workspace…
            </p>
          ) : isError || !data ? (
            <p className="py-16 text-center text-red-600">
              The Job Workspace could not be loaded.
            </p>
          ) : (
            <>
              <div className="mb-5 grid gap-3 md:grid-cols-[1.4fr_repeat(4,1fr)]">
                <div className="rounded-xl border bg-slate-50 p-4">
                  <p className="flex items-center gap-2 font-semibold">
                    <UserRound className="h-4 w-4" />
                    {customer.first_name} {customer.last_name}
                  </p>
                  <p className="mt-1 text-sm">{customer.email}</p>
                  <p className="text-sm">
                    {customer.phone || "No phone saved"}
                  </p>
                  {data.project.address && (
                    <p className="mt-2 flex gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {data.project.address}
                    </p>
                  )}
                </div>
                {[
                  ["Contract", data.financials.currentContract],
                  ["Billed", data.financials.billed],
                  ["Collected", data.financials.collected],
                  ["Receivable", data.financials.outstandingReceivables],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-xl border p-4">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-2 text-xl font-bold">
                      {money(Number(value))}
                    </p>
                  </div>
                ))}
              </div>
              <Tabs defaultValue="overview">
                <TabsList className="h-auto w-full justify-start overflow-x-auto">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="scope">Scope</TabsTrigger>
                  <TabsTrigger value="work">Work</TabsTrigger>
                  <TabsTrigger value="schedule">Schedule</TabsTrigger>
                  <TabsTrigger value="money">Money</TabsTrigger>
                  <TabsTrigger value="files">Files & Photos</TabsTrigger>
                  <TabsTrigger value="marketing">Marketing Pack</TabsTrigger>
                  <TabsTrigger value="closeout">Closeout</TabsTrigger>
                </TabsList>
                <TabsContent
                  value="overview"
                  className="grid gap-4 lg:grid-cols-2"
                >
                  <section className="rounded-xl border p-4">
                    <h3 className="mb-3 flex items-center gap-2 font-semibold">
                      <ClipboardList className="h-4 w-4" />
                      Job summary
                    </h3>
                    <p className="whitespace-pre-wrap text-sm">
                      {data.project.description ||
                        "No scope notes have been added yet."}
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <Info
                        label="Actual direct cost"
                        value={money(data.financials.actualCosts)}
                      />
                      <Info
                        label="Projected gross profit"
                        value={money(data.financials.projectedGrossProfit)}
                      />
                      <Info
                        label="Unbilled contract"
                        value={money(data.financials.unbilledContract)}
                      />
                      <Info
                        label="Next activity"
                        value={
                          data.appointments[0]
                            ? date(data.appointments[0].start_timestamptz)
                            : "Not scheduled"
                        }
                      />
                    </div>
                  </section>
                  <section className="rounded-xl border p-4">
                    <h3 className="mb-3 flex items-center gap-2 font-semibold">
                      <MessageSquare className="h-4 w-4" />
                      Activity
                    </h3>
                    <div className="space-y-2">
                      {data.activity.slice(0, 10).map((x) => (
                        <div
                          key={x.id}
                          className="flex justify-between gap-3 border-b pb-2 text-sm"
                        >
                          <span>{x.summary}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {date(x.occurred_at)}
                          </span>
                        </div>
                      ))}
                      {!data.activity.length && (
                        <p className="text-sm text-muted-foreground">
                          No contextual activity yet.
                        </p>
                      )}
                    </div>
                  </section>
                </TabsContent>
                <TabsContent value="scope">
                  <section className="space-y-4 rounded-xl border p-4">
                    <div>
                      <h3 className="font-semibold">Original Approved Scope</h3>
                      {data.approvedScopes[0] ? (
                        <div className="mt-2 rounded-lg bg-blue-50 p-3">
                          <strong>
                            {
                              data.approvedScopes[0].proposal_snapshot
                                ?.quoteNumber
                            }
                          </strong>
                          <p>
                            Approved {date(data.approvedScopes[0].approved_at)}{" "}
                            · {money(data.approvedScopes[0].approved_price)}
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-sm">
                            {data.approvedScopes[0].proposal_snapshot?.notes ||
                              data.project.description}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">
                          No immutable Approved Scope snapshot is linked yet.
                        </p>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">Change Orders</h3>
                      <div className="mt-2 space-y-2">
                        {data.changeOrders.map((x) => (
                          <div
                            key={x.id}
                            className="flex flex-col gap-3 rounded-lg bg-slate-50 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                          >
                            <span>{x.description}</span>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold">
                                {money(x.amount)} · {status(x.status)}
                              </span>
                              {x.invoice_id ? (
                                <Badge>Invoiced</Badge>
                              ) : x.status === "accepted" &&
                                Number(x.amount) > 0 ? (
                                <Button
                                  size="sm"
                                  disabled={invoiceChangeOrder.isPending}
                                  onClick={() =>
                                    invoiceChangeOrder.mutate(x.id)
                                  }
                                >
                                  Create Supplemental Invoice
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        ))}
                        {!data.changeOrders.length && (
                          <p className="text-sm text-muted-foreground">
                            No post-approval changes.
                          </p>
                        )}
                      </div>
                    </div>
                  </section>
                </TabsContent>
                <TabsContent value="work" className="space-y-4">
                  <section className="rounded-xl border p-4">
                    <h3 className="font-semibold">Add field work</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <Select value={entryType} onValueChange={setEntryType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            ["field_note", "Field note"],
                            ["measurement", "Measurement"],
                            ["task", "Task update"],
                            ["problem", "Problem discovered"],
                            ["labor", "Labor"],
                          ].map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={worker}
                        onChange={(e) => setWorker(e.target.value)}
                        placeholder="Worker (optional)"
                      />
                      {entryType === "labor" && (
                        <>
                          <Input
                            type="number"
                            min="0"
                            step="0.25"
                            value={hours}
                            onChange={(e) => setHours(e.target.value)}
                            placeholder="Completed labor hours"
                          />
                          <Button
                            variant="outline"
                            disabled={!worker.trim() || startLabor.isPending}
                            onClick={() => startLabor.mutate()}
                          >
                            Start Work Timer
                          </Button>
                        </>
                      )}
                      <Textarea
                        className="sm:col-span-2"
                        rows={5}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Voice or typed field notes, measurements, completed work, remaining tasks, or discovered problems"
                      />
                      <Button
                        className="sm:col-span-2"
                        disabled={addWork.isPending || (!note.trim() && !hours)}
                        onClick={() => addWork.mutate()}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Save Work Entry
                      </Button>
                    </div>
                  </section>
                  <div className="space-y-2">
                    {data.workLogs.map((x) => (
                      <div key={x.id} className="rounded-xl border p-4">
                        <div className="flex justify-between">
                          <Badge variant="outline">
                            {status(x.entry_type)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {date(x.created_at)}
                          </span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm">
                          {x.note}
                        </p>
                        {x.started_at && !x.ended_at && (
                          <Button
                            className="mt-2"
                            size="sm"
                            variant="outline"
                            disabled={finishLabor.isPending}
                            onClick={() => finishLabor.mutate(x.id)}
                          >
                            Pause / Finish Session
                          </Button>
                        )}
                        {x.labor_hours && (
                          <p className="mt-1 text-sm font-medium">
                            {x.labor_hours} labor hour(s)
                            {x.worker_name ? ` · ${x.worker_name}` : ""}
                          </p>
                        )}
                      </div>
                    ))}
                    {!data.workLogs.length && (
                      <p className="rounded-xl border p-8 text-center text-muted-foreground">
                        No field work recorded.
                      </p>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="schedule">
                  <div className="space-y-4">
                    <section className="rounded-xl border p-4">
                      <h3 className="font-semibold">
                        Schedule a Job work block
                      </h3>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <Input
                          type="datetime-local"
                          value={scheduleStart}
                          onChange={(e) => setScheduleStart(e.target.value)}
                        />
                        <Input
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={scheduleHours}
                          onChange={(e) => setScheduleHours(e.target.value)}
                          placeholder="Clock hours"
                        />
                        <Input
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={crewHours}
                          onChange={(e) => setCrewHours(e.target.value)}
                          placeholder="Crew-hours (optional)"
                        />
                        <Button
                          className="sm:col-span-3"
                          disabled={
                            !scheduleStart ||
                            Number(scheduleHours) <= 0 ||
                            addSchedule.isPending
                          }
                          onClick={() => addSchedule.mutate()}
                        >
                          <CalendarDays className="mr-2 h-4 w-4" />
                          Add Work Block
                        </Button>
                      </div>
                    </section>
                    <div className="space-y-2">
                      {data.appointments.map((x) => (
                        <div key={x.id} className="rounded-xl border p-4">
                          <div className="flex justify-between">
                            <strong>{x.service_type}</strong>
                            <Badge>{status(x.status)}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {date(x.start_timestamptz || x.appointment_date)} ·{" "}
                            {status(x.schedule_kind || "appointment")}
                            {x.estimated_crew_hours
                              ? ` · ${x.estimated_crew_hours} crew-hours`
                              : ""}
                          </p>
                        </div>
                      ))}
                      {!data.appointments.length && (
                        <p className="rounded-xl border p-8 text-center text-muted-foreground">
                          No Job schedule item attached.
                        </p>
                      )}
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="money" className="space-y-4">
                  <div className="grid gap-2 sm:grid-cols-4">
                    <Info
                      label="Original contract"
                      value={money(data.financials.originalContract)}
                    />
                    <Info
                      label="Approved changes"
                      value={money(data.financials.approvedChanges)}
                    />
                    <Info
                      label="Current contract"
                      value={money(data.financials.currentContract)}
                    />
                    <Info
                      label="Direct costs"
                      value={money(data.financials.actualCosts)}
                    />
                  </div>
                  <section className="rounded-xl border p-4">
                    <h3 className="font-semibold">
                      Create invoice from this Job
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Remaining unbilled contract:{" "}
                      {money(data.financials.unbilledContract)}
                    </p>
                    {!data.invoices.length &&
                      data.quotes.some(
                        (quote: any) => quote.proposal_status === "accepted",
                      ) && (
                        <Button
                          className="mt-3 w-full"
                          disabled={createFromAcceptedQuote.isPending}
                          onClick={() => createFromAcceptedQuote.mutate()}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          {createFromAcceptedQuote.isPending
                            ? "Preparing Invoice..."
                            : "Create Invoice from Accepted Quote"}
                        </Button>
                      )}
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <Input
                        value={invoiceDescription}
                        onChange={(e) => setInvoiceDescription(e.target.value)}
                        placeholder="Invoice description"
                      />
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        max={data.financials.unbilledContract || undefined}
                        value={invoiceAmount}
                        onChange={(e) => setInvoiceAmount(e.target.value)}
                        placeholder="Amount"
                      />
                      <Input
                        type="date"
                        value={invoiceDue}
                        onChange={(e) => setInvoiceDue(e.target.value)}
                      />
                      <Button
                        className="sm:col-span-3"
                        variant="outline"
                        disabled={
                          invoiceDescription.length < 2 ||
                          Number(invoiceAmount) <= 0 ||
                          !invoiceDue ||
                          createInvoice.isPending
                        }
                        onClick={() => createInvoice.mutate()}
                      >
                        <CircleDollarSign className="mr-2 h-4 w-4" />
                        Create Custom Draft Invoice
                      </Button>
                    </div>
                  </section>
                  <section>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold">Invoices & Payments</h3>
                      {onNavigate && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onNavigate("invoices")}
                        >
                          Open full invoice manager
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {data.invoices.map((x) => {
                        const balance = Math.max(
                          0,
                          Number(x.total || 0) - Number(x.amount_paid || 0),
                        );
                        return (
                          <div key={x.id} className="rounded-xl border p-4">
                            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                              <div>
                                <strong>{x.invoice_number}</strong>
                                <p className="text-xs text-muted-foreground">
                                  Due {date(x.due_date)} · {status(x.status)}
                                </p>
                              </div>
                              <div className="grid grid-cols-3 gap-3 text-right text-sm">
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Total
                                  </p>
                                  <strong>{money(x.total)}</strong>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Paid
                                  </p>
                                  <strong className="text-emerald-700">
                                    {money(x.amount_paid)}
                                  </strong>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Balance
                                  </p>
                                  <strong>{money(balance)}</strong>
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {x.status === "draft" && (
                                <Button
                                  size="sm"
                                  disabled={sendInvoice.isPending}
                                  onClick={() => sendInvoice.mutate(x.id)}
                                >
                                  <Send className="mr-2 h-4 w-4" />
                                  Send Invoice
                                </Button>
                              )}
                              {balance > 0 && x.status !== "void" && (
                                <Button
                                  size="sm"
                                  variant={
                                    x.status === "draft" ? "outline" : "default"
                                  }
                                  onClick={() => {
                                    setPaymentInvoice(x);
                                    setPaymentAmount(balance.toFixed(2));
                                    setPaymentMethod("check");
                                    setPaymentReference("");
                                    setPaymentDate(
                                      new Date().toISOString().slice(0, 10),
                                    );
                                  }}
                                >
                                  <CircleDollarSign className="mr-2 h-4 w-4" />
                                  Record Payment
                                </Button>
                              )}
                              {Number(x.amount_paid) > 0 &&
                                x.status !== "void" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={sendReceipt.isPending}
                                    onClick={() => sendReceipt.mutate(x.id)}
                                  >
                                    Send Paid Receipt
                                  </Button>
                                )}
                              {x.status !== "void" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setEditInvoice({
                                      id: Number(x.id),
                                      invoiceNumber: x.invoice_number,
                                      customerId: Number(x.customer_id),
                                      quoteProposalId: x.quote_proposal_id
                                        ? Number(x.quote_proposal_id)
                                        : null,
                                      status: x.status,
                                      amountPaid: Number(x.amount_paid || 0),
                                      lineItems: (x.line_items || []).map(
                                        (item: any) => ({
                                          description: String(
                                            item.description || "",
                                          ),
                                          quantity: Number(item.quantity || 0),
                                          rate: Number(item.rate || 0),
                                        }),
                                      ),
                                      discount: Number(x.discount || 0),
                                      taxRate: Number(x.tax_rate || 0),
                                      depositRequired: Number(
                                        x.deposit_required || 0,
                                      ),
                                      paymentUrl: x.payment_url || "",
                                      dueDate: x.due_date,
                                      notes: x.notes || "",
                                      terms: x.terms || "",
                                    })
                                  }
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit Invoice
                                </Button>
                              )}
                              <Button size="sm" variant="outline" asChild>
                                <a
                                  href={`/api/admin/invoices/${x.id}/pdf`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  View Invoice
                                </a>
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      {!data.invoices.length && (
                        <p className="rounded-xl border p-6 text-center text-muted-foreground">
                          No invoice exists yet. Create it from the accepted
                          quote above.
                        </p>
                      )}
                    </div>
                  </section>
                  <section>
                    <h3 className="mb-2 font-semibold">Direct Job Costs</h3>
                    {data.expenses.map((x) => (
                      <div
                        key={x.id}
                        className="mb-2 flex items-center justify-between rounded-xl border p-3"
                      >
                        <span className="flex items-center gap-2">
                          <Receipt className="h-4 w-4" />
                          {x.description}
                        </span>
                        <strong>{money(x.amount)}</strong>
                      </div>
                    ))}
                  </section>
                </TabsContent>
                <TabsContent value="files" className="space-y-4">
                  <section className="rounded-xl border p-4">
                    <h3 className="font-semibold">Add Job photo</h3>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                      <Select value={mediaStage} onValueChange={setMediaStage}>
                        <SelectTrigger className="sm:w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            "site_visit",
                            "before",
                            "progress",
                            "change_order",
                            "completion",
                            "document",
                            "other",
                          ].map((x) => (
                            <SelectItem key={x} value={x}>
                              {status(x)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) =>
                          setMediaFile(e.target.files?.[0] || null)
                        }
                      />
                      <Button
                        disabled={!mediaFile || addMedia.isPending}
                        onClick={() => addMedia.mutate()}
                      >
                        Upload
                      </Button>
                    </div>
                  </section>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {data.media.map((x) => (
                      <div
                        key={x.id}
                        className="overflow-hidden rounded-xl border"
                      >
                        <a href={x.url} target="_blank" rel="noreferrer">
                          <img
                            src={x.url}
                            alt={x.caption || x.stage}
                            className="aspect-square w-full object-cover"
                          />
                        </a>
                        <div className="p-2 text-xs">
                          <Badge variant="outline">{status(x.stage)}</Badge>
                          <p className="mt-1">{x.caption}</p>
                          {x.stage === "completion" &&
                            !data.gallery.some(
                              (g) => Number(g.source_media_id) === Number(x.id),
                            ) && (
                              <Button
                                className="mt-2 w-full"
                                size="sm"
                                variant="outline"
                                disabled={publishMedia.isPending}
                                onClick={() => publishMedia.mutate(x)}
                              >
                                Publish to Gallery
                              </Button>
                            )}
                        </div>
                      </div>
                    ))}
                    {data.gallery.map((x) => (
                      <a
                        key={`gallery-${x.id}`}
                        href={x.image_url}
                        target="_blank"
                        rel="noreferrer"
                        className="overflow-hidden rounded-xl border"
                      >
                        <img
                          src={x.image_url}
                          alt={x.title}
                          className="aspect-square w-full object-cover"
                        />
                        <div className="p-2 text-xs">
                          <Badge>Published</Badge>
                          <p className="mt-1">{x.title}</p>
                        </div>
                      </a>
                    ))}
                    {!data.media.length && !data.gallery.length && (
                      <div className="col-span-full rounded-xl border p-10 text-center text-muted-foreground">
                        <Images className="mx-auto mb-2 h-8 w-8" />
                        No Job media attached.
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="marketing" className="space-y-4">
                  <section className="rounded-xl border p-4">
                    <h3 className="flex items-center gap-2 font-semibold"><Megaphone className="h-4 w-4" />Completed-job marketing pack</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Turn verified Job information into a local project page, review request, and reusable business updates without publishing the customer's full address.</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className={`rounded-lg p-3 text-sm ${data.media.some((x) => x.stage === "completion") ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-950"}`}><strong>Completion photos</strong><p>{data.media.filter((x) => x.stage === "completion").length || "None"} attached</p></div>
                      <div className={`rounded-lg p-3 text-sm ${data.gallery.length ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-950"}`}><strong>SEO project page</strong><p>{data.gallery.length ? "Published" : "Not published"}</p></div>
                      <div className={`rounded-lg p-3 text-sm ${data.reviews.length ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-950"}`}><strong>Customer review</strong><p>{data.reviews.length ? "Received" : "Not received yet"}</p></div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="outline" disabled={requestReview.isPending || !data.project.customer?.email} onClick={() => requestReview.mutate()}><Star className="mr-2 h-4 w-4" />Request customer review</Button>
                      {!data.gallery.length && data.media.filter((x) => x.stage === "completion").slice(0, 1).map((media) => <Button key={media.id} variant="outline" disabled={publishMedia.isPending} onClick={() => publishMedia.mutate(media)}><Images className="mr-2 h-4 w-4" />Publish SEO project page</Button>)}
                      {data.gallery[0]?.id && <Button variant="outline" asChild><a href={projectUrl} target="_blank" rel="noreferrer">View project page<ExternalLink className="ml-2 h-4 w-4" /></a></Button>}
                    </div>
                  </section>
                  <section className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border p-4"><div className="flex items-center justify-between gap-2"><h3 className="font-semibold">Google Business update</h3><Button size="sm" variant="outline" onClick={() => copyMarketingText("Google post", googlePostDraft)}><Copy className="mr-2 h-4 w-4" />Copy</Button></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{googlePostDraft}</p></div>
                    <div className="rounded-xl border p-4"><div className="flex items-center justify-between gap-2"><h3 className="font-semibold">Yelp business update</h3><Button size="sm" variant="outline" onClick={() => copyMarketingText("Yelp post", yelpPostDraft)}><Copy className="mr-2 h-4 w-4" />Copy</Button></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{yelpPostDraft}</p></div>
                  </section>
                  <section className="rounded-xl border border-red-200 bg-red-50 p-4"><h3 className="font-semibold text-red-950">Yelp for Business</h3><p className="mt-1 text-sm text-red-900">Claim the free business listing first. Search before adding a new listing so HandyTech does not end up with duplicates. Claiming is free; paid Yelp advertising is optional.</p><Button className="mt-3" variant="outline" asChild><a href="https://biz.yelp.com/claim" target="_blank" rel="noreferrer">Find or claim HandyTech on Yelp<ExternalLink className="ml-2 h-4 w-4" /></a></Button></section>
                </TabsContent>
                <TabsContent value="closeout">
                  <section className="rounded-xl border p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="flex items-center gap-2 font-semibold">
                        <Wrench className="h-4 w-4" />
                        Guided closeout
                      </h3>
                      {!data.closeoutItems.length && (
                        <Button size="sm" onClick={() => initCloseout.mutate()}>
                          Start Closeout
                        </Button>
                      )}
                    </div>
                    <div className="mt-3 space-y-2">
                      {data.closeoutItems.map((item) => (
                        <label
                          key={item.id}
                          className={`flex items-center gap-3 rounded-lg p-3 text-sm ${item.completed ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-950"}`}
                        >
                          <Checkbox
                            checked={item.completed}
                            onCheckedChange={(checked) =>
                              updateCloseout.mutate({
                                id: item.id,
                                completed: checked === true,
                              })
                            }
                          />
                          <span className="flex-1">{item.label}</span>
                          {item.completed && (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                        </label>
                      ))}
                      {!data.closeoutItems.length && (
                        <p className="py-8 text-center text-muted-foreground">
                          Start closeout when the approved work is substantially
                          complete.
                        </p>
                      )}
                      {data.closeoutItems.length > 0 &&
                        data.closeoutItems.every((item) => item.completed) && (
                          <Button
                            className="mt-4 w-full"
                            disabled={
                              completeCloseout.isPending ||
                              data.project.status === "closed"
                            }
                            onClick={() => completeCloseout.mutate()}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            {data.project.status === "closed"
                              ? "Job Closed"
                              : "Close Job"}
                          </Button>
                        )}
                    </div>
                  </section>
                </TabsContent>
              </Tabs>
            </>
          )}
          <Dialog
            open={!!paymentInvoice}
            onOpenChange={(open) => !open && setPaymentInvoice(null)}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record payment</DialogTitle>
                <DialogDescription>
                  {paymentInvoice?.invoice_number} · remaining balance{" "}
                  {money(
                    Math.max(
                      0,
                      Number(paymentInvoice?.total || 0) -
                        Number(paymentInvoice?.amount_paid || 0),
                    ),
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <p className="mb-1 text-sm font-medium">Amount received</p>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={Math.max(
                      0,
                      Number(paymentInvoice?.total || 0) -
                        Number(paymentInvoice?.amount_paid || 0),
                    )}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                </div>
                <div>
                  <p className="mb-1 text-sm font-medium">Payment method</p>
                  <Select
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="bank_transfer">
                        Bank transfer / Zelle
                      </SelectItem>
                      <SelectItem value="other">Other / crypto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="mb-1 text-sm font-medium">Date received</p>
                  <Input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>
                <div>
                  <p className="mb-1 text-sm font-medium">
                    Reference or note (optional)
                  </p>
                  <Input
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Check number, Zelle reference, cash, BTC transaction, etc."
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={
                    recordPayment.isPending ||
                    Number(paymentAmount) <= 0 ||
                    Number(paymentAmount) >
                      Math.max(
                        0,
                        Number(paymentInvoice?.total || 0) -
                          Number(paymentInvoice?.amount_paid || 0),
                      ) ||
                    !paymentDate
                  }
                  onClick={() => recordPayment.mutate()}
                >
                  {recordPayment.isPending ? "Recording..." : "Record Payment"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <InvoiceEditorDialog
            invoice={editInvoice}
            onClose={() => setEditInvoice(null)}
            onSaved={() => {
              refresh();
              qc.invalidateQueries({ queryKey: ["/api/admin/invoices"] });
              qc.invalidateQueries({
                queryKey: ["/api/admin/operations/jobs"],
              });
              qc.invalidateQueries({
                queryKey: ["/api/admin/operations/summary"],
              });
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <strong className="mt-1 block">{value}</strong>
    </div>
  );
}
