# Mode 06 — Returns

**Status:** Comprehensive mode specification  
**Primary phases:** Phase 2 operational returns; Phase 3 merchant integration; Phase 4 partner and settlement automation  
**Authoritative references:** [Product definition](../product-definition.md), [Delivery contracts](../contracts.md), [Delivery workflows](../workflows.md), [Delivery lifecycle](../modules/05-delivery-job-lifecycle.md), [Proof](../modules/11-proof-of-pickup-delivery.md), [Exceptions and returns](../modules/12-exceptions-returns.md), [Billing ledger](../modules/21-billing-ledger.md), [COD custody](../modules/22-cod-cash-custody.md), and [Invoicing, settlements, and payouts](../modules/23-invoicing-settlements-payouts.md).

## 1. Purpose

Returns provide controlled reverse logistics after a failed or completed outbound delivery. Every physical return movement is a new linked delivery job with its own quote, addresses, lifecycle, assignment, tracking token, proof, events, charges, and reconciliation references.

A return must never:

- reverse the original delivery through earlier statuses;
- replace or edit the original delivery's addresses, package snapshots, proof, attempts, events, COD records, or ledger entries;
- imply that a recipient refund has occurred;
- imply that a return fee has been charged, waived, refunded, or netted;
- treat the original rider or partner as the return assignee without a new assignment; or
- mark the original `returned` merely because a request or authorization exists.

The original delivery remains the historical record of outbound execution. The linked return job is the historical record of reverse execution.

## 2. Scope and boundaries

### 2.1 In scope

- Failed-delivery returns while the parcel remains with a rider, partner, hub, or another known custodian.
- Merchant-requested returns after delivery.
- Customer return requests submitted through an authorized merchant-controlled flow.
- Exchanges when enabled, with explicit return and replacement-delivery links.
- Eligibility evaluation, authorization, and optional merchant RMA correlation.
- Current-custody confirmation and append-only custody handoffs.
- Return quoting, payer designation, serviceability, dispatch, execution, proof, tracking, webhooks, notifications, exceptions, and reconciliation.
- Return lineage across repeated attempts without graph cycles.
- Operational and financial source references needed for later fee, refund, COD, settlement, and payout decisions.

### 2.2 Out of scope

- Determining a merchant's product-return policy, warranty rights, statutory cooling-off rights, or refund entitlement.
- Owning the merchant's order, inventory, replacement-order, payment-refund, or RMA system.
- Automatically deciding who pays a return fee, whether a fee is waived, or whether outbound charges are refundable.
- Automatically refunding customer funds, reversing merchant COD payable, netting fees, writing off loss, or releasing settlements.
- Treating package condition evidence as a final fraud, warranty, or legal decision.

Those decisions are **configurable** and require the appropriate merchant, operations, finance, risk, and legal approval. The platform records decisions and executes approved actions; it does not invent them.

## 3. Core invariants

1. A physical return is a `Delivery` with `job_type=return`.
2. The return has a non-null `parent_delivery_id` and a stable `lineage_root_delivery_id`.
3. The return and its parent belong to the same merchant tenant.
4. The parent link is immutable after creation.
5. Every return uses the normal authoritative delivery state machine.
6. A return's pickup reflects verified current custody, not an assumed reversal of the original drop-off.
7. A return's drop-off is an approved immutable destination snapshot, which may be the original pickup, a branch, a return center, a warehouse, or another serviceable location.
8. Return authorization, physical execution, delivery fees, COD custody, merchant settlement, and recipient refund are separate records and state machines.
9. Original and return operational, proof, webhook, and financial histories are append-only.
10. At most one active return exists for the same lineage and package scope unless the previous return is terminal and an authorized reattempt is created.
11. Parent links always point toward the lineage root; no delivery may be its own ancestor or descendant.
12. Completing a return may trigger an authorized transition of the original from `delivery_failed` or `delivered` to `returned`; it never changes the original to `picked_up`, `in_transit`, or `delivered` again.

## 4. Return types and reasons

### 4.1 Return types

| Type | Initiating condition | Typical pickup | Authorization |
|---|---|---|---|
| Failed-delivery return | Outbound attempt failed and return is selected instead of reattempt/hold | Current rider, partner, hub, or approved custody point | Ops or policy-authorized merchant action |
| Merchant-requested return | Merchant requests reverse logistics for a failed or delivered order | Recipient or current custodian | Merchant permission plus eligibility policy |
| Customer return | Recipient asks the merchant to collect an item | Recipient/approved collection point | Merchant-approved authorization; public tracking token alone is insufficient |
| Exchange | Return of one item is coordinated with a replacement delivery | Recipient/approved collection point | Enabled exchange policy and explicit package links |

Exchange is **configurable**. It must not collapse two physical movements into one ambiguous status. The returned item uses a return job. A replacement item uses a separate outbound job unless an approved multi-action stop model explicitly represents both custody changes with separate package actions, proof, and financial references.

### 4.2 Reason taxonomy

Stable reason codes should be grouped without assigning policy outcomes:

- Failed delivery: `recipient_unavailable`, `recipient_refused`, `address_issue`, `unsafe_access`, `payment_issue`, `attempt_limit_reached`.
- Merchant request: `merchant_recall`, `fulfilment_error`, `wrong_item`, `duplicate_shipment`, `merchant_other`.
- Customer return: `customer_changed_mind`, `item_not_as_expected`, `wrong_item_received`, `damaged_reported`, `defective_reported`, `customer_other`.
- Exchange: `size_or_variant_exchange`, `replacement_approved`, `exchange_other`.
- Operational: `package_damaged_in_transit`, `prohibited_or_unsafe_item`, `custody_exception`, `serviceability_change`, `other`.

Reason codes describe the asserted cause; they do not prove fault, refund eligibility, fee responsibility, or item condition. Free text is length-limited, treated as potentially sensitive, and never used when a controlled code is sufficient. Taxonomy availability, required evidence, and merchant-visible wording are **configurable and versioned**.

## 5. Actors and permissions

| Actor | Allowed actions |
|---|---|
| Business owner/admin/dispatcher | Request returns for own-tenant deliveries; view authorizations and linked jobs; supply RMA/destination/payer instructions where permitted |
| Business viewer | Read own-tenant return status; no mutation |
| Business finance | View return quote, charge, refund-reference, ledger, invoice, hold, and settlement effects; no operational approval by implication |
| `ops_dispatcher` | Triage failed delivery, verify custody, approve or reject where delegated, create/dispatch returns, handle attempts and destination changes |
| Restricted ops/risk reviewer | Review damage, safety, fraud, or high-value exceptions under scoped permissions |
| Rider | Execute only the actively assigned return job; report attempt, custody, proof, and condition facts |
| Partner admin/rider | Accept and execute only partner-assigned returns; publish normalized events/proof under partner scope |
| System | Evaluate configured rules, create idempotent records, publish events, reconcile state, and perform explicitly approved automation |
| Recipient | View sanitized tracking; confirm OTP/signature or provide pickup availability through an authorized channel |

No broad role alone bypasses eligibility, state, custody, proof, serviceability, financial, or tenant constraints. Creating a customer-service ticket, knowing a tracking token, or possessing an RMA number does not authorize a return.

Sensitive overrides require explicit permission, reason, expected version, audit, and any configured maker-checker approval. Hard tenant, lineage, custody, and append-only-history constraints cannot be overridden.

## 6. Eligibility, authorization, and RMA

### 6.1 Eligibility evaluation

Eligibility is evaluated against a versioned policy and returns a decision with reason codes. Inputs may include:

- tenant, branch, city, service product, and channel;
- original delivery type and status;
- original delivery and product/order timestamps supplied by the merchant;
- package/item scope and whether it was already returned;
- current custody and serviceability;
- reason and condition assertion;
- attempt count and open exceptions/disputes;
- COD, settlement, refund, fraud, safety, or legal hold indicators;
- merchant-provided RMA/order authorization; and
- configurable return window, package restrictions, and approval thresholds.

The result is `eligible`, `ineligible`, or `review_required`. It must include the evaluated policy version and stable explanation codes. Eligibility is not authorization and is not a quote.

### 6.2 Return authorization

Authorization states:

```text
requested
  → review_required
  → approved
  → return_created
  → completed
```

Alternatives:

```text
requested | review_required → rejected
requested | review_required | approved → expired
approved → cancelled
return_created → cancelled | failed
```

- `requested` records intent only.
- `approved` freezes package scope, destination policy, requester/approver, payer designation, validity window, and required inspection/proof.
- `return_created` references exactly one active linked return for its package scope.
- `completed` requires the linked return to complete at its approved destination and any required receiving inspection to be recorded.
- Rejection, expiry, cancellation, and failure preserve the authorization and decision history.

Whether authorization may be automatically approved, who may approve, approval validity, return windows, and required merchant confirmation are **configurable**.

### 6.3 RMA handling

An RMA is a merchant-controlled reference, not the platform return ID.

- Store `merchant_rma_reference` as an optional tenant-scoped external correlation value.
- Preserve the exact accepted reference snapshot.
- Uniqueness and reuse rules are **merchant-configurable**.
- Do not expose another tenant's RMA existence through validation errors.
- A changed RMA after approval creates a superseding authorization or audited correction; it does not rewrite the accepted record.
- API and reconciliation views return the platform authorization ID, return delivery ID, original delivery ID, `external_order_id`, and RMA reference where authorized.

## 7. Custody and destination determination

### 7.1 Current custody

Return creation requires a known current custody position:

- recipient/customer;
- outbound rider;
- return rider after pickup;
- partner fleet or partner rider;
- merchant branch/warehouse;
- platform hub/cashier or approved third-party custody point; or
- `unknown`, which blocks dispatch until resolved.

The custody position is derived from append-only pickup, delivery, failed-attempt, handoff, and inspection events. A form field claiming custody is not sufficient when it conflicts with evidence.

Each custody event records package scope, from/to party type and ID, event type, source and server times, actor, assignment, location reference where permitted, proof, condition assertion, and correlation ID. Responsibility changes only when the configured acknowledgement requirement is satisfied. Cross-rider or cross-partner handoff after pickup must be explicit.

### 7.2 Pickup and drop-off

The default failed-delivery pattern is:

```text
return pickup = verified current custodian/location
return drop-off = approved origin/branch/return center
```

The default post-delivery pattern is:

```text
return pickup = recipient or approved collection point
return drop-off = approved merchant/return center destination
```

These are patterns, not mandatory business policy. The destination may differ from the original pickup when approved. Return creation must:

1. snapshot pickup and drop-off addresses and contacts;
2. identify the custody party expected at pickup;
3. validate city, zone, lane, operating hours, package, and service-level constraints;
4. minimize contact data shared with riders/partners;
5. retain the authorization destination and any later versioned change; and
6. re-quote/re-dispatch when an approved destination change affects service or price.

The original delivery's address snapshots are never modified.

## 8. Quote, payer, refund, and fee separation

### 8.1 Independent concepts

| Concept | Meaning | Authority |
|---|---|---|
| Return quote | Offered price to execute reverse logistics | Quoting/pricing |
| Return payer designation | Party expected to bear an approved return charge | Authorization/commercial policy |
| Recognized return charge | Posted delivery-fee effect under an approved recognition rule | Billing ledger |
| Outbound fee adjustment | Waiver, credit, or correction of the original delivery charge | Finance-approved ledger correction |
| Customer refund | Merchant/payment-system obligation to the recipient | Merchant commerce/payment authority |
| COD treatment | Hold, release, reversal, refund, or adjustment of COD-related obligations | COD/ledger/settlement policy |
| Rider/partner earning | Compensation for return execution | Compensation rule and ledger |

No one field may stand in for these concepts. In particular, `payer=merchant` does not prove a charge was posted, and `refund_status=completed` must not be inferred from return completion.

### 8.2 Quoting

Every chargeable return has its own quote or an explicit approved no-charge pricing result. The quote snapshots route/service assumptions, package scope, currency, pricing rule version, breakdown, expiry, and payer designation used for presentation. Quote acceptance does not itself post a financial transaction unless an approved posting rule says otherwise.

Repricing triggers, waived-return representation, cancellation fees, failed-attempt fees, taxes, surcharges, partner costs, and responsibility are **configurable**. The system must display “not yet determined” rather than assume zero.

### 8.3 Refund and COD consequences

- Recipient refund state is recorded only from an authorized merchant/payment integration or audited merchant assertion.
- If COD was never collected, the return must not create a fictitious COD reversal.
- If COD was collected, current cash custody and merchant payable remain intact until approved ledger events change them.
- A return request may place eligible settlement items on hold where policy allows; a hold is not a reversal.
- A refund, payable reversal, fee credit, write-off, or variance posts explicit balanced transactions linked to source evidence and the original entries.
- Delivery charges, COD payable, cash in transit, customer refunds, rider earnings, partner earnings, and platform revenue remain separately reportable.
- Netting is prohibited unless an explicit agreement, jurisdiction policy, and approved posting rule permit it.
- Closed-period corrections use approved current-period reversal/replacement procedures; posted history is never edited.

## 9. Linked job creation and idempotency

### 9.1 Creation transaction/saga

`POST /v1/deliveries/{deliveryId}/returns` requires `Idempotency-Key`. The application:

1. resolves the authenticated tenant and original delivery;
2. authorizes the caller and locks or version-checks the authorization/package scope;
3. validates eligibility, authorization, custody, destination, serviceability, and quote;
4. verifies no prohibited active return exists;
5. validates the lineage graph and cycle constraints;
6. creates the return delivery with immutable snapshots and links;
7. creates package links, tracking token, initial lifecycle events, custody expectations, audit record, and outbox events;
8. binds the authorization to the return job;
9. stores the replayable response; and
10. commits atomically where module boundaries permit, otherwise completes through a recoverable saga with reconciliation.

Same key and canonical request hash returns the original response. Same key with different content returns `409`. Concurrent requests for the same package scope produce one active child. A timeout is an unknown outcome; the caller retries with the same key.

### 9.2 Package scope

A return may cover all or an authorized subset of original packages/items. `ReturnPackageLink` maps original package/item references to return package snapshots and quantity. Quantity cannot exceed the remaining returnable quantity under the approved authorization. Split returns and partial quantities are **configurable**; when unsupported, the request is rejected clearly.

The return package snapshot may add observed condition and inspection references, but must preserve a link to the originally accepted package snapshot.

## 10. Lifecycle and lineage

### 10.1 Return delivery state machine

A return uses the complete lifecycle:

```text
draft
  → quoted
  → awaiting_dispatch
  → assigned
  → rider_arriving_pickup
  → picked_up
  → in_transit
  → delivered
```

Its exception terminals are `cancelled` and `delivery_failed`. The return job does not enter `returned` merely because it is a return; `delivered` means it reached its approved return destination.

Every transition appends an immutable status event. Proof, assignment, attempt, tracking, and financial rules apply independently to the return job.

### 10.2 Original delivery

- `delivery_failed → returned` is permitted only through authorized ops and configured completion criteria.
- `delivered → returned` is permitted only through authorized ops and configured product semantics.
- The usual completion criterion is a completed linked return with custody accepted at the approved destination.
- If product policy uses `returned` only for selected return types, the original may remain `delivered`; the linked job still records the completed reverse movement.
- Failure or cancellation of the return does not automatically change the original to `returned`.

### 10.3 Lineage model

Each delivery stores:

- `job_type`: `outbound` or `return`;
- `parent_delivery_id`: immediate source delivery;
- `lineage_root_delivery_id`: first outbound delivery;
- `lineage_depth`: derived and bounded;
- `return_authorization_id`; and
- optional `replacement_delivery_id` / exchange linkage through a dedicated relation.

Lineage creation must reject:

- self-links;
- links across tenants;
- a return whose root is not the parent's root;
- any link that makes an ancestor a descendant;
- exceeding the configured safe lineage depth;
- two active returns for overlapping package scope; and
- using a replacement delivery as an implicit return without an explicit relation.

Multiple attempts are represented as attempts within the same return job when the job remains valid. If a terminal return must be retried as a new job, create a new authorized child or successor relation with its own lifecycle; never reactivate the terminal job.

## 11. Dispatch, owned fleet, and partners

- Return jobs enter normal dispatch only after authorization, quote/price treatment, custody, and pickup readiness are valid.
- Candidate selection considers service zone/lane, package, vehicle, capacity, time window, proof/inspection capability, current custodian, and any restricted handling requirement.
- Assignment creates new assignment history. The outbound assignment grants no rights over the return.
- Before pickup, normal reassignment rules apply.
- After pickup, reassignment requires a verified custody handoff and explicit ops policy.
- Partner selection creates a new partner handoff and partner job reference; the outbound partner is not automatically selected.
- Partner status, location, proof, condition, and custody messages are authenticated, deduplicated, normalized, and passed through platform rules.
- If a partner becomes unreachable after pickup, custody remains with the last acknowledged custodian until an explicit handoff or incident resolution.

Dispatch timeout, offer limits, partner selection, same-rider preference, handoff requirements, and service-level targets are **configurable**.

## 12. Pickup proof, condition inspection, and completion proof

### 12.1 Pickup

Before `picked_up`, the assigned return rider must satisfy the active return proof policy. Configurable requirements may include:

- custodian/recipient OTP or signature;
- package count, barcode, seal, or merchant RMA scan;
- photos where lawful;
- declared and observed condition;
- tamper/damage/missing-accessory checklist;
- pickup location/time context; and
- discrepancy acknowledgement.

If the parcel is absent, refused, unsafe to collect, or materially mismatched, record a failed attempt and retain custody with the prior custodian. Do not mark `picked_up`.

### 12.2 Condition inspection

Condition observations are evidence, not an automatic refund decision. Store:

- inspection stage (`pickup`, `handoff`, `return_destination`);
- inspector actor and organization;
- package/item scope;
- controlled condition codes;
- notes and proof references;
- source/server time;
- acknowledged discrepancies; and
- review/decision reference where applicable.

Corrections create a new inspection or review result. They do not overwrite source observations or artifacts.

### 12.3 Return destination

Before the return job becomes `delivered`, require configured receiving proof and custody acceptance. Completion may require recipient/warehouse identity, package count, seal, condition inspection, OTP/signature, or authorized override. Return proof remains separate from all original pickup/delivery proof.

## 13. Failed attempts, cancellation, failure, and retries

### 13.1 Attempt behavior

Each failed pickup or drop-off attempt records assignment, stop, attempt number, outcome, reason, source/server time, contextual location where permitted, custody outcome, proof, and actor.

Configurable policy determines maximum attempts, wait time, rescheduling, customer contact, fee treatment, and escalation. Reattempting does not rewind lifecycle:

- Before return pickup, the job may stay in its valid pre-pickup state and receive another explicit attempt/dispatch action.
- After return pickup, a failed drop-off records `delivery_failed` when the canonical transition applies and opens an exception.
- A new physical retry after a terminal failure requires an authorized new linked/successor job where the base lifecycle cannot legally resume.

### 13.2 Cancellation

- Authorization may be cancelled before return creation under its state rules.
- A return delivery may be cancelled only in the base lifecycle's permitted pre-pickup states.
- Cancellation after pickup is prohibited; custody must be resolved through failure, handoff, alternate approved destination, or another linked job.
- Cancellation never deletes proof, quote, assignment, attempt, event, notification, or ledger history.
- Any cancellation charge, credit, or refund is determined and posted separately under approved policy.

### 13.3 Operational failures

Unknown custody, unserviceable destination, package mismatch, recipient refusal, loss/damage, partner silence, proof outage, dispatch outage, or finance-posting failure opens or updates an exception. Automation must not close the case when its requested action failed.

Reconciliation detects orphan authorizations, duplicate-active-return attempts, unknown custody, return jobs without valid parent/root, completed returns whose original finalization is pending, proof gaps, event publication gaps, and financial source events not posted.

## 14. APIs and errors

The following are target return operations. They require additions to the checked-in OpenAPI and contract review before being treated as public:

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/v1/deliveries/{deliveryId}/return-eligibility` | Evaluate policy without authorizing or creating |
| `POST` | `/v1/deliveries/{deliveryId}/return-authorizations` | Request authorization/RMA linkage |
| `GET` | `/v1/deliveries/{deliveryId}/return-authorizations` | List tenant-scoped authorization history |
| `POST` | `/v1/return-authorizations/{id}/approve` | Authorized approval with expected version |
| `POST` | `/v1/return-authorizations/{id}/reject` | Reject with reason |
| `POST` | `/v1/deliveries/{deliveryId}/returns` | Idempotently create linked return |
| `GET` | `/v1/deliveries/{deliveryId}/returns` | Read lineage/linked returns |
| `GET` | `/v1/returns/{returnDeliveryId}` | Read return detail |
| `POST` | `/v1/riders/jobs/{returnDeliveryId}/attempts` | Record failed return attempt |
| `POST` | `/v1/riders/jobs/{returnDeliveryId}/inspections` | Record condition inspection |
| `POST` | `/v1/ops/returns/{returnDeliveryId}/change-destination` | Versioned serviceability/requote action |
| `POST` | `/v1/ops/returns/{returnDeliveryId}/finalize-original` | Idempotent original `returned` finalization where allowed |

Mutations require idempotency keys where duplication could create an effect, expected versions for mutable workflow records, and stable operation IDs for offline rider actions.

Machine-readable errors include:

- `return_not_eligible`;
- `return_review_required`;
- `return_authorization_required`;
- `return_authorization_expired`;
- `return_scope_invalid`;
- `duplicate_active_return`;
- `return_lineage_cycle`;
- `return_lineage_depth_exceeded`;
- `custody_unknown`;
- `custody_changed`;
- `return_destination_unserviceable`;
- `return_quote_expired`;
- `return_package_mismatch`;
- `return_proof_required`;
- `return_transition_conflict`; and
- `return_finance_review_required`.

Authorization failures avoid cross-tenant resource disclosure. Stale state/version and conflicting idempotency content return `409`; validation failures return the platform's standard machine-readable validation response.

## 15. Events, webhooks, and tracking

### 15.1 Events

Internal domain events should include authorization and execution correlation, for example:

- `return.authorization.requested|approved|rejected|expired`;
- `return.job.created`;
- `return.attempt.recorded`;
- `return.inspection.recorded`;
- `return.custody.changed`;
- `return.job.completed|failed|cancelled`; and
- `return.original.finalized`.

Public merchant event names require contract/OpenAPI approval. Existing approved delivery events apply to the return job according to its own lifecycle, and payloads identify `job_type=return`, original delivery ID, return delivery ID, root ID, and aggregate version. `delivery.returned` describes the authorized original-delivery transition.

Module 12 proposes additive `return.created` and exception events. They must be versioned and added to the public event catalog before merchants rely on them. Historical webhooks are never retracted or rewritten after a later return.

All webhook delivery uses the transactional outbox, stable event IDs, tenant-scoped endpoint selection, HMAC signature, timestamp, bounded retry, dead-lettering, and at-least-once semantics. Consumers deduplicate and may fetch current state.

### 15.2 Tracking

The original and return jobs use distinct unguessable, revocable tracking tokens. Merchant views may show the full authorized lineage. Public tracking shows only recipient-safe information:

- return public reference and customer-safe status;
- pickup window/readiness where appropriate;
- current safe ETA/location projection;
- approved merchant identity and support channel; and
- minimal proof/completion summary.

It must not expose internal reason/risk notes, ledger/COD/settlement details, full addresses before needed, other custodians' personal data, raw proof, RMA internals, or unrelated jobs. Whether the original tracking page links to return tracking is **configurable** and must not weaken token authorization.

## 16. Data model

### 16.1 `ReturnAuthorization`

| Field | Requirement |
|---|---|
| `id`, `business_id` | Required opaque ID and tenant |
| `original_delivery_id`, `lineage_root_delivery_id` | Required same-tenant links |
| `type`, `reason_code`, `reason_text` | Required type/reason; text optional and protected |
| `state`, `version` | Required workflow state and optimistic concurrency |
| `requester_actor`, `approver_actor` | Required as state dictates |
| `policy_version`, `eligibility_result` | Required evaluation evidence |
| `merchant_rma_reference` | Optional tenant-scoped external reference |
| `package_scope` | Required original package/item/quantity links |
| `approved_destination_snapshot` | Required by approval |
| `payer_designation` | Required decision or explicit `undetermined` |
| `refund_expectation` | Optional merchant assertion; never authoritative payment success |
| `required_proof_inspection_policy` | Required policy snapshot/reference |
| `requested_at`, `decided_at`, `expires_at`, `completed_at` | State-dependent UTC times |
| `created_by_channel`, `request_id`, `correlation_id` | Required provenance |

### 16.2 Delivery additions and relations

| Field/relation | Requirement |
|---|---|
| `job_type` | `outbound` or `return` |
| `parent_delivery_id` | Required and immutable for return |
| `lineage_root_delivery_id` | Required and immutable for return |
| `lineage_depth` | Derived/bounded |
| `return_authorization_id` | Required for return except an explicitly authorized emergency flow |
| `ReturnPackageLink` | Original package/item/quantity to return package |
| `DeliveryRelation` | Typed relation for `return_of`, `replacement_for`, `exchange_pair`, or `retry_of`; cycle checked |

### 16.3 Supporting records

- `ReturnEligibilityDecision`: inputs hash, policy version, outcome, explanation codes, evaluator, expiry.
- `ReturnAttempt`: return delivery/assignment/stop, number, outcome, reason, custody result, proof.
- `ConditionInspection`: stage, package scope, observations, actor, proof, review result.
- `CustodyEvent` / `CustodyPosition`: append-only chain plus current projection.
- `ReturnFinancialInstruction`: return delivery, quote, payer designation, requested action type, source references, state; not a ledger posting.
- `RefundReference`: merchant/provider reference, amount/currency if supplied, reported state, source, observed time; does not replace provider/merchant authority.
- `ReturnFinalization`: original/return IDs, completion conditions, operation key, result, actor.

All money uses integer minor units and ISO currency. All tenant-owned records carry or derive `business_id`. All snapshots and policy/configuration references preserve the version used.

## 17. Security, privacy, and audit

- Resolve tenant from authenticated context; never trust a body-supplied business ID.
- Merchant access is limited to its deliveries, authorizations, proof summaries, and finance records.
- Rider and partner access derives from the active return assignment and current execution need.
- Return pickup addresses, contacts, instructions, precise location, condition images, signatures, OTPs, and refund/payment references are sensitive.
- Share the minimum current-stop data and revoke access when assignment ends.
- OTPs are hashed, expiring, purpose-bound, attempt-limited, and never exposed to riders or logs.
- Proof artifacts use private storage, encryption, malware scanning, checksums, retention controls, legal holds, and short-lived authorized access.
- Public tracking and general webhooks exclude restricted exception, fraud, safety, finance, and unnecessary PII fields.
- Free text is minimized, sanitized, access-controlled, and excluded from logs/analytics by default.
- Step-up authentication applies to configured sensitive approvals, destination changes, refunds/holds, financial corrections, and high-risk overrides.
- Audit request, eligibility decision, approval/rejection, RMA change, linked-job creation, destination change, assignment/handoff, custody/inspection, attempt, cancellation/failure, original finalization, proof access, and all financial instructions/decisions.
- Retention, recipient consent/notice, employee monitoring, financial records, and legal rights are jurisdiction-configurable and require review.

## 18. User interfaces

### 18.1 Merchant

- Original delivery detail shows immutable outbound timeline, return eligibility status, request action, authorization/RMA, package scope, destination, payer/refund state as separate labels, linked return tracking, quote/charges, and support history.
- Return request uses reason-driven fields and explains when review, proof, package scope, or destination is required.
- Return detail shows its own timeline, attempts, current custody, proof summary, fee state, and lineage.
- Finance view separates return delivery charges, outbound credits, COD holds/adjustments, customer refund references, and settlement effects.

### 18.2 Operations

- Return queue filters by authorization state, SLA age, city, tenant, type/reason, custody, package condition, fleet/partner, financial review, and exception severity.
- Detail combines original and return timelines without visually merging them.
- Actions include verify custody, review eligibility, approve/reject, select destination, request quote, create/dispatch, change destination, resolve handoff, review proof/inspection, create successor attempt, and finalize original.
- Dangerous actions show consequences, require reason/expected version, and expose approval status.

### 18.3 Rider/partner

- Return job is clearly labeled and shows only current pickup/drop-off instructions.
- Pickup checklist includes custodian verification, package/item/RMA match, condition, required proof, and refusal/mismatch paths.
- After pickup, the UI makes current custody explicit and prevents cancellation.
- Drop-off requires receiving proof/inspection and acknowledgement.
- Offline actions show pending versus server-accepted state.

### 18.4 Recipient

- Recipient receives an authorized pickup window, preparation guidance, safe identity verification, reschedule/contact path, and return tracking.
- The interface never promises refund timing or eligibility unless supplied by the merchant's authoritative integration.
- Exchange screens distinguish “item being collected” from “replacement being delivered.”

## 19. Notifications

Notification triggers may include request receipt, approval/rejection/expiry, pickup scheduling/rescheduling, rider assignment/arrival, failed attempt, custody handoff requiring action, return completion, and merchant/ops exception escalation.

Messages are audience-specific, localized, deduplicated by event/recipient/channel, and asynchronous. They include no raw proof, internal risk reason, full financial details, or unnecessary PII. Notification failure never rolls back authorization, delivery, custody, or finance state; attempts retry under provider policy and remain observable.

Refund, fee, and settlement wording must reflect authoritative state:

- “return approved” is not “refund approved”;
- “return delivered” is not “refund paid”;
- “settlement on hold” is not “COD reversed”; and
- “fee under review” is not “fee waived.”

Templates, channels, consent, quiet hours, resend limits, and escalation are **configurable**.

## 20. Reconciliation, observability, and metrics

### 20.1 Reconciliation

Scheduled checks identify:

- authorizations approved without a linked return after the configured age;
- return jobs without valid authorization, parent, root, or package links;
- cycles, root mismatch, excessive depth, or overlapping active package scope;
- unknown or conflicting custody positions;
- pickup/completion statuses missing required proof/inspection;
- completed returns whose original finalization is required but pending;
- originals marked `returned` without an eligible completed return/approved override;
- return source events lacking expected ledger postings or carrying duplicate postings;
- COD holds/adjustments inconsistent with collection, custody, or settlement evidence;
- refund references with unknown/stale provider or merchant state;
- partner handoffs/statuses that do not map to platform state; and
- outbox/webhook/notification projections behind the authoritative aggregate version.

Repairs use the same idempotent commands as normal flows. Reconciliation does not directly edit history or force-balance finance.

### 20.2 Metrics

Track by tenant, city, reason/type, channel, service, fleet source, and time period where privacy permits:

- requests, eligibility outcomes, approval/rejection/expiry, and authorization latency;
- creation idempotency replay/conflict and duplicate-active-return prevention;
- pickup readiness, dispatch/assignment latency, attempts per return, pickup/completion time, and success/failure/cancellation;
- current-custody age, unknown-custody duration, handoff latency, loss/damage/mismatch, and inspection outcomes;
- owned-rider versus partner execution and exception rates;
- quote-to-charge variance and payer-undetermined age;
- return charges, fee credits, COD holds/adjustments, refund-reference states, and reconciliation variance, always separated;
- proof completion/override, webhook/notification delivery, dead letters, and projection lag;
- original-finalization lag and lineage/reconciliation defects.

Alerts cover safety incidents, unknown custody, aging high-severity returns, duplicate/cycle constraint attempts, unusual overrides, proof outages, partner silence after pickup, unposted financial events, settlement/refund ambiguity, and reconciliation backlog.

Logs and traces correlate business, original delivery, return delivery, lineage root, authorization, assignment, attempt, proof, custody, quote, ledger source event, request, and event IDs without logging sensitive content.

## 21. Phase boundaries

### Phase 1 — Structural readiness

- Reserve `job_type`, parent/root lineage, package-link, custody, and authorization references.
- Preserve append-only delivery, ledger, and audit foundations.
- Handle returns manually outside automated execution without mutating outbound history.

### Phase 2 — Operational returns

- Failed-delivery and ops/merchant-authorized returns.
- Eligibility/authorization, current custody, linked job creation, owned-rider dispatch, attempt handling, separate tracking, proof/inspection, and exception queue.
- Return quote/financial instructions and COD/ledger reconciliation hooks without assuming policy.
- Idempotent original finalization and core notifications.

### Phase 3 — Merchant integrations

- Merchant API/dashboard return requests, RMA correlation, stable reason codes, OpenAPI schemas, signed return webhooks, webhook logs/replay, and plugin integration.
- Merchant finance presentation of separate return charge, refund reference, COD, invoice/credit, and settlement effects.

### Phase 4 — Scale

- Partner return execution, multi-city/alternate-destination lanes, route/multi-stop integration, exchange orchestration where enabled, advanced inspections, automated settlement links, and configuration/reporting at scale.

No phase may implement returns by rewriting the original delivery. Public endpoints/events require contract and OpenAPI changes before release.

## 22. Acceptance and test matrix

| Area | Acceptance test |
|---|---|
| Linked job | Approved request creates one `job_type=return` delivery with immutable parent/root links, its own token, quote, addresses, lifecycle, and events |
| Original history | Creating, failing, cancelling, or completing a return does not modify original addresses, packages, proof, attempts, events, quote, or posted entries |
| Lifecycle | Return executes the standard state machine; invalid skips/backward transitions return `409` |
| Original finalization | Only authorized completion policy can move `delivery_failed|delivered → returned`; request/approval alone cannot |
| Idempotency | Same creation key/body replays one return; changed body conflicts; concurrent duplicates cannot create two active returns |
| Lineage | Self-link, cross-tenant link, cycle, wrong root, excessive depth, and overlapping active package scope are rejected |
| Partial scope | Package quantity/scope cannot exceed authorization or remaining eligible quantity |
| Eligibility | Decision records policy version and explanation; `review_required` cannot silently auto-approve |
| RMA | Merchant RMA correlates records but never substitutes for platform authorization or leaks cross-tenant existence |
| Custody | Return cannot dispatch with unknown custody; every post-pickup transfer preserves two-party acknowledgement or an audited exception |
| Destination | Alternate destination is snapshotted, serviceable, authorized, and re-quoted when required; original address remains unchanged |
| Dispatch | Outbound assignment gives no return access; only active return assignee can mutate rider states |
| Partner | Duplicate/out-of-order partner messages do not duplicate or bypass platform transitions, proof, or custody |
| Proof | Required pickup/completion proof blocks transition; return proof is separate from original proof |
| Inspection | Condition observations remain immutable evidence and do not automatically decide refund/fault |
| Attempts | Failed pickup retains prior custody; terminal failed return is not reactivated and requires authorized successor execution |
| Cancellation | Pre-pickup cancellation obeys base rules; post-pickup cancellation is denied and custody resolution is required |
| Quote/payer | Return quote and payer are independently recorded; undetermined policy is not presented as zero/waived |
| Refund | Return approval/completion cannot create or mark a customer refund without an authorized source |
| COD | No collection means no COD reversal; collected COD remains traceable through holds/reversals/settlement with balanced linked entries |
| Ledger | Return charges, outbound credits, COD, refunds, earnings, revenue, and cash custody remain separate; replay posts exactly once |
| Finance correction | Corrections create approved reversal/replacement transactions and preserve closed-period controls |
| Tracking | Original and return tokens are distinct; public views expose no restricted notes, finance internals, raw proof, or unrelated PII |
| Webhooks | Events are tenant-routed, signed, replayable, deduplicable, versioned, and never retract historical outbound events |
| RBAC | Merchant, rider, partner, ops, finance, and public users are restricted to explicit tenant/assignment/purpose scopes |
| Offline/retry | Rider operation IDs replay safely; stale assignment/state is rejected; notification/provider timeout does not duplicate effects |
| Reconciliation | Orphan, mismatch, custody, proof, finance, finalization, event, and lineage defects are surfaced without direct history edits |
| UI semantics | All surfaces distinguish return, refund, fee, COD, settlement, and exchange/replacement states |
| Phase gating | Unreleased APIs/events/partner/exchange/financial automation remain disabled or clearly unsupported until dependencies and policy approvals exist |

## 23. Definition of done

The mode is complete only when:

- the public OpenAPI and webhook catalog describe every released return operation and event;
- state, lineage, idempotency, tenant, custody, proof, and ledger invariants have concurrency and recovery tests;
- merchant, ops, rider, partner, recipient, finance, support, and audit views use the same authoritative records;
- configurable return, refund, fee, COD, exchange, proof, retention, and legal decisions identify their owner and version;
- daily reconciliation can trace original delivery → authorization/RMA → return job → assignment/attempt/proof/custody → quote/charge → COD/refund/settlement references; and
- no supported workflow requires editing or reversing the original delivery history.
