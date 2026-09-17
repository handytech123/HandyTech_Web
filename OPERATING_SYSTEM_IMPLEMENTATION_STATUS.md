# HandyTech Operating System Implementation Status

Status: implementation complete; production activation pending controlled database rehearsal  
Architecture source: `HANDYTECH_OPERATING_SYSTEM_ARCHITECTURE.md`

## Implemented architecture

| Architecture requirement | Implementation evidence |
|---|---|
| Permanent Contact identity | Existing `customers` IDs remain authoritative; additive Contact semantics, normalization, duplicate checks, deactivation, and Contact history workspace are implemented. |
| First-class Property | `properties` and `contact_properties` preserve service-location identity and expose Request, Job, activity, media, and associated-Contact history. |
| Universal Request intake | Quotes, consultations, standalone appointments, referrals, repeat work, and manual intake create or link Requests through compatibility mirrors. |
| Request pre-sale workspace | Customer questions, internal notes, site visits, media, internal estimates, customer-facing Proposal drafts/sending, status, next action, and complete history are Request-local. |
| Estimate / Proposal / Approved Scope | Private estimate economics are separate from the customer Proposal. Proposal acceptance transactionally creates/links a Job and stores an immutable Approved Scope snapshot. |
| Change Orders | Post-approval price/scope changes have immutable customer decisions, secure public tokens, approval dates, signer evidence, and Job activity events. |
| Unified Scheduling | Appointments, site visits, work blocks, schedule purpose, Job/Request links, Google Calendar synchronization, workers, assignments, and crew-hour capacity are represented in one system. |
| Today command center | Lifecycle-native action queues cover today's schedule, Requests, Proposals, inbound messages, receivables, closeout, and capacity. |
| Job operational center | Overview, frozen Scope, Work, labor sessions, Schedule, Money, Files & Photos, Change Orders, and guided Closeout are available without reconstructing Job context. |
| Authoritative financial semantics | Contract value, approved changes, current contract, billed revenue, cash collected, receivables, direct costs, gross profit, overhead, and operating profit are explicitly separated. |
| Unified activity history | Request/Job/Contact/Property activity records include intake, scheduling, notes, messages, Proposals, approvals, work, media, invoices, payments, Change Orders, and closeout. |
| Contextual media | Media originates on Request/Job records. Completion media may be deliberately published to Gallery with a retained source-media link. |
| Project-centric customer portal | Customers see projects, next schedule, documents, invoices, paid/balance amounts, shared activity, and contextual project messaging. |
| Conservative AI/automation | Prepared actions are audited and owner-reviewed; consequential actions are not silently executed. |
| Final owner navigation | Primary navigation is `Today | Requests | Jobs | Contacts | Money | Business`; retired owner destinations resolve into these lifecycle areas. |
| Legacy workflow retirement | Complete. Legacy Quotes, Consultations, Appointments, Invoices, and Customers are no longer owner destinations; internal navigation resolves to Requests, Schedule, Money, and Contacts. Historical storage and public token routes remain read-compatible for rollback and audit safety. |

## Data migration controls

- Migrations are additive, ordered, transactional, advisory-locked, and disabled unless `ENABLE_OPERATING_SYSTEM_MIGRATIONS=true`.
- Legacy IDs, tables, routes, tokens, links, and records remain in place.
- `legacy_record_matches` classifies every enumerated source record as `automatically_matched`, `needs_review`, or `unmatched_historical`.
- Manual review changes only the audited relationship disposition; it does not delete or rewrite the source record.
- Reconciliation calculates before/after accounting and fails the command when `lostDeleted` is nonzero.
- The admin Data Migration Control Center exposes source counts, dispositions, unresolved records, and reviewed resolution.
- Application rollback is the feature flag or prior deployment. Database rollback uses a verified backup restore; additive history must not be deleted as a shortcut.

## Verification available in this repository

```powershell
npm run check
npm run test:architecture
npm run test:operating-system
npm run test:operating-system-migrations
npm run test:scheduling
npm run test:home-depot
npm run build
```

These checks prove source-level architecture coverage, normalization behavior, migration safety constraints, time handling, referral scoring, compilation, and production bundling.

## Production activation gate

Production activation is intentionally not represented as complete in source control. It requires the external evidence defined in `OPERATING_SYSTEM_MIGRATION_RUNBOOK.md`:

1. Read-only production inventory.
2. Verified backup and restore rehearsal.
3. Migration against a production snapshot in staging.
4. Reconciliation with every source record accounted for and `lostDeleted = 0`.
5. Legacy/public-link, authentication, portal, scheduling, communication, and financial smoke tests.
6. Controlled production activation, immediate reconciliation, monitoring, and retained rollback evidence.

No production database connection was present in the implementation environment, so no claim is made that this external activation gate has passed.
