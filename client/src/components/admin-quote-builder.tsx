import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Calculator, CalendarPlus, CheckCircle2, ClipboardList, Copy, Eye, FileText, Loader2, Plus, Send, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import type { Quote } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type LineItem = { description: string; quantity: number; rate: number; details?: string; estimatedHours?: string; materials?: string; estimatedLaborAmount?: number; estimatedMaterialAmount?: number };
type SavedProposal = { quoteNumber: string; lineItems: LineItem[]; discount: number; taxRate: number; subtotal: number; tax: number; total: number; depositRequired: number; notes?: string; validUntil: string; status: string; sentAt: string; viewedAt?: string; respondedAt?: string; signerName?: string };

type IntakeAnalysis = { jobTitle: string; category: string; summary: string; readiness: "ready_to_price" | "needs_information" | "needs_site_visit" | "needs_urgent_review"; urgency: "routine" | "soon" | "urgent"; missingInformation: string[]; customerQuestions: string[]; safetyFlags: string[]; suggestedNextStep: string; contractorBrief: string };
type FollowUpDraft = { subject: string; emailBody: string; smsBody: string };
type GuardrailAnalysis = {
  roundedHours: { owner: number; helper: number };
  costs: { ownerLabor: number; helperLabor: number; internalLabor: number; suppliedMaterials: number; fuelAllocation: number; directCost: number };
  pricing: { customerLabor: number; customerMaterials: number; contingency: number; minimumPrice: number; recommendedPrice: number; proposedPrice: number; expectedGrossProfit: number; expectedGrossMarginPercent: number };
  market: { label: string; low: number; high: number; sourceLabel: string; sourceUrl: string; reviewedAt: string; applicable: boolean; limitation?: string };
  warnings: string[];
  history: { quoted: number; accepted: number; completedPaid: number; acceptedAverage: number | null; confidence: "low" | "medium" | "high"; note: string };
};

const laborBasedDeposit = (lineItems: LineItem[], fallbackTotal: number) => {
  const labor = lineItems.reduce((sum, item) => sum + Math.max(0, item.estimatedLaborAmount || 0), 0);
  return Math.round((labor > 0 ? labor : fallbackTotal) * 50) / 100;
};

const proposalSection = (notes: string | undefined, heading: string) => {
  if (!notes) return "";
  const match = notes.match(new RegExp(`\\[${heading.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\]\\n([\\s\\S]*?)(?=\\n\\n\\[[A-Z &]+\\]|$)`));
  return match?.[1]?.trim() || "";
};

export default function AdminQuoteBuilder({ quote, onSchedule, initiallyOpen = false, initiallyCorrecting = false, triggerLabel = "Build & Send Quote" }: { quote: Quote; onSchedule: (quote: Quote) => void; initiallyOpen?: boolean; initiallyCorrecting?: boolean; triggerLabel?: string }) {
  const [open, setOpen] = useState(initiallyOpen);
  const [showPreview, setShowPreview] = useState(false);
  const [viewingSaved, setViewingSaved] = useState(false);
  const [items, setItems] = useState<LineItem[]>([
    { description: quote.serviceNeeded || "Labor and services", quantity: 1, rate: 0 },
  ]);
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [validDays, setValidDays] = useState(14);
  const [notes, setNotes] = useState("Materials or work outside the listed scope require customer approval before proceeding.");
  const [projectSummary, setProjectSummary] = useState(quote.message || `Professional ${quote.serviceNeeded || "home improvement"} services as discussed.`);
  const [includedWork, setIncludedWork] = useState("");
  const [exclusions, setExclusions] = useState("Concealed damage or additional work discovered after work begins is not included unless approved in writing.");
  const [estimatedDuration, setEstimatedDuration] = useState("To be scheduled after approval");
  const [paymentTerms, setPaymentTerms] = useState("A deposit equal to 50% of the fixed labor amount is required to reserve the project and begin scheduling. Estimated materials are not included in the deposit calculation. The remaining balance and actual approved material charges are due upon completion unless another written payment schedule is included in this proposal. Changes to the approved scope require written approval.");
  const [workmanship, setWorkmanship] = useState("Work will be completed in a professional manner using appropriate methods and materials.");
  const [pricingPresentation, setPricingPresentation] = useState<"fixed_project" | "itemized">("fixed_project");
  const [roughNotes, setRoughNotes] = useState([quote.serviceNeeded, quote.message].filter(Boolean).join("\n"));
  const [aiSubtotal, setAiSubtotal] = useState(0);
  const [detailLevel, setDetailLevel] = useState<"concise" | "detailed">("detailed");
  const [intakeAnalysis, setIntakeAnalysis] = useState<IntakeAnalysis | null>(null);
  const [followUpPurpose, setFollowUpPurpose] = useState<"missing_information" | "quote_reminder" | "changes_reply">("missing_information");
  const [followUpContext, setFollowUpContext] = useState("");
  const [followUpDraft, setFollowUpDraft] = useState<FollowUpDraft | null>(null);
  const [smsConsentConfirmed, setSmsConsentConfirmed] = useState(false);
  const [ownerHours, setOwnerHours] = useState(0);
  const [helperHours, setHelperHours] = useState(0);
  const [suppliedMaterialsCost, setSuppliedMaterialsCost] = useState(0);
  const [distanceMiles, setDistanceMiles] = useState(0);
  const [includeContingency, setIncludeContingency] = useState(false);
  const [guardrailAnalysis, setGuardrailAnalysis] = useState<GuardrailAnalysis | null>(null);
  const [correctionMode, setCorrectionMode] = useState(false);
  const [correctionInstruction, setCorrectionInstruction] = useState("");
  const [correctionSummary, setCorrectionSummary] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: savedProposal, isLoading: savedProposalLoading } = useQuery<SavedProposal>({
    queryKey: ["/api/admin/quotes", quote.id, "proposal"],
    queryFn: async () => {
      const response = await fetch(`/api/admin/quotes/${quote.id}/proposal`, { credentials: "include" });
      if (response.status === 404) return undefined as unknown as SavedProposal;
      if (!response.ok) throw new Error("Generated quote could not be loaded");
      return response.json();
    },
    retry: false,
  });

  const loadSavedProposal = (proposal: SavedProposal) => {
    setItems(proposal.lineItems);
    setDiscount(proposal.discount);
    setTaxRate(proposal.taxRate);
    setProjectSummary(proposalSection(proposal.notes, "PROJECT SUMMARY") || projectSummary);
    setIncludedWork(proposalSection(proposal.notes, "INCLUDED WORK"));
    setExclusions(proposalSection(proposal.notes, "EXCLUSIONS & ASSUMPTIONS"));
    setEstimatedDuration(proposalSection(proposal.notes, "ESTIMATED DURATION") || estimatedDuration);
    setPaymentTerms(proposalSection(proposal.notes, "PAYMENT TERMS") || paymentTerms);
    setWorkmanship(proposalSection(proposal.notes, "WORKMANSHIP") || workmanship);
    const presentation = proposalSection(proposal.notes, "PRICING PRESENTATION");
    if (presentation === "fixed_project" || presentation === "itemized") setPricingPresentation(presentation);
    setNotes(proposalSection(proposal.notes, "ADDITIONAL NOTES"));
    const remainingDays = Math.max(1, Math.ceil((new Date(proposal.validUntil).getTime() - Date.now()) / 86400000));
    setValidDays(Math.min(90, remainingDays));
  };

  useEffect(() => {
    if (!savedProposal) return;
    if (savedProposal.status === "draft") loadSavedProposal(savedProposal);
    else if (initiallyCorrecting) {
      loadSavedProposal(savedProposal);
      setCorrectionMode(true);
      setViewingSaved(false);
      setShowPreview(false);
    }
  // Hydrate once when an existing revision draft is loaded.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedProposal?.quoteNumber, savedProposal?.status, initiallyCorrecting]);

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
        projectSummary,
        includedWork,
        exclusions,
        estimatedDuration,
        paymentTerms,
        workmanship,
        pricingPresentation,
        depositRequired: laborBasedDeposit(items, totals.total),
        createRevision: correctionMode,
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

  const convertMutation = useMutation({
    mutationFn: async () => (await apiRequest(`/api/admin/quotes/${quote.id}/convert-to-invoice`, "POST", {})).json(),
    onSuccess: (result: { invoice: { invoiceNumber: string }; created: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invoices"] });
      toast({
        title: result.created ? "Invoice draft created" : "Invoice already exists",
        description: `${result.invoice.invoiceNumber} is ready in the Invoices tab for review.`,
      });
    },
    onError: (error: Error) => toast({ title: "Invoice not created", description: error.message, variant: "destructive" }),
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
      return response.json() as Promise<{ lineItems: LineItem[]; scopeNotes: string; projectSummary: string; includedWork: string[]; exclusions: string[]; estimatedDuration: string; usedSubtotal: number }>;
    },
    onSuccess: (draft) => {
      setItems(draft.lineItems);
      setNotes(draft.scopeNotes);
      setProjectSummary(draft.projectSummary);
      setIncludedWork(draft.includedWork.map((item) => `- ${item}`).join("\n"));
      setExclusions(draft.exclusions.map((item) => `- ${item}`).join("\n"));
      setEstimatedDuration(draft.estimatedDuration);
      setAiSubtotal(draft.usedSubtotal);
      toast({ title: "AI draft and pricing ready", description: `$${draft.usedSubtotal.toFixed(2)} was distributed across the line items. Review everything before sending.` });
    },
    onError: (error: Error) => toast({ title: "Draft not generated", description: error.message, variant: "destructive" }),
  });

  const aiCorrectionMutation = useMutation({
    mutationFn: async () => (await apiRequest(`/api/admin/quotes/${quote.id}/ai-corrections`, "POST", {
      instruction: correctionInstruction,
      current: { lineItems: items.map((item) => ({ ...item, details: item.details || "", estimatedHours: item.estimatedHours || "", materials: item.materials || "", estimatedLaborAmount: item.estimatedLaborAmount ?? null, estimatedMaterialAmount: item.estimatedMaterialAmount ?? null })), discount, taxRate, notes, projectSummary, includedWork, exclusions, estimatedDuration, paymentTerms, workmanship, pricingPresentation },
    })).json() as Promise<{ corrected: { lineItems: LineItem[]; discount: number; taxRate: number; notes: string; projectSummary: string; includedWork: string; exclusions: string; estimatedDuration: string; paymentTerms: string; workmanship: string; pricingPresentation: "fixed_project" | "itemized" }; changedFields: string[] }>,
    onSuccess: ({ corrected, changedFields }) => {
      setItems(corrected.lineItems); setDiscount(corrected.discount); setTaxRate(corrected.taxRate); setNotes(corrected.notes); setProjectSummary(corrected.projectSummary); setIncludedWork(corrected.includedWork); setExclusions(corrected.exclusions); setEstimatedDuration(corrected.estimatedDuration); setPaymentTerms(corrected.paymentTerms); setWorkmanship(corrected.workmanship); setPricingPresentation(corrected.pricingPresentation);
      setCorrectionSummary(changedFields);
      toast({ title: "Requested correction applied to the preview", description: `Changed only: ${changedFields.join(", ")}. Nothing has been saved or sent yet.` });
    },
    onError: (error: Error) => toast({ title: "Correction not applied", description: error.message, variant: "destructive" }),
  });

  const intakeMutation = useMutation({
    mutationFn: async () => (await apiRequest(`/api/admin/quotes/${quote.id}/analyze-intake`, "POST", { contractorNotes: roughNotes })).json() as Promise<IntakeAnalysis>,
    onSuccess: (analysis) => { setIntakeAnalysis(analysis); toast({ title: "Job intake analyzed", description: analysis.suggestedNextStep }); },
    onError: (error: Error) => toast({ title: "Intake not analyzed", description: error.message, variant: "destructive" }),
  });

  const followUpMutation = useMutation({
    mutationFn: async () => (await apiRequest(`/api/admin/quotes/${quote.id}/ai-follow-up`, "POST", { purpose: followUpPurpose, context: followUpContext })).json() as Promise<FollowUpDraft>,
    onSuccess: (draft) => { setFollowUpDraft(draft); toast({ title: "Follow-up drafted", description: "Review or edit it, then choose how to send it." }); },
    onError: (error: Error) => toast({ title: "Follow-up not drafted", description: error.message, variant: "destructive" }),
  });

  const sendFollowUpMutation = useMutation({
    mutationFn: async (channel: "email" | "sms" | "both") => {
      if (!followUpDraft) throw new Error("Generate a follow-up draft first.");
      const response = await apiRequest(`/api/admin/quotes/${quote.id}/send-follow-up`, "POST", {
        channel,
        ...followUpDraft,
        smsConsentConfirmed,
      });
      return response.json() as Promise<{ emailSent: boolean; smsSent: boolean; message: string }>;
    },
    onSuccess: (result) => toast({ title: "Follow-up sent", description: result.message }),
    onError: (error: Error) => toast({ title: "Follow-up not sent", description: error.message, variant: "destructive" }),
  });

  const guardrailMutation = useMutation({
    mutationFn: async () => (await apiRequest(`/api/admin/quotes/${quote.id}/pricing-guardrails`, "POST", {
      proposedPrice: totals.total,
      ownerHours,
      helperHours,
      suppliedMaterialsCost,
      distanceMiles,
      includeContingency,
    })).json() as Promise<GuardrailAnalysis>,
    onSuccess: setGuardrailAnalysis,
    onError: (error: Error) => toast({ title: "Price check not completed", description: error.message, variant: "destructive" }),
  });

  const copyText = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    toast({ title: `${label} copied` });
  };

  const updateItem = (index: number, field: keyof LineItem, value: string) => {
    setItems((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      return { ...item, [field]: field === "quantity" || field === "rate" ? Number(value) : value };
    }));
  };

  const projectLaborAmount = items.reduce((sum, item) => sum + Math.max(0, item.estimatedLaborAmount || 0), 0);
  const projectMaterialAmount = items.reduce((sum, item) => sum + Math.max(0, item.estimatedMaterialAmount || 0), 0);
  const previewLineItems = viewingSaved && savedProposal ? savedProposal.lineItems : items;
  const previewLaborAmount = previewLineItems.reduce((sum, item) => sum + Math.max(0, item.estimatedLaborAmount || 0), 0);
  const previewMaterialAmount = previewLineItems.reduce((sum, item) => sum + Math.max(0, item.estimatedMaterialAmount || 0), 0);
  const updateProjectAllocation = (field: "estimatedLaborAmount" | "estimatedMaterialAmount", value: string) => {
    setItems((current) => current.map((item, index) => index === 0
      ? { ...item, [field]: Math.max(0, Number(value)) }
      : { ...item, [field]: undefined }));
  };

  const pricingSplitComplete = projectLaborAmount + projectMaterialAmount > 0
    && Math.abs(projectLaborAmount + projectMaterialAmount - totals.subtotal) <= 0.01;
  const ready = items.length > 0 && items.every((item) => item.description.trim() && item.quantity > 0 && item.rate >= 0) && totals.total > 0 && pricingSplitComplete;
  const isRevision = (quote.revisionNumber || 0) > 0;
  const isRevisionDraft = (isRevision && savedProposal?.status === "draft") || correctionMode;
  const beginCorrection = () => {
    if (!savedProposal) return;
    loadSavedProposal(savedProposal);
    setCorrectionMode(true);
    setViewingSaved(false);
    setShowPreview(false);
    setOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) { setShowPreview(false); setViewingSaved(false); } }}>
      <div className="flex flex-wrap gap-2">
        {(!savedProposal || savedProposal.status === "draft") && <DialogTrigger asChild><Button size="sm" onClick={() => setViewingSaved(false)}><Send className="mr-2 h-4 w-4" />{savedProposal?.status === "draft" ? "Edit Revision Draft" : triggerLabel}</Button></DialogTrigger>}
        {savedProposal && <Button type="button" size="sm" variant="outline" onClick={() => { setViewingSaved(true); setShowPreview(true); setOpen(true); }}><Eye className="mr-2 h-4 w-4" />View Generated Quote</Button>}
        {savedProposal && savedProposal.status !== "draft" && <Button type="button" size="sm" variant="outline" onClick={beginCorrection}><Copy className="mr-2 h-4 w-4" />Correct Quote</Button>}
        {savedProposal && savedProposal.status !== "draft" && <Button type="button" size="sm" variant="outline" onClick={() => onSchedule(quote)}><CalendarPlus className="mr-2 h-4 w-4" />Schedule</Button>}
        {savedProposal && savedProposal.status !== "draft" && <Button type="button" size="sm" onClick={() => convertMutation.mutate()} disabled={convertMutation.isPending}><FileText className="mr-2 h-4 w-4" />{convertMutation.isPending ? "Creating..." : "Convert to Invoice"}</Button>}
      </div>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isRevisionDraft ? "Correct Quote" : "Build Quote"} for {quote.firstName} {quote.lastName}</DialogTitle>
          <DialogDescription>{quote.email} · {quote.phone || "No phone provided"}. {isRevisionDraft ? "This starts as an exact copy. Only change the specific item that needs correction." : "Nothing sends until you press the final button."}</DialogDescription>
        </DialogHeader>

        {isRevision && savedProposalLoading ? <div className="flex min-h-48 items-center justify-center gap-3 text-slate-600"><Loader2 className="h-5 w-5 animate-spin" />Loading the complete prior quote…</div> : !showPreview ? <div className="space-y-5">
          {isRevisionDraft && <div className="space-y-3 rounded-xl border-2 border-blue-300 bg-blue-50 p-4"><div><h3 className="font-semibold text-blue-950">Correction mode — no revision exists until you send</h3><p className="mt-1 text-sm leading-6 text-blue-900">The original quote is loaded below. Edit a field directly, or tell AI exactly what to change. Everything else must remain identical. Closing this screen creates no extra quote. Customer names and addresses come from the Contact record.</p></div><Textarea rows={3} value={correctionInstruction} onChange={(event) => setCorrectionInstruction(event.target.value)} placeholder='Example: Change the estimated duration to 3–4 working days and do not change anything else.' /><Button type="button" variant="outline" className="border-blue-300 bg-white" disabled={correctionInstruction.trim().length < 3 || aiCorrectionMutation.isPending} onClick={() => aiCorrectionMutation.mutate()}>{aiCorrectionMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}{aiCorrectionMutation.isPending ? "Applying only that correction..." : "Apply Only These Changes with AI"}</Button>{correctionSummary.length > 0 && <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950"><strong>AI changed:</strong> {correctionSummary.join(", ")}. Review the preview before sending.</div>}</div>}
          {!isRevisionDraft && <>
          <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between"><div className="flex gap-3"><ClipboardList className="mt-0.5 h-5 w-5 text-emerald-700" /><div><h3 className="font-semibold">AI Job Intake Analysis</h3><p className="text-sm text-slate-600">Check whether this request is ready to price or schedule. Internal only; it never contacts the customer.</p></div></div><Button type="button" variant="outline" onClick={() => intakeMutation.mutate()} disabled={intakeMutation.isPending}>{intakeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}{intakeMutation.isPending ? "Analyzing..." : intakeAnalysis ? "Analyze Again" : "Analyze Request"}</Button></div>
            {intakeAnalysis && <div className="space-y-3 rounded-lg border bg-white p-4"><div className="flex flex-wrap gap-2"><h4 className="mr-auto font-semibold">{intakeAnalysis.jobTitle}</h4><Badge variant="outline">{intakeAnalysis.category}</Badge><Badge>{intakeAnalysis.readiness.replaceAll("_", " ")}</Badge></div><p className="text-sm text-slate-700">{intakeAnalysis.summary}</p>{intakeAnalysis.safetyFlags.length > 0 && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-900"><div className="flex gap-2 font-semibold"><AlertTriangle className="h-4 w-4" />Review before quoting</div><ul className="list-disc pl-5">{intakeAnalysis.safetyFlags.map(x => <li key={x}>{x}</li>)}</ul></div>}{intakeAnalysis.missingInformation.length > 0 ? <div className="text-sm"><strong>Missing information</strong><ul className="list-disc pl-5">{intakeAnalysis.missingInformation.map(x => <li key={x}>{x}</li>)}</ul></div> : <div className="flex gap-2 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4" />No important information gaps identified.</div>}{intakeAnalysis.customerQuestions.length > 0 && <div className="text-sm"><strong>Questions to ask</strong><ol className="list-decimal pl-5">{intakeAnalysis.customerQuestions.map(x => <li key={x}>{x}</li>)}</ol><Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => copyText("Customer questions", intakeAnalysis.customerQuestions.join("\n"))}><Copy className="mr-2 h-4 w-4" />Copy Questions</Button></div>}<div className="rounded bg-slate-50 p-3 text-sm"><strong>Next step:</strong> {intakeAnalysis.suggestedNextStep}</div><Button type="button" size="sm" onClick={() => setRoughNotes(intakeAnalysis.contractorBrief)}>Use Brief in Quote Builder</Button></div>}
          </div>

          <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/70 p-4">
            <div><h3 className="font-semibold">AI Customer Follow-up</h3><p className="text-sm text-slate-600">Draft, review, and send an email or text without leaving HandyTech.</p></div>
            <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
              <select className="h-10 rounded-md border border-input bg-white px-3 text-sm" value={followUpPurpose} onChange={(event) => setFollowUpPurpose(event.target.value as typeof followUpPurpose)}>
                <option value="missing_information">Ask for missing details</option><option value="quote_reminder">Quote reminder</option><option value="changes_reply">Reply about changes</option>
              </select>
              <Input value={followUpContext} onChange={(event) => setFollowUpContext(event.target.value)} placeholder="Optional context or questions to include" />
            </div>
            <Button type="button" variant="outline" onClick={() => followUpMutation.mutate()} disabled={followUpMutation.isPending}>{followUpMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}{followUpMutation.isPending ? "Drafting..." : "Draft Follow-up"}</Button>
            {followUpDraft && <div className="space-y-4 rounded-lg border bg-white p-4 text-sm">
              <div><Label>Subject</Label><Input className="mt-1" maxLength={140} value={followUpDraft.subject} onChange={(event) => setFollowUpDraft((current) => current ? { ...current, subject: event.target.value } : current)} /></div>
              <div><Label>Email to {quote.email}</Label><Textarea className="mt-1" rows={7} maxLength={2400} value={followUpDraft.emailBody} onChange={(event) => setFollowUpDraft((current) => current ? { ...current, emailBody: event.target.value } : current)} /><Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => copyText("Email", `Subject: ${followUpDraft.subject}\n\n${followUpDraft.emailBody}`)}><Copy className="mr-2 h-4 w-4" />Copy Email</Button></div>
              <div><Label>Text to {quote.phone || "No phone saved"}</Label><Textarea className="mt-1" rows={4} maxLength={480} value={followUpDraft.smsBody} onChange={(event) => setFollowUpDraft((current) => current ? { ...current, smsBody: event.target.value } : current)} /><div className="mt-1 text-right text-xs text-slate-500">{followUpDraft.smsBody.length}/480</div><Button type="button" size="sm" variant="outline" onClick={() => copyText("Text message", followUpDraft.smsBody)}><Copy className="mr-2 h-4 w-4" />Copy Text</Button></div>
              <label className="flex items-start gap-2 rounded border border-amber-200 bg-amber-50 p-3 text-sm"><input type="checkbox" className="mt-1" checked={smsConsentConfirmed} onChange={(event) => setSmsConsentConfirmed(event.target.checked)} /><span>I confirmed this customer agreed to receive text messages from HandyTech Solutions.</span></label>
              <div className="grid gap-2 sm:grid-cols-3">
                <Button type="button" variant="outline" disabled={sendFollowUpMutation.isPending || !followUpDraft.subject.trim() || !followUpDraft.emailBody.trim()} onClick={() => sendFollowUpMutation.mutate("email")}><Send className="mr-2 h-4 w-4" />Send Email</Button>
                <Button type="button" variant="outline" disabled={sendFollowUpMutation.isPending || !quote.phone || !smsConsentConfirmed || !followUpDraft.smsBody.trim()} onClick={() => sendFollowUpMutation.mutate("sms")}><Send className="mr-2 h-4 w-4" />Send Text</Button>
                <Button type="button" disabled={sendFollowUpMutation.isPending || !quote.phone || !smsConsentConfirmed || !followUpDraft.subject.trim() || !followUpDraft.emailBody.trim() || !followUpDraft.smsBody.trim()} onClick={() => sendFollowUpMutation.mutate("both")}>{sendFollowUpMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Send Both</Button>
              </div>
            </div>}
          </div>

          <div className="space-y-3 rounded-xl border border-sky-200 bg-sky-50/70 p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 text-sky-700" />
              <div>
                <h3 className="font-semibold text-slate-950">AI Quote Assistant</h3>
                <p className="text-sm text-slate-600">Paste a ChatGPT Project summary or dictate rough job notes. If the price is written in the message, AI will use it and distribute it across the line items. It never sends the quote.</p>
              </div>
            </div>
            <Textarea rows={8} maxLength={30000} value={roughNotes} onChange={(event) => setRoughNotes(event.target.value)} placeholder="Paste a detailed ChatGPT project summary or enter your job notes here..." />
            <div className="flex justify-between text-xs text-slate-500"><span>Detailed summaries and working estimates are supported.</span><span>{roughNotes.length.toLocaleString()} / 30,000 characters</span></div>
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
          </>}

          <div className="space-y-2">
            <div className="rounded-xl border bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-950">Project Details</h3>
              <p className="mb-4 text-sm text-slate-600">These sections explain the job clearly before the customer reaches the price.</p>
              <div className="space-y-4">
                <div><Label>Project overview</Label><Textarea rows={3} value={projectSummary} onChange={(event) => setProjectSummary(event.target.value)} placeholder="Summarize the customer’s goal and proposed solution." /></div>
                <div className="grid gap-4 sm:grid-cols-2"><div><Label>Included work</Label><Textarea rows={6} value={includedWork} onChange={(event) => setIncludedWork(event.target.value)} placeholder={'- Protect the work area\n- Complete the listed repairs\n- Clean up debris'} /></div><div><Label>Exclusions and assumptions</Label><Textarea rows={6} value={exclusions} onChange={(event) => setExclusions(event.target.value)} placeholder={'- Hidden damage is not included\n- Customer-selected finishes may affect price'} /></div></div>
                <div className="grid gap-4 sm:grid-cols-2"><div><Label>Estimated duration</Label><Input value={estimatedDuration} onChange={(event) => setEstimatedDuration(event.target.value)} placeholder="Example: 1–2 working days" /></div><div><Label>Payment terms</Label><Textarea rows={3} value={paymentTerms} onChange={(event) => setPaymentTerms(event.target.value)} /></div></div>
                <div><Label>Workmanship statement</Label><Textarea rows={2} value={workmanship} onChange={(event) => setWorkmanship(event.target.value)} /></div>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-semibold">Customer pricing presentation</div><p className="text-sm text-slate-600">Fixed project shows detailed phases with one total, preventing line-item cherry-picking.</p></div><select className="h-10 rounded-md border bg-white px-3 text-sm" value={pricingPresentation} onChange={(event) => setPricingPresentation(event.target.value as typeof pricingPresentation)}><option value="fixed_project">Fixed project price (recommended)</option><option value="itemized">Show every item price</option></select></div>
            <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4"><div className="text-sm text-amber-950"><strong>Whole-project planning split</strong><span className="block">The assistant estimates labor and contractor-supplied materials for the entire job. This is internal planning information; the customer still receives one fixed project price.</span></div><div className="grid gap-3 sm:grid-cols-3"><div><Label>Approx. project labor ($)</Label><Input type="number" min="0" step="0.01" value={projectLaborAmount || ""} onChange={(event) => updateProjectAllocation("estimatedLaborAmount", event.target.value)} placeholder="0.00" /></div><div><Label>Approx. project materials ($)</Label><Input type="number" min="0" step="0.01" value={projectMaterialAmount || ""} onChange={(event) => updateProjectAllocation("estimatedMaterialAmount", event.target.value)} placeholder="0.00" /></div><div><Label>Fixed project subtotal</Label><Input readOnly value={`$${totals.subtotal.toFixed(2)}`} className="bg-white font-semibold" /></div></div>{Math.abs(projectLaborAmount + projectMaterialAmount - totals.subtotal) > 0.01 && <p className="text-xs font-medium text-amber-900">Labor and materials currently total ${(projectLaborAmount + projectMaterialAmount).toFixed(2)}; adjust them to match the ${totals.subtotal.toFixed(2)} project subtotal.</p>}</div>
            {items.map((item, index) => (
              <div className="space-y-3 rounded-lg border p-3" key={index}>
                <div className="flex gap-2"><Input value={item.description} onChange={(event) => updateItem(index, "description", event.target.value)} placeholder="Project phase title" /><Button type="button" size="icon" variant="ghost" aria-label="Remove line item" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4" /></Button></div>
                <Textarea rows={2} value={item.details || ""} onChange={(event) => updateItem(index, "details", event.target.value)} placeholder="Describe the steps and finished result for this phase." />
                <div className="grid gap-2 sm:grid-cols-2"><Input value={item.estimatedHours || ""} onChange={(event) => updateItem(index, "estimatedHours", event.target.value)} placeholder="Approx. labor effort, e.g. 6–10 hours" /><Input value={item.materials || ""} onChange={(event) => updateItem(index, "materials", event.target.value)} placeholder="Material categories/allowance included" /></div>
                <div><Label>Internal phase allocation</Label><Input aria-label="Internal phase allocation" type="number" min="0" step="0.01" value={item.rate} onChange={(event) => updateItem(index, "rate", event.target.value)} /></div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setItems((current) => [...current, { description: "", quantity: 1, rate: 0, details: "", estimatedHours: "", materials: "" }])}><Plus className="mr-2 h-4 w-4" />Add Project Phase</Button>
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
            <div className="flex justify-between border-t pt-2 text-lg font-bold"><span>Total</span><span>${totals.total.toFixed(2)}</span></div><div className="flex justify-between rounded bg-blue-50 px-3 py-2 font-semibold text-blue-900"><span>Deposit: 50% of labor</span><span>${laborBasedDeposit(items, totals.total).toFixed(2)}</span></div>
          </div>

          {!isRevisionDraft && <div className="space-y-4 rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-700" />
              <div><h3 className="font-semibold text-slate-950">Private Pricing Guardrails</h3><p className="text-sm text-slate-600">Internal only. These figures never appear on the customer quote and never block you from sending it.</p></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div><Label>Your labor hours</Label><Input type="number" min="0" step="0.25" value={ownerHours || ""} onChange={(event) => { setOwnerHours(Number(event.target.value)); setGuardrailAnalysis(null); }} placeholder="Example: 6" /></div>
              <div><Label>Helper hours</Label><Input type="number" min="0" step="0.25" value={helperHours || ""} onChange={(event) => { setHelperHours(Number(event.target.value)); setGuardrailAnalysis(null); }} placeholder="Example: 2" /></div>
              <div><Label>Your material receipts</Label><Input type="number" min="0" step="0.01" value={suppliedMaterialsCost || ""} onChange={(event) => { setSuppliedMaterialsCost(Number(event.target.value)); setGuardrailAnalysis(null); }} placeholder="Tax included" /></div>
              <div><Label>One-way distance (miles)</Label><Input type="number" min="0" step="0.1" value={distanceMiles || ""} onChange={(event) => { setDistanceMiles(Number(event.target.value)); setGuardrailAnalysis(null); }} placeholder="From 63031" /></div>
            </div>
            <label className="flex items-start gap-2 rounded-lg border bg-white p-3 text-sm"><input type="checkbox" className="mt-1" checked={includeContingency} onChange={(event) => { setIncludeContingency(event.target.checked); setGuardrailAnalysis(null); }} /><span><strong>Include 10% uncertainty contingency</strong><span className="block text-slate-600">Use only for documented hidden-condition or preparation risk—not automatically.</span></span></label>
            <Button type="button" variant="outline" className="w-full border-emerald-300 bg-white sm:w-auto" disabled={guardrailMutation.isPending || totals.total <= 0} onClick={() => guardrailMutation.mutate()}>{guardrailMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}Check This Price</Button>

            {guardrailAnalysis && <div className="space-y-4 rounded-lg border bg-white p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded bg-slate-50 p-3"><div className="text-xs text-slate-500">Recommended price</div><div className="text-xl font-bold">${guardrailAnalysis.pricing.recommendedPrice.toFixed(2)}</div></div>
                <div className="rounded bg-slate-50 p-3"><div className="text-xs text-slate-500">Proposed price</div><div className="text-xl font-bold">${guardrailAnalysis.pricing.proposedPrice.toFixed(2)}</div></div>
                <div className="rounded bg-slate-50 p-3"><div className="text-xs text-slate-500">Expected gross margin</div><div className="text-xl font-bold">{guardrailAnalysis.pricing.expectedGrossMarginPercent.toFixed(1)}%</div><div className="text-xs text-slate-500">35% target</div></div>
                <div className="rounded bg-slate-50 p-3"><div className="text-xs text-slate-500">Confidence</div><div className="text-xl font-bold capitalize">{guardrailAnalysis.history.confidence}</div><div className="text-xs text-slate-500">{guardrailAnalysis.history.completedPaid} comparable paid jobs</div></div>
              </div>
              <div className="grid gap-4 text-sm sm:grid-cols-2">
                <div><h4 className="font-semibold">Internal cost picture</h4><dl className="mt-2 space-y-1 text-slate-700"><div className="flex justify-between"><dt>Owner labor ({guardrailAnalysis.roundedHours.owner} hr)</dt><dd>${guardrailAnalysis.costs.ownerLabor.toFixed(2)}</dd></div>{guardrailAnalysis.roundedHours.helper > 0 && <div className="flex justify-between"><dt>Helper labor ({guardrailAnalysis.roundedHours.helper} hr)</dt><dd>${guardrailAnalysis.costs.helperLabor.toFixed(2)}</dd></div>}<div className="flex justify-between"><dt>Supplied materials at receipt cost</dt><dd>${guardrailAnalysis.costs.suppliedMaterials.toFixed(2)}</dd></div><div className="flex justify-between"><dt>Fuel allocation</dt><dd>${guardrailAnalysis.costs.fuelAllocation.toFixed(2)}</dd></div><div className="flex justify-between border-t pt-1 font-semibold"><dt>Estimated direct cost</dt><dd>${guardrailAnalysis.costs.directCost.toFixed(2)}</dd></div><div className="flex justify-between text-emerald-800"><dt>Expected gross profit</dt><dd>${guardrailAnalysis.pricing.expectedGrossProfit.toFixed(2)}</dd></div></dl></div>
                <div><h4 className="font-semibold">Regional comparison</h4>{guardrailAnalysis.market.applicable ? <><p className="mt-2 text-slate-700">{guardrailAnalysis.market.label}: <strong>${guardrailAnalysis.market.low.toFixed(0)}–${guardrailAnalysis.market.high.toFixed(0)}</strong></p><p className="text-xs text-slate-500">Broad comparison only. <a className="underline" href={guardrailAnalysis.market.sourceUrl} target="_blank" rel="noreferrer">{guardrailAnalysis.market.sourceLabel}</a>, reviewed {guardrailAnalysis.market.reviewedAt}.</p></> : <p className="mt-2 rounded bg-blue-50 p-2 text-sm text-blue-950">{guardrailAnalysis.market.limitation}</p>}<p className="mt-2 text-xs text-slate-600">{guardrailAnalysis.history.note}</p></div>
              </div>
              {guardrailAnalysis.warnings.length > 0 ? <div className="rounded border border-amber-300 bg-amber-50 p-3"><div className="flex items-center gap-2 font-semibold text-amber-950"><AlertTriangle className="h-4 w-4" />Review before sending</div><ul className="mt-1 list-disc pl-5 text-sm text-amber-950">{guardrailAnalysis.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div> : <div className="flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-900"><CheckCircle2 className="h-4 w-4" />No pricing guardrail warnings.</div>}
            </div>}
          </div>}

          <Button className="w-full" disabled={!ready} onClick={() => setShowPreview(true)}>
            <Eye className="mr-2 h-4 w-4" />{isRevisionDraft ? "Preview Corrected Quote" : "Preview Customer Quote"}
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

              <div className="space-y-4 rounded-lg bg-slate-50 p-4"><div><div className="text-xs font-bold uppercase tracking-wider text-blue-700">Project overview</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{projectSummary}</p></div><div className="grid gap-4 sm:grid-cols-2"><div><div className="text-xs font-bold uppercase tracking-wider text-emerald-700">Included work</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{includedWork || items.map((item) => `- ${item.description}`).join("\n")}</p></div><div><div className="text-xs font-bold uppercase tracking-wider text-amber-700">Exclusions &amp; assumptions</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{exclusions || "No additional exclusions listed."}</p></div></div><div className="grid gap-3 border-t pt-3 text-sm sm:grid-cols-2"><div><strong>Estimated duration:</strong> {estimatedDuration}</div><div><strong>Payment terms:</strong> {paymentTerms}</div></div></div>

              {pricingPresentation === "fixed_project" ? <div className="space-y-3"><div><h3 className="text-lg font-bold">Project phases</h3><p className="text-sm text-slate-600">Phase allocations are included in the fixed project price and are not individually removable.</p></div>{items.map((item, index) => <div key={index} className="rounded-lg border p-4"><div className="flex gap-3"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">{index + 1}</div><div><h4 className="font-semibold">{item.description}</h4>{item.details && <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.details}</p>}<div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">{item.estimatedHours && <span><strong>Planning estimate:</strong> {item.estimatedHours}</span>}{item.materials && <span><strong>Materials:</strong> {item.materials}</span>}</div></div></div></div>)}</div> : <div className="overflow-x-auto rounded-lg border">
                <div className="grid min-w-[600px] grid-cols-[1fr_70px_100px_110px] gap-2 bg-slate-100 px-4 py-3 text-xs font-bold uppercase text-slate-600"><span>Description</span><span className="text-right">Qty</span><span className="text-right">Rate</span><span className="text-right">Amount</span></div>
                {(viewingSaved && savedProposal ? savedProposal.lineItems : items).map((item, index) => <div key={index} className="grid min-w-[600px] grid-cols-[1fr_70px_100px_110px] gap-2 border-t px-4 py-3 text-sm"><span className="font-medium text-slate-900">{item.description}</span><span className="text-right text-slate-600">{item.quantity}</span><span className="text-right text-slate-600">${item.rate.toFixed(2)}</span><span className="text-right font-semibold">${(item.quantity * item.rate).toFixed(2)}</span></div>)}
              </div>}

              <div className="ml-auto w-full max-w-md space-y-1 text-sm">
                <div className={`mb-3 space-y-2 rounded-lg border p-4 ${previewLaborAmount + previewMaterialAmount > 0 ? "bg-slate-50" : "border-amber-300 bg-amber-50"}`}><div className="flex justify-between font-semibold"><span>Labor — fixed for listed scope</span><span>{previewLaborAmount + previewMaterialAmount > 0 ? `$${previewLaborAmount.toFixed(2)}` : "Not entered"}</span></div><div className="flex justify-between"><span>Estimated materials allowance</span><span>{previewLaborAmount + previewMaterialAmount > 0 ? `$${previewMaterialAmount.toFixed(2)}` : "Not entered"}</span></div><p className="border-t pt-2 text-xs leading-5 text-slate-600">Labor remains fixed for the work listed in this quote. Material pricing is estimated and may vary with actual purchase cost, availability, or customer selections. HandyTech will obtain approval before any material change increases the quoted total.</p>{previewLaborAmount + previewMaterialAmount <= 0 && <p className="text-xs font-semibold text-amber-900">This draft predates the pricing split or was started manually. Return to Edit and enter the whole-project labor and materials amounts before sending.</p>}</div>
                <div className="flex justify-between"><span>{pricingPresentation === "fixed_project" ? "Fixed project price" : "Subtotal"}</span><span>${(viewingSaved && savedProposal ? savedProposal.subtotal : totals.subtotal).toFixed(2)}</span></div>
                {(viewingSaved && savedProposal ? savedProposal.discount : discount) > 0 && <div className="flex justify-between"><span>Discount</span><span>-${(viewingSaved && savedProposal ? savedProposal.discount : discount).toFixed(2)}</span></div>}
                {(viewingSaved && savedProposal ? savedProposal.tax : totals.tax) > 0 && <div className="flex justify-between"><span>Tax</span><span>${(viewingSaved && savedProposal ? savedProposal.tax : totals.tax).toFixed(2)}</span></div>}
                <div className="flex justify-between border-t pt-2 text-xl font-bold"><span>Total investment</span><span>${(viewingSaved && savedProposal ? savedProposal.total : totals.total).toFixed(2)}</span></div><div className="mt-2 flex justify-between rounded bg-blue-50 px-3 py-2 font-semibold text-blue-900"><span>Deposit: 50% of fixed labor</span><span>${(viewingSaved && savedProposal ? laborBasedDeposit(savedProposal.lineItems, savedProposal.total) : laborBasedDeposit(items, totals.total)).toFixed(2)}</span></div>
              </div>

              {(viewingSaved && savedProposal ? savedProposal.notes : notes) && <div className="rounded-lg bg-slate-50 p-4"><div className="text-xs font-bold uppercase tracking-wider text-slate-600">Scope and notes</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{viewingSaved && savedProposal ? savedProposal.notes : notes}</p></div>}
              <p className="text-xs text-slate-500">This admin preview shows what the customer will receive. The final version also includes its quote number, downloadable PDF, approval controls, and electronic-signature section.</p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" onClick={() => viewingSaved ? setOpen(false) : setShowPreview(false)}><ArrowLeft className="mr-2 h-4 w-4" />{viewingSaved ? "Close" : "Back to Edit"}</Button>
            {viewingSaved && savedProposal ? <div className="flex flex-wrap justify-end gap-2">
              {savedProposal.status === "draft" ? <Button type="button" onClick={() => { setViewingSaved(false); setShowPreview(false); }}><FileText className="mr-2 h-4 w-4" />Edit Draft</Button> : <Button type="button" variant="outline" onClick={beginCorrection}><Copy className="mr-2 h-4 w-4" />Correct Quote</Button>}
              <Button type="button" variant="outline" onClick={() => { setOpen(false); onSchedule(quote); }}><CalendarPlus className="mr-2 h-4 w-4" />Schedule Appointment</Button>
              <Button type="button" onClick={() => convertMutation.mutate()} disabled={convertMutation.isPending}><FileText className="mr-2 h-4 w-4" />{convertMutation.isPending ? "Creating Invoice..." : "Convert to Invoice"}</Button>
              <Button asChild variant="outline"><a href={`/api/admin/quotes/${quote.id}/proposal/pdf`} target="_blank" rel="noreferrer"><Eye className="mr-2 h-4 w-4" />View PDF</a></Button>
            </div> : <Button disabled={sendMutation.isPending} onClick={() => sendMutation.mutate()}><Send className="mr-2 h-4 w-4" />{sendMutation.isPending ? "Sending..." : isRevisionDraft ? `Send Corrected $${totals.total.toFixed(2)} Quote` : `Send $${totals.total.toFixed(2)} Quote to Customer`}</Button>}
          </div>
        </div>}
      </DialogContent>
    </Dialog>
  );
}
