# HandyTech Solutions

## Operating System Architecture

- **Document Version:** 1.0
- **Status:** Approved Product Architecture
- **Purpose:** Product, UX, data-model, and implementation direction for the HandyTech business-management system.

## 1. Purpose

HandyTech has evolved from a service-business website into a broader business-management application.

The existing application already contains substantial working functionality, including customer records, quote requests, consultations, appointments, scheduling, proposals, invoices, payments, jobs, expenses, change orders, reviews, project galleries, customer portals, communications, marketing tools, automation, and integrations.

The problem is not primarily lack of functionality.

The problem is that functionality has been added incrementally and now exists across many independent sections. The application reflects the history of how features were built rather than the natural lifecycle of a HandyTech customer and project.

This architecture reorganizes HandyTech around the actual lifecycle of work.

This is an incremental architectural refactor.

It is not a rewrite.

Existing production functionality and data must be preserved wherever reasonably possible.

## 2. Product Philosophy

HandyTech exists to solve a customer's problem.

The customer should never need to understand HandyTech's internal business processes in order to receive service.

From the customer's perspective, the experience is:

```text
I have a problem
      ↓
HandyTech understands what I need
      ↓
I understand what the work will involve
      ↓
I approve the work
      ↓
HandyTech performs the work
      ↓
I pay
      ↓
The problem is resolved
```

Internally, the business lifecycle is:

```text
Contact
   ↓
Property
   ↓
Request
   ↓
Evaluation / Estimate
   ↓
Proposal
   ↓
Approval
   ↓
Job
   ↓
Execution
   ↓
Invoice / Payment
   ↓
Closeout
```

Software features must support this lifecycle rather than becoming independent destinations simply because they exist.

## 3. Core Architectural Principle

The system should be organized around business objects and responsibilities, not individual software features.

The primary business objects are:

- Contact
- Property
- Request
- Job

Supporting objects such as appointments, estimates, proposals, messages, photos, expenses, invoices, payments, reviews, and change orders exist in the context of those primary objects.

## 4. Core Relationship Model

The conceptual relationship should become:

```text
CONTACT
   │
   ├── PROPERTY
   │      │
   │      ├── REQUEST
   │      │     │
   │      │     ├── Communications
   │      │     ├── Customer description
   │      │     ├── Photos / Videos / Files
   │      │     ├── Site Visits
   │      │     ├── Internal Estimate
   │      │     └── Proposal
   │      │              │
   │      │           APPROVED
   │      │              ↓
   │      └───────────── JOB
   │                     │
   │                     ├── Approved Scope
   │                     ├── Field Work
   │                     ├── Schedule
   │                     ├── Labor
   │                     ├── Materials
   │                     ├── Expenses
   │                     ├── Photos / Files
   │                     ├── Change Orders
   │                     ├── Invoices
   │                     ├── Payments
   │                     └── Closeout
   │
   └── Complete Relationship History
```

## 5. Decision 1 — Request Is Universal Intake

Every potential piece of work should enter HandyTech as a Request.

A Request may originate from:

- Website
- Phone
- Text
- Email
- Referral
- Website Chat
- Repeat Customer
- Manual Admin Entry
- Future integrations

These channels should not create fundamentally different business workflows.

They are simply different sources of Requests.

The Request is the universal front door to HandyTech.

## 6. Decision 2 — Requests Begin Lightweight

A customer should not be required to complete a complicated form simply to ask HandyTech for help.

At creation, a Request primarily needs to answer:

**Who needs help?**

Contact information sufficient to identify or create the Contact.

**Where is the work?**

The relevant Property/service location when applicable.

**What is the problem?**

The customer's description in their own words.

**What can they show HandyTech?**

Optional:

- Photos
- Videos
- Documents
- Other supporting media

**Where did the Request originate?**

Examples:

- Website
- Phone
- Text
- Email
- Referral
- Chat
- Repeat customer
- Manual

Additional information can be gathered after the Request exists.

The customer should not have to understand HandyTech's internal workflow.

## 7. Decision 3 — Permanent Contact Model

HandyTech should not maintain fundamentally separate Lead and Customer person databases.

A person or organization should have one permanent Contact identity.

The relationship with HandyTech can change over time.

Examples:

- Prospective
- Customer
- Past Customer
- Repeat Customer
- Inactive

These describe the relationship.

They do not create another person.

A Contact may represent:

- Individual
- Company
- Property Management Company
- Organization

Contacts should be searchable by appropriate identifying information such as:

- Name
- Company
- Phone
- Email
- Property

The system should check for an existing Contact before creating another one.

Duplicate Contact creation should be minimized.

## 8. Property Is a First-Class Business Object

A Contact and a Property are not the same thing.

One Contact may have multiple Properties.

Example:

```text
Mary Johnson
   ├── 123 Main Street — Residence
   ├── 487 Oak Drive — Rental
   └── 921 Pine Street — Rental
```

A property manager or company may be connected to many Properties.

Property history should survive individual projects.

A Property should eventually provide a permanent service history containing its:

- Requests
- Jobs
- Photos
- Relevant documents
- Service history

Future versions may optionally store useful property-specific information such as appliance models, paint selections, installed equipment, maintenance information, or other relevant property knowledge.

Sensitive information must receive appropriate security controls.

## 9. Decision 4 — Request Is the Pre-Sale Workspace

The Request is the primary workspace before work is approved.

Existing concepts such as:

- Consultation
- Site Visit
- Appointment
- Quote
- Proposal
- Customer Questions
- Photos

should not behave as disconnected business universes.

They are things that can happen to a Request.

A Request might follow:

```text
New
 ↓
Reviewing
 ↓
Needs Visit
 ↓
Visit Scheduled
 ↓
Visit Complete
 ↓
Ready to Estimate
 ↓
Estimate / Proposal
 ↓
Proposal Sent
 ↓
Approved
```

But not every Request must pass through every stage.

A simple Request may follow:

```text
New
 ↓
Ready to Estimate
 ↓
Proposal Sent
 ↓
Approved
```

A straightforward repeat service may potentially move directly from Request into approved/scheduled work when appropriate.

The software must support flexible workflows without forcing unnecessary steps.

## 10. Request Actions

When an owner opens a Request, the application should answer:

> What needs to happen next?

Common actions may include:

- Ask Customer a Question
- Add Internal Note
- Schedule Site Visit
- Add Photos / Files
- Prepare Estimate
- Create Proposal
- Send Proposal
- Convert to Job
- Decline / Close Request

The owner should not need to leave the Request and search through unrelated administrative sections to perform normal Request-related work.

## 11. Decision 5 — Estimate, Proposal, Approved Scope

These concepts must remain distinct.

### Internal Estimate

The Estimate is an internal business calculation.

It may contain:

- Estimated labor hours
- Crew size
- Internal labor cost
- Materials
- Material cost
- Equipment
- Rental
- Disposal
- Subcontractors
- Travel
- Other direct costs
- Contingency
- Desired margin
- Recommended selling price
- Owner-selected selling price

This information is primarily for HandyTech.

It is not automatically customer-facing.

## 12. Proposal

The Proposal is the customer-facing offer.

It should clearly communicate:

- Scope of work
- Price
- Deposit requirement
- Approximate duration
- Included work
- Excluded work
- Terms
- Proposal expiration
- Customer approval

The Proposal should be easy for the customer to understand.

The customer should not need to understand HandyTech's internal costing model.

## 13. Approved Scope

When the customer approves the Proposal, the approved Proposal becomes the contractual baseline for the Job.

It must be preserved.

Example:

```text
Original Approved Scope
Proposal Q-1042
Approved Price: $5,000
Approved Date: September 20
```

The original approved scope should not later be silently rewritten.

## 14. Change Orders

Work added after approval must be handled through a Change Order.

Example:

```text
Original Contract     $5,000
Change Order #1         $350
Change Order #2         $200
--------------------------------
Current Contract      $5,550
```

A Change Order should preserve:

- Description
- Price change
- Status
- Customer approval
- Approval date
- Relevant documentation

Historical contractual information must remain auditable.

## 15. Decision 6 — Unified Scheduling

The following concepts belong to one Scheduling system:

- Calendar
- Appointments
- Site Visits
- Work Visits
- Work Blocks
- Availability
- Blocked Dates
- Google Calendar synchronization

Availability and blocked dates are configuration aspects of Scheduling.

They should not require separate top-level business navigation.

## 16. Every Scheduled Item Needs Context

A scheduled event should normally answer:

> Why is HandyTech going there?

Examples:

```text
Request R-1024
Site Visit
September 22 — 10:00 AM
```

or:

```text
Job J-1048
Work Day 2
September 26 — 8:00 AM
```

Jobs must support multiple scheduled work periods.

Example:

```text
J-1048 Bathroom Remodel

Sept 22 — Site Visit
Sept 26 — Work Day 1
Sept 27 — Work Day 2
Sept 28 — Work Day 3
Oct 1   — Final Walkthrough
```

## 17. Appointments vs. Work Blocks

The architecture should recognize that a short consultation appointment and a multi-day construction project are different scheduling concepts.

A site visit may be:

```text
10:00 AM – 11:00 AM
```

A Job may consume:

```text
2 workers
3 days
48 estimated crew-hours
```

The architecture should eventually support capacity planning based on available labor rather than merely empty calendar slots.

## 18. Decision 7 — Job Workspace Is the Operational Center

Once a Request is approved, the resulting Job becomes the center of operational work.

The owner should normally be able to perform job-related activities without leaving the Job Workspace.

A Job should immediately answer:

- What job is this?
- Who is the customer?
- Where is it?
- What did we agree to?
- What is happening today?
- What happens next?
- How much is the contract?
- How much has been collected?
- What remains unpaid?
- How much has the job cost?
- Are we making money?

## 19. Job Workspace Structure

The target Job Workspace should contain approximately:

- Overview
- Scope
- Work
- Schedule
- Money
- Files & Photos

Closeout can become a workflow presented when the Job reaches completion rather than necessarily remaining a permanent primary tab.

## 20. Job Overview

The Overview should summarize:

- Job number
- Job title
- Status
- Contact
- Property
- Current contract value
- Amount billed
- Amount collected
- Balance
- Next scheduled activity
- Important alerts
- Recent activity
- Estimated remaining work

Quick actions should include appropriate actions such as:

- Call
- Text
- Directions
- Add Field Note
- Add Cost
- Create Change Order
- Create Invoice

## 21. Work / Field Operations

The Work area should be optimized for mobile field use.

It should support:

- Field notes
- Voice-entered notes
- Measurements
- Tasks completed
- Tasks remaining
- Problems discovered
- Labor
- Materials used
- Progress photos
- Relevant documents

Example field note:

> Removed flooring around toilet. Rot extends approximately three feet beneath vanity. Additional subfloor replacement is likely required. Four photos attached.

Future AI may recognize that this appears outside the Approved Scope and offer:

> Possible scope change detected. Prepare Change Order?

The AI may prepare the Change Order.

The owner approves it before it becomes a customer-facing commitment.

## 22. Labor Tracking

Labor should become measurable operational data.

The long-term experience should make recording labor extremely easy.

Possible workflow:

```text
Start Work
Pause
Resume
Finish Day
```

The system should ultimately support:

- Worker
- Job
- Start time
- End time
- Labor hours
- Internal labor cost

This enables:

**Estimated labor vs. actual labor**

Example:

```text
Estimated: 32 hours
Actual:    38.5 hours
Variance:  +6.5 hours
```

This information should feed future estimating intelligence.

## 23. Materials and Expenses

Expenses belong to Jobs.

Examples:

- Materials
- Labor
- Fuel
- Equipment
- Rental
- Disposal
- Fees
- Subcontractor
- Other

Receipt capture should be simple from a phone.

Future AI may extract:

- Vendor
- Amount
- Date
- Likely expense category
- Relevant Job

The owner confirms before the record becomes authoritative when appropriate.

## 24. Job Closeout

Completing a Job should be a workflow rather than merely changing a status field.

Possible closeout checklist:

- Approved scope completed
- Change Orders resolved
- Labor entered
- Expenses entered
- Completion photos captured
- Final invoice created
- Customer balance resolved
- Relevant documents stored
- Review request ready

After appropriate completion/payment:

> Close Job

The completed Job becomes permanent historical business data.

## 25. Decision 8 — Contact and Property History

Opening a Contact should answer:

> Who is this person or organization, and what is our complete history?

A Contact record may display:

- Contact information
- Properties
- Active Requests
- Active Jobs
- Completed Jobs
- Invoices
- Outstanding balance
- Communications
- Reviews
- Relationship history

A prominent:

> + New Request

action should allow repeat work to begin immediately without re-entering customer information.

## 26. Property History

Opening a Property should answer:

> What has HandyTech done at this location?

Possible information:

- Associated Contacts
- Active Requests
- Active Jobs
- Completed Jobs
- Service history
- Photos
- Documents
- Relevant property notes

Requests and Jobs should attach to the appropriate Property rather than repeatedly duplicating address information throughout unrelated records.

## 27. Decision 9 — Financial Architecture

HandyTech must distinguish between:

- Contract Value
- Billed Revenue
- Cash Collected
- Outstanding Receivables
- Direct Job Costs
- Gross Profit
- Business Overhead
- Operating Profit

These terms must never be casually substituted for one another.

## 28. Estimate Economics

Before approval, HandyTech should be able to compare:

- Estimated labor
- Estimated materials
- Estimated other direct costs
- Estimated total direct cost
- Proposed selling price
- Expected gross profit
- Expected gross margin

The owner always retains authority to override a recommended selling price.

The system may advise.

The owner decides.

## 29. Job Economics

During execution, the Job should show:

```text
Original contract
Approved Change Orders
Current contract value

Estimated costs
Actual costs

Billed
Collected
Balance

Projected / current gross profit
```

It should eventually provide:

**Estimate vs. Actual**

Example:

```text
Labor
Estimated: 48 hours
Actual:    42 hours

Materials
Estimated: $900
Actual:    $1,025
```

## 30. Invoice Creation

Once a Job exists, invoices should normally originate from the Job.

The user should not have to navigate to a separate invoice system and reconstruct job context.

Example:

```text
Job Contract:          $5,650
Previously Invoiced:   $2,000
Remaining:             $3,650

Create Final Invoice:  $3,650
```

The global Money area remains available for company-wide invoice management.

## 31. Deposits and Payments

Deposits should be represented through the normal financial ledger rather than treated as unrelated exceptions.

Example:

```text
Contract             $5,000
Deposit Invoice      $1,500
Deposit Collected    $1,500
Remaining Contract   $3,500
Final Invoice        $3,500
Total Collected      $5,000
```

Payment history must remain auditable.

## 32. Business-Level Financial Management

The global Money area answers:

> Is HandyTech making money?

It should eventually support:

- Billed
- Collected
- Outstanding
- Direct Job Costs
- Gross Profit
- Business Overhead
- Operating Profit

Reporting should eventually support profitability analysis by dimensions such as:

- Service type
- Job type
- Time period
- Customer
- Property
- Lead source

Historical Job data should eventually help identify which categories of work are most profitable.

## 33. Decision 10 — Unified Communication History

Communication should be organized around the business relationship and work.

Relevant communication channels may include:

- Email
- SMS
- Website Chat
- Customer Portal
- Phone Call Notes
- Automated Messages
- Proposal Activity
- Appointment Activity
- Payment Activity

When opening a Request or Job, the owner should be able to see a chronological history.

Example:

```text
8:42 AM — Customer submitted Request
9:03 AM — Luis sent message
9:05 AM — Scheduling link sent
9:18 AM — Customer scheduled visit
11:14 AM — Site visit notes added
2:35 PM — Proposal sent
4:17 PM — Proposal approved
```

HandyTech does not need to replace every external communication application immediately.

The initial objective is for HandyTech to become the authoritative business history.

Integrations may progressively capture or send communications through external services.

## 34. Decision 11 — Photos, Files and Documentation

Media should originate in the context of the work.

Possible lifecycle:

```text
Customer Intake Photos
      ↓
Site Visit Photos
      ↓
Before Photos
      ↓
Progress Photos
      ↓
Receipts / Documents
      ↓
Change Order Documentation
      ↓
Completion Photos
```

These belong primarily to:

- Contact
