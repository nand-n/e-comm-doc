# 12 — Exceptions and Returns

## Purpose

Detect, record, triage, and resolve delivery problems without losing custody, state, or financial history. Support failed attempts, delays, address/contact/package/COD issues, rider/partner incidents, cancellation, and returns. A return is modeled as a new linked delivery job, not a status rewrite or reverse traversal of the original job.

## Boundaries

**Owns:** exception cases/incidents, reason taxonomy, triage queue, SLA/escalation, resolution actions, failed-attempt records, return authorization, linked return-job creation, custody/handoff records, and operational notes.

**Does not own:** base delivery state-machine persistence, dispatch ranking, proof storage, general notifications, pricing engine, ledger accounting, or refunds. It orchestrates guarded commands in those modules and stores cross-module resolution context.

## Actor flows

### Failed delivery attempt

1. Rider/partner selects a permitted reason (recipient unavailable, bad address, refused, unsafe access, damaged package, payment issue, vehicle incident, other) and supplies required notes/proof.
2. Server validates assignment, current delivery state, proof, location/context, and reason-specific fields.
3. An attempt and exception case are created; delivery becomes `delivery_failed` when the canonical transition applies.
4. Ops triages: retry delivery, correct permitted address/contact details, arrange handoff, create return, cancel where legal, or close as no action.
5. Every action records custody, actor, reason, customer/merchant authorization where required, and financial side effects requested.

### Proactive exception

Rules create a case for dispatch timeout, stale/no movement, ETA/SLA breach, rider offline, partner event gap, maps outage, KYC/suspension, proof failure, or COD discrepancy. Ops may also open a case manually. A signal does not automatically make a terminal delivery state unless its rule explicitly authorizes that transition.

### Return to origin or alternate point

1. Authorized merchant/ops requests a return against the original delivery and states reason, destination, payer, package/custody condition, and service level.
2. System creates a new delivery with `job_type=return`, `parent_delivery_id` set to the original, and pickup/drop-off appropriate to current custody and approved return destination.
3. Return receives its own quote/charge policy, assignment, tracking token, lifecycle, proof, events, and ledger entries.
4. The original may transition to `returned` only when policy conditions are met—normally after linked return completion—not merely when return is requested.
5. Multiple return attempts form an explicit lineage; cycles and duplicate active returns are prohibited.

### Manual override

Authorized ops can force a supported resolution when automation cannot proceed. Hard tenant/security/legal/custody constraints remain non-bypassable. Overrides require reason, note, expected version, and often proof or second approval.

## Data model and constraints

- `ExceptionCase`: delivery, tenant, category/reason, severity, source, state, owner/team, SLA deadlines, summary, opened/closed timestamps.
- `ExceptionSignal`: case, type, source module, observed time, payload reference, deduplication key, confidence.
- `DeliveryAttempt`: delivery/assignment/stop, attempt number, outcome, reason, time, contextual location, proof reference, actor.
- `ExceptionAction`: case, action type, before/after references, actor, reason/note, idempotency key, result.
- `CustodyEvent`: package/delivery, from/to party types and IDs, event type, time, proof/reference; append-only.
- `ReturnAuthorization`: original delivery, requester/approver, reason, payer, approved destination, package condition, expiry, state.
- `Delivery` additions: `job_type` (`outbound`, `return`), nullable `parent_delivery_id`, lineage root ID.
- One open case per configured deduplication class/delivery. Cases may contain many signals.
- At most one active return child for an original/package scope unless an authorized reattempt closes/releases the prior one.
- Parent and child must belong to the same business, currency context where charged, and valid service cities/zones. Cross-city returns require an enabled lane.
- Original delivery events, proof, quote, and ledger entries remain immutable.

## API surface

- `POST /v1/riders/jobs/{id}/attempts` — report unsuccessful attempt with reason/proof.
- `GET /v1/ops/exceptions` and `GET /v1/ops/exceptions/{id}`.
- `POST /v1/ops/exceptions/{id}/assign|acknowledge|resolve|reopen`.
- `POST /v1/ops/deliveries/{id}/exceptions` — manual case.
- `POST /v1/deliveries/{id}/returns` — merchant/ops return request; requires `Idempotency-Key`.
- `GET /v1/deliveries/{id}/returns` and `GET /v1/returns/{id}`.
- Resolution commands for retry dispatch, approved address correction, custody handoff, linked return creation, or cancellation, each with expected version.
- Webhooks: existing `delivery.failed`, `delivery.cancelled`, `delivery.returned`, plus additive `delivery.exception.opened/resolved` and `return.created` where merchants subscribe.

Machine-readable errors include invalid reason/state, missing proof, duplicate active return, return destination unserviceable, custody unknown, and stale version.

## Algorithms and rules

Signal rules deduplicate by delivery, signal type, and time bucket while updating severity/count. Severity and SLA derive from safety, custody, promised-window impact, package/COD value, customer impact, and duration. Safety/fraud signals route to restricted queues.

Resolution policy maps reason/state to allowed actions:

- unavailable recipient: wait/retry, scheduled retry, or return after attempt limit
- bad address: tenant-approved correction before retry; preserve original address
- refusal/damage: capture proof, protect custody, usually return
- unsafe access/incident: stop work, prioritize rider safety, escalate
- COD discrepancy: do not complete delivery; open finance-linked case
- no movement/partner gap: contact provider, reassign before pickup, handoff after pickup

Clearly configurable values:

- signal thresholds for dispatch age, stale location, no movement, ETA/SLA breach, and partner silence
- severity mapping, acknowledgement/resolution SLAs, escalation paths
- maximum attempts, wait duration, retry windows, and customer-contact policy
- reasons requiring proof, supervisor approval, or restricted visibility
- auto-return eligibility, return authorization TTL, destination policy, and payer policy
- cancellation cutoffs/fees and post-pickup restrictions
- custody handoff requirements and dual confirmation
- case deduplication/reopen windows and retention

Automatic action is limited to low-risk, reversible steps such as opening/escalating a case or retrying dispatch before pickup. Delivery terminal transitions, post-pickup custody change, and return creation require explicit policy and audit.

## State transitions

Exception case:

`open -> acknowledged -> investigating -> action_pending -> resolved -> closed`

`resolved|closed -> reopened` when a new related signal arrives within policy. Safety cases may move directly to escalated handling while retaining the base state.

Return authorization:

`requested -> approved | rejected | expired`; `approved -> return_created -> completed | cancelled`.

Return delivery uses the full authoritative lifecycle:

`draft -> quoted -> awaiting_dispatch -> assigned -> rider_arriving_pickup -> picked_up -> in_transit -> delivered`

with its own `cancelled`/`delivery_failed` outcomes. It is identified as a return job, but does not use a shortened reverse status machine.

Original delivery:

- may enter `delivery_failed` from assigned through in-transit per the contract
- `delivery_failed | delivered -> returned` only through authorized ops and preferably when linked return completion is recorded
- never moves backward to `in_transit` for a retry; a retry action creates explicit attempt/resolution events and only uses supported commands
- terminal history is never deleted or overwritten

## UI touchpoints

- Rider job: reason-driven failed-attempt form, required proof, safety-first actions, contact/wait guidance, and confirmation of retained custody.
- Ops exceptions: queue by severity/SLA/city/tenant/source, map/freshness context, assignment/status/proof/custody timeline, action playbooks, owner, notes, and override controls.
- Merchant delivery detail: clear issue/status, allowed retry/return request, linked return tracking, charges subject to policy, and support timeline.
- Admin: reason taxonomy, thresholds, SLAs, return/cancellation policies, restricted queues, and audit.
- Partner portal: normalized exception reasons, required evidence, action requests, and custody acknowledgment.
- Public tracking: customer-safe status text; never expose internal risk, blame, private notes, or exact exception rules.

## Security and privacy

Tenant scope applies to cases and returns. Safety, fraud, KYC, medical, and identity-related notes use restricted fields/roles and must not appear in merchant/public payloads. Free text is minimized, sanitized, and excluded from analytics/logs by default. Return addresses and contacts are shared only with the active assignee. Manual state/custody/financial requests are permissioned and audited. Public tokens for original and return jobs are distinct. Retention/legal hold covers incident evidence and custody records without retaining unrelated location or contact data indefinitely.

## Failures and retries

Signals and actions use stable deduplication/idempotency keys. Case creation, canonical state command, return job creation, outbox events, and ledger requests are coordinated transactionally or through a recoverable saga; reconciliation detects partial completion. Duplicate return requests return the same child job. Notification failure leaves the case/action durable and retryable. If maps/dispatch/partner systems are unavailable, cases remain action-pending with manual fallback. Failed automated resolution never closes the case. Reconciliation jobs detect stuck cases, unknown custody, orphan return authorizations, and original/return state mismatch.

## Metrics and observability

Track cases opened by reason/source/severity/city/fleet, acknowledgement/resolution time and SLA breaches, reopen/escalation rates, failed attempts per delivery, retry success, cancellation/return rates, return cycle time/outcome, custody-unknown duration, manual overrides, partner/owned exception rates, and reconciliation defects. Correlate case, original/return delivery, assignment, attempt, proof, and action IDs. Alert on safety cases, aging high-severity cases, spikes by reason/zone/provider, unknown custody, duplicate-return constraint attempts, and saga/reconciliation backlog.

## Phase boundaries

- **Phase 1:** cancellation under allowed states/reasons, audit events, and manual ops handling.
- **Phase 2:** structured failed attempts, exception queue/signals, retry/reassignment orchestration, proof integration, and linked return jobs.
- **Phase 3:** merchant return requests, signed exception/return webhooks, and integration-safe reason codes.
- **Phase 4:** partner exceptions, multi-stop/city return routing, configurable advanced SLA playbooks, and settlement automation links.

The linked-job model and lineage fields should exist before automated returns so no phase relies on mutating an outbound job into a reverse trip.

## Acceptance criteria

- Every failed attempt records reason, actor, time, assignment, custody outcome, and required proof.
- Signals deduplicate without losing repeated occurrence count or latest severity.
- Invalid/stale resolution commands return `409` and do not partially change state.
- A return creates an idempotent, separately trackable linked job with its own quote, assignment, statuses, proof, and ledger effects.
- Original delivery history and evidence are never rewritten by return creation/completion.
- No more than one active return exists for the same original/package scope unless explicitly resolved and reauthorized.
- Manual overrides remain available to authorized ops, require reason/audit, and cannot bypass hard custody/security constraints.
- Restricted exception details never appear in public tracking or general merchant webhooks.
- Reconciliation identifies and surfaces partial sagas, stuck cases, and unknown custody.
