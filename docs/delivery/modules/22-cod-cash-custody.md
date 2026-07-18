# Module 22 — COD Cash Custody

**Status:** Detailed delivery specification  
**Dependencies:** Deliveries, proof, identity/RBAC, billing ledger, notifications, audit  
**Primary phase:** Phase 2, expanded in Phase 4

## 1. Purpose

Control cash-on-delivery (COD) from expected collection through verified collection, custody handoffs, deposit, reconciliation, and merchant settlement. The module must always answer: how much cash is expected, who is responsible for it, where it was last acknowledged, how old it is, and how it reconciles to the immutable ledger.

## 2. Boundaries

### In scope

- COD declaration and eligibility checks.
- Collection confirmation and evidence.
- Rider, partner, hub, and deposit custody tracking.
- Count sessions, sealed handoffs, deposits, variances, escalation, and reconciliation.
- Posting instructions to `cash_in_transit_cod` and `merchant_cod_payable`.

### Out of scope

- Delivery pricing, merchant invoicing, general cash-register operation, lending, or statutory money-transmission classification.
- Automatic legal conclusions about who owns funds or maximum custody duration.
- Editing COD financial history after collection.

COD availability, limits, accepted currency/denominations, receipt wording, custody obligations, remittance deadlines, identity checks, insurance, and merchant settlement timing are **configurable by jurisdiction and subject to legal/finance review**.

## 3. Actors and permissions

| Actor | Permissions |
|---|---|
| Merchant | Request COD within policy; view own expected, collected, and settled amounts |
| Rider | View assigned COD amount; confirm collection; hold and initiate handoff for own custody only |
| Partner rider/admin | Equivalent partner-scoped custody actions and reconciliation |
| Cashier/hub custodian | Accept/reject handoffs, count cash, seal batches, prepare deposit |
| Ops supervisor | Investigate operational exceptions; cannot approve own financial variance |
| Finance operator | Match deposits, prepare variance adjustments and merchant settlement |
| Finance approver | Approve material variance resolution, write-off, or settlement release |
| Auditor | Read custody chain, evidence, ledger links, and approvals |

Every custody transfer requires two-party acknowledgement unless an approved exception flow records why that was impossible. No actor can acknowledge both sides of the same handoff.

## 4. Data model

- **CodObligation:** delivery, merchant, expected amount/currency, configured policy version, collection state.
- **CodCollection:** actual amount/currency, collected time, collector, receipt/evidence references, source event.
- **CustodyPosition:** current custodian type/id, amount, currency, location reference, acquired time, version.
- **CustodyTransfer:** from/to custodians, amount, initiated/acknowledged times, seal/bag id, evidence, status.
- **CashCount:** count session, denomination summary where allowed, expected/actual totals, counters, timestamp.
- **DepositBatch:** deposits grouped by account/provider, expected amount, bank/processor reference, submitted/confirmed times.
- **CodVarianceCase:** expected, observed, difference, category, owner, evidence, approvals, ledger adjustment link.
- **CustodyPolicy:** COD limits, handoff requirements, aging thresholds, evidence and escalation rules, effective dates.

Amounts are integer minor units. A COD obligation and each collection have one currency. Partial collection, overcollection, customer change, gratuity, and split tender are disabled unless an approved policy explicitly defines their treatment.

## 5. Operations and APIs

Representative APIs:

- `POST /v1/riders/jobs/{deliveryId}/cod/collect`
- `GET /v1/riders/me/cash-position`
- `POST /v1/cash/transfers`
- `POST /v1/cash/transfers/{id}/acknowledge`
- `POST /v1/cash/transfers/{id}/reject`
- `POST /v1/cash/counts`
- `POST /v1/finance/cod/deposit-batches`
- `POST /v1/finance/cod/deposit-batches/{id}/confirm`
- `GET /v1/businesses/{id}/finance/cod`
- `GET /v1/ops/cod/custody`
- `POST /v1/finance/cod/variances/{id}/resolve`

Collection and transfer commands require idempotency keys, expected record version, geotime context where permitted, and evidence required by the active policy. APIs return authoritative current custody and linked journal transaction ids.

## 6. Rules and states

### Collection

- Expected COD is fixed at dispatch or another configured cutoff; changes after assignment require authorized re-quote/reconfirmation and audit.
- A delivery cannot become `delivered` with COD unless collection is confirmed or an authorized `waived/not_collected` exception is recorded.
- Confirmed collection posts a balanced journal: debit cash in transit for the custodian; credit merchant COD payable.
- The operational collection and ledger source event share a stable id. Duplicate retries cannot duplicate money.
- Customer-facing receipt numbers are unique and do not expose internal identifiers.

Collection states:

`not_required` or `expected → collection_pending → collected`

Exception terminals: `waived`, `not_collected`, `collection_disputed`. A correction creates reversal and replacement events; it never edits `collected`.

### Custody

- Custody is conserved: acknowledged outbound amount equals acknowledged inbound amount, except through an approved variance process.
- Initiating a transfer does not release the sender. Responsibility changes only on acknowledgement.
- Each transfer records one currency and cannot be netted against delivery fees, rider earnings, partner payables, or personal advances.
- Cash-in-transit reporting is dimensioned by current custodian even if control-account postings aggregate it.
- Deposit confirmation moves value from cash in transit to the configured controlled cash/bank clearing account.

Transfer states:

`draft → offered → acknowledged`, with `rejected`, `expired`, or `cancelled` alternatives. Acknowledged transfers are immutable.

Deposit states:

`open → counted → submitted → confirmed → reconciled`; exceptions use `variance_open` before `reconciled`.

## 7. Security and privacy

- Minimize customer personal data in cash records; use delivery references and masked contact details.
- Require strong authentication and device/session binding for collection and handoff actions.
- Step-up authentication is required for large-value handoffs, deposit confirmation, variance resolution, and policy overrides.
- Evidence files use malware scanning, encryption, signed access URLs, access logs, retention schedules, and legal holds where applicable.
- Detect impossible handoffs, replay, repeated offline submissions, altered device time, and custody above configured limits.
- Location capture, biometric/signature evidence, receipt content, retention, and employee monitoring are **jurisdiction-configurable and require privacy/legal review**.

## 8. Failure handling and reconciliation

- Offline collection may be queued only within configured risk limits; issue a device-generated idempotency key and reconcile immediately on reconnect.
- If delivery status succeeds but ledger posting fails, mark finance posting pending, block settlement, retry from outbox, and alert after threshold.
- If a receiver disputes count, keep sender custody active and open a variance case; do not silently transfer the difference.
- Lost connectivity during acknowledgement is safely replayable and returns the existing transfer result.
- Lost/stolen cash, counterfeit notes, wrong currency, over/short count, and missing deposit each use explicit variance categories and escalation.
- Daily reconciliation compares:
  - COD-required delivered jobs to collections or approved exceptions;
  - collections to merchant payable and cash-in-transit journals;
  - custody positions to acknowledged transfers/counts;
  - deposit batches to bank/processor evidence;
  - settled merchant COD to available reconciled payable.
- Variance resolution posts approved reversal/adjustment journals; it never updates original collection or custody entries.

## 9. Reports and metrics

- Current cash in transit by rider, partner, hub, city, currency, and age.
- Expected versus collected COD by merchant/delivery.
- Unacknowledged/expired handoffs and overdue remittances.
- Deposit batches pending confirmation and unmatched bank deposits.
- Variance value/rate by category, custodian, route, and period.
- COD payable available, held, settled, and disputed by merchant.
- Collection-to-handoff, handoff-to-deposit, and deposit-to-reconciliation time.
- Offline collections, policy overrides, duplicate attempts, and custody-limit breaches.

## 10. Delivery phases

- **Phase 1:** COD requested amount and policy placeholder; no production cash accounting.
- **Phase 2:** Collection proof, rider custody, two-party handoff, immutable ledger posting, daily reconciliation, merchant view.
- **Phase 3:** Hub count/deposit batches, variance workflow, statements, enhanced risk alerts.
- **Phase 4:** Partner custody, configurable processor deposits, automated matching and settlement eligibility.

## 11. Acceptance criteria

- Every collected COD amount creates exactly one balanced ledger transaction separating cash in transit from merchant COD payable.
- The current custodian and full immutable handoff chain are retrievable for every unremitted collection.
- A sender remains accountable until a distinct receiver acknowledges the transfer.
- COD cannot be netted with delivery charges, rider/partner payables, platform revenue, or unapproved deductions.
- Offline retries and duplicate commands do not duplicate collections, handoffs, or journals.
- Delivered COD jobs without collection or authorized exception appear in reconciliation within the configured SLA.
- Deposit confirmation and merchant settlement cannot proceed for unresolved or unreconciled amounts unless an approved hold/override policy explicitly allows it.
- Variances preserve expected and observed values, evidence, maker/approver identities, and linked adjustment journals.
- Tenant and partner scopes prevent cross-organization visibility.
- Jurisdiction and processor-dependent settings remain explicitly unapproved until legal/finance review.
