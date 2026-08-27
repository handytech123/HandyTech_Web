import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { CheckCircle2, Download, FileSignature, Loader2, MessageSquareText, ShieldCheck, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type ProposalData = {
  quote: { firstName: string; lastName: string; email: string; phone?: string; serviceNeeded: string; street?: string; city?: string; state?: string; zip?: string };
  proposal: { quoteNumber: string; lineItems: Array<{ description: string; quantity: number; rate: number }>; discount: number; taxRate: number; subtotal: number; tax: number; total: number; notes?: string; validUntil: string; status: string; sentAt: string; respondedAt?: string; signerName?: string };
};

const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });

function SignaturePad({ onChange }: { onChange: (value: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = rect.width * ratio; canvas.height = rect.height * ratio;
      const context = canvas.getContext("2d");
      if (context) { context.scale(ratio, ratio); context.lineCap = "round"; context.lineJoin = "round"; context.lineWidth = 2.4; context.strokeStyle = "#0f172a"; }
    };
    resize();
  }, []);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId); drawing.current = true;
    const ctx = event.currentTarget.getContext("2d"); const p = point(event); ctx?.beginPath(); ctx?.moveTo(p.x, p.y);
  };
  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return; const ctx = event.currentTarget.getContext("2d"); const p = point(event); ctx?.lineTo(p.x, p.y); ctx?.stroke(); setHasInk(true);
  };
  const stop = () => {
    if (!drawing.current) return; drawing.current = false;
    onChange(canvasRef.current?.toDataURL("image/png") || null);
  };
  const clear = () => {
    const canvas = canvasRef.current; const ctx = canvas?.getContext("2d"); if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false); onChange(null);
  };

  return <div>
    <div className="relative overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-white">
      <canvas ref={canvasRef} className="h-40 w-full touch-none cursor-crosshair" onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} aria-label="Draw your signature" />
      {!hasInk && <span className="pointer-events-none absolute inset-x-0 top-16 text-center text-sm text-slate-400">Sign here with your finger, mouse, or stylus</span>}
      <div className="absolute bottom-5 left-8 right-8 border-b border-slate-300" />
    </div>
    <button type="button" onClick={clear} className="mt-2 text-sm font-medium text-blue-700 hover:underline">Clear signature</button>
  </div>;
}

export default function QuoteProposalPage() {
  const { token = "" } = useParams<{ token: string }>();
  const [decision, setDecision] = useState<"accepted" | "changes_requested" | "declined" | null>(null);
  const [signerName, setSignerName] = useState("");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [message, setMessage] = useState("");
  const [finished, setFinished] = useState<string | null>(null);
  const query = useQuery<ProposalData>({ queryKey: ["/api/quote-proposals", token], queryFn: async () => { const response = await fetch(`/api/quote-proposals/${token}`, { credentials: "include" }); if (!response.ok) throw new Error((await response.json()).message || "Quote unavailable"); return response.json(); } });
  const responseMutation = useMutation({
    mutationFn: async () => { const response = await apiRequest(`/api/quote-proposals/${token}/respond`, "POST", { decision, signerName, signatureData, acceptedTerms, message }); return response.json(); },
    onSuccess: (data) => { setFinished(data.status); window.scrollTo({ top: 0, behavior: "smooth" }); },
  });

  if (query.isLoading) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  if (query.isError || !query.data) return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><div className="max-w-lg rounded-xl bg-white p-8 text-center shadow"><XCircle className="mx-auto h-12 w-12 text-red-500" /><h1 className="mt-4 text-2xl font-bold text-slate-900">Quote unavailable</h1><p className="mt-2 text-slate-600">{query.error instanceof Error ? query.error.message : "Please contact HandyTech Solutions at 314-325-4575."}</p></div></div>;
  const { quote, proposal } = query.data;
  const expired = new Date(proposal.validUntil).getTime() < Date.now();
  const address = [quote.street, quote.city, quote.state, quote.zip].filter(Boolean).join(", ");
  const finalStatus = finished || (["accepted", "declined"].includes(proposal.status) ? proposal.status : null);

  return <div className="min-h-screen bg-slate-100 text-slate-900 print:bg-white">
    <header className="border-t-[6px] border-blue-600 bg-slate-950 text-white print:border-0">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-6"><div><div className="text-2xl font-bold">HandyTech Solutions</div><div className="text-sm text-sky-200">Professional home improvement &amp; repair</div></div><div className="text-right"><div className="text-xs uppercase tracking-widest text-sky-200">Service Quote</div><div className="font-semibold">{proposal.quoteNumber}</div></div></div>
    </header>
    <main className="mx-auto max-w-5xl px-4 py-8">
      {finalStatus ? <section className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <CheckCircle2 className={`mx-auto h-16 w-16 ${finalStatus === "accepted" ? "text-emerald-600" : "text-blue-600"}`} />
        <h1 className="mt-4 text-3xl font-bold">{finalStatus === "accepted" ? "Quote approved—thank you!" : finalStatus === "changes_requested" ? "Your change request was sent" : "Your response was recorded"}</h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">{finalStatus === "accepted" ? "Your signature and approval are recorded. A signed copy has been emailed to you, and you can move on to scheduling." : "HandyTech Solutions will review your response and follow up with you."}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3"><Button asChild variant="outline"><a href={`/api/quote-proposals/${token}/pdf?download=1`}><Download className="mr-2 h-4 w-4" />Download PDF</a></Button>{finalStatus === "accepted" && <Button asChild><a href="/#scheduler">Schedule This Job</a></Button>}</div>
      </section> : <>
        <section className="grid gap-5 rounded-2xl bg-white p-6 shadow-sm sm:grid-cols-2">
          <div><div className="text-xs font-bold uppercase tracking-wider text-blue-700">Prepared for</div><h1 className="mt-2 text-2xl font-bold">{quote.firstName} {quote.lastName}</h1><p className="mt-1 text-slate-600">{quote.email}</p>{quote.phone && <p className="text-slate-600">{quote.phone}</p>}{address && <p className="mt-2 text-slate-600">{address}</p>}</div>
          <div className="sm:text-right"><div className="text-xs font-bold uppercase tracking-wider text-blue-700">Quote details</div><p className="mt-2">Issued {new Date(proposal.sentAt).toLocaleDateString()}</p><p className={expired ? "font-semibold text-red-600" : "text-slate-600"}>{expired ? "Expired" : "Valid through"} {new Date(proposal.validUntil).toLocaleDateString()}</p><Button asChild variant="link" className="px-0 print:hidden"><a href={`/api/quote-proposals/${token}/pdf`} target="_blank"><Download className="mr-2 h-4 w-4" />View PDF</a></Button></div>
        </section>
        <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full"><thead className="bg-blue-50 text-left text-xs uppercase tracking-wider"><tr><th className="p-4">Description</th><th className="p-4 text-right">Qty</th><th className="p-4 text-right">Rate</th><th className="p-4 text-right">Amount</th></tr></thead><tbody>{proposal.lineItems.map((item, index) => <tr key={index} className="border-t"><td className="p-4 font-medium">{item.description}</td><td className="p-4 text-right">{item.quantity}</td><td className="p-4 text-right">{money(item.rate)}</td><td className="p-4 text-right">{money(item.quantity * item.rate)}</td></tr>)}</tbody></table></div>
          <div className="ml-auto w-full max-w-sm space-y-2 p-6"><div className="flex justify-between"><span>Subtotal</span><span>{money(proposal.subtotal)}</span></div>{proposal.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{money(proposal.discount)}</span></div>}{proposal.tax > 0 && <div className="flex justify-between"><span>Tax ({proposal.taxRate}%)</span><span>{money(proposal.tax)}</span></div>}<div className="flex justify-between border-t-2 border-blue-600 pt-3 text-xl font-bold"><span>Total</span><span>{money(proposal.total)}</span></div></div>
          {proposal.notes && <div className="border-t bg-slate-50 p-6"><h2 className="font-bold">Scope &amp; notes</h2><p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{proposal.notes}</p></div>}
        </section>
        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm print:hidden"><h2 className="text-xl font-bold">How would you like to proceed?</h2><p className="mt-1 text-sm text-slate-600">Choose an option below. Nothing is recorded until you submit.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3"><Button disabled={expired} variant={decision === "accepted" ? "default" : "outline"} onClick={() => setDecision("accepted")}><FileSignature className="mr-2 h-4 w-4" />Approve &amp; Sign</Button><Button variant={decision === "changes_requested" ? "default" : "outline"} onClick={() => setDecision("changes_requested")}><MessageSquareText className="mr-2 h-4 w-4" />Request Changes</Button><Button variant={decision === "declined" ? "destructive" : "outline"} onClick={() => setDecision("declined")}><XCircle className="mr-2 h-4 w-4" />Decline</Button></div>
          {expired && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">This quote has expired. You may request an updated quote or call 314-325-4575.</p>}
          {decision === "accepted" && <div className="mt-6 space-y-4 rounded-xl border p-5"><div><Label htmlFor="signer">Your full name</Label><Input id="signer" value={signerName} onChange={(e) => setSignerName(e.target.value)} autoComplete="name" /></div><div><Label>Your signature</Label><SignaturePad onChange={setSignatureData} /></div><label className="flex items-start gap-3 rounded-lg bg-blue-50 p-4 text-sm"><Checkbox checked={acceptedTerms} onCheckedChange={(checked) => setAcceptedTerms(checked === true)} /><span>I agree that this electronic signature represents my approval of the listed scope, price, and terms. I understand that requested changes may affect the price or schedule.</span></label></div>}
          {(decision === "changes_requested" || decision === "declined") && <div className="mt-6"><Label htmlFor="response-message">{decision === "changes_requested" ? "What would you like changed?" : "Optional note"}</Label><Textarea id="response-message" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={decision === "changes_requested" ? "Describe the changes or questions you have…" : "Tell us why, if you would like…"} /></div>}
          {decision && <Button className="mt-5 w-full" size="lg" disabled={responseMutation.isPending || (decision === "accepted" && (!signerName.trim() || !signatureData || !acceptedTerms)) || (decision === "changes_requested" && message.trim().length < 3)} onClick={() => responseMutation.mutate()}>{responseMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Recording response…</> : decision === "accepted" ? "Approve and Record Signature" : decision === "changes_requested" ? "Send Change Request" : "Decline Quote"}</Button>}
          {responseMutation.isError && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{responseMutation.error instanceof Error ? responseMutation.error.message : "Your response could not be recorded."}</p>}
          <div className="mt-5 flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4" />Your secure response records the date, time, and basic connection details for verification.</div>
        </section>
      </>}
    </main>
  </div>;
}
