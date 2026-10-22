import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  BriefcaseBusiness,
  Camera,
  Download,
  ExternalLink,
  Eye,
  FileImage,
  Plus,
  Receipt,
  RefreshCw,
  ScanLine,
  Trash2,
  TrendingUp,
  Upload,
} from "lucide-react";
import type { Customer } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { createCsrfHeaders } from "@/lib/csrf";
import { useToast } from "@/hooks/use-toast";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import ProjectWorkspace from "@/components/project-workspace";

type JobRow = {
  id: number;
  customer_id: number;
  job_number: string;
  title: string;
  description?: string;
  address?: string;
  status: string;
  first_name: string;
  last_name: string;
  email: string;
  invoice_total: number | string;
  amount_paid: number | string;
  expenses: number | string;
  material_cost: number | string;
  labor_cost: number | string;
  approved_changes: number | string;
};
type ExpenseRow = {
  id: number;
  jobId: number;
  category: string;
  description: string;
  amount: number;
  vendor?: string | null;
  receiptUrl?: string | null;
  laborHours?: number | null;
  hourlyRate?: number | null;
  expenseDate: string;
};
type Summary = {
  billed: number;
  collected: number;
  outstanding: number;
  expenses: number;
  grossProfit: number;
  activeJobs: number;
  completedJobs: number;
};
type ActionCenter = {
  newConsultations: number;
  quoteRequests: number;
  quotesWaiting: number;
  invoicesDue: number;
  todayAppointments: number;
  reviewsNeeded: number;
};
type PricingIntelligence = {
  funnel: {
    sent: number;
    accepted: number;
    declined: number;
    changesRequested: number;
    acceptanceRate: number | null;
    acceptedAverage: number | null;
    declinedAverage: number | null;
  };
  actuals: {
    completed: number;
    withCosts: number;
    withHours: number;
    withRevenue: number;
    collected: number;
    directCost: number;
    laborHours: number;
    grossMarginPercent: number | null;
    completeJobs: number;
  };
  services: {
    service: string;
    quoted: number;
    accepted: number;
    declined: number;
    acceptedAverage: number | null;
  }[];
  publicBenchmarks: {
    reviewedAt: string;
    reviewEveryMonths: number;
    sources: { name: string; purpose: string; url: string }[];
  };
  guidance: string;
};
const statuses = [
  "lead",
  "quoted",
  "approved",
  "scheduled",
  "in_progress",
  "completed",
  "invoiced",
  "paid",
  "closed",
  "cancelled",
];
const categories = [
  "materials",
  "labor",
  "fuel",
  "equipment",
  "rental",
  "disposal",
  "payment_fees",
  "fees",
  "subcontractor",
  "other",
];
const categoryLabel = (category: string) =>
  category === "payment_fees"
    ? "Payment fees"
    : category[0].toUpperCase() + category.slice(1);
const money = (n: number | string) =>
  Number(n || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

export default function BusinessOperationsManager({
  customers,
  onNavigate,
  showCommandCenter = true,
  initialJobId,
  onInitialJobOpened,
}: {
  customers: Customer[];
  onNavigate?: (tab: string) => void;
  showCommandCenter?: boolean;
  initialJobId?: number | null;
  onInitialJobOpened?: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [workspaceJobId, setWorkspaceJobId] = useState<number | null>(null);
  useEffect(() => {
    if (!initialJobId) return;
    setWorkspaceJobId(initialJobId);
    onInitialJobOpened?.();
  }, [initialJobId, onInitialJobOpened]);
  const [jobView, setJobView] = useState<"active" | "history" | "all">("active");
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [expenseJob, setExpenseJob] = useState<JobRow | null>(null);
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("materials");
  const [expenseVendor, setExpenseVendor] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [laborHours, setLaborHours] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState("");
  const receiptFileInput = useRef<HTMLInputElement>(null);
  const receiptCameraInput = useRef<HTMLInputElement>(null);
  const [pnlJob, setPnlJob] = useState<JobRow | null>(null);
  const [changeJob, setChangeJob] = useState<JobRow | null>(null);
  const [changeDescription, setChangeDescription] = useState("");
  const [changeAmount, setChangeAmount] = useState("");
  const { data: jobs = [] } = useQuery<JobRow[]>({
    queryKey: ["/api/admin/operations/jobs"],
  });
  const visibleJobs = useMemo(() => {
    const historical = new Set(["cancelled", "paid", "closed"]);
    if (jobView === "active") return jobs.filter((job) => !historical.has(job.status));
    if (jobView === "history") return jobs.filter((job) => historical.has(job.status));
    return jobs;
  }, [jobs, jobView]);
  const { data: summary } = useQuery<Summary>({
    queryKey: ["/api/admin/operations/summary"],
  });
  const { data: actions } = useQuery<ActionCenter>({
    queryKey: ["/api/admin/operations/action-center"],
    enabled: showCommandCenter,
  });
  const { data: pricing } = useQuery<PricingIntelligence>({
    queryKey: ["/api/admin/operations/pricing-intelligence"],
  });
  const { data: expenses = [], isLoading: expensesLoading } = useQuery<
    ExpenseRow[]
  >({
    queryKey: ["job-expenses", pnlJob?.id],
    enabled: !!pnlJob,
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/operations/jobs/${pnlJob!.id}/expenses`,
        { credentials: "include" },
      );
      if (!response.ok) throw new Error("Expenses could not be loaded");
      return response.json();
    },
  });
  useEffect(() => {
    if (!receiptFile || !receiptFile.type.startsWith("image/")) {
      setReceiptPreview("");
      return;
    }
    const url = URL.createObjectURL(receiptFile);
    setReceiptPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [receiptFile]);
  useEffect(() => {
    if (
      expenseCategory === "labor" &&
      Number(laborHours) > 0 &&
      Number(hourlyRate) > 0
    )
      setExpenseAmount((Number(laborHours) * Number(hourlyRate)).toFixed(2));
  }, [expenseCategory, laborHours, hourlyRate]);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["/api/admin/operations/jobs"] });
    qc.invalidateQueries({ queryKey: ["/api/admin/operations/summary"] });
    qc.invalidateQueries({ queryKey: ["/api/admin/os/requests"] });
    qc.invalidateQueries({ queryKey: ["/api/admin/os/today"] });
    if (pnlJob) qc.invalidateQueries({ queryKey: ["job-expenses", pnlJob.id] });
  };
  const resetExpense = () => {
    setExpenseJob(null);
    setExpenseDescription("");
    setExpenseAmount("");
    setExpenseVendor("");
    setLaborHours("");
    setHourlyRate("");
    setReceiptFile(null);
    if (receiptFileInput.current) receiptFileInput.current.value = "";
    if (receiptCameraInput.current) receiptCameraInput.current.value = "";
    setExpenseCategory("materials");
    setExpenseDate(new Date().toISOString().slice(0, 10));
  };
  const create = useMutation({
    mutationFn: () =>
      apiRequest("/api/admin/operations/jobs", "POST", {
        customerId: Number(customerId),
        title,
        description,
        address,
      }),
    onSuccess: () => {
      refresh();
      setOpen(false);
      setTitle("");
      setDescription("");
      setAddress("");
      toast({ title: "Job created" });
    },
    onError: (e: Error) =>
      toast({
        title: "Job not created",
        description: e.message,
        variant: "destructive",
      }),
  });
  const analyzeReceipt = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("receipt", file);
      const headers = await createCsrfHeaders();
      const response = await fetch("/api/admin/operations/receipts/analyze", {
        method: "POST",
        headers,
        body: form,
        credentials: "include",
      });
      if (!response.ok)
        throw new Error(
          (await response.json().catch(() => null))?.message ||
            "Receipt could not be read",
        );
      return response.json() as Promise<{
        vendor: string;
        purchaseDate: string;
        total: number | null;
        description: string;
        category: string;
        confidence: "high" | "medium" | "low";
      }>;
    },
    onSuccess: (data) => {
      if (data.vendor) setExpenseVendor(data.vendor);
      if (data.purchaseDate) setExpenseDate(data.purchaseDate);
      if (data.total != null) setExpenseAmount(data.total.toFixed(2));
      if (data.description) setExpenseDescription(data.description);
      if (categories.includes(data.category)) setExpenseCategory(data.category);
      toast({
        title: "Receipt details extracted",
        description: `${data.confidence[0].toUpperCase() + data.confidence.slice(1)} confidence — review the fields before saving.`,
      });
    },
    onError: (e: Error) =>
      toast({
        title: "Receipt not automatically read",
        description: `${e.message} You can still enter the details manually.`,
        variant: "destructive",
      }),
  });
  const selectReceipt = (file: File | null) => {
    setReceiptFile(file);
    if (file) analyzeReceipt.mutate(file);
  };
  const update = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest(`/api/admin/operations/jobs/${id}`, "PATCH", { status }),
    onSuccess: (_result, variables) => {
      refresh();
      if (variables.status === "cancelled") toast({ title: "Job cancelled", description: "The history was preserved and future Job appointments were cancelled." });
    },
    onError: (error: Error) => toast({ title: "Job not updated", description: error.message, variant: "destructive" }),
  });
  const sync = useMutation({
    mutationFn: async () =>
      (await apiRequest("/api/admin/operations/sync", "POST", {})).json(),
    onSuccess: (d) => {
      refresh();
      toast({
        title: "Records synchronized",
        description: `${d.imported} existing quote records added to Jobs.`,
      });
    },
  });
  const addExpense = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("category", expenseCategory);
      form.append("description", expenseDescription);
      form.append("amount", expenseAmount);
      form.append("vendor", expenseVendor);
      form.append("expenseDate", expenseDate);
      if (expenseCategory === "labor") {
        form.append("laborHours", laborHours);
        form.append("hourlyRate", hourlyRate);
      }
      if (receiptFile) form.append("receipt", receiptFile);
      const headers = await createCsrfHeaders();
      const response = await fetch(
        `/api/admin/operations/jobs/${expenseJob!.id}/expenses`,
        { method: "POST", headers, body: form, credentials: "include" },
      );
      if (!response.ok)
        throw new Error(
          (await response.json().catch(() => null))?.message ||
            "Expense could not be saved",
        );
      return response.json();
    },
    onSuccess: () => {
      refresh();
      resetExpense();
      toast({
        title: "Cost added to project P&L",
        description: receiptFile
          ? "The receipt image was saved with the expense."
          : undefined,
      });
    },
    onError: (e: Error) =>
      toast({
        title: "Expense not saved",
        description: e.message,
        variant: "destructive",
      }),
  });
  const removeExpense = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/admin/operations/expenses/${id}`, "DELETE"),
    onSuccess: () => {
      refresh();
      toast({ title: "Expense removed" });
    },
  });
  const addChange = useMutation({
    mutationFn: () =>
      apiRequest(
        `/api/admin/operations/jobs/${changeJob!.id}/change-orders`,
        "POST",
        { description: changeDescription, amount: Number(changeAmount) },
      ),
    onSuccess: () => {
      refresh();
      setChangeJob(null);
      setChangeDescription("");
      setChangeAmount("");
      toast({
        title: "Change order drafted",
        description: "It is saved with this job for review.",
      });
    },
  });
  const selectedCustomer = useMemo(
    () => customers.find((c) => String(c.id) === customerId),
    [customers, customerId],
  );
  const pnlCosts = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const pnlPaymentFees = expenses
    .filter((item) => item.category === "payment_fees")
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const pnlRevenue = Number(pnlJob?.invoice_total || 0);
  const pnlProfit = pnlRevenue - pnlCosts;
  return (
    <div className="space-y-5">
      {showCommandCenter && (
        <Card className="border-slate-800 bg-slate-950 text-white">
          <CardHeader>
            <CardTitle>Today at HandyTech</CardTitle>
            <CardDescription className="text-slate-300">
              Start with what needs attention. These buttons take you directly
              to the work.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {[
              ["New consultations", actions?.newConsultations, "consultations"],
              ["Quote requests", actions?.quoteRequests, "quotes"],
              ["Awaiting response", actions?.quotesWaiting, "quotes"],
              ["Invoices due", actions?.invoicesDue, "invoices"],
              [
                "Today appointments",
                actions?.todayAppointments,
                "appointments",
              ],
              ["Reviews needed", actions?.reviewsNeeded, "reviews"],
            ].map(([label, value, tab]) => (
              <button
                key={String(label)}
                onClick={() => onNavigate?.(String(tab))}
                className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-left transition hover:border-blue-400 hover:bg-slate-800"
              >
                <span className="block text-2xl font-bold">
                  {Number(value || 0)}
                </span>
                <span className="text-xs text-slate-300">{label}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {[
          ["Billed", summary?.billed],
          ["Collected", summary?.collected],
          ["Outstanding", summary?.outstanding],
          ["Expenses", summary?.expenses],
          ["Gross profit", summary?.grossProfit],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-lg font-bold">
                {money(Number(value || 0))}
              </p>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active jobs</p>
            <p className="mt-1 text-lg font-bold">{summary?.activeJobs || 0}</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Pricing Intelligence
          </CardTitle>
          <CardDescription>
            Actual profitability and customer acceptance are kept separate.
            Public sources are supporting evidence—not automatic prices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-xs text-muted-foreground">Quote acceptance</p>
              <strong className="text-xl">
                {pricing?.funnel.acceptanceRate == null
                  ? "Not enough data"
                  : `${pricing.funnel.acceptanceRate}%`}
              </strong>
              <p className="text-xs text-muted-foreground">
                {pricing?.funnel.accepted || 0} accepted of{" "}
                {pricing?.funnel.sent || 0} sent
              </p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-xs text-muted-foreground">
                Actual gross margin
              </p>
              <strong className="text-xl">
                {pricing?.actuals.grossMarginPercent == null
                  ? "Not ready"
                  : `${pricing.actuals.grossMarginPercent}%`}
              </strong>
              <p className="text-xs text-muted-foreground">
                Completed work only
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3">
              <p className="text-xs text-muted-foreground">
                Complete job records
              </p>
              <strong className="text-xl">
                {pricing?.actuals.completeJobs || 0} /{" "}
                {pricing?.actuals.completed || 0}
              </strong>
              <p className="text-xs text-muted-foreground">
                Hours + costs + payment
              </p>
            </div>
            <div className="rounded-lg bg-slate-100 p-3">
              <p className="text-xs text-muted-foreground">
                Recorded field hours
              </p>
              <strong className="text-xl">
                {Number(pricing?.actuals.laborHours || 0).toFixed(1)}
              </strong>
              <p className="text-xs text-muted-foreground">Completed jobs</p>
            </div>
          </div>
          <p className="rounded-lg border p-3 text-sm">
            {pricing?.guidance || "Loading pricing evidence…"}
          </p>
          {pricing?.services?.length ? (
            <div>
              <h4 className="font-semibold">Evidence by service</h4>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="py-2">Service</th>
                      <th>Quoted</th>
                      <th>Accepted</th>
                      <th>Declined</th>
                      <th>Average accepted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pricing.services.map((row) => (
                      <tr key={row.service} className="border-b">
                        <td className="py-2 font-medium">{row.service}</td>
                        <td>{row.quoted}</td>
                        <td>{row.accepted}</td>
                        <td>{row.declined}</td>
                        <td>
                          {row.acceptedAverage == null
                            ? "—"
                            : money(row.acceptedAverage)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Reviewed public references · every{" "}
              {pricing?.publicBenchmarks.reviewEveryMonths || 6} months
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {pricing?.publicBenchmarks.sources.map((source) => (
                <Button key={source.url} size="sm" variant="outline" asChild>
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.name}
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </a>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BriefcaseBusiness className="h-5 w-5" />
              Projects & Profitability
            </CardTitle>
            <CardDescription>
              Open a project to see the complete customer journey, schedule,
              money, and closeout.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => sync.mutate()}
              disabled={sync.isPending}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync existing
            </Button>
            <Button variant="outline" asChild>
              <a href="/api/admin/operations/accounting.csv">
                <Download className="mr-2 h-4 w-4" />
                P&L CSV
              </a>
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Existing Job
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add existing or unquoted job</DialogTitle>
                  <DialogDescription>
                    Use this only for work that already exists outside the
                    Request and Quote workflow. New customer work should begin
                    under Requests.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <Label>Customer</Label>
                  <Select
                    value={customerId}
                    onValueChange={(v) => {
                      setCustomerId(v);
                      const c = customers.find((x) => String(x.id) === v);
                      if (c)
                        setAddress(
                          [
                            c.street,
                            c.city,
                            [c.state, c.zip].filter(Boolean).join(" "),
                          ]
                            .filter(Boolean)
                            .join(", "),
                        );
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.firstName} {c.lastName} · {c.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Label>Job title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Kitchen repairs"
                  />
                  <Label>Scope notes</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <Label>Service address</Label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                  <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-900">
                    This creates a project directly and does not send a quote or
                    customer notification.
                  </p>
                  <Button
                    className="w-full"
                    disabled={
                      !selectedCustomer ||
                      title.trim().length < 2 ||
                      create.isPending
                    }
                    onClick={() => create.mutate()}
                  >
                    Add Existing Job
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter jobs">
            <Button size="sm" variant={jobView === "active" ? "default" : "outline"} onClick={() => setJobView("active")}>Active ({jobs.filter(job => !["cancelled","paid","closed"].includes(job.status)).length})</Button>
            <Button size="sm" variant={jobView === "history" ? "default" : "outline"} onClick={() => setJobView("history")}>History ({jobs.filter(job => ["cancelled","paid","closed"].includes(job.status)).length})</Button>
            <Button size="sm" variant={jobView === "all" ? "default" : "outline"} onClick={() => setJobView("all")}>All ({jobs.length})</Button>
          </div>
          <div className="space-y-3">
            {visibleJobs.map((job) => (
              <div key={job.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <strong>{job.job_number}</strong>
                      <Badge variant="secondary">
                        {job.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <h3 className="mt-1 font-semibold">{job.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {job.first_name} {job.last_name} · {job.email}
                    </p>
                    {job.address && (
                      <p className="text-sm text-muted-foreground">
                        {job.address}
                      </p>
                    )}
                  </div>
                  <Select
                    value={job.status}
                    onValueChange={(status) =>
                      update.mutate({ id: job.id, status })
                    }
                  >
                    <SelectTrigger className="w-full lg:w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
                  <div className="rounded bg-slate-50 p-2">
                    Revenue{" "}
                    <strong className="block">
                      {money(job.invoice_total)}
                    </strong>
                  </div>
                  <div className="rounded bg-amber-50 p-2">
                    Materials{" "}
                    <strong className="block">
                      {money(job.material_cost)}
                    </strong>
                  </div>
                  <div className="rounded bg-orange-50 p-2">
                    Labor{" "}
                    <strong className="block">{money(job.labor_cost)}</strong>
                  </div>
                  <div className="rounded bg-slate-50 p-2">
                    Total costs{" "}
                    <strong className="block">{money(job.expenses)}</strong>
                  </div>
                  <div
                    className={`${Number(job.invoice_total) - Number(job.expenses) >= 0 ? "bg-emerald-50" : "bg-red-50"} rounded p-2`}
                  >
                    Gross profit{" "}
                    <strong className="block">
                      {money(Number(job.invoice_total) - Number(job.expenses))}
                    </strong>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => setWorkspaceJobId(job.id)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Open project
                  </Button>
                  <Button size="sm" onClick={() => setExpenseJob(job)}>
                    <Receipt className="mr-2 h-4 w-4" />
                    Add cost / receipt
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPnlJob(job)}
                  >
                    <TrendingUp className="mr-2 h-4 w-4" />
                    View project P&L
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setChangeJob(job)}
                  >
                    Draft change order
                  </Button>
                  {!['cancelled','paid','closed'].includes(job.status) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
                      disabled={update.isPending}
                      onClick={() => window.confirm(`Cancel ${job.job_number}? Its history will be kept and future appointments for this Job will be cancelled.`) && update.mutate({ id: job.id, status: "cancelled" })}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Cancel Job
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {!visibleJobs.length && (
              <div className="py-10 text-center text-muted-foreground">
                <TrendingUp className="mx-auto mb-2 h-8 w-8" />
                {jobView === "active" ? "No active jobs. Cancelled and finished jobs are under History." : jobView === "history" ? "No cancelled or finished jobs yet." : "No jobs yet. Sync existing records or create the first job."}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!expenseJob} onOpenChange={(v) => !v && resetExpense()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add project cost</DialogTitle>
            <DialogDescription>
              {expenseJob?.job_number} · add materials, labor, fuel, fees, or
              another expense.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Cost type</Label>
              <Select
                value={expenseCategory}
                onValueChange={setExpenseCategory}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((v) => (
                    <SelectItem key={v} value={v}>
                      {categoryLabel(v)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={expenseDescription}
                onChange={(e) => setExpenseDescription(e.target.value)}
                placeholder={expenseCategory === "payment_fees" ? "Card processing fee for invoice payment" : "Paint and drywall supplies"}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>{expenseCategory === "payment_fees" ? "Payment provider" : "Store, vendor, or worker"}</Label>
                <Input
                  value={expenseVendor}
                  onChange={(e) => setExpenseVendor(e.target.value)}
                  placeholder={expenseCategory === "payment_fees" ? "Stripe, Venmo, PayPal…" : "Home Depot"}
                />
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                />
              </div>
            </div>
            {expenseCategory === "labor" ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Labor hours</Label>
                  <Input
                    type="number"
                    min="0.25"
                    step="0.25"
                    value={laborHours}
                    onChange={(e) => setLaborHours(e.target.value)}
                    placeholder="8"
                  />
                </div>
                <div>
                  <Label>Hourly cost</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    placeholder="25.00"
                  />
                </div>
              </div>
            ) : null}
            <div>
              <Label>Total cost</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                placeholder="Amount"
                readOnly={
                  expenseCategory === "labor" && !!laborHours && !!hourlyRate
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Receipt file (optional)</Label>
              <input
                ref={receiptFileInput}
                className="hidden"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => selectReceipt(e.target.files?.[0] || null)}
              />
              <input
                ref={receiptCameraInput}
                className="hidden"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => selectReceipt(e.target.files?.[0] || null)}
              />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => receiptFileInput.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Choose Existing Receipt
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => receiptCameraInput.current?.click()}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Take New Photo
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Choose a downloaded receipt, payment-provider statement, PDF, or
                existing photo, or take a new photo. Smart receipt reading fills
                the fields above; review them before saving. Add each receipt as
                its own cost so every fee remains traceable. PDF, JPG, PNG, or
                WebP up to 10 MB.
              </p>
              {analyzeReceipt.isPending && (
                <p className="flex items-center rounded-md bg-blue-50 p-2 text-sm text-blue-800">
                  <ScanLine className="mr-2 h-4 w-4 animate-pulse" />
                  Reading vendor, date, total, and category…
                </p>
              )}
              {receiptFile && (
                <p className="truncate text-xs font-medium">
                  Selected: {receiptFile.name}
                </p>
              )}
              {receiptPreview && (
                <img
                  src={receiptPreview}
                  alt="Receipt preview"
                  className="max-h-52 w-full rounded border object-contain"
                />
              )}
            </div>
            <Button
              className="w-full"
              disabled={
                expenseDescription.length < 2 ||
                Number(expenseAmount) <= 0 ||
                addExpense.isPending ||
                analyzeReceipt.isPending
              }
              onClick={() => addExpense.mutate()}
            >
              {addExpense.isPending
                ? "Saving receipt…"
                : "Review Details & Save to Project P&L"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pnlJob} onOpenChange={(v) => !v && setPnlJob(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Project profit & loss</DialogTitle>
            <DialogDescription>
              {pnlJob?.job_number} · {pnlJob?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded bg-blue-50 p-3">
              <span className="text-xs text-muted-foreground">Revenue</span>
              <strong className="block">{money(pnlRevenue)}</strong>
            </div>
            <div className="rounded bg-amber-50 p-3">
              <span className="text-xs text-muted-foreground">Costs</span>
              <strong className="block">{money(pnlCosts)}</strong>
            </div>
            <div className="rounded bg-violet-50 p-3">
              <span className="text-xs text-muted-foreground">Payment fees</span>
              <strong className="block">{money(pnlPaymentFees)}</strong>
            </div>
            <div
              className={`${pnlProfit >= 0 ? "bg-emerald-50" : "bg-red-50"} rounded p-3`}
            >
              <span className="text-xs text-muted-foreground">
                Gross profit
              </span>
              <strong className="block">{money(pnlProfit)}</strong>
            </div>
          </div>
          <div className="space-y-2">
            {expensesLoading ? (
              <p className="py-6 text-center text-muted-foreground">
                Loading costs…
              </p>
            ) : (
              expenses.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{categoryLabel(item.category)}</Badge>
                      <strong>{money(item.amount)}</strong>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.expenseDate).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.vendor || "No vendor"}
                      {item.laborHours && item.hourlyRate
                        ? ` · ${item.laborHours} hrs × ${money(item.hourlyRate)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {item.receiptUrl && (
                      <Button size="sm" variant="outline" asChild>
                        <a
                          href={item.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <FileImage className="mr-2 h-4 w-4" />
                          Receipt
                        </a>
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Delete expense"
                      onClick={() => removeExpense.mutate(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))
            )}
            {!expensesLoading && !expenses.length && (
              <p className="py-8 text-center text-muted-foreground">
                No project costs recorded yet.
              </p>
            )}
          </div>
          <Button
            onClick={() => {
              setExpenseJob(pnlJob);
              setPnlJob(null);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add another cost
          </Button>
        </DialogContent>
      </Dialog>

      <ProjectWorkspace
        jobId={workspaceJobId}
        onClose={() => setWorkspaceJobId(null)}
        onNavigate={(tab) => {
          setWorkspaceJobId(null);
          onNavigate?.(tab);
        }}
      />

      <Dialog open={!!changeJob} onOpenChange={(v) => !v && setChangeJob(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Draft change order</DialogTitle>
            <DialogDescription>
              {changeJob?.job_number} · record work outside the original scope.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={changeDescription}
            onChange={(e) => setChangeDescription(e.target.value)}
            placeholder="Describe the added or removed work"
          />
          <Input
            type="number"
            step="0.01"
            value={changeAmount}
            onChange={(e) => setChangeAmount(e.target.value)}
            placeholder="Price adjustment (negative for credit)"
          />
          <Button
            disabled={changeDescription.length < 2 || !changeAmount}
            onClick={() => addChange.mutate()}
          >
            Save Draft
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
