import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  Download,
  Eye,
  FileText,
  Images,
  Plus,
  Receipt,
  Send,
  Star,
  Trash2,
  WalletCards,
} from "lucide-react";
import type { Customer, Invoice, InvoicePayment } from "@shared/schema";
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

type InvoiceRow = { invoice: Invoice; customer: Customer | null };
type DraftItem = { description: string; quantity: number; rate: number };
type QuoteChoice = {
  id: number;
  quoteId: number;
  quoteNumber: string;
  lineItems: DraftItem[];
  discount: number;
  taxRate: number;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  status: string;
  sentAt: string;
  serviceNeeded: string;
  serviceAddress: string;
  existingInvoice: { invoiceNumber: string; status: string } | null;
};
const money = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD" });
const statusStyle: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-indigo-100 text-indigo-700",
  partial: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-800",
  overdue: "bg-red-100 text-red-800",
  void: "bg-gray-200 text-gray-600",
};

export default function AdminInvoiceManager({
  customers,
}: {
  customers: Customer[];
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [quoteProposalId, setQuoteProposalId] = useState("");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<DraftItem[]>([
    { description: "", quantity: 1, rate: 0 },
  ]);
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("Payment is due by the date shown above.");
  const [paymentInvoice, setPaymentInvoice] = useState<InvoiceRow | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("check");
  const [paymentReference, setPaymentReference] = useState("");
  const [projectInvoice, setProjectInvoice] = useState<InvoiceRow | null>(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectCategory, setProjectCategory] = useState("general");
  const [projectLocation, setProjectLocation] = useState("");
  const [beforePhotos, setBeforePhotos] = useState<File[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<File[]>([]);
  const { data: rows = [] } = useQuery<InvoiceRow[]>({
    queryKey: ["/api/admin/invoices"],
  });
  const { data: quoteChoices = [], isFetching: quotesLoading } = useQuery<
    QuoteChoice[]
  >({
    queryKey: ["/api/admin/customers", customerId, "quote-proposals"],
    queryFn: async () =>
      (
        await apiRequest(
          `/api/admin/customers/${customerId}/quote-proposals`,
          "GET",
        )
      ).json(),
    enabled: !!customerId,
  });
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.rate || 0),
    0,
  );
  const tax = (Math.max(0, subtotal - discount) * taxRate) / 100;
  const total = Math.max(0, subtotal - discount) + tax;
  const reset = () => {
    setCustomerId("");
    setQuoteProposalId("");
    setSearch("");
    setItems([{ description: "", quantity: 1, rate: 0 }]);
    setDiscount(0);
    setTaxRate(0);
    setNotes("");
  };
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/admin/invoices"] });
  const create = useMutation({
    mutationFn: async () =>
      (
        await apiRequest("/api/admin/invoices", "POST", {
          customerId: Number(customerId),
          quoteProposalId: quoteProposalId ? Number(quoteProposalId) : null,
          lineItems: items,
          discount,
          taxRate,
          dueDate: new Date(`${dueDate}T12:00:00`).toISOString(),
          notes,
          terms,
        })
      ).json(),
    onSuccess: () => {
      refresh();
      setOpen(false);
      reset();
      toast({
        title: "Invoice draft created",
        description: "Preview it before sending.",
      });
    },
    onError: (error: Error) =>
      toast({
        title: "Invoice not created",
        description: error.message,
        variant: "destructive",
      }),
  });
  const send = useMutation({
    mutationFn: async (id: number) =>
      (await apiRequest(`/api/admin/invoices/${id}/send`, "POST", {})).json(),
    onSuccess: (data) => {
      refresh();
      toast({
        title: "Invoice sent",
        description: `${data.invoiceNumber} was emailed to the customer.`,
      });
    },
    onError: (error: Error) =>
      toast({
        title: "Invoice not sent",
        description: error.message,
        variant: "destructive",
      }),
  });
  const recordPayment = useMutation({
    mutationFn: async () =>
      (
        await apiRequest(
          `/api/admin/invoices/${paymentInvoice!.invoice.id}/payments`,
          "POST",
          {
            amount: Number(paymentAmount),
            method: paymentMethod,
            reference: paymentReference,
          },
        )
      ).json(),
    onSuccess: () => {
      refresh();
      setPaymentInvoice(null);
      setPaymentAmount("");
      setPaymentReference("");
      toast({ title: "Payment recorded" });
    },
    onError: (error: Error) =>
      toast({
        title: "Payment not recorded",
        description: error.message,
        variant: "destructive",
      }),
  });
  const sendReceipt = useMutation({
    mutationFn: async (id: number) =>
      (
        await apiRequest(`/api/admin/invoices/${id}/send-receipt`, "POST", {})
      ).json(),
    onSuccess: (data) =>
      toast({
        title: "Receipt sent",
        description: `${data.invoiceNumber} was emailed to the customer.`,
      }),
    onError: (error: Error) =>
      toast({
        title: "Receipt not sent",
        description: error.message,
        variant: "destructive",
      }),
  });
  const voidInvoice = useMutation({
    mutationFn: async (id: number) =>
      apiRequest(`/api/admin/invoices/${id}/void`, "POST", {}),
    onSuccess: () => {
      refresh();
      toast({ title: "Invoice voided" });
    },
    onError: (error: Error) =>
      toast({
        title: "Invoice not voided",
        description: error.message,
        variant: "destructive",
      }),
  });
  const requestReview = useMutation({
    mutationFn: async (row: InvoiceRow) => {
      if (!row.customer) throw new Error("This invoice does not have a customer profile.");
      const serviceType = row.invoice.lineItems[0]?.description || "HandyTech service";
      return apiRequest("/api/admin/review-requests/send-manual", "POST", {
        customerName: `${row.customer.firstName} ${row.customer.lastName}`,
        customerEmail: row.customer.email,
        serviceType: serviceType.slice(0, 160),
        personalMessage: `Thank you for choosing HandyTech Solutions for ${serviceType}.`,
      });
    },
    onSuccess: (_data, row) =>
      toast({
        title: "Review request sent",
        description: `The review link was emailed to ${row.customer?.firstName}.`,
      }),
    onError: (error: Error) =>
      toast({ title: "Review request not sent", description: error.message, variant: "destructive" }),
  });
  const addProject = useMutation({
    mutationFn: async () => {
      if (!afterPhotos.length) throw new Error("Choose at least one After photo for the gallery cover.");
      if (beforePhotos.length + afterPhotos.length > 10) throw new Error("Choose no more than 10 photos total.");
      const formData = new FormData();
      afterPhotos.forEach((photo) => formData.append("images", photo));
      beforePhotos.forEach((photo) => formData.append("images", photo));
      formData.append("beforeImageCount", String(beforePhotos.length));
      formData.append("afterImageCount", String(afterPhotos.length));
      formData.append("hasBeforeImage", beforePhotos.length ? "true" : "false");
      formData.append("title", projectTitle.trim());
      formData.append("description", projectDescription.trim());
      formData.append("category", projectCategory);
      if (projectLocation.trim()) formData.append("location", projectLocation.trim());
      formData.append("completionDate", new Date().toISOString());
      formData.append("featured", "false");
      formData.append("videoUrls", "[]");
      const headers = await createCsrfHeaders();
      const response = await fetch("/api/admin/gallery", {
        method: "POST",
        headers,
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message || "Project photos could not be saved.");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gallery"] });
      setProjectInvoice(null);
      setBeforePhotos([]);
      setAfterPhotos([]);
      toast({ title: "Before and after project added", description: "It is now available in Gallery Management." });
    },
    onError: (error: Error) =>
      toast({ title: "Photos not added", description: error.message, variant: "destructive" }),
  });
  const openProjectUpload = (row: InvoiceRow) => {
    const service = row.invoice.lineItems[0]?.description || "Completed project";
    const customer = row.customer;
    setProjectInvoice(row);
    setProjectTitle(service);
    setProjectDescription(`Completed ${service.toLowerCase()} for ${customer ? `${customer.firstName} ${customer.lastName}` : "a HandyTech customer"}.`);
    setProjectLocation(customer ? [customer.city, customer.state].filter(Boolean).join(", ") : "");
    setBeforePhotos([]);
    setAfterPhotos([]);
  };
  const addSelectedPhotos = async (kind: "before" | "after", selected: FileList | null) => {
    if (!selected?.length) return;
    let incoming: File[];
    try {
      // Windows exposes connected-phone photos through temporary MTP handles.
      // Snapshot them immediately so a later form submission does not lose access.
      incoming = await Promise.all(Array.from(selected).map(async (file) =>
        new File([await file.arrayBuffer()], file.name, {
          type: file.type,
          lastModified: file.lastModified,
        }),
      ));
    } catch {
      toast({
        title: "Photo could not be read",
        description: "Keep the phone unlocked and try that photo again, or copy it to the PC first.",
        variant: "destructive",
      });
      return;
    }
    const current = kind === "before" ? beforePhotos : afterPhotos;
    const otherCount = kind === "before" ? afterPhotos.length : beforePhotos.length;
    const unique = incoming.filter(
      (file) => !current.some((existing) =>
        existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified),
    );
    const available = Math.max(0, 10 - otherCount - current.length);
    const next = [...current, ...unique.slice(0, available)];
    if (kind === "before") setBeforePhotos(next);
    else setAfterPhotos(next);
    if (unique.length > available) {
      toast({ title: "10-photo limit reached", description: "Remove a selected photo before adding another." });
    }
  };
  const filtered = customers
    .filter((customer) =>
      `${customer.firstName} ${customer.lastName} ${customer.email} ${customer.phone || ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .slice(0, 100);
  const importQuote = () => {
    const quote = quoteChoices.find(
      (item) => String(item.id) === quoteProposalId,
    );
    if (!quote) return;
    setItems(quote.lineItems.map((item) => ({ ...item })));
    setDiscount(quote.discount);
    setTaxRate(quote.taxRate);
    setNotes(
      quote.notes ||
        `Invoice for ${quote.serviceNeeded}${quote.serviceAddress ? ` at ${quote.serviceAddress}` : ""}.`,
    );
    toast({
      title: `${quote.quoteNumber} imported`,
      description:
        "Review the line items and totals before saving the invoice.",
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>
            Create, preview, deliver, and track customer invoices and payments.
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Invoice</DialogTitle>
              <DialogDescription>
                Nothing is emailed until you preview the saved draft and press
                Send.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Find customer</Label>
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Name, email, or phone"
                  />
                </div>
                <div>
                  <Label>Bill to</Label>
                  <Select
                    value={customerId}
                    onValueChange={(value) => {
                      setCustomerId(value);
                      setQuoteProposalId("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {filtered.map((customer) => (
                        <SelectItem
                          key={customer.id}
                          value={String(customer.id)}
                        >
                          {customer.firstName} {customer.lastName} ·{" "}
                          {customer.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {customerId && (
                <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4">
                  <div className="mb-2">
                    <Label>Import an existing quote</Label>
                    <p className="text-sm text-slate-600">
                      Choose one of this customer&apos;s generated quotes to
                      copy its scope and pricing into the invoice.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Select
                      value={quoteProposalId}
                      onValueChange={setQuoteProposalId}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue
                          placeholder={
                            quotesLoading
                              ? "Loading quotes…"
                              : quoteChoices.length
                                ? "Select a quote"
                                : "No generated quotes found"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {quoteChoices.map((quote) => (
                          <SelectItem key={quote.id} value={String(quote.id)}>
                            {quote.quoteNumber} · {quote.serviceNeeded} ·{" "}
                            {money(quote.total)}
                            {quote.existingInvoice
                              ? ` · invoiced as ${quote.existingInvoice.invoiceNumber}`
                              : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!quoteProposalId}
                      onClick={importQuote}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Import Quote
                    </Button>
                  </div>
                  {quoteProposalId && (
                    <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-600">
                      <span>
                        {quoteChoices.find(
                          (quote) => String(quote.id) === quoteProposalId,
                        )?.serviceAddress || "No service address on quote"}
                      </span>
                      <a
                        className="font-medium text-blue-700 underline"
                        href={`/api/admin/quotes/${quoteChoices.find((quote) => String(quote.id) === quoteProposalId)?.quoteId}/proposal/pdf`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Preview quote
                      </a>
                    </div>
                  )}
                </div>
              )}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label>Line items</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setItems([
                        ...items,
                        { description: "", quantity: 1, rate: 0 },
                      ])
                    }
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add item
                  </Button>
                </div>
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[1fr_72px_100px_36px] gap-2"
                    >
                      <Input
                        value={item.description}
                        onChange={(event) =>
                          setItems(
                            items.map((current, i) =>
                              i === index
                                ? {
                                    ...current,
                                    description: event.target.value,
                                  }
                                : current,
                            ),
                          )
                        }
                        placeholder="Work performed or material"
                      />
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity}
                        onChange={(event) =>
                          setItems(
                            items.map((current, i) =>
                              i === index
                                ? {
                                    ...current,
                                    quantity: Number(event.target.value),
                                  }
                                : current,
                            ),
                          )
                        }
                      />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.rate}
                        onChange={(event) =>
                          setItems(
                            items.map((current, i) =>
                              i === index
                                ? {
                                    ...current,
                                    rate: Number(event.target.value),
                                  }
                                : current,
                            ),
                          )
                        }
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={items.length === 1}
                        onClick={() =>
                          setItems(items.filter((_, i) => i !== index))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label>Discount</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(event) =>
                      setDiscount(Number(event.target.value))
                    }
                  />
                </div>
                <div>
                  <Label>Tax rate %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="30"
                    step="0.01"
                    value={taxRate}
                    onChange={(event) => setTaxRate(Number(event.target.value))}
                  />
                </div>
                <div>
                  <Label>Due date</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                  />
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-4 text-right">
                <div>Subtotal: {money(subtotal)}</div>
                {discount > 0 && <div>Discount: -{money(discount)}</div>}
                <div>Tax: {money(tax)}</div>
                <div className="mt-2 text-xl font-bold">
                  Total: {money(total)}
                </div>
              </div>
              <div>
                <Label>Customer notes</Label>
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  placeholder="Thank-you message, project details, or payment instructions"
                />
              </div>
              <div>
                <Label>Payment terms</Label>
                <Textarea
                  value={terms}
                  onChange={(event) => setTerms(event.target.value)}
                  rows={2}
                />
              </div>
              <Button
                className="w-full"
                disabled={
                  !customerId ||
                  items.some(
                    (item) => !item.description.trim() || item.quantity <= 0,
                  ) ||
                  total <= 0 ||
                  create.isPending
                }
                onClick={() => create.mutate()}
              >
                {create.isPending ? "Saving…" : "Save Invoice Draft"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rows.map((row) => {
            const balance = Math.max(
              0,
              row.invoice.total - row.invoice.amountPaid,
            );
            return (
              <div
                key={row.invoice.id}
                className="rounded-lg border bg-white p-4"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <FileText className="h-4 w-4 text-brand-primary" />
                      <strong>{row.invoice.invoiceNumber}</strong>
                      <Badge className={statusStyle[row.invoice.status] || ""}>
                        {row.invoice.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {row.customer
                        ? `${row.customer.firstName} ${row.customer.lastName} · ${row.customer.email}`
                        : "Customer unavailable"}
                    </p>
                    <p className="text-sm text-slate-500">
                      Due {new Date(row.invoice.dueDate).toLocaleDateString()} ·
                      Total {money(row.invoice.total)} · Paid{" "}
                      {money(row.invoice.amountPaid)} ·{" "}
                      <strong>Balance {money(balance)}</strong>
                    </p>
                    {row.invoice.viewedAt && (
                      <p className="text-xs text-indigo-600">
                        Viewed {new Date(row.invoice.viewedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={`/api/admin/invoices/${row.invoice.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        Preview
                      </a>
                    </Button>
                    {!["paid", "void"].includes(row.invoice.status) && (
                      <Button
                        size="sm"
                        onClick={() => send.mutate(row.invoice.id)}
                        disabled={send.isPending}
                      >
                        <Send className="mr-1 h-4 w-4" />
                        {row.invoice.sentAt ? "Resend" : "Send"}
                      </Button>
                    )}
                    {balance > 0 && row.invoice.status !== "void" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPaymentInvoice(row);
                          setPaymentAmount(balance.toFixed(2));
                        }}
                      >
                        <WalletCards className="mr-1 h-4 w-4" />
                        Record payment
                      </Button>
                    )}
                    {row.invoice.amountPaid > 0 && row.invoice.status !== "void" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => sendReceipt.mutate(row.invoice.id)}
                        disabled={sendReceipt.isPending}
                      >
                        <Receipt className="mr-1 h-4 w-4" />
                        Send receipt
                      </Button>
                    )}
                    {row.invoice.status === "paid" && (
                      <Button size="sm" variant="outline" onClick={() => openProjectUpload(row)}>
                        <Images className="mr-1 h-4 w-4" />
                        Add Before/After
                      </Button>
                    )}
                    {row.invoice.status === "paid" && row.customer && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => requestReview.mutate(row)}
                        disabled={requestReview.isPending}
                      >
                        <Star className="mr-1 h-4 w-4" />
                        Request Review
                      </Button>
                    )}
                    {row.invoice.amountPaid === 0 &&
                      row.invoice.status !== "void" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600"
                          onClick={() =>
                            window.confirm("Void this invoice?") &&
                            voidInvoice.mutate(row.invoice.id)
                          }
                        >
                          Void
                        </Button>
                      )}
                  </div>
                </div>
              </div>
            );
          })}
          {rows.length === 0 && (
            <div className="py-12 text-center text-slate-500">
              No invoices yet. Create your first invoice when work is ready to
              bill.
            </div>
          )}
        </div>
      </CardContent>
      <Dialog
        open={!!paymentInvoice}
        onOpenChange={(value) => !value && setPaymentInvoice(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment already received outside the website.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
              />
            </div>
            <div>
              <Label>Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="card">
                    Card (processed elsewhere)
                  </SelectItem>
                  <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reference (optional)</Label>
              <Input
                value={paymentReference}
                onChange={(event) => setPaymentReference(event.target.value)}
                placeholder="Check number or transaction reference"
              />
            </div>
            <Button
              className="w-full"
              disabled={!Number(paymentAmount) || recordPayment.isPending}
              onClick={() => recordPayment.mutate()}
            >
              {recordPayment.isPending ? "Recording…" : "Record Payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!projectInvoice} onOpenChange={(value) => !value && setProjectInvoice(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Before &amp; After Project</DialogTitle>
            <DialogDescription>
              Add photos from this completed invoice. You can edit, feature, or publish the project from Gallery Management afterward.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Project title</Label>
              <Input value={projectTitle} onChange={(event) => setProjectTitle(event.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={3} value={projectDescription} onChange={(event) => setProjectDescription(event.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Category</Label>
                <Select value={projectCategory} onValueChange={setProjectCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="plumbing">Plumbing</SelectItem>
                    <SelectItem value="electrical">Electrical</SelectItem>
                    <SelectItem value="carpentry">Carpentry</SelectItem>
                    <SelectItem value="tech">Technology</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Location</Label>
                <Input value={projectLocation} onChange={(event) => setProjectLocation(event.target.value)} placeholder="City, State" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="cursor-pointer rounded-lg border-2 border-dashed p-4 text-center">
                <Camera className="mx-auto mb-2 h-6 w-6 text-slate-500" />
                <span className="block font-medium">Before photos</span>
                <span className="block text-xs text-slate-500">{beforePhotos.length ? `${beforePhotos.length} selected` : "Optional — select multiple"}</span>
                <Input className="sr-only" type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => { void addSelectedPhotos("before", event.target.files); event.target.value = ""; }} />
              </label>
              <label className="cursor-pointer rounded-lg border-2 border-dashed border-brand-primary p-4 text-center">
                <Camera className="mx-auto mb-2 h-6 w-6 text-brand-primary" />
                <span className="block font-medium">After photos *</span>
                <span className="block text-xs text-slate-500">{afterPhotos.length ? `${afterPhotos.length} selected` : "Select multiple — first is the cover"}</span>
                <Input className="sr-only" type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => { void addSelectedPhotos("after", event.target.files); event.target.value = ""; }} />
              </label>
            </div>
            {(beforePhotos.length > 0 || afterPhotos.length > 0) && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  {beforePhotos.map((photo, index) => (
                    <div key={`${photo.name}-${photo.lastModified}`} className="flex items-center justify-between gap-2 rounded border px-3 py-2 text-sm">
                      <span className="min-w-0 truncate">Before {index + 1}: {photo.name}</span>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setBeforePhotos(beforePhotos.filter((_, photoIndex) => photoIndex !== index))}>Remove</Button>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {afterPhotos.map((photo, index) => (
                    <div key={`${photo.name}-${photo.lastModified}`} className="flex items-center justify-between gap-2 rounded border px-3 py-2 text-sm">
                      <span className="min-w-0 truncate">After {index + 1}: {photo.name}{index === 0 ? " (cover)" : ""}</span>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setAfterPhotos(afterPhotos.filter((_, photoIndex) => photoIndex !== index))}>Remove</Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className={`text-sm ${beforePhotos.length + afterPhotos.length > 10 ? "font-semibold text-red-600" : "text-slate-500"}`}>
              {beforePhotos.length + afterPhotos.length} of 10 photos selected
            </p>
            <Button
              className="w-full"
              disabled={!projectTitle.trim() || !projectDescription.trim() || !afterPhotos.length || beforePhotos.length + afterPhotos.length > 10 || addProject.isPending}
              onClick={() => addProject.mutate()}
            >
              {addProject.isPending ? "Uploading…" : "Add Project to Gallery"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
