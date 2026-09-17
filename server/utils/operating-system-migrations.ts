import { sql } from "drizzle-orm";
import { db } from "../db";

type Migration = { version: string; description: string; statement: string };

const migrations: Migration[] = [
  {
    version: "20260917_001_operating_system_foundation",
    description: "Contact semantics, Property, Request, Estimate, approved scope, field work, activity, media, and closeout foundations",
    statement: `
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact_type TEXT NOT NULL DEFAULT 'individual';
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS relationship_state TEXT NOT NULL DEFAULT 'prospective';
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS normalized_email TEXT;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS normalized_phone TEXT;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
      UPDATE customers SET normalized_email=LOWER(TRIM(email)), normalized_phone=REGEXP_REPLACE(COALESCE(phone,''),'[^0-9]','','g');
      CREATE INDEX IF NOT EXISTS customers_normalized_email_idx ON customers(normalized_email);
      CREATE INDEX IF NOT EXISTS customers_normalized_phone_idx ON customers(normalized_phone) WHERE normalized_phone <> '';

      CREATE TABLE IF NOT EXISTS properties (
        id SERIAL PRIMARY KEY, label TEXT, property_type TEXT, street TEXT, city TEXT, state TEXT, zip TEXT,
        normalized_address TEXT, notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS properties_normalized_address_uidx ON properties(normalized_address) WHERE normalized_address IS NOT NULL AND normalized_address <> '';
      CREATE TABLE IF NOT EXISTS contact_properties (
        id SERIAL PRIMARY KEY, contact_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE, relationship TEXT NOT NULL DEFAULT 'owner',
        is_primary BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(contact_id,property_id,relationship)
      );

      CREATE TABLE IF NOT EXISTS requests (
        id SERIAL PRIMARY KEY, request_number VARCHAR(32) NOT NULL UNIQUE, contact_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL, source TEXT NOT NULL DEFAULT 'manual', source_detail TEXT,
        legacy_type TEXT, legacy_id TEXT, title TEXT, customer_description TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'new',
        next_action TEXT, service_classification TEXT, received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), closed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS requests_legacy_origin_uidx ON requests(legacy_type,legacy_id) WHERE legacy_type IS NOT NULL AND legacy_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS requests_status_idx ON requests(status,received_at DESC);
      CREATE INDEX IF NOT EXISTS requests_contact_idx ON requests(contact_id);
      CREATE INDEX IF NOT EXISTS requests_property_idx ON requests(property_id);

      CREATE TABLE IF NOT EXISTS migration_runs (
        id SERIAL PRIMARY KEY, migration_version TEXT NOT NULL, mode TEXT NOT NULL DEFAULT 'apply', status TEXT NOT NULL DEFAULT 'running',
        source_counts JSONB NOT NULL DEFAULT '{}'::jsonb, disposition_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
        lost_deleted_count INTEGER NOT NULL DEFAULT 0, started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), completed_at TIMESTAMPTZ,
        notes TEXT
      );
      CREATE TABLE IF NOT EXISTS legacy_record_matches (
        id SERIAL PRIMARY KEY, migration_version TEXT NOT NULL, source_table TEXT NOT NULL, source_id TEXT NOT NULL,
        target_table TEXT, target_id TEXT, classification TEXT NOT NULL,
        match_rule TEXT NOT NULL, confidence NUMERIC(5,4), review_status TEXT NOT NULL DEFAULT 'unreviewed',
        reviewed_by TEXT, reviewed_at TIMESTAMPTZ, notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(migration_version,source_table,source_id)
      );
      CREATE INDEX IF NOT EXISTS legacy_record_matches_review_idx ON legacy_record_matches(classification,review_status,source_table);

      CREATE TABLE IF NOT EXISTS request_activities (
        id SERIAL PRIMARY KEY, request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE, activity_type TEXT NOT NULL,
        summary TEXT NOT NULL, details JSONB, visibility TEXT NOT NULL DEFAULT 'internal', occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS request_activities_request_idx ON request_activities(request_id,occurred_at DESC);

      CREATE TABLE IF NOT EXISTS estimates (
        id SERIAL PRIMARY KEY, request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE, version INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'draft', crew_size INTEGER, estimated_labor_hours REAL, internal_labor_cost NUMERIC(12,2),
        estimated_direct_cost NUMERIC(12,2), contingency NUMERIC(12,2), target_margin_percent NUMERIC(7,3),
        recommended_price NUMERIC(12,2), owner_selected_price NUMERIC(12,2), notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(request_id,version)
      );
      CREATE TABLE IF NOT EXISTS estimate_items (
        id SERIAL PRIMARY KEY, estimate_id INTEGER NOT NULL REFERENCES estimates(id) ON DELETE CASCADE, category TEXT NOT NULL,
        description TEXT NOT NULL, quantity NUMERIC(12,3) NOT NULL DEFAULT 1, unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
        total_cost NUMERIC(12,2) NOT NULL DEFAULT 0, metadata JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE quotes ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL;
      ALTER TABLE quotes ADD COLUMN IF NOT EXISTS property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL;
      ALTER TABLE quotes ADD COLUMN IF NOT EXISTS request_id INTEGER REFERENCES requests(id) ON DELETE SET NULL;
      ALTER TABLE consultations ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL;
      ALTER TABLE consultations ADD COLUMN IF NOT EXISTS property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL;
      ALTER TABLE consultations ADD COLUMN IF NOT EXISTS request_id INTEGER REFERENCES requests(id) ON DELETE SET NULL;
      ALTER TABLE referral_leads ADD COLUMN IF NOT EXISTS request_id INTEGER REFERENCES requests(id) ON DELETE SET NULL;
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL;
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS request_id INTEGER REFERENCES requests(id) ON DELETE SET NULL;
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS schedule_kind TEXT NOT NULL DEFAULT 'appointment';
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS estimated_crew_hours REAL;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS request_id INTEGER REFERENCES requests(id) ON DELETE SET NULL;
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS request_id INTEGER REFERENCES requests(id) ON DELETE SET NULL;
      ALTER TABLE project_gallery ADD COLUMN IF NOT EXISTS property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL;
      ALTER TABLE jobs ADD COLUMN IF NOT EXISTS request_id INTEGER REFERENCES requests(id) ON DELETE SET NULL;
      ALTER TABLE jobs ADD COLUMN IF NOT EXISTS property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL;
      ALTER TABLE jobs ADD COLUMN IF NOT EXISTS original_contract_value NUMERIC(12,2) NOT NULL DEFAULT 0;
      ALTER TABLE jobs ADD COLUMN IF NOT EXISTS estimated_direct_cost NUMERIC(12,2) NOT NULL DEFAULT 0;
      ALTER TABLE jobs ADD COLUMN IF NOT EXISTS closeout_status TEXT NOT NULL DEFAULT 'not_started';

      CREATE TABLE IF NOT EXISTS approved_scopes (
        id SERIAL PRIMARY KEY, job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        request_id INTEGER REFERENCES requests(id) ON DELETE SET NULL, proposal_id INTEGER NOT NULL REFERENCES quote_proposals(id) ON DELETE RESTRICT,
        proposal_snapshot JSONB NOT NULL, approved_price NUMERIC(12,2) NOT NULL, approved_at TIMESTAMPTZ NOT NULL,
        signer_name TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(proposal_id)
      );
      CREATE TABLE IF NOT EXISTS work_logs (
        id SERIAL PRIMARY KEY, job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE, worker_name TEXT,
        entry_type TEXT NOT NULL DEFAULT 'field_note', note TEXT, started_at TIMESTAMPTZ, ended_at TIMESTAMPTZ,
        labor_hours NUMERIC(10,2), internal_labor_cost NUMERIC(12,2), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS work_logs_job_idx ON work_logs(job_id,created_at DESC);
      CREATE TABLE IF NOT EXISTS activity_events (
        id SERIAL PRIMARY KEY, contact_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL, request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE,
        job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE, entity_type TEXT NOT NULL, entity_id TEXT, event_type TEXT NOT NULL,
        summary TEXT NOT NULL, channel TEXT, direction TEXT, visibility TEXT NOT NULL DEFAULT 'internal', metadata JSONB,
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS activity_events_request_idx ON activity_events(request_id,occurred_at DESC);
      CREATE INDEX IF NOT EXISTS activity_events_job_idx ON activity_events(job_id,occurred_at DESC);
      CREATE INDEX IF NOT EXISTS activity_events_contact_idx ON activity_events(contact_id,occurred_at DESC);
      CREATE TABLE IF NOT EXISTS media_assets (
        id SERIAL PRIMARY KEY, contact_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL, request_id INTEGER REFERENCES requests(id) ON DELETE SET NULL,
        job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL, entity_type TEXT, entity_id TEXT, media_type TEXT NOT NULL DEFAULT 'photo',
        stage TEXT NOT NULL DEFAULT 'other', url TEXT NOT NULL, caption TEXT, publishable BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(entity_type,entity_id,url)
      );
      CREATE TABLE IF NOT EXISTS job_closeout_items (
        id SERIAL PRIMARY KEY, job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE, item_key TEXT NOT NULL, label TEXT NOT NULL,
        completed BOOLEAN NOT NULL DEFAULT false, completed_at TIMESTAMPTZ, notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(job_id,item_key)
      );
      CREATE TABLE IF NOT EXISTS automation_actions (
        id SERIAL PRIMARY KEY, action_type TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT,
        risk_level TEXT NOT NULL DEFAULT 'low', proposed_payload JSONB NOT NULL, status TEXT NOT NULL DEFAULT 'prepared',
        prepared_by TEXT NOT NULL DEFAULT 'ai', approved_by TEXT, approved_at TIMESTAMPTZ, executed_at TIMESTAMPTZ,
        outcome TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS automation_actions_status_idx ON automation_actions(status,created_at DESC);
      CREATE TABLE IF NOT EXISTS workers (
        id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT, internal_hourly_cost NUMERIC(12,2),
        weekly_capacity_hours NUMERIC(8,2) NOT NULL DEFAULT 40, is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS schedule_assignments (
        id SERIAL PRIMARY KEY, appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
        worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE, allocated_hours NUMERIC(8,2),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(appointment_id,worker_id)
      );
      CREATE TABLE IF NOT EXISTS business_expenses (
        id SERIAL PRIMARY KEY, category TEXT NOT NULL DEFAULT 'overhead', description TEXT NOT NULL,
        amount NUMERIC(12,2) NOT NULL, vendor TEXT, expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `,
  },
  {
    version: "20260917_002_operating_system_backfill",
    description: "Idempotent Property and Request backfill with explicit legacy provenance",
    statement: `
      INSERT INTO properties(street,city,state,zip,normalized_address,label)
      SELECT MIN(NULLIF(TRIM(street),'')), MIN(NULLIF(TRIM(city),'')), MIN(NULLIF(TRIM(state),'')), MIN(NULLIF(TRIM(zip),'')),
        LOWER(REGEXP_REPLACE(CONCAT_WS('|',TRIM(street),TRIM(city),TRIM(state),TRIM(zip)),'\\s+',' ','g')), 'Primary property'
      FROM customers WHERE COALESCE(TRIM(street),'') <> ''
      GROUP BY LOWER(REGEXP_REPLACE(CONCAT_WS('|',TRIM(street),TRIM(city),TRIM(state),TRIM(zip)),'\\s+',' ','g'))
      ON CONFLICT (normalized_address) WHERE normalized_address IS NOT NULL AND normalized_address <> '' DO NOTHING;

      INSERT INTO contact_properties(contact_id,property_id,relationship,is_primary)
      SELECT c.id,p.id,'owner',true FROM customers c JOIN properties p ON p.normalized_address=
        LOWER(REGEXP_REPLACE(CONCAT_WS('|',TRIM(c.street),TRIM(c.city),TRIM(c.state),TRIM(c.zip)),'\\s+',' ','g'))
      ON CONFLICT (contact_id,property_id,relationship) DO NOTHING;

      UPDATE quotes q SET customer_id=c.id FROM customers c WHERE q.customer_id IS NULL AND LOWER(TRIM(q.email))=LOWER(TRIM(c.email));
      UPDATE consultations x SET customer_id=c.id FROM customers c WHERE x.customer_id IS NULL AND LOWER(TRIM(x.email))=LOWER(TRIM(c.email));
      UPDATE quotes q SET property_id=p.id FROM properties p WHERE q.property_id IS NULL AND COALESCE(TRIM(q.street),'')<>'' AND p.normalized_address=
        LOWER(REGEXP_REPLACE(CONCAT_WS('|',TRIM(q.street),TRIM(q.city),TRIM(q.state),TRIM(q.zip)),'\\s+',' ','g'));
      UPDATE appointments a SET property_id=p.id FROM properties p WHERE a.property_id IS NULL AND COALESCE(TRIM(a.street),'')<>'' AND p.normalized_address=
        LOWER(REGEXP_REPLACE(CONCAT_WS('|',TRIM(a.street),TRIM(a.city),TRIM(a.state),TRIM(a.zip)),'\\s+',' ','g'));

      INSERT INTO requests(request_number,contact_id,property_id,source,source_detail,legacy_type,legacy_id,title,customer_description,status,service_classification,received_at,created_at,updated_at)
      SELECT 'REQ-Q-'||q.id,q.customer_id,q.property_id,COALESCE(NULLIF(q.lead_source,''),'website'),q.lead_medium,'quote',q.id::text,
        q.service_needed,COALESCE(q.message,''),CASE q.status WHEN 'converted' THEN 'approved' WHEN 'declined' THEN 'declined' WHEN 'contacted' THEN 'reviewing' ELSE 'new' END,
        q.service_needed,q.created_at,q.created_at,NOW() FROM quotes q
      ON CONFLICT (legacy_type,legacy_id) WHERE legacy_type IS NOT NULL AND legacy_id IS NOT NULL DO NOTHING;
      UPDATE quotes q SET request_id=r.id FROM requests r WHERE r.legacy_type='quote' AND r.legacy_id=q.id::text AND q.request_id IS NULL;

      INSERT INTO requests(request_number,contact_id,property_id,source,source_detail,legacy_type,legacy_id,title,customer_description,status,received_at,created_at,updated_at)
      SELECT 'REQ-C-'||x.id,x.customer_id,x.property_id,COALESCE(NULLIF(x.lead_source,''),'website'),'consultation','consultation',x.id::text,
        x.topic,COALESCE(x.message,''),CASE x.status WHEN 'closed' THEN 'closed' WHEN 'contacted' THEN 'reviewing' ELSE 'new' END,x.created_at,x.created_at,NOW()
      FROM consultations x ON CONFLICT (legacy_type,legacy_id) WHERE legacy_type IS NOT NULL AND legacy_id IS NOT NULL DO NOTHING;
      UPDATE consultations x SET request_id=r.id FROM requests r WHERE r.legacy_type='consultation' AND r.legacy_id=x.id::text AND x.request_id IS NULL;

      INSERT INTO requests(request_number,contact_id,source,source_detail,legacy_type,legacy_id,title,customer_description,status,service_classification,received_at,created_at,updated_at)
      SELECT 'REQ-R-'||l.id,l.customer_id,'referral',l.provider,'referral_lead',l.id::text,l.service,COALESCE(l.customer_notes,''),
        CASE WHEN l.status IN ('closed','declined') THEN 'closed' WHEN l.status='new' THEN 'new' ELSE 'reviewing' END,l.service,l.created_at,l.created_at,NOW()
      FROM referral_leads l WHERE l.quote_id IS NULL
      ON CONFLICT (legacy_type,legacy_id) WHERE legacy_type IS NOT NULL AND legacy_id IS NOT NULL DO NOTHING;
      UPDATE referral_leads l SET request_id=q.request_id FROM quotes q WHERE l.request_id IS NULL AND l.quote_id=q.id;
      UPDATE referral_leads l SET request_id=r.id FROM requests r
        WHERE l.request_id IS NULL AND l.quote_id IS NULL AND r.legacy_type='referral_lead' AND r.legacy_id=l.id::text;

      INSERT INTO requests(request_number,contact_id,property_id,source,source_detail,legacy_type,legacy_id,title,customer_description,status,received_at,created_at,updated_at)
      SELECT 'REQ-A-'||a.id,a.customer_id,a.property_id,COALESCE(NULLIF(a.source,''),'manual'),'appointment','appointment',a.id::text,
        a.service_type,COALESCE(a.notes,''),CASE WHEN a.status='completed' THEN 'closed' WHEN a.status='cancelled' THEN 'closed' ELSE 'approved' END,
        a.created_at,a.created_at,NOW() FROM appointments a WHERE a.job_id IS NULL
      ON CONFLICT (legacy_type,legacy_id) WHERE legacy_type IS NOT NULL AND legacy_id IS NOT NULL DO NOTHING;
      UPDATE appointments a SET request_id=r.id FROM requests r WHERE a.request_id IS NULL AND r.legacy_type='appointment' AND r.legacy_id=a.id::text;

      INSERT INTO jobs(customer_id,quote_proposal_id,job_number,title,description,address,status,request_id,property_id,original_contract_value)
      SELECT q.customer_id,qp.id,'JOB-LEGACY-P-'||qp.id,q.service_needed,q.message,
        CONCAT_WS(', ',NULLIF(q.street,''),NULLIF(q.city,''),NULLIF(CONCAT_WS(' ',q.state,q.zip),'')),
        CASE WHEN EXISTS(SELECT 1 FROM invoices i WHERE i.quote_proposal_id=qp.id AND i.status='paid') THEN 'paid' ELSE 'approved' END,
        q.request_id,q.property_id,qp.total
      FROM quote_proposals qp JOIN quotes q ON q.id=qp.quote_id
      WHERE qp.status='accepted' AND q.customer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM jobs j WHERE j.quote_proposal_id=qp.id);
      UPDATE quotes q SET job_id=j.id FROM quote_proposals qp JOIN jobs j ON j.quote_proposal_id=qp.id
        WHERE q.id=qp.quote_id AND q.job_id IS NULL;
      UPDATE invoices i SET job_id=j.id FROM jobs j WHERE i.job_id IS NULL AND i.quote_proposal_id=j.quote_proposal_id;

      UPDATE jobs j SET request_id=q.request_id FROM quotes q WHERE j.request_id IS NULL AND q.job_id=j.id AND q.request_id IS NOT NULL;
      UPDATE jobs j SET property_id=q.property_id FROM quote_proposals qp JOIN quotes q ON q.id=qp.quote_id
        WHERE j.quote_proposal_id=qp.id AND j.property_id IS NULL AND q.property_id IS NOT NULL;
      UPDATE jobs j SET property_id=a.property_id FROM appointments a
        WHERE j.appointment_id=a.id AND j.property_id IS NULL AND a.property_id IS NOT NULL;
      UPDATE jobs j SET original_contract_value=qp.total FROM quote_proposals qp WHERE j.quote_proposal_id=qp.id AND j.original_contract_value=0;

      INSERT INTO approved_scopes(job_id,request_id,proposal_id,proposal_snapshot,approved_price,approved_at,signer_name)
      SELECT j.id,j.request_id,qp.id,jsonb_build_object('quoteNumber',qp.quote_number,'lineItems',qp.line_items,'discount',qp.discount,
        'taxRate',qp.tax_rate,'subtotal',qp.subtotal,'tax',qp.tax,'total',qp.total,'notes',qp.notes,'validUntil',qp.valid_until,
        'signerName',qp.signer_name,'signatureUrl',qp.signature_url,'acceptedTerms',qp.accepted_terms),qp.total,
        COALESCE(qp.responded_at,qp.updated_at),qp.signer_name
      FROM jobs j JOIN quote_proposals qp ON qp.id=j.quote_proposal_id WHERE qp.status='accepted'
      ON CONFLICT (proposal_id) DO NOTHING;

      INSERT INTO activity_events(contact_id,property_id,request_id,entity_type,entity_id,event_type,summary,channel,visibility,metadata,occurred_at)
      SELECT r.contact_id,r.property_id,r.id,'request',r.id::text,'request_received','Request received',r.source,'shared',jsonb_build_object('legacyType',r.legacy_type),r.received_at
      FROM requests r;
      INSERT INTO activity_events(contact_id,property_id,request_id,job_id,entity_type,entity_id,event_type,summary,channel,visibility,metadata,occurred_at)
      SELECT q.customer_id,q.property_id,q.request_id,q.job_id,'proposal',qp.id::text,
        CASE WHEN qp.status='accepted' THEN 'proposal_approved' ELSE 'proposal_sent' END,
        CASE WHEN qp.status='accepted' THEN 'Proposal approved' ELSE 'Proposal sent' END,'portal','shared',
        jsonb_build_object('quoteNumber',qp.quote_number,'total',qp.total,'status',qp.status),COALESCE(qp.responded_at,qp.sent_at)
      FROM quote_proposals qp JOIN quotes q ON q.id=qp.quote_id;
      INSERT INTO activity_events(contact_id,property_id,request_id,job_id,entity_type,entity_id,event_type,summary,channel,visibility,metadata,occurred_at)
      SELECT a.customer_id,a.property_id,a.request_id,a.job_id,'appointment',a.id::text,'scheduled',a.service_type,'schedule','shared',
        jsonb_build_object('status',a.status,'kind',a.schedule_kind),COALESCE(a.start_timestamptz,a.created_at) FROM appointments a;
      INSERT INTO activity_events(contact_id,request_id,job_id,entity_type,entity_id,event_type,summary,channel,visibility,metadata,occurred_at)
      SELECT i.customer_id,i.request_id,i.job_id,'invoice',i.id::text,'invoice_'||i.status,'Invoice '||i.invoice_number,'financial','shared',
        jsonb_build_object('total',i.total,'amountPaid',i.amount_paid,'status',i.status),i.issue_date FROM invoices i;
      INSERT INTO activity_events(contact_id,request_id,job_id,entity_type,entity_id,event_type,summary,channel,visibility,metadata,occurred_at)
      SELECT i.customer_id,i.request_id,i.job_id,'payment',p.id::text,'payment_recorded','Payment recorded','financial','shared',
        jsonb_build_object('invoiceId',p.invoice_id,'amount',p.amount,'method',p.method),p.paid_at
      FROM invoice_payments p JOIN invoices i ON i.id=p.invoice_id;

      INSERT INTO media_assets(contact_id,property_id,request_id,entity_type,entity_id,media_type,stage,url)
      SELECT q.customer_id,q.property_id,q.request_id,'quote',q.id::text,'photo','customer_intake',u.url
      FROM quotes q CROSS JOIN LATERAL UNNEST(COALESCE(q.photo_urls,ARRAY[]::text[])) u(url)
      ON CONFLICT (entity_type,entity_id,url) DO NOTHING;

      INSERT INTO legacy_record_matches(migration_version,source_table,source_id,target_table,target_id,classification,match_rule,confidence)
      SELECT '20260917_002_operating_system_backfill','customers',c.id::text,'customers',c.id::text,'automatically_matched','identity_preserved',1
      FROM customers c ON CONFLICT (migration_version,source_table,source_id) DO UPDATE SET target_table=EXCLUDED.target_table,target_id=EXCLUDED.target_id,classification=EXCLUDED.classification,match_rule=EXCLUDED.match_rule,confidence=EXCLUDED.confidence,updated_at=NOW();
      INSERT INTO legacy_record_matches(migration_version,source_table,source_id,target_table,target_id,classification,match_rule,confidence)
      SELECT '20260917_002_operating_system_backfill','quotes',q.id::text,'requests',q.request_id::text,
        CASE WHEN q.request_id IS NOT NULL THEN 'automatically_matched' ELSE 'unmatched_historical' END,
        CASE WHEN q.request_id IS NOT NULL THEN 'deterministic_legacy_origin' ELSE 'no_safe_match' END,
        CASE WHEN q.request_id IS NOT NULL THEN 1 ELSE 0 END FROM quotes q
      ON CONFLICT (migration_version,source_table,source_id) DO UPDATE SET target_table=EXCLUDED.target_table,target_id=EXCLUDED.target_id,classification=EXCLUDED.classification,match_rule=EXCLUDED.match_rule,confidence=EXCLUDED.confidence,updated_at=NOW();
      INSERT INTO legacy_record_matches(migration_version,source_table,source_id,target_table,target_id,classification,match_rule,confidence)
      SELECT '20260917_002_operating_system_backfill','consultations',x.id::text,'requests',x.request_id::text,
        CASE WHEN x.request_id IS NOT NULL THEN 'automatically_matched' ELSE 'unmatched_historical' END,
        CASE WHEN x.request_id IS NOT NULL THEN 'deterministic_legacy_origin' ELSE 'no_safe_match' END,
        CASE WHEN x.request_id IS NOT NULL THEN 1 ELSE 0 END FROM consultations x
      ON CONFLICT (migration_version,source_table,source_id) DO UPDATE SET target_table=EXCLUDED.target_table,target_id=EXCLUDED.target_id,classification=EXCLUDED.classification,match_rule=EXCLUDED.match_rule,confidence=EXCLUDED.confidence,updated_at=NOW();
      INSERT INTO legacy_record_matches(migration_version,source_table,source_id,target_table,target_id,classification,match_rule,confidence)
      SELECT '20260917_002_operating_system_backfill','appointments',a.id::text,
        CASE WHEN a.job_id IS NOT NULL THEN 'jobs' ELSE 'requests' END,COALESCE(a.job_id::text,a.request_id::text),
        CASE WHEN a.job_id IS NOT NULL OR a.request_id IS NOT NULL THEN 'automatically_matched' ELSE 'unmatched_historical' END,
        CASE WHEN a.job_id IS NOT NULL THEN 'explicit_job_foreign_key' WHEN a.request_id IS NOT NULL THEN 'deterministic_legacy_origin' ELSE 'no_safe_match' END,
        CASE WHEN a.job_id IS NOT NULL OR a.request_id IS NOT NULL THEN 1 ELSE 0 END FROM appointments a
      ON CONFLICT (migration_version,source_table,source_id) DO UPDATE SET target_table=EXCLUDED.target_table,target_id=EXCLUDED.target_id,classification=EXCLUDED.classification,match_rule=EXCLUDED.match_rule,confidence=EXCLUDED.confidence,updated_at=NOW();
      INSERT INTO legacy_record_matches(migration_version,source_table,source_id,target_table,target_id,classification,match_rule,confidence)
      SELECT '20260917_002_operating_system_backfill','quote_proposals',qp.id::text,'quote_proposals',qp.id::text,'automatically_matched','identity_preserved',1 FROM quote_proposals qp
      ON CONFLICT (migration_version,source_table,source_id) DO UPDATE SET target_table=EXCLUDED.target_table,target_id=EXCLUDED.target_id,classification=EXCLUDED.classification,match_rule=EXCLUDED.match_rule,confidence=EXCLUDED.confidence,updated_at=NOW();
      INSERT INTO legacy_record_matches(migration_version,source_table,source_id,target_table,target_id,classification,match_rule,confidence)
      SELECT '20260917_002_operating_system_backfill','jobs',j.id::text,'jobs',j.id::text,'automatically_matched','identity_preserved',1 FROM jobs j
      ON CONFLICT (migration_version,source_table,source_id) DO UPDATE SET target_table=EXCLUDED.target_table,target_id=EXCLUDED.target_id,classification=EXCLUDED.classification,match_rule=EXCLUDED.match_rule,confidence=EXCLUDED.confidence,updated_at=NOW();
      INSERT INTO legacy_record_matches(migration_version,source_table,source_id,target_table,target_id,classification,match_rule,confidence)
      SELECT '20260917_002_operating_system_backfill','referral_leads',l.id::text,'requests',l.request_id::text,
        CASE WHEN l.request_id IS NOT NULL THEN 'automatically_matched' ELSE 'unmatched_historical' END,
        CASE WHEN l.request_id IS NOT NULL THEN 'deterministic_legacy_origin' ELSE 'no_safe_match' END,
        CASE WHEN l.request_id IS NOT NULL THEN 1 ELSE 0 END FROM referral_leads l
      ON CONFLICT (migration_version,source_table,source_id) DO UPDATE SET target_table=EXCLUDED.target_table,target_id=EXCLUDED.target_id,classification=EXCLUDED.classification,match_rule=EXCLUDED.match_rule,confidence=EXCLUDED.confidence,updated_at=NOW();
      INSERT INTO legacy_record_matches(migration_version,source_table,source_id,target_table,target_id,classification,match_rule,confidence)
      SELECT '20260917_002_operating_system_backfill','invoices',i.id::text,
        CASE WHEN i.job_id IS NOT NULL THEN 'jobs' WHEN candidate.job_count=1 THEN 'jobs' ELSE 'invoices' END,
        CASE WHEN i.job_id IS NOT NULL THEN i.job_id::text WHEN candidate.job_count=1 THEN candidate.only_job_id::text ELSE i.id::text END,
        CASE WHEN i.job_id IS NOT NULL THEN 'automatically_matched' WHEN candidate.job_count>0 THEN 'needs_review' ELSE 'unmatched_historical' END,
        CASE WHEN i.job_id IS NOT NULL THEN 'explicit_job_foreign_key' WHEN candidate.job_count=1 THEN 'single_contact_job_candidate_requires_review' WHEN candidate.job_count>1 THEN 'multiple_contact_job_candidates' ELSE 'no_safe_job_match' END,
        CASE WHEN i.job_id IS NOT NULL THEN 1 WHEN candidate.job_count=1 THEN 0.75 ELSE 0 END
      FROM invoices i LEFT JOIN LATERAL (SELECT COUNT(*)::int job_count,MIN(j.id) only_job_id FROM jobs j WHERE j.customer_id=i.customer_id) candidate ON true
      ON CONFLICT (migration_version,source_table,source_id) DO UPDATE SET target_table=EXCLUDED.target_table,target_id=EXCLUDED.target_id,classification=EXCLUDED.classification,match_rule=EXCLUDED.match_rule,confidence=EXCLUDED.confidence,updated_at=NOW();
      INSERT INTO legacy_record_matches(migration_version,source_table,source_id,target_table,target_id,classification,match_rule,confidence)
      SELECT '20260917_002_operating_system_backfill','invoice_payments',p.id::text,'invoice_payments',p.id::text,'automatically_matched','identity_preserved',1 FROM invoice_payments p
      ON CONFLICT (migration_version,source_table,source_id) DO UPDATE SET target_table=EXCLUDED.target_table,target_id=EXCLUDED.target_id,classification=EXCLUDED.classification,match_rule=EXCLUDED.match_rule,confidence=EXCLUDED.confidence,updated_at=NOW();
      INSERT INTO legacy_record_matches(migration_version,source_table,source_id,target_table,target_id,classification,match_rule,confidence)
      SELECT '20260917_002_operating_system_backfill','job_expenses',e.id::text,'job_expenses',e.id::text,'automatically_matched','explicit_job_foreign_key',1 FROM job_expenses e
      ON CONFLICT (migration_version,source_table,source_id) DO UPDATE SET target_table=EXCLUDED.target_table,target_id=EXCLUDED.target_id,classification=EXCLUDED.classification,match_rule=EXCLUDED.match_rule,confidence=EXCLUDED.confidence,updated_at=NOW();
      INSERT INTO legacy_record_matches(migration_version,source_table,source_id,target_table,target_id,classification,match_rule,confidence)
      SELECT '20260917_002_operating_system_backfill','change_orders',o.id::text,'change_orders',o.id::text,'automatically_matched','explicit_job_foreign_key',1 FROM change_orders o
      ON CONFLICT (migration_version,source_table,source_id) DO UPDATE SET target_table=EXCLUDED.target_table,target_id=EXCLUDED.target_id,classification=EXCLUDED.classification,match_rule=EXCLUDED.match_rule,confidence=EXCLUDED.confidence,updated_at=NOW();
      INSERT INTO legacy_record_matches(migration_version,source_table,source_id,target_table,target_id,classification,match_rule,confidence)
      SELECT '20260917_002_operating_system_backfill','project_gallery',g.id::text,
        CASE WHEN g.job_id IS NOT NULL THEN 'jobs' ELSE NULL END,g.job_id::text,
        CASE WHEN g.job_id IS NOT NULL THEN 'automatically_matched' ELSE 'unmatched_historical' END,
        CASE WHEN g.job_id IS NOT NULL THEN 'explicit_job_foreign_key' ELSE 'no_safe_match' END,
        CASE WHEN g.job_id IS NOT NULL THEN 1 ELSE 0 END FROM project_gallery g
      ON CONFLICT (migration_version,source_table,source_id) DO UPDATE SET target_table=EXCLUDED.target_table,target_id=EXCLUDED.target_id,classification=EXCLUDED.classification,match_rule=EXCLUDED.match_rule,confidence=EXCLUDED.confidence,updated_at=NOW();
      INSERT INTO media_assets(contact_id,property_id,request_id,entity_type,entity_id,media_type,stage,url)
      SELECT q.customer_id,q.property_id,q.request_id,'quote',q.id::text,'video','customer_intake',u.url
      FROM quotes q CROSS JOIN LATERAL UNNEST(COALESCE(q.video_urls,ARRAY[]::text[])) u(url)
      ON CONFLICT (entity_type,entity_id,url) DO NOTHING;
    `,
  },
  {
    version: "20260917_003_operational_workflows",
    description: "Add immutable Job closeout timestamp used by the guided closeout workflow",
    statement: `
      ALTER TABLE jobs ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
      CREATE INDEX IF NOT EXISTS jobs_closeout_status_idx ON jobs(closeout_status,status,updated_at DESC);
    `,
  },
  {
    version: "20260917_004_request_proposals",
    description: "Add explicit customer-facing proposal terms while preserving legacy proposal IDs and links",
    statement: `
      ALTER TABLE quote_proposals ADD COLUMN IF NOT EXISTS deposit_required NUMERIC(12,2) NOT NULL DEFAULT 0;
      ALTER TABLE quote_proposals ADD COLUMN IF NOT EXISTS approximate_duration TEXT;
      ALTER TABLE quote_proposals ADD COLUMN IF NOT EXISTS included_work TEXT;
      ALTER TABLE quote_proposals ADD COLUMN IF NOT EXISTS excluded_work TEXT;
      ALTER TABLE quote_proposals ADD COLUMN IF NOT EXISTS proposal_terms TEXT;
    `,
  },
  {
    version: "20260917_005_referral_reconciliation",
    description: "Account for referral leads in the no-loss migration ledger even when earlier backfill versions already ran",
    statement: `
      INSERT INTO legacy_record_matches(migration_version,source_table,source_id,target_table,target_id,classification,match_rule,confidence)
      SELECT '20260917_002_operating_system_backfill','referral_leads',l.id::text,'requests',l.request_id::text,
        CASE WHEN l.request_id IS NOT NULL THEN 'automatically_matched' ELSE 'unmatched_historical' END,
        CASE WHEN l.request_id IS NOT NULL THEN 'deterministic_legacy_origin' ELSE 'no_safe_match' END,
        CASE WHEN l.request_id IS NOT NULL THEN 1 ELSE 0 END FROM referral_leads l
      ON CONFLICT (migration_version,source_table,source_id) DO UPDATE SET target_table=EXCLUDED.target_table,target_id=EXCLUDED.target_id,
        classification=EXCLUDED.classification,match_rule=EXCLUDED.match_rule,confidence=EXCLUDED.confidence,updated_at=NOW();
    `,
  },
  {
    version: "20260917_006_gallery_destination",
    description: "Link published Gallery entries back to authoritative Job media",
    statement: `
      ALTER TABLE project_gallery ADD COLUMN IF NOT EXISTS source_media_id INTEGER REFERENCES media_assets(id) ON DELETE SET NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS project_gallery_source_media_uidx ON project_gallery(source_media_id) WHERE source_media_id IS NOT NULL;
    `,
  },
  {
    version: "20260917_007_work_address_properties",
    description: "Promote explicit legacy quote and appointment service addresses into Contact Properties",
    statement: `
      INSERT INTO properties(street,city,state,zip,normalized_address,label)
      SELECT MIN(street),MIN(city),MIN(state),MIN(zip),normalized_address,'Service property'
      FROM (
        SELECT NULLIF(TRIM(street),'') street,NULLIF(TRIM(city),'') city,NULLIF(TRIM(state),'') state,NULLIF(TRIM(zip),'') zip,
          LOWER(REGEXP_REPLACE(CONCAT_WS('|',TRIM(street),TRIM(city),TRIM(state),TRIM(zip)),'\\s+',' ','g')) normalized_address
        FROM quotes WHERE customer_id IS NOT NULL AND COALESCE(TRIM(street),'')<>''
        UNION ALL
        SELECT NULLIF(TRIM(street),''),NULLIF(TRIM(city),''),NULLIF(TRIM(state),''),NULLIF(TRIM(zip),''),
          LOWER(REGEXP_REPLACE(CONCAT_WS('|',TRIM(street),TRIM(city),TRIM(state),TRIM(zip)),'\\s+',' ','g'))
        FROM appointments WHERE customer_id IS NOT NULL AND COALESCE(TRIM(street),'')<>''
      ) source_addresses
      GROUP BY normalized_address
      ON CONFLICT (normalized_address) WHERE normalized_address IS NOT NULL AND normalized_address<>'' DO NOTHING;

      UPDATE quotes q SET property_id=p.id FROM properties p
      WHERE q.property_id IS NULL AND q.customer_id IS NOT NULL AND COALESCE(TRIM(q.street),'')<>''
        AND p.normalized_address=LOWER(REGEXP_REPLACE(CONCAT_WS('|',TRIM(q.street),TRIM(q.city),TRIM(q.state),TRIM(q.zip)),'\\s+',' ','g'));
      UPDATE appointments a SET property_id=p.id FROM properties p
      WHERE a.property_id IS NULL AND a.customer_id IS NOT NULL AND COALESCE(TRIM(a.street),'')<>''
        AND p.normalized_address=LOWER(REGEXP_REPLACE(CONCAT_WS('|',TRIM(a.street),TRIM(a.city),TRIM(a.state),TRIM(a.zip)),'\\s+',' ','g'));

      INSERT INTO contact_properties(contact_id,property_id,relationship,is_primary)
      SELECT customer_id,property_id,'service_contact',false FROM quotes WHERE customer_id IS NOT NULL AND property_id IS NOT NULL
      UNION
      SELECT customer_id,property_id,'service_contact',false FROM appointments WHERE customer_id IS NOT NULL AND property_id IS NOT NULL
      ON CONFLICT (contact_id,property_id,relationship) DO NOTHING;

      UPDATE requests r SET property_id=q.property_id FROM quotes q
      WHERE r.property_id IS NULL AND r.legacy_type='quote' AND r.legacy_id=q.id::text AND q.property_id IS NOT NULL;
      UPDATE requests r SET property_id=a.property_id FROM appointments a
      WHERE r.property_id IS NULL AND r.legacy_type='appointment' AND r.legacy_id=a.id::text AND a.property_id IS NOT NULL;
      UPDATE jobs j SET property_id=q.property_id FROM quote_proposals qp JOIN quotes q ON q.id=qp.quote_id
      WHERE j.property_id IS NULL AND j.quote_proposal_id=qp.id AND q.property_id IS NOT NULL;
      UPDATE activity_events e SET property_id=r.property_id FROM requests r
      WHERE e.property_id IS NULL AND e.request_id=r.id AND r.property_id IS NOT NULL;
      UPDATE media_assets m SET property_id=r.property_id FROM requests r
      WHERE m.property_id IS NULL AND m.request_id=r.id AND r.property_id IS NOT NULL;
    `,
  },
];

export async function runOperatingSystemMigrations(): Promise<void> {
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS handytech_schema_migrations (
      version TEXT PRIMARY KEY, description TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `));

  await db.execute(sql.raw("SELECT pg_advisory_lock(72419017)"));
  try {
    for (const migration of migrations) {
      const existing = await db.execute(sql.raw(`SELECT version FROM handytech_schema_migrations WHERE version='${migration.version}'`));
      if ((existing as any).rows?.length) continue;
      await db.transaction(async (tx) => {
        await tx.execute(sql.raw(migration.statement));
        await tx.execute(sql.raw(`INSERT INTO handytech_schema_migrations(version,description) VALUES ('${migration.version}','${migration.description.replace(/'/g, "''")}')`));
      });
      console.log(`  Operating-system migration applied: ${migration.version}`);
    }
  } finally {
    await db.execute(sql.raw("SELECT pg_advisory_unlock(72419017)"));
  }
}
