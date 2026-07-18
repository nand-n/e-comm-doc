# Module 21 — Billing Ledger

**Status:** Detailed delivery specification  
**Dependencies:** Tenancy/RBAC, deliveries, pricing, identity, audit log  
**Primary phases:** Foundation in Phase 1; operational posting in Phase 2; automation in Phases 3–4

## 1. Purpose

Provide the authoritative financial subledger for delivery charges, COD obligations, rider and partner earnings, platform revenue, cash custody, adjustments, settlements, and payouts. Every financial effect is represented by an immutable, balanced journal transaction; balances are derived views, never editable source data.

## 2. Boundaries

### In scope

- Multi-tenant, multi-currency journal transactions and entries.
- Separate control accounts for:
  - `merchant_delivery_charges`
  - `merchant_cod_payable`
  - `rider_earnings_payable`
  - `partner_earnings_payable`
  - `platform_revenue`
  - `cash_in_transit_cod`
- Supporting accounts such as merchant prepaid funds, delivery-fulfilment expense, bank/cash clearing, tax suspense, write-off expense, and rounding.
- Posting from delivery, COD custody, invoice, settlement, payout, refund, and approved adjustment events.
- Reconciliation, period controls, approval evidence, exports, and audit traceability.

### Out of scope

- General-purpose accounting, payroll, tax advice, statutory chart-of-accounts design, or legal determination of fund ownership.
- Direct mutation of balances or deletion/update of posted entries.
- Payment-processor-specific accounting until processor behavior is configured and reviewed.

## 3. Actors and permissions

| Actor | Permissions |
|---|---|
| System posting service | Post only from registered event types and versioned posting rules; no approval authority |
| Business finance | View/export its tenant ledger, invoices, COD payable, and reconciliations |
| Business owner/admin | View summaries; cannot post manual journals by default |
| Platform finance operator | Prepare adjustments, reconciliation cases, period close, settlement batches |
| Platform finance approver | Approve/reject adjustments, write-offs, payout releases, and close/reopen requests |
| Auditor/compliance reviewer | Read entries, source evidence, approvals, configuration history, and exports |
| Platform admin | Configure access and account mappings; cannot silently alter posted finance data |

Maker and approver must be different users for manual adjustments, write-offs, settlement release, payout release, and period reopening. Emergency access is time-bound, reasoned, and audited; it does not bypass balancing or immutability.

## 4. Data model

### Core records

- **LedgerAccount:** `id`, stable `code`, account class, normal side, owner scope/type, tenant/party dimensions, currency policy, active dates.
- **JournalTransaction:** `id`, `type`, `effective_at`, `posted_at`, currency, source type/id, source event id, idempotency key, posting-rule version, description, status.
- **JournalEntry:** `id`, transaction id, account id, debit minor units, credit minor units, currency, business/delivery/rider/partner/invoice/settlement dimensions.
- **PostingRule:** event type, version, predicates, debit mapping, credit mapping, effective dates, approval status.
- **AccountingPeriod:** scope, start/end, state, closed/reopened by, approval and reason.
- **AdjustmentRequest:** proposed reversal/replacement, evidence, maker, approver, decision.
- **ReconciliationRun/Item:** source, period, expected and observed amounts, match key, variance, status, assignee.
- **BalanceSnapshot:** rebuildable optimization with ledger watermark and checksum; never source of truth.

All money uses integer minor units plus ISO currency. Transactions never balance across currencies. FX, if introduced, requires explicit per-currency entries and configured clearing/gain/loss treatment.

### Required invariants

1. Total debits equal total credits for every posted transaction and currency.
2. A posted transaction and its entries are append-only.
3. Corrections use a full reversal linked to the original, then a replacement when needed.
4. Source event plus posting-rule version is unique and idempotent.
5. Every entry carries tenant and relevant operational dimensions.
6. Control accounts remain separate; netting COD, charges, earnings, revenue, or cash in transit into one balance is prohibited.
7. A closed period rejects new effective dates in that period except through approved reopening or a current-period adjustment.

### Illustrative postings

| Event | Debit | Credit |
|---|---|---|
| Postpaid delivery charge recognized | Merchant delivery charges | Platform revenue |
| Prepaid delivery charge consumed | Merchant prepaid funds | Platform revenue |
| COD confirmed collected | Cash in transit — COD, custodian dimension | Merchant COD payable |
| Rider earning accrued | Delivery fulfilment expense | Rider earnings payable |
| Partner earning accrued | Delivery fulfilment expense | Partner earnings payable |
| COD remitted into controlled cash/bank | Controlled cash/bank clearing | Cash in transit — COD |
| Merchant COD settlement paid | Merchant COD payable | Controlled bank/cash |
| Rider/partner payout paid | Rider/partner earnings payable | Controlled bank/cash |

Taxes, processor fees, reserves, and withholding are not inferred. Their accounts and posting rules are **configurable and require finance/legal review for each jurisdiction and payment processor**.

## 5. Operations and APIs

Internal operations:

- `post(sourceEvent, ruleVersion, idempotencyKey)` validates and atomically writes a balanced transaction.
- `reverse(transactionId, reason, approvedRequestId)` posts inverse entries.
- `trialBalance(filters, asOf)` derives account totals.
- `rebuildSnapshot(watermark)` verifies and regenerates cached balances.
- `reconcile(source, period)` imports or references evidence and proposes matches.

Representative restricted APIs:

- `GET /v1/finance/ledger/transactions`
- `GET /v1/finance/ledger/transactions/{id}`
- `GET /v1/finance/ledger/balances`
- `POST /v1/finance/adjustments`
- `POST /v1/finance/adjustments/{id}/approve`
- `POST /v1/finance/periods/{id}/close`
- `POST /v1/finance/reconciliations`
- `GET /v1/businesses/{id}/finance/ledger`

All write APIs require idempotency keys, optimistic concurrency where applicable, explicit reason codes, and audit context. Public merchant APIs expose only the authenticated tenant’s dimensions.

## 6. Rules and posting lifecycle

- Operational events enter an outbox; posting consumes them at least once and deduplicates exactly by source identity.
- A delivery fee posts only when its configured recognition event occurs; quote creation alone is non-financial unless explicitly configured as a non-posted commitment.
- COD payable posts only from verified collection evidence, never solely from an entered COD expectation.
- Earnings use the approved compensation rule version effective for the delivery.
- Adjustments may not overwrite source facts or backdate into closed periods without approved procedure.
- Negative payable or cash-in-transit balances trigger exceptions; they are not auto-hidden by netting.
- Ledger totals are reproducible from entries and hash/checksum-verifiable by period.

Transaction states: `pending_validation → posted` or `rejected`; posted transactions may be `reversed` only by a linked posted reversal.  
Adjustment states: `draft → submitted → approved → posted`, with `rejected` or `cancelled` terminal alternatives.  
Period states: `open → close_pending → closed → reopen_pending → open`.

## 7. Security and privacy

- Enforce tenant row-level scope and least-privilege finance roles.
- Encrypt data in transit and at rest; keep secrets and payment credentials outside ledger metadata.
- Treat bank references, tax identifiers, and reconciliation files as restricted data with field-level masking and retention controls.
- Require step-up authentication for approvals, exports containing sensitive data, close/reopen, and payout-related adjustments.
- Record actor, delegated authority, request id, IP/device context where lawful, before/after proposal, decision, and reason in tamper-evident audit storage.
- Retention, data residency, financial-record access, tax treatment, and privacy rights are **jurisdiction-configurable and subject to legal review**.

## 8. Failure handling and reconciliation

- Reject unbalanced, unknown-account, inactive-account, currency-mismatched, duplicate-conflict, or closed-period postings before commit.
- Atomically commit journal header and entries; partial journals are impossible.
- Retry transient failures with bounded backoff; quarantine deterministic failures with alerting and source-event visibility.
- Reconcile daily at minimum:
  - delivered/COD evidence to ledger postings;
  - rider custody acknowledgements to cash in transit;
  - cash deposits and processor/bank statements to controlled cash;
  - invoices/credits to delivery-charge entries;
  - settlements/payouts to payable releases.
- Match by stable references and amount/currency; fuzzy matches require human confirmation.
- Variances remain open with owner, age, evidence, and resolution journal. Never “force balance” by editing or deleting.
- Disaster recovery must prove restored journal counts, debit/credit totals, checksums, and source watermarks.

## 9. Reports and metrics

- Trial balance and account activity by tenant, city, delivery, custodian, rider/partner, and currency.
- Merchant delivery-charge receivable/prepaid movement.
- Merchant COD payable aging and settlement history.
- Rider/partner payable aging.
- Cash-in-transit aging by current custodian and handoff stage.
- Platform revenue by recognition date and rule version.
- Unposted source events, rejected postings, reversals, manual-adjustment value, open reconciliation variance, close duration, and snapshot lag.

Reports must display “as of” time, currency, filters, data watermark, and whether figures are posted or operational estimates.

## 10. Delivery phases

- **Phase 1:** Accounts, immutable balanced journal, idempotent posting helper, delivery-fee stub/commitment distinction, tenant views, audit.
- **Phase 2:** Delivery charge recognition, COD payable/cash-in-transit postings, rider earnings, daily reconciliation.
- **Phase 3:** Postpaid invoices, credits, merchant statements, approval workflows, period close.
- **Phase 4:** Partner earnings, automated settlements/payouts, processor/bank reconciliation, controlled multi-currency support.

## 11. Acceptance criteria

- Every posted transaction balances by currency and cannot be edited or deleted through application or admin interfaces.
- Required control accounts are separate and reportable without spreadsheet reconstruction.
- Replaying the same source event creates no duplicate; changing its payload under the same key raises a conflict.
- A correction produces linked reversal/replacement entries with preserved original evidence.
- Unauthorized tenant, role, maker/approver, and closed-period attempts are denied and audited.
- A merchant can reconcile entries to `external_order_id`, delivery, invoice, and settlement references.
- Finance can account from COD collection through custody, deposit, merchant settlement, and remaining cash in transit.
- Rider and partner accruals and payouts reconcile independently from merchant COD and delivery charges.
- Daily reconciliation identifies missing, duplicated, late, and amount-mismatched items without mutating ledger history.
- Configurable jurisdiction, tax, retention, FX, and processor policies are visibly marked unapproved until finance/legal review.
