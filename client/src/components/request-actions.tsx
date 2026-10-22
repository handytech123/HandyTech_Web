import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  CalendarDays,
  Camera,
  Calculator,
  MessageSquare,
  NotebookPen,
  Send,
  X,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { createCsrfHeaders } from "@/lib/csrf";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function RequestActions({
  requestId,
  requestKind = "job_request",
  refresh,
}: {
  requestId: number;
  requestKind?: string;
  refresh: () => void;
}) {
  const { toast } = useToast();
  const [note, setNote] = useState("");
  const [question, setQuestion] = useState("");
  const [subject, setSubject] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [visitTime, setVisitTime] = useState("");
  const [visitMinutes, setVisitMinutes] = useState("60");
  const [overrideAvailability, setOverrideAvailability] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [laborHours, setLaborHours] = useState("");
  const [laborCost, setLaborCost] = useState("");
  const [otherCost, setOtherCost] = useState("");
  const [contingency, setContingency] = useState("");
  const [margin, setMargin] = useState("35");
  const [sellingPrice, setSellingPrice] = useState("");
  const done = (title: string) => {
    refresh();
    toast({ title });
  };
  const addNote = useMutation({
    mutationFn: () =>
      apiRequest(`/api/admin/os/requests/${requestId}/activities`, "POST", {
        kind: "internal_note",
        body: note,
      }),
    onSuccess: () => {
      setNote("");
      done("Internal note added");
    },
  });
  const ask = useMutation({
    mutationFn: () =>
      apiRequest(`/api/admin/os/requests/${requestId}/activities`, "POST", {
        kind: "customer_question",
        subject: subject || undefined,
        body: question,
      }),
    onSuccess: () => {
      setQuestion("");
      setSubject("");
      done("Question sent and recorded");
    },
  });
  const visit = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/admin/os/requests/${requestId}/site-visits`, "POST", {
        date: visitDate,
        time: visitTime,
        durationMinutes: Number(visitMinutes),
        overrideAvailability,
      });
      return response.json();
    },
    onSuccess: (result: {
      emailSent?: boolean;
      emailSkippedReason?: string | null;
      smsSent?: boolean;
      smsSkippedReason?: string | null;
      availabilityOverridden?: boolean;
    }) => {
      setVisitDate("");
      setVisitTime("");
      setOverrideAvailability(false);
      refresh();
      const emailStatus = result.emailSent
        ? "Email confirmation sent."
        : `Email not sent${result.emailSkippedReason ? `: ${result.emailSkippedReason}` : "."}`;
      const textStatus = result.smsSent
        ? "Text confirmation sent."
        : `Text not sent${result.smsSkippedReason ? `: ${result.smsSkippedReason}` : "."}`;
      toast({
        title: requestKind === "consultation" ? "Consultation scheduled" : "Site visit scheduled",
        description: `${result.availabilityOverridden ? "Availability was intentionally overridden. " : ""}${emailStatus} ${textStatus}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Visit not scheduled",
        description: error.message || "That time could not be verified. Choose another time.",
        variant: "destructive",
      });
    },
  });
  const estimate = useMutation({
    mutationFn: () =>
      apiRequest(`/api/admin/os/requests/${requestId}/estimates`, "POST", {
        estimatedLaborHours: Number(laborHours || 0),
        internalLaborCost: Number(laborCost || 0),
        contingency: Number(contingency || 0),
        targetMarginPercent: Number(margin || 0),
        ownerSelectedPrice: sellingPrice ? Number(sellingPrice) : undefined,
        items:
          Number(otherCost) > 0
            ? [
                {
                  category: "other_direct_cost",
                  description: "Materials and other direct costs",
                  quantity: 1,
                  unitCost: Number(otherCost),
                },
              ]
            : [],
      }),
    onSuccess: () => done("Internal estimate saved"),
  });
  const upload = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      files.forEach((file) => form.append("media", file));
      form.append("stage", "site_visit");
      const headers = await createCsrfHeaders();
      const response = await fetch(
        `/api/admin/os/requests/${requestId}/media`,
        { method: "POST", headers, body: form, credentials: "include" },
      );
      if (!response.ok)
        throw new Error(
          (await response.json().catch(() => null))?.message ||
            "File could not be saved",
        );
      return response.json();
    },
    onSuccess: () => {
      const uploadedCount = files.length;
      setFiles([]);
      done(`${uploadedCount} photo${uploadedCount === 1 ? "" : "s"} added to Request`);
    },
  });
  const addFiles = (selected: FileList | null) => {
    if (!selected) return;
    const images = Array.from(selected).filter((file) => file.type.startsWith("image/"));
    setFiles((current) => {
      const existing = new Set(current.map((file) => `${file.name}:${file.size}:${file.lastModified}`));
      const unique = images.filter((file) => !existing.has(`${file.name}:${file.size}:${file.lastModified}`));
      const next = [...current, ...unique].slice(0, 10);
      if (current.length + unique.length > 10) {
        toast({
          title: "Ten-photo maximum",
          description: "You can add up to 10 photos to a Request at one time.",
          variant: "destructive",
        });
      }
      return next;
    });
  };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <NotebookPen className="h-4 w-4" />
            Internal note
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Private observations, measurements, or next steps"
          />
          <Button
            size="sm"
            disabled={note.trim().length < 2 || addNote.isPending}
            onClick={() => addNote.mutate()}
          >
            Save Note
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            Ask customer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject (optional)"
          />
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What information do you need?"
          />
          <Button
            size="sm"
            disabled={question.trim().length < 2 || ask.isPending}
            onClick={() => ask.mutate()}
          >
            <Send className="mr-2 h-4 w-4" />
            Send & Record
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4" />
            {requestKind === "consultation" ? "Consultation" : "Site visit"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
            />
          </div>
          <div>
            <Label>Start time (Central)</Label>
            <Input
              type="time"
              step="900"
              value={visitTime}
              onChange={(e) => setVisitTime(e.target.value)}
            />
          </div>
          <div>
            <Label>Minutes</Label>
            <Input
              type="number"
              min="15"
              step="15"
              value={visitMinutes}
              onChange={(e) => setVisitMinutes(e.target.value)}
            />
          </div>
          <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 sm:col-span-3 ${overrideAvailability ? "border-amber-500 bg-amber-50" : "bg-slate-50"}`}>
            <Checkbox
              checked={overrideAvailability}
              onCheckedChange={(checked) => setOverrideAvailability(checked === true)}
            />
            <span className="text-sm">
              <strong>Override availability for this appointment</strong>
              <span className="mt-1 block text-xs text-muted-foreground">
                Off by default. Check this only when you intentionally want to schedule outside your working hours or during blocked time. Existing appointments still cannot be double-booked.
              </span>
            </span>
          </label>
          <Button
            className="sm:col-span-3"
            size="sm"
            disabled={
              !visitDate || !visitTime || Number(visitMinutes) < 15 || visit.isPending
            }
            onClick={() => visit.mutate()}
          >
            {overrideAvailability ? "Schedule with Availability Override" : requestKind === "consultation" ? "Schedule Consultation" : "Schedule Site Visit"}
          </Button>
          <p className="text-xs text-muted-foreground sm:col-span-3">
            Scheduling sends the customer an email confirmation. A text is also sent when the customer has a phone number and recorded SMS consent. The result will appear here after scheduling.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="h-4 w-4" />
            Photos & files
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={files.length >= 10 || upload.isPending}
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <p className="text-xs text-muted-foreground">
            Select several photos at once, or choose more in another selection. Up to 10 photos per upload.
          </p>
          {!!files.length && (
            <div className="space-y-1 rounded-lg border p-2">
              <p className="px-1 text-xs font-medium">{files.length} of 10 photos selected</p>
              {files.map((file, index) => (
                <div key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center justify-between gap-2 rounded bg-slate-50 px-2 py-1 text-xs">
                  <span className="min-w-0 truncate">{file.name}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    disabled={upload.isPending}
                    aria-label={`Remove ${file.name}`}
                    onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Button
            size="sm"
            disabled={!files.length || upload.isPending}
            onClick={() => upload.mutate()}
          >
            {upload.isPending ? "Uploading photos…" : `Add ${files.length || ""} Photo${files.length === 1 ? "" : "s"} to Request`}
          </Button>
        </CardContent>
      </Card>
      {requestKind !== "consultation" && <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4 w-4" />
            Internal estimate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field
              label="Estimated labor hours"
              value={laborHours}
              set={setLaborHours}
            />
            <Field
              label="Internal labor cost"
              value={laborCost}
              set={setLaborCost}
            />
            <Field
              label="Other direct costs"
              value={otherCost}
              set={setOtherCost}
            />
            <Field
              label="Contingency"
              value={contingency}
              set={setContingency}
            />
            <Field label="Target margin %" value={margin} set={setMargin} />
            <Field
              label="Owner-selected price"
              value={sellingPrice}
              set={setSellingPrice}
            />
            <Button
              className="sm:col-span-3"
              disabled={estimate.isPending}
              onClick={() => estimate.mutate()}
            >
              Save Private Estimate
            </Button>
          </div>
        </CardContent>
      </Card>}
    </div>
  );
}
function Field({
  label,
  value,
  set,
}: {
  label: string;
  value: string;
  set: (value: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(e) => set(e.target.value)}
      />
    </div>
  );
}
