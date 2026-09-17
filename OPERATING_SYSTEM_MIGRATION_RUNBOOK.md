# HandyTech Operating System Migration Runbook

This runbook controls activation of the additive Contact–Property–Request–Job architecture. The default deployment behavior leaves the new migrations disabled.

## Non-negotiable acceptance criteria

- Existing identifiers, customer records, public tokens, Proposal/invoice links, portal access, and historical records remain intact.
- Every source record is classified as `automatically_matched`, `needs_review`, or `unmatched_historical`.
- Ambiguous records are not silently attached to a Contact, Property, Request, or Job.
- For every source table: `source total = automatically matched + needs review + unmatched historical`.
- `lostDeleted` is zero before cutover.
- Legacy tables, columns, and routes remain available during the compatibility period.

## 1. Read-only production inventory

Run without enabling operating-system migrations:

```powershell
$env:DATABASE_URL='<production read-only connection>'
npm run db:reconcile
```

Before the ledger exists, the report intentionally shows source counts as unaccounted. Save this initial JSON as the pre-migration inventory.

Also capture:

- PostgreSQL schema-only dump.
- Row counts for all source tables.
- Duplicate email/phone candidates.
- Duplicate normalized-address candidates.
- Accepted Proposals without Jobs.
- invoices, appointments, reviews, or gallery records with missing/ambiguous Job context.

## 2. Backup and restore proof

Create a complete database backup and verify restoration into an isolated database. Record the backup identifier, checksum, restore database, start/end time, and verification result. Do not activate migrations without a successful restore proof.

## 3. Staging rehearsal

Restore the production backup into staging, then enable the additive migration for that environment:

```powershell
$env:ENABLE_OPERATING_SYSTEM_MIGRATIONS='true'
npm start
npm run db:reconcile
```

The startup process uses a PostgreSQL advisory lock and the `handytech_schema_migrations` ledger. Re-running it must be safe.

Review `/api/admin/os/matches?classification=needs_review` and `/api/admin/os/matches?classification=unmatched_historical`. Resolve only relationships supported by business evidence.

## 4. Reconciliation gate

Save the post-migration report:

```powershell
npm run db:reconcile
```

Activation is blocked if:

- Any source table fails its accounting equation.
- `lostDeleted` is nonzero.
- Existing public Proposal, invoice, reschedule, or portal links fail.
- A repeat Contact's records appear in the wrong Request or Job.
- Financial totals differ without an explained semantic reconciliation.

## 5. Production activation

After staging approval:

1. Schedule a controlled deployment window.
2. Pause background workers that could create conflicting records.
3. Take a fresh backup and record its restore command.
4. Set `ENABLE_OPERATING_SYSTEM_MIGRATIONS=true`.
5. Deploy one application instance first so it acquires the advisory lock.
6. Run reconciliation immediately.
7. Run the lifecycle and legacy smoke tests.
8. Resume background workers and remaining instances.
9. Monitor errors, match classifications, Job creation, tokens, calendar sync, email/SMS, and financial totals.

## 6. Rollback

Application rollback means deploying the prior version or setting `ENABLE_OPERATING_SYSTEM_MIGRATIONS=false`. Because migrations are additive, legacy reads and writes remain available.

Do not roll back by deleting new Requests, Properties, match records, Approved Scopes, or activity history. If database restoration is required, restore the verified pre-deployment backup and separately retain an export of records created after the backup for controlled replay.

Physical removal or renaming of legacy structures requires a separate, explicitly approved retirement plan after the compatibility observation period.
