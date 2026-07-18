# Module 26 — Support and Disputes

**Status:** Detailed delivery specification  
**Dependencies:** Deliveries, proof, notifications, finance, identity, audit  
**Primary phases:** Support in Phase 2; structured disputes in Phases 3–4

## 1. Purpose

Provide a tenant-aware case system for delivery questions, exceptions, complaints, COD discrepancies, invoice/settlement/payout disputes, and evidence-driven resolution without allowing support workflows to rewrite operational or financial history.

## 2. Boundaries

### In scope

- Case intake, classification, ownership, SLA, communication, evidence, escalation, dispute decisions, and remedies.
- Linkage to deliveries, status events, proof, COD custody, ledger transactions, invoices, settlements, payouts, and webhooks.
- Merchant, recipient, rider, partner, and internal support channels.

### Out of scope

- Legal adjudication, emergency services, insurance claim determination, or law-enforcement process.
- Direct ledger edits, delivery history edits, unlogged communications, or unrestricted support impersonation.
- Promising refunds, compensation, liability, or regulatory outcomes not established by approved policy.

Remedy eligibility, response deadlines, evidence requirements, consumer rights, limitation periods, recording/consent, escalation, and regulator handling are **jurisdiction-configurable and require legal review**.

## 3. Actors and permissions

| Actor | Permissions |
|---|---|
| Merchant user | Open and view own business cases; submit evidence; dispute own charges/COD |
| Recipient | Open or respond through verified limited-access channel for own delivery |
| Rider | View/respond to assigned allegations with redacted customer information |
| Partner admin | Manage partner-scoped cases and evidence |
| Support agent | Handle assigned scoped cases; view minimum necessary records |
| Support lead | Reassign, escalate, approve low-risk remedies within threshold |
| Ops investigator | Investigate delivery/proof/custody events |
| Finance investigator/approver | Review financial disputes and approve ledger-backed remedy |
| Privacy/security/legal reviewer | Handle restricted categories under separate permissions |
| Auditor | Read case timeline, access, evidence, decision, and remedy links |

Agents cannot decide cases involving themselves, their tenant, or their own operational actions. Material remedies require independent approval.

## 4. Data model

- **Case:** id, tenant/party scopes, category/subcategory, severity, channel, subject, description, state, SLA policy/version, owner/team.
- **CaseParty:** role, verified identity/contact reference, communication preferences.
- **CaseLink:** typed reference to delivery, event, proof, journal, custody transfer, invoice, settlement, payout, or webhook.
- **CaseTimelineEvent:** immutable actor action, timestamp, visibility (`internal`, `merchant`, `recipient`, `rider/partner`), content reference.
- **EvidenceItem:** submitter, type, hash, capture/source time, chain-of-custody metadata, retention/legal-hold status.
- **Dispute:** disputed item/type, amount/currency where applicable, reason, claimed outcome, response deadline, decision.
- **RemedyProposal:** action, amount/currency, policy basis, ledger posting preview, maker/approvers.
- **Communication:** channel, template/version, recipient, sent/delivery state, consent/recording basis where applicable.
- **SlaPolicy:** response/resolution targets, pause conditions, escalation rules, effective dates.

Sensitive categories such as security, privacy, health, harassment, and legal requests use restricted queues and redacted general timelines.

## 5. Operations and APIs

Representative APIs:

- `POST /v1/support/cases`
- `GET /v1/support/cases/{id}`
- `POST /v1/support/cases/{id}/messages`
- `POST /v1/support/cases/{id}/evidence`
- `POST /v1/support/cases/{id}/assign`
- `POST /v1/support/cases/{id}/escalate`
- `POST /v1/support/cases/{id}/disputes`
- `POST /v1/support/disputes/{id}/decision`
- `POST /v1/support/remedies/{id}/approve`
- `POST /v1/support/cases/{id}/close`
- `POST /v1/support/cases/{id}/reopen`

Intake is idempotent by channel message/reference. Commands use expected case version. Communication APIs separate internal notes from external messages and show visibility before submission.

## 6. Rules and states

Case states:

`new → triaged → assigned → investigating → awaiting_customer|awaiting_merchant|awaiting_rider|awaiting_partner|awaiting_internal → resolved → closed`

Alternatives: `duplicate`, `spam`, `withdrawn`; `closed → reopened` under policy.

Dispute states:

`submitted → eligibility_review → evidence_collection → under_review → decision_pending → upheld|partially_upheld|denied → remedy_pending → completed`

Alternatives include `withdrawn`, `duplicate`, and `expired` only when approved policy permits.

Rules:

- Case timelines are append-only; corrections append a clarification.
- Delivery and finance source records are read-only in support.
- A financial remedy posts an approved balanced reversal/adjustment through the ledger and links transaction ids.
- COD, delivery charges, rider/partner payable, platform revenue, and cash-in-transit impacts are assessed separately; support cannot net them informally.
- SLA clocks, pause reasons, reopen windows, evidence deadlines, and severity are determined by versioned policy.
- Duplicate cases link to a primary case without deleting original intake.
- Automated classification may recommend but not make material dispute decisions without an approved, reviewed policy.

## 7. Security and privacy

- Verify external parties before revealing case or delivery detail; public tracking tokens alone do not grant support history.
- Enforce field- and category-level permissions, redaction, and purpose-based access.
- Scan uploads, validate type/size, hash at ingestion, encrypt, and serve through expiring URLs.
- Keep internal notes from external responses by explicit visibility controls and UI warnings.
- Mask addresses, phone numbers, bank references, signatures, and identity evidence unless needed.
- Log every sensitive case view and export; alert on bulk/unusual access.
- Recording, transcript, evidence retention, legal hold, data-subject requests, minors, and cross-border sharing are **configurable and subject to privacy/legal review**.

## 8. Failure handling and escalation

- Channel/email/webhook failures retain the message and retry safely; agents see delivery state and must not assume receipt.
- Duplicate inbound messages deduplicate by provider reference but remain linked as attempts.
- Upload processing failures quarantine files and prevent reviewer download until safe.
- SLA breach triggers escalation, not automatic closure or unsupported compensation.
- Missing operational/finance evidence creates a dependency task and visible uncertainty.
- If a financial posting fails, remedy remains `remedy_pending`, retries idempotently, and cannot be marked completed.
- Conflicting evidence preserves all versions and records reviewer rationale.
- Security, privacy, safety, large-value finance, and legal categories route immediately to designated teams based on approved policy.

## 9. Reports and metrics

- Case volume by category, channel, tenant, city, delivery mode, and severity.
- First-response and resolution time; SLA breach and reopen rate.
- Backlog and aging by queue/owner/dependency.
- Dispute value/count, uphold rate, remedy type/value, and decision time.
- COD, invoice, settlement, payout, proof, and delivery-failure dispute trends.
- Contact rate per 100 deliveries and repeat-contact rate.
- Communication delivery failures, evidence-processing failures, escalations, and restricted-data access.
- Root-cause tags linked to product/operations corrective actions.

Metrics must not rank individuals or infer misconduct without adequate context and approved employee/privacy policy.

## 10. Delivery phases

- **Phase 1:** Basic internal exception notes and audit links.
- **Phase 2:** Tenant-scoped support cases, delivery linkage, SLA, communication, evidence.
- **Phase 3:** Structured COD/invoice disputes, remedy approvals, finance links, self-service views.
- **Phase 4:** Partner cases, omnichannel intake, advanced routing and root-cause analytics.

## 11. Acceptance criteria

- Each case has verified tenant/party scope, immutable timeline, owner, SLA version, and source links.
- Support users cannot alter delivery status history, custody records, ledger entries, or issued financial documents.
- External and internal messages cannot be confused; each has explicit visibility and delivery status.
- Evidence is hashed, access-controlled, malware-scanned, and traceable to its submitter.
- Financial remedies require policy basis, maker/approver separation, and balanced linked ledger transactions.
- COD and other financial components remain separate throughout investigation and remedy reporting.
- Unauthorized users cannot infer case existence or access cross-tenant/restricted categories.
- Failed communications and remedy postings remain visible and retry safely without duplication.
- Decisions retain evidence considered, rationale, policy version, reviewer, and timestamps.
- Jurisdiction-dependent deadlines, rights, evidence, recording, and remedy policies remain pending until legal review.
