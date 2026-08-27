CREATE TABLE IF NOT EXISTS invoices (
  id serial PRIMARY KEY,
  customer_id integer NOT NULL REFERENCES customers(id),
  quote_proposal_id integer REFERENCES quote_proposals(id),
  invoice_number varchar(32) NOT NULL UNIQUE,
  token_hash varchar(64) NOT NULL UNIQUE,
  line_items jsonb NOT NULL,
  discount real NOT NULL DEFAULT 0,
  tax_rate real NOT NULL DEFAULT 0,
  subtotal real NOT NULL,
  tax real NOT NULL DEFAULT 0,
  total real NOT NULL,
  amount_paid real NOT NULL DEFAULT 0,
  notes text,
  terms text,
  status text NOT NULL DEFAULT 'draft',
  issue_date timestamptz NOT NULL DEFAULT now(),
  due_date timestamptz NOT NULL,
  sent_at timestamptz,
  viewed_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoices_customer_id_idx ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx ON invoices(status);

CREATE TABLE IF NOT EXISTS invoice_payments (
  id serial PRIMARY KEY,
  invoice_id integer NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount real NOT NULL CHECK (amount > 0),
  method text NOT NULL,
  reference text,
  notes text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoice_payments_invoice_id_idx ON invoice_payments(invoice_id);
