import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Copy, Loader2, MessageSquareText, Send, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type FollowUpDraft = { subject: string; emailBody: string; smsBody: string };

export default function QuoteFollowUpDialog({ quoteId, quoteNumber, email, phone }:{ quoteId:number; quoteNumber:string; email?:string|null; phone?:string|null }) {
  const { toast } = useToast();
  const [open,setOpen]=useState(false);
  const [purpose,setPurpose]=useState<"missing_information"|"quote_reminder"|"changes_reply">("quote_reminder");
  const [context,setContext]=useState("");
  const [draft,setDraft]=useState<FollowUpDraft|null>(null);
  const [smsConsentConfirmed,setSmsConsentConfirmed]=useState(false);
  const generate=useMutation({mutationFn:async()=>(await apiRequest(`/api/admin/quotes/${quoteId}/ai-follow-up`,"POST",{purpose,context})).json() as Promise<FollowUpDraft>,onSuccess:(value)=>{setDraft(value);toast({title:"Follow-up drafted",description:"Review it, then choose email, text, or both."});},onError:(error:Error)=>toast({title:"Follow-up not drafted",description:error.message,variant:"destructive"})});
  const send=useMutation({mutationFn:async(channel:"email"|"sms"|"both")=>{if(!draft)throw new Error("Draft the follow-up first.");return (await apiRequest(`/api/admin/quotes/${quoteId}/send-follow-up`,"POST",{channel,...draft,smsConsentConfirmed})).json() as Promise<{message:string}>;},onSuccess:(result)=>{toast({title:"Follow-up sent",description:result.message});setOpen(false);},onError:(error:Error)=>toast({title:"Follow-up not sent",description:error.message,variant:"destructive"})});
  const copy=async(value:string)=>{await navigator.clipboard.writeText(value);toast({title:"Copied"});};
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button size="sm"><MessageSquareText className="mr-2 h-4 w-4"/>Follow Up</Button></DialogTrigger>
    <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
      <DialogHeader><DialogTitle>Follow up on {quoteNumber}</DialogTitle><DialogDescription>Draft, review, and send from HandyTech. Nothing sends until you choose a send button.</DialogDescription></DialogHeader>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[220px_1fr]"><select className="h-10 rounded-md border border-input bg-white px-3 text-sm" value={purpose} onChange={(event)=>setPurpose(event.target.value as typeof purpose)}><option value="quote_reminder">Quote reminder</option><option value="missing_information">Ask for missing details</option><option value="changes_reply">Reply about changes</option></select><Input value={context} onChange={(event)=>setContext(event.target.value)} placeholder="Optional context or questions"/></div>
        <Button type="button" variant="outline" onClick={()=>generate.mutate()} disabled={generate.isPending}>{generate.isPending?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Sparkles className="mr-2 h-4 w-4"/>}{generate.isPending?"Drafting…":"Draft Follow-up"}</Button>
        {draft&&<div className="space-y-4 rounded-lg border p-4">
          <div><Label>Subject</Label><Input value={draft.subject} maxLength={140} onChange={(event)=>setDraft({...draft,subject:event.target.value})}/></div>
          <div><Label>Email to {email||"No email saved"}</Label><Textarea rows={7} maxLength={2400} value={draft.emailBody} onChange={(event)=>setDraft({...draft,emailBody:event.target.value})}/><Button type="button" size="sm" variant="outline" className="mt-2" onClick={()=>copy(`Subject: ${draft.subject}\n\n${draft.emailBody}`)}><Copy className="mr-2 h-4 w-4"/>Copy Email</Button></div>
          <div><Label>Text to {phone||"No phone saved"}</Label><Textarea rows={4} maxLength={480} value={draft.smsBody} onChange={(event)=>setDraft({...draft,smsBody:event.target.value})}/><div className="mt-1 text-right text-xs text-muted-foreground">{draft.smsBody.length}/480</div><Button type="button" size="sm" variant="outline" onClick={()=>copy(draft.smsBody)}><Copy className="mr-2 h-4 w-4"/>Copy Text</Button></div>
          <label className="flex items-start gap-2 rounded border border-amber-200 bg-amber-50 p-3 text-sm"><input type="checkbox" className="mt-1" checked={smsConsentConfirmed} onChange={(event)=>setSmsConsentConfirmed(event.target.checked)}/><span>I confirmed this customer agreed to receive text messages from HandyTech Solutions.</span></label>
          <div className="grid gap-2 sm:grid-cols-3"><Button type="button" variant="outline" disabled={send.isPending||!email||!draft.subject.trim()||!draft.emailBody.trim()} onClick={()=>send.mutate("email")}><Send className="mr-2 h-4 w-4"/>Send Email</Button><Button type="button" variant="outline" disabled={send.isPending||!phone||!smsConsentConfirmed||!draft.smsBody.trim()} onClick={()=>send.mutate("sms")}><Send className="mr-2 h-4 w-4"/>Send Text</Button><Button type="button" disabled={send.isPending||!email||!phone||!smsConsentConfirmed||!draft.subject.trim()||!draft.emailBody.trim()||!draft.smsBody.trim()} onClick={()=>send.mutate("both")}><Send className="mr-2 h-4 w-4"/>Send Both</Button></div>
        </div>}
      </div>
    </DialogContent>
  </Dialog>;
}
