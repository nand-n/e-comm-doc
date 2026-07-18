# Module 23 — Invoicing, Settlements, and Payouts

**Status:** Detailed delivery specification  
**Dependencies:** Billing ledger, COD custody, pricing, deliveries, partner/rider management, notifications, audit  
**Primary phases:** Phase 3 invoicing; Phase 4 automated settlements and payouts

## 1. Purpose

Turn posted ledger activity into reviewable merchant invoices, COD settlements, and rider/partner payouts while preserving separate obligations, approvals, processor evidence, and end-to-end reconciliation.

## 2. Boundaries

### In scope

- Prepaid usage statements and postpaid invoices.
- Credit/debit notes generated from approved ledger corrections.
- Merchant COD settlement statements and disbursements.
- Rider and partner earning statements and payouts.
- Holds, reserves, approval batches, payment attempts, remittance advice, and reconciliation.

### Out of scope

- Creating financial effects outside the ledger.
- Payroll, employment classification, tax advice, lending, foreign exchange brokerage, or asserting statutory invoice validity.
- Unapproved netting of merchant COD against delivery charges or of earnings against cash custody.

Invoice content, numbering, tax treatment, withholding, reserve rules, payout eligibility, payment timing, abandoned funds, sanctions/KYC checks, and processor terms are **configurable and require jurisdiction-specific legal/finance and payment-processor review**.

## 3. Actors and permissions

| Actor | Permissions |
|---|---|
| Merchant finance | View/download own invoices and settlement statements; manage approved payout destination |
| Rider | View own earnings statement, holds, and payout status |
| Partner finance | View partner earnings and payout reconciliation |
| Finance operator | Prepare invoice/settlement/payout runs and investigate failures |
| Finance approver | Approve issuance/release; cannot approve own prepared batch |
| Treasury operator | Submit approved payment batches and attach provider evidence |
| Support | View masked status and open disputes; cannot alter finance records |
| Auditor | Read source entries, documents, approvals, attempts, and reconciliation |

Destination changes require re-verification, step-up authentication, cooling-off/risk policy, and immutable audit. The preparer, approver, and destination owner must not collapse into one unchecked role.

## 4. Data model

- **BillingProfile:** party, billing cycle, terms, currency, invoice/statement preferences, effective dates.
- **Invoice:** number, merchant, period, currency, issue/due dates, source ledger watermark, totals, status, rendered artifact hash.
- **InvoiceLine:** delivery/source references, description, quantity, unit amount, tax category placeholder, ledger entry ids.
- **CreditDebitNote:** original invoice, reason, approved reversal/replacement transaction ids.
- **SettlementStatement:** merchant, period, COD payable entries, holds/releases, gross amount, disbursement amount.
- **EarningStatement:** rider/partner, period, earning and adjustment entries, holds, payable amount.
- **PaymentDestination:** tokenized provider reference, owner, verification state, effective dates; no raw credentials.
- **DisbursementBatch/Item:** type, party, currency, approved amount, ledger cutoff, destination snapshot, status.
- **PaymentAttempt:** provider, idempotency key, provider reference, requested/accepted/final timestamps, raw response reference.
- **Hold:** party, amount/currency, reason, scope, authority, start/review/release dates.
- **RemittanceAdvice:** immutable generated artifact and delivery status.

Documents are projections of posted ledger entries. Their totals must be reproducible from immutable source ids and rule/configuration versions.

## 5. Operations and APIs

Representative APIs:

- `GET /v1/businesses/{id}/invoices`
- `GET /v1/businesses/{id}/settlements`
- `GET /v1/riders/me/earnings`
- `GET /v1/partners/{id}/earning-statements`
- `POST /v1/finance/invoice-runs`
- `POST /v1/finance/invoices/{id}/approve`
- `POST /v1/finance/settlement-runs`
- `POST /v1/finance/payout-runs`
- `POST /v1/finance/disbursement-batches/{id}/approve`
- `POST /v1/finance/disbursement-batches/{id}/submit`
- `POST /v1/finance/payment-attempts/{id}/reconcile`
- `POST /v1/finance/holds`
- `POST /v1/finance/holds/{id}/release`

Batch creation freezes a source-entry cutoff and produces a deterministic preview. Approval acts on the exact preview hash; any source or destination change invalidates approval and requires regeneration.

## 6. Rules and states

### Invoices

- Include only eligible, posted `merchant_delivery_charges` and configured taxes/fees for the tenant, currency, and period.
- A ledger entry appears on at most one active invoice line; credits reference the original.
- Issued documents are immutable. Corrections use credit/debit notes and linked ledger reversals/replacements.
- Prepaid consumption and postpaid receivables remain distinguishable.

Invoice states:

`draft → calculated → approval_pending → issued → partially_paid → paid`

Alternatives: `voided` only before issuance; `overdue`, `disputed`, or `credited` after issuance according to policy.

### Merchant COD settlements

- Eligible amount derives from reconciled `merchant_cod_payable`, excluding prior settlement releases, approved holds, and unresolved custody/payment items.
- Delivery charges are shown separately and are not netted against COD unless an explicit merchant agreement, jurisdiction policy, and approved posting rule permit it.
- When approved COD is paid, post debit merchant COD payable and credit controlled bank/cash.

Settlement states:

`draft → reconciled → approval_pending → approved → submitted → paid → reconciled`

Failure alternatives: `held`, `failed`, `returned`, `cancelled_before_submission`.

### Rider/partner payouts

- Eligible amount derives independently from rider or partner payable entries and approved holds.
- Cash personally held by a rider is never assumed paid or deducted from earnings; custody and payable remain separate. Any legally permitted offset requires explicit agreement, approval, and separate balanced journal entries.
- Payment success is based on authoritative provider/bank final status, not HTTP acceptance.
- Paid payout posts debit rider/partner payable and credit controlled bank/cash.

Payout item states:

`eligible → batched → approved → submitted → processing → paid → reconciled`, with `held`, `failed`, `returned`, or `cancelled_before_submission`.

## 7. Approval and audit controls

- Maker-checker approval is mandatory for issuance exceptions, manual holds/releases, destination overrides, settlement/payout release, write-offs, and payment retries that may duplicate value.
- Approval thresholds and required approver count are versioned configuration.
- Every document and batch stores source watermark, calculation version, configuration version, preview hash, maker, approver(s), timestamps, and reason.
- Processor callbacks are authenticated, deduplicated, retained, and linked to attempts.
- Manual “mark paid” is prohibited except an approved reconciliation operation with external bank evidence; it still posts through the ledger.

## 8. Security and privacy

- Tokenize payment destinations and display only masked values.
- Separate permission to view destination data from permission to submit funds.
- Require step-up authentication for destination changes, batch approvals/submission, exports, and hold overrides.
- Use signed, short-lived links for documents; log downloads; protect generated artifacts by tenant.
- Validate webhook signatures, timestamps, replay windows, and provider event uniqueness.
- Retention, invoice fields, tax IDs, payment data, KYC/sanctions processes, and data residency are **configurable and subject to legal/privacy/processor review**.

## 9. Failure handling and reconciliation

- Use a stable idempotency key per payment item and provider operation. A timeout yields `unknown`, not automatic failure or retry.
- Resolve unknown attempts by provider query/reconciliation before resubmission.
- Partial batch acceptance tracks each item independently; no batch-wide assumption.
- Returned payments reopen the payable through a new balanced journal and hold the destination for review.
- Reconcile invoice payments, COD disbursements, and earnings payouts separately against bank/processor statements and ledger entries.
- Never interpret a processor balance as the platform ledger balance.
- Rendering/email failures do not roll back issuance; retry delivery and expose document access.
- Discrepancies create cases with amount, currency, owner, age, evidence, and resolution journals.

## 10. Reports and metrics

- Invoice aging, paid/overdue/disputed value, credit-note rate, and unbilled posted charges.
- Merchant COD payable: gross, held, eligible, submitted, paid, returned, and outstanding.
- Rider and partner payable aging and payout success/failure/return rates.
- Processor/bank unmatched items, unknown attempts, duplicate-prevention events, and reconciliation lag.
- Batch preparation-to-approval and approval-to-payment time.
- Destination changes, manual holds, overrides, and value by approver.
- Statements by party, currency, period, delivery, and `external_order_id`.

## 11. Delivery phases

- **Phase 2:** Read-only COD and earnings balances with manual, audited reconciliation.
- **Phase 3:** Billing profiles, postpaid invoices, credit notes, merchant statements, payment recording.
- **Phase 4:** COD settlement runs, rider/partner payout batches, provider integrations, holds, automated matching.
- **Later/configured:** Multi-currency/FX, jurisdictional taxes/withholding, permitted netting, and additional payment rails only after review.

## 12. Acceptance criteria

- Every invoice, settlement, and earning statement total is reproducible from listed posted ledger entries.
- Issued documents and submitted batches cannot be edited; changes use linked corrective records.
- COD payable, delivery charges, rider payable, partner payable, platform revenue, and cash in transit remain separately visible before and after payment.
- The same source entry cannot be billed, settled, or paid twice.
- Maker cannot approve their own controlled action, and approval is invalidated if the batch changes.
- Processor timeout handling cannot create an automatic duplicate payment.
- Payment success/return creates the correct balanced payable and cash journals with provider evidence.
- Tenant, rider, and partner users can see only their scoped documents and masked destination details.
- Open holds and disputes are visible and excluded from eligibility according to versioned policy.
- All jurisdiction, tax, withholding, netting, timing, and processor rules are explicitly configurable and flagged for required review.
