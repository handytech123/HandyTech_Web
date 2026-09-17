import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, ClipboardCopy, Loader2, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type JobBrief = {
  summary: string;
  customerGoal: string;
  checklist: string[];
  toolsAndMaterialsToVerify: string[];
  questions: string[];
  riskFlags: string[];
};

export default function AppointmentAiBrief({ appointmentId, customerName }: { appointmentId: number; customerName: string }) {
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState<JobBrief | null>(null);
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: async () => (await apiRequest(`/api/admin/appointments/${appointmentId}/ai-brief`, "POST", {})).json() as Promise<JobBrief>,
    onSuccess: (result) => { setBrief(result); setOpen(true); },
    onError: (error: Error) => toast({ title: "Job brief not generated", description: error.message, variant: "destructive" }),
  });

  const asText = brief ? [
    `PRE-JOB BRIEF — ${customerName}`, brief.summary, `Customer goal: ${brief.customerGoal}`,
    `Checklist:\n${brief.checklist.map((item) => `- ${item}`).join("\n")}`,
    `Tools/materials to verify:\n${brief.toolsAndMaterialsToVerify.map((item) => `- ${item}`).join("\n")}`,
    `Questions:\n${brief.questions.map((item) => `- ${item}`).join("\n")}`,
    brief.riskFlags.length ? `Safety/risk review:\n${brief.riskFlags.map((item) => `- ${item}`).join("\n")}` : "",
  ].filter(Boolean).join("\n\n") : "";

  return <>
    <Button type="button" size="sm" variant="outline" onClick={() => brief ? setOpen(true) : mutation.mutate()} disabled={mutation.isPending}>
      {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
      {mutation.isPending ? "Preparing..." : brief ? "View Job Brief" : "Prepare Job Brief"}
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Pre-job Brief: {customerName}</DialogTitle><DialogDescription>AI-prepared from the appointment record. Verify it before relying on it at the job.</DialogDescription></DialogHeader>
        {brief && <div className="space-y-4 text-sm">
          <div className="rounded-lg bg-slate-50 p-4"><p>{brief.summary}</p><p className="mt-2"><strong>Customer goal:</strong> {brief.customerGoal}</p></div>
          <BriefList title="Checklist" items={brief.checklist} />
          <BriefList title="Tools and materials to verify" items={brief.toolsAndMaterialsToVerify} />
          <BriefList title="Questions to confirm" items={brief.questions} />
          {brief.riskFlags.length > 0 && <div className="rounded-lg border border-amber-200 bg-amber-50 p-4"><h4 className="flex items-center gap-2 font-semibold text-amber-950"><AlertTriangle className="h-4 w-4" />Safety and risk review</h4><ul className="mt-2 list-disc space-y-1 pl-5">{brief.riskFlags.map((item) => <li key={item}>{item}</li>)}</ul></div>}
          <div className="flex flex-wrap gap-2"><Button type="button" onClick={async () => { await navigator.clipboard.writeText(asText); toast({ title: "Job brief copied" }); }}><ClipboardCopy className="mr-2 h-4 w-4" />Copy Brief</Button><Button type="button" variant="outline" onClick={() => mutation.mutate()} disabled={mutation.isPending}>Regenerate</Button></div>
        </div>}
      </DialogContent>
    </Dialog>
  </>;
}

function BriefList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return <div><h4 className="font-semibold">{title}</h4><ul className="mt-1 list-disc space-y-1 pl-5">{items.map((item) => <li key={item}>{item}</li>)}</ul></div>;
}
