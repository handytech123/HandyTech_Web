import { sql } from "drizzle-orm";
import { db } from "../db";
import type { Appointment, Consultation, Quote, QuoteProposal } from "@shared/schema";
import { normalizeAddress, normalizePhone } from "./operating-system-normalization";

const OS_VERSION = "20260917_002_operating_system_backfill";

export function operatingSystemEnabled(): boolean {
  return process.env.ENABLE_OPERATING_SYSTEM_MIGRATIONS === "true";
}

async function nextRequestIdentity(tx: any, prefix: string, legacyId: number): Promise<string> {
  const preferred = `REQ-${prefix}-${legacyId}`;
  const existing = await tx.execute(sql`SELECT id FROM requests WHERE request_number=${preferred}`);
  if (!(existing as any).rows?.length) return preferred;
  const sequence = await tx.execute(sql.raw("SELECT nextval(pg_get_serial_sequence('requests','id'))::int AS id"));
  return `REQ-${new Date().getFullYear()}-${String((sequence as any).rows?.[0]?.id || legacyId).padStart(6, "0")}`;
}

async function ensureContact(tx: any, input: { email?: string | null; phone?: string | null; firstName?: string; lastName?: string; company?: string | null }) {
  const email = String(input.email || "").trim().toLowerCase();
  if (email) {
    const exact = await tx.execute(sql`SELECT id FROM customers WHERE LOWER(TRIM(email))=${email} ORDER BY id LIMIT 2`);
    if ((exact as any).rows?.length === 1) return { id: Number((exact as any).rows[0].id), rule: "exact_unique_email", confidence: 1 };
  }
  const phone = normalizePhone(input.phone);
  if (phone) {
    const exact = await tx.execute(sql`SELECT id FROM customers WHERE REGEXP_REPLACE(COALESCE(phone,''),'[^0-9]','','g')=${phone} ORDER BY id LIMIT 2`);
    if ((exact as any).rows?.length === 1) return { id: Number((exact as any).rows[0].id), rule: "exact_unique_phone", confidence: 0.98 };
  }
  return null;
}

async function ensureProperty(tx: any, contactId: number | null, input: { street?: string | null; city?: string | null; state?: string | null; zip?: string | null }) {
  const normalized = normalizeAddress(input);
  if (!String(input.street || "").trim()) return null;
  const result = await tx.execute(sql`
    INSERT INTO properties(street,city,state,zip,normalized_address,label)
    VALUES (${input.street || null},${input.city || null},${input.state || null},${input.zip || null},${normalized},'Service property')
    ON CONFLICT (normalized_address) WHERE normalized_address IS NOT NULL AND normalized_address <> ''
    DO UPDATE SET updated_at=NOW() RETURNING id
  `);
  const propertyId = Number((result as any).rows?.[0]?.id);
  if (contactId && propertyId) {
    await tx.execute(sql`INSERT INTO contact_properties(contact_id,property_id,relationship,is_primary) VALUES (${contactId},${propertyId},'owner',false) ON CONFLICT (contact_id,property_id,relationship) DO NOTHING`);
  }
  return propertyId || null;
}

async function recordMatch(tx: any, sourceTable: string, sourceId: number, targetTable: string | null, targetId: number | null, classification: string, rule: string, confidence: number) {
  await tx.execute(sql`
    INSERT INTO legacy_record_matches(migration_version,source_table,source_id,target_table,target_id,classification,match_rule,confidence)
    VALUES (${OS_VERSION},${sourceTable},${String(sourceId)},${targetTable},${targetId ? String(targetId) : null},${classification},${rule},${String(confidence)})
    ON CONFLICT (migration_version,source_table,source_id) DO UPDATE SET target_table=EXCLUDED.target_table,target_id=EXCLUDED.target_id,
      classification=EXCLUDED.classification,match_rule=EXCLUDED.match_rule,confidence=EXCLUDED.confidence,updated_at=NOW()
  `);
}

export async function mirrorQuoteAsRequest(quote: Quote): Promise<number | null> {
  if (!operatingSystemEnabled()) return null;
  return db.transaction(async (tx) => {
    const current = await tx.execute(sql`SELECT request_id FROM quotes WHERE id=${quote.id}`);
    const currentId = Number((current as any).rows?.[0]?.request_id || 0);
    if (currentId) return currentId;
    const contact = await ensureContact(tx, quote);
    const propertyId = await ensureProperty(tx, contact?.id || null, quote);
    const requestNumber = await nextRequestIdentity(tx, "Q", quote.id);
    const inserted = await tx.execute(sql`
      INSERT INTO requests(request_number,contact_id,property_id,source,source_detail,legacy_type,legacy_id,title,customer_description,status,service_classification,received_at)
      VALUES (${requestNumber},${contact?.id || null},${propertyId},${quote.leadSource || "website"},${quote.leadMedium || null},'quote',${String(quote.id)},${quote.serviceNeeded},${quote.message || ""},'new',${quote.serviceNeeded},${quote.createdAt})
      ON CONFLICT (legacy_type,legacy_id) WHERE legacy_type IS NOT NULL AND legacy_id IS NOT NULL DO UPDATE SET updated_at=NOW() RETURNING id
    `);
    const requestId = Number((inserted as any).rows?.[0]?.id);
    await tx.execute(sql`UPDATE quotes SET customer_id=${contact?.id || null},property_id=${propertyId},request_id=${requestId} WHERE id=${quote.id}`);
    await tx.execute(sql`INSERT INTO request_activities(request_id,activity_type,summary,details,visibility,occurred_at) VALUES (${requestId},'request_received','Customer submitted a request',${JSON.stringify({ source: quote.leadSource || "website" })}::jsonb,'shared',${quote.createdAt})`);
    await recordMatch(tx, "quotes", quote.id, "requests", requestId, "automatically_matched", "deterministic_legacy_origin", 1);
    return requestId;
  });
}

export async function mirrorConsultationAsRequest(consultation: Consultation): Promise<number | null> {
  if (!operatingSystemEnabled()) return null;
  return db.transaction(async (tx) => {
    const contact = await ensureContact(tx, consultation);
    const requestNumber = await nextRequestIdentity(tx, "C", consultation.id);
    const inserted = await tx.execute(sql`
      INSERT INTO requests(request_number,contact_id,source,source_detail,legacy_type,legacy_id,title,customer_description,status,received_at)
      VALUES (${requestNumber},${contact?.id || null},${consultation.leadSource || "website"},'consultation','consultation',${String(consultation.id)},${consultation.topic},${consultation.message || ""},'new',${consultation.createdAt})
      ON CONFLICT (legacy_type,legacy_id) WHERE legacy_type IS NOT NULL AND legacy_id IS NOT NULL DO UPDATE SET updated_at=NOW() RETURNING id
    `);
    const requestId = Number((inserted as any).rows?.[0]?.id);
    await tx.execute(sql`UPDATE consultations SET customer_id=${contact?.id || null},request_id=${requestId} WHERE id=${consultation.id}`);
    await recordMatch(tx, "consultations", consultation.id, "requests", requestId, "automatically_matched", "deterministic_legacy_origin", 1);
    return requestId;
  });
}

export async function mirrorAppointmentAsScheduleItem(appointment: Appointment): Promise<number | null> {
  if (!operatingSystemEnabled()) return null;
  return db.transaction(async (tx) => {
    const existing = await tx.execute(sql`SELECT request_id,job_id FROM appointments WHERE id=${appointment.id}`);
    const row = (existing as any).rows?.[0];
    if (row?.job_id) {
      await recordMatch(tx, "appointments", appointment.id, "jobs", Number(row.job_id), "automatically_matched", "explicit_job_foreign_key", 1);
      return Number(row.job_id);
    }
    if (row?.request_id) return Number(row.request_id);
    const contact = await ensureContact(tx, appointment);
    const propertyId = await ensureProperty(tx, contact?.id || appointment.customerId || null, appointment);
    const requestNumber = await nextRequestIdentity(tx, "A", appointment.id);
    const inserted = await tx.execute(sql`
      INSERT INTO requests(request_number,contact_id,property_id,source,source_detail,legacy_type,legacy_id,title,customer_description,status,received_at)
      VALUES (${requestNumber},${contact?.id || appointment.customerId || null},${propertyId},${appointment.source || "manual"},'appointment','appointment',${String(appointment.id)},${appointment.serviceType},${appointment.notes || ""},'approved',${appointment.createdAt})
      ON CONFLICT (legacy_type,legacy_id) WHERE legacy_type IS NOT NULL AND legacy_id IS NOT NULL DO UPDATE SET updated_at=NOW() RETURNING id
    `);
    const requestId = Number((inserted as any).rows?.[0]?.id);
    await tx.execute(sql`UPDATE appointments SET property_id=${propertyId},request_id=${requestId},schedule_kind=${appointment.bookingType === "consultation" ? "site_visit" : "appointment"} WHERE id=${appointment.id}`);
    await recordMatch(tx, "appointments", appointment.id, "requests", requestId, "automatically_matched", "deterministic_legacy_origin", 1);
    return requestId;
  });
}

export async function ensureAcceptedProposalJob(quote: Quote, proposal: QuoteProposal): Promise<number | null> {
  if (!operatingSystemEnabled()) return null;
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${9000000 + proposal.id})`);
    const linked = await tx.execute(sql`SELECT id FROM jobs WHERE quote_proposal_id=${proposal.id} ORDER BY id LIMIT 1`);
    let jobId = Number((linked as any).rows?.[0]?.id || 0);
    const q = await tx.execute(sql`SELECT request_id,customer_id,property_id FROM quotes WHERE id=${quote.id}`);
    const link = (q as any).rows?.[0] || {};
    if (!jobId) {
      const contact = link.customer_id || (await ensureContact(tx, quote))?.id;
      if (!contact) throw new Error("Accepted proposal cannot create a Job until its Contact is resolved");
      const idResult = await tx.execute(sql.raw("SELECT nextval(pg_get_serial_sequence('jobs','id'))::int AS id"));
      jobId = Number((idResult as any).rows?.[0]?.id);
      const jobNumber = `JOB-${new Date().getFullYear()}-${String(jobId).padStart(5, "0")}`;
      await tx.execute(sql`INSERT INTO jobs(id,customer_id,quote_proposal_id,job_number,title,description,address,status,request_id,property_id,original_contract_value)
        VALUES (${jobId},${Number(contact)},${proposal.id},${jobNumber},${quote.serviceNeeded},${quote.message || null},${[quote.street, quote.city, [quote.state, quote.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")},'approved',${link.request_id || null},${link.property_id || null},${String(proposal.total)})`);
      await tx.execute(sql`UPDATE quotes SET job_id=${jobId} WHERE id=${quote.id}`);
    }
    const snapshot = { quoteNumber: proposal.quoteNumber, lineItems: proposal.lineItems, discount: proposal.discount, taxRate: proposal.taxRate, subtotal: proposal.subtotal, tax: proposal.tax, total: proposal.total, notes: proposal.notes, validUntil: proposal.validUntil, signerName: proposal.signerName, signatureUrl: proposal.signatureUrl, acceptedTerms: proposal.acceptedTerms };
    await tx.execute(sql`INSERT INTO approved_scopes(job_id,request_id,proposal_id,proposal_snapshot,approved_price,approved_at,signer_name)
      VALUES (${jobId},${link.request_id || null},${proposal.id},${JSON.stringify(snapshot)}::jsonb,${String(proposal.total)},${proposal.respondedAt || new Date()},${proposal.signerName || null}) ON CONFLICT (proposal_id) DO NOTHING`);
    if (link.request_id) {
      await tx.execute(sql`UPDATE requests SET status='approved',next_action='Schedule work',updated_at=NOW() WHERE id=${Number(link.request_id)}`);
      await tx.execute(sql`INSERT INTO activity_events(contact_id,property_id,request_id,job_id,entity_type,entity_id,event_type,summary,channel,visibility,metadata,occurred_at)
        VALUES (${Number(link.customer_id) || null},${Number(link.property_id) || null},${Number(link.request_id)},${jobId},'proposal',${String(proposal.id)},'proposal_approved','Proposal approved; Job created','portal','shared',${JSON.stringify({ quoteNumber: proposal.quoteNumber, total: proposal.total })}::jsonb,${proposal.respondedAt || new Date()})`);
    }
    return jobId;
  });
}
