import { sql } from "drizzle-orm";
import { db } from "../db";

type Check = { key: string; label: string; count: number; severity: "error" | "review"; explanation: string };
const count = (result: any) => Number(result?.rows?.[0]?.count || 0);

export async function buildRelationshipParity() {
  const definitions: Array<[string,string,"error"|"review",string,string]> = [
    ["contact_address_without_property","Contact addresses without a Property","error","A deterministic customer address was not promoted into Property history","SELECT COUNT(*)::int count FROM customers c WHERE COALESCE(TRIM(c.street),'')<>'' AND NOT EXISTS(SELECT 1 FROM contact_properties cp WHERE cp.contact_id=c.id)"],
    ["legacy_intake_without_request","Legacy intake without a Request","error","Every quote, consultation, appointment, and referral must have lifecycle context","SELECT ((SELECT COUNT(*) FROM quotes WHERE request_id IS NULL)+(SELECT COUNT(*) FROM consultations WHERE request_id IS NULL)+(SELECT COUNT(*) FROM appointments WHERE request_id IS NULL AND job_id IS NULL)+(SELECT COUNT(*) FROM referral_leads WHERE request_id IS NULL))::int count"],
    ["appointment_address_without_property","Scheduled addresses without a Property","error","Explicit service addresses must be promoted and linked","SELECT COUNT(*)::int count FROM appointments WHERE COALESCE(TRIM(street),'')<>'' AND property_id IS NULL"],
    ["appointment_without_activity","Appointments missing timeline history","error","Every visit must be reconstructable in the unified timeline","SELECT COUNT(*)::int count FROM appointments a WHERE NOT EXISTS(SELECT 1 FROM activity_events e WHERE e.entity_type='appointment' AND e.entity_id=a.id::text)"],
    ["proposal_without_request","Proposals without a Request","error","Pre-sale contractual history must retain its originating Request","SELECT COUNT(*)::int count FROM quote_proposals qp JOIN quotes q ON q.id=qp.quote_id WHERE q.request_id IS NULL"],
    ["accepted_proposal_without_job","Accepted Proposals without a Job","error","Approval must create or link operational work","SELECT COUNT(*)::int count FROM quote_proposals qp WHERE qp.status='accepted' AND NOT EXISTS(SELECT 1 FROM jobs j WHERE j.quote_proposal_id=qp.id)"],
    ["accepted_proposal_without_scope","Accepted Proposals without frozen scope","error","Approved contractual scope must remain immutable and auditable","SELECT COUNT(*)::int count FROM quote_proposals qp WHERE qp.status='accepted' AND NOT EXISTS(SELECT 1 FROM approved_scopes s WHERE s.proposal_id=qp.id)"],
    ["job_without_context","Jobs missing Contact, Request, or Property","error","The Job workspace requires complete lifecycle context","SELECT COUNT(*)::int count FROM jobs WHERE customer_id IS NULL OR request_id IS NULL OR property_id IS NULL"],
    ["invoice_without_request","Invoices without Request history","error","Financial history must trace back to the work origin","SELECT COUNT(*)::int count FROM invoices WHERE request_id IS NULL"],
    ["payment_mismatch","Invoice payment-ledger mismatches","error","Cash collected must equal the auditable payment ledger","SELECT COUNT(*)::int count FROM invoices i WHERE ABS(i.amount_paid-COALESCE((SELECT SUM(p.amount) FROM invoice_payments p WHERE p.invoice_id=i.id),0))>0.009"],
    ["quote_media_mismatch","Legacy intake media not represented contextually","error","Every legacy quote photo or video must remain available on its Request","SELECT GREATEST(0,(SELECT COALESCE(SUM(CARDINALITY(COALESCE(photo_urls,ARRAY[]::text[]))+CARDINALITY(COALESCE(video_urls,ARRAY[]::text[]))),0) FROM quotes)-(SELECT COUNT(*) FROM media_assets WHERE entity_type='quote'))::int count"],
    ["request_without_contact","Requests without a resolved Contact","review","The source lacks enough trustworthy identity data for automatic Contact creation","SELECT COUNT(*)::int count FROM requests WHERE contact_id IS NULL"],
    ["request_without_property","Requests without a confirmed Property","review","Some intake records contain no service location; select one when known","SELECT COUNT(*)::int count FROM requests WHERE property_id IS NULL"],
    ["invoice_without_job","Invoices without a Job","review","Historical invoices may predate approval or lack safe Job evidence","SELECT COUNT(*)::int count FROM invoices WHERE job_id IS NULL"],
    ["review_without_job","Reviews without a confirmed Job","review","Customer history exists, but the correct Job may be ambiguous","SELECT COUNT(*)::int count FROM reviews WHERE job_id IS NULL"],
    ["gallery_without_job","Gallery entries without a confirmed Job","review","Published history is preserved until its source Job can be proven","SELECT COUNT(*)::int count FROM project_gallery WHERE job_id IS NULL"],
    ["anonymous_chat","Chat conversations without a Contact","review","Anonymous conversations are preserved and must not be guessed onto a Contact","SELECT COUNT(*)::int count FROM chat_conversations WHERE customer_id IS NULL"],
  ];
  const checks: Check[]=[];
  for(const [key,label,severity,explanation,statement] of definitions){checks.push({key,label,severity,explanation,count:count(await db.execute(sql.raw(statement)))});}
  return {generatedAt:new Date().toISOString(),checks,hardFailures:checks.filter(x=>x.severity==="error"&&x.count>0).length,reviewItems:checks.filter(x=>x.severity==="review").reduce((sum,x)=>sum+x.count,0)};
}
