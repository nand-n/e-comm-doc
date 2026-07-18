# 07 — Dispatch and Assignment

## Purpose

Move confirmed deliveries from `awaiting_dispatch` to a capable owned rider or partner fleet while preserving operator control. Dispatch balances serviceability, readiness, proximity, workload, promised windows, cost, and fairness, and always supports an audited manual override.

## Boundaries

**Owns:** dispatch eligibility, candidate discovery, scoring, offers, assignment/reassignment, reservations, dispatch timeouts, manual assignment, and assignment history.

**Does not own:** rider KYC records, partner onboarding, price quotes, route optimization for multi-stop work, rider location collection, proof capture, or delivery status rules after assignment. It consumes readiness, location, ETA, capacity, and partner capability from those modules.

## Actor flows

### Automatic owned-fleet dispatch

1. A confirmed job enters `awaiting_dispatch` and emits a dispatch request.
2. Candidate search filters online, active, KYC-approved riders with suitable vehicle/package capacity and city/zone access.
3. Eligible riders are scored from route ETA, active workload, promised window, idle time/fairness, and configured operating cost.
4. The engine offers to one rider or a bounded batch.
5. Acceptance atomically creates the active assignment and transitions the delivery to `assigned`; rejection/timeout records an attempt and proceeds to the next strategy.

### Partner fallback

If owned candidates are unavailable or the hybrid fleet policy prefers a partner, eligible partner fleets receive an offer or API request. A partner acceptance reserves the job to that fleet; its internal rider may be bound immediately or later within a deadline.

### Dispatcher override

An ops dispatcher may assign, reassign, cancel an offer, or select owned versus partner capacity. The UI shows eligibility warnings. Hard safety/compliance constraints cannot be overridden; soft constraints require a reason. Every override records actor, before/after assignment, reason, and timestamp.

### Reassignment

Before pickup, rider rejection, no movement, breakdown, or operator action may reopen dispatch. The prior assignment is closed with a reason. After pickup, reassignment is an explicit handoff/exception flow and cannot silently replace custody.

## Data model and constraints

- `DispatchRequest`: delivery, trigger, strategy version, priority, earliest/latest dispatch times, state, attempt count.
- `DispatchCandidate`: request, provider type (`owned_rider`, `partner_fleet`), provider ID, eligibility result, score components, rank, route estimate, exclusion reasons.
- `DispatchOffer`: candidate, offered/expiry/responded timestamps, status, response reason, unique offer token.
- `DeliveryAssignment`: delivery, assignee type/ID, optional rider ID, status (`reserved`, `active`, `released`, `completed`), accepted time, effective interval, source (`automatic`, `manual`, `partner`), actor/reason.
- A delivery has at most one `reserved` or `active` assignment. Enforce with a database constraint/transactional lock.
- Assignment history is append-only; reassignment closes the current record and creates another.
- Candidates must match delivery city/zone/product, package limits, vehicle capabilities, and required compliance.
- KYC approval is a hard prerequisite for owned riders. Partner rider compliance is attested by the partner contract and can be independently enforced when identities are shared.
- Dispatch actions carry a delivery version to prevent stale operator or worker decisions.

## API surface

Existing `POST /v1/ops/deliveries/{deliveryId}/assign` remains the manual owned-rider path and expands to accept assignee type, assignee ID, expected delivery version, and reason.

Additional surfaces:

- `POST /v1/ops/deliveries/{id}/dispatch` — enqueue/retry automatic dispatch.
- `GET /v1/ops/deliveries/{id}/candidates` — ranked candidates and exclusion reasons.
- `POST /v1/ops/deliveries/{id}/reassign` — close current assignment and choose/reopen dispatch.
- `POST /v1/riders/offers/{offerId}/accept|decline`.
- Partner offer/accept/decline endpoints or signed partner webhooks.
- `GET /v1/ops/dispatch-board` — unassigned, offered, assigned, and breached jobs.

Conflicts return `409` for stale version, already assigned, expired offer, or invalid delivery state. Eligibility errors use `422`; no candidates is a valid dispatch outcome, not a server error.

## Algorithms and rules

Candidate eligibility is evaluated before scoring. Example score:

`score = eta_weight * pickup_eta + load_weight * active_load + cost_weight * expected_cost - idle_weight * idle_duration + risk_penalties`

Lower score wins. Score components and exclusions are persisted for explanation. Stable ID tie-breaking makes repeated evaluation deterministic for the same snapshot.

Clearly configurable values:

- dispatch mode by city/product (`manual`, `automatic`, `hybrid`)
- owned-versus-partner preference and fallback order
- candidate search radius and maximum pickup ETA
- offer batch size, offer TTL, maximum rounds, and retry delay
- score weights, load limits, fairness window, and risk penalties
- scheduled release lead time and SLA breach thresholds
- no-movement/reassignment timeout
- partner response and internal-rider binding deadlines
- priority classes and emergency escalation rules

Multi-city jobs are dispatched only to riders/partners explicitly enabled for both the origin city and the inter-city product. Zone containment and route estimates come from canonical zone services and the maps provider adapter. Maps provider identities are not used as assignment IDs.

## State transitions

Dispatch request: `pending -> searching -> offering -> assigned | exhausted | cancelled`, with `exhausted -> pending` on retry/escalation.

Offer: `created -> sent -> accepted | declined | expired | withdrawn`.

Assignment: `reserved -> active -> completed | released`; `reserved -> released` on failed binding.

Delivery transitions:

- `awaiting_dispatch -> assigned` only after an assignment is atomically active.
- `assigned -> awaiting_dispatch` may occur only before pickup through a recorded release/reassignment command.
- Normal rider progression remains `assigned -> rider_arriving_pickup -> picked_up`.
- Cancellation withdraws outstanding offers and releases reservations.
- After `picked_up`, custody changes use an exception/handoff event rather than reopening ordinary dispatch.

## UI touchpoints

- Ops live board: queue age, priority, assignment state, promised window, owned/partner badge, and SLA indicators.
- Assign/reassign modal: ranked eligible candidates, distance/ETA, load, availability, KYC/compliance status, exclusions, and override reason.
- Live map: candidate and active rider positions with location freshness.
- Rider app: time-limited offer, accept/decline reason, assigned job details.
- Partner portal: incoming offers, response deadline, capability summary, and internal assignment status.
- Delivery detail: complete assignment timeline and manual action audit.

## Security and privacy

Only `ops_dispatcher`/authorized admins can view cross-tenant dispatch data or override assignments. Business dispatchers may see and assign only where explicitly allowed for their tenant. Riders see delivery details only for active offers/assignments and only the minimum contact data needed at that stage. Offer tokens are short-lived, single-use, and bound to rider/partner identity. Location and candidate data are not exposed to merchants or other riders. All manual actions are audited.

## Failures and retries

Dispatch is asynchronous through an outbox/queue. Consumers lock/version the delivery and are idempotent by request/offer ID. Worker retries use exponential backoff with jitter; duplicate messages cannot create duplicate active assignments. Maps/ETA failure may use fresh cached estimates or a configured non-location strategy; it must reduce confidence in the UI. Partner timeout withdraws the offer before fallback. Notification failure does not equal offer rejection; expiry controls progress. A dead-lettered dispatch request appears as an ops alert with a safe manual action.

## Metrics and observability

Track time-to-first-offer, time-to-assignment, unassigned queue age, candidate count/exclusion reasons, accept/decline/timeout rates, rounds per assignment, reassignment rate/reasons, manual override rate, owned/partner split, partner response latency, SLA breaches, and stale-location use. Logs/traces correlate `delivery_id`, `dispatch_request_id`, offer/assignment IDs, strategy version, city/zone, and actor. Alert on queue age, exhausted dispatches, duplicate-assignment constraint failures, partner degradation, and unusual override volume.

## Phase boundaries

- **Phase 1:** manual owned-rider assignment, availability filter, assignment history, conflict protection, and audit.
- **Phase 2:** automatic owned-rider offers, live location/ETA scoring, timeouts, reassignment, and full ops board.
- **Phase 3:** merchant integrations receive assignment webhooks; no new dispatch authority.
- **Phase 4:** partner fleet offers, configurable hybrid strategy, scheduled/multi-stop release, multi-city capability, and advanced balancing.

Interfaces should model assignee type from Phase 1 so partner support does not require replacing assignment history.

## Acceptance criteria

- Exactly one active/reserved assignment can exist per delivery under concurrent automatic and manual actions.
- Only `awaiting_dispatch` deliveries can receive a normal first assignment.
- Offline, inactive, KYC-unapproved, incompatible, or out-of-scope riders are excluded with an explainable reason.
- Rider/partner offer acceptance after expiry or assignment elsewhere returns `409` and changes nothing.
- Manual override is always available to authorized ops for soft constraints and always records a reason and audit event.
- Reassignment before pickup closes the previous assignment; after pickup it requires the exception/handoff flow.
- Hybrid policy can prefer owned riders and fall back to partners independently per city/product.
- Retried queue messages and API requests do not duplicate offers or assignments.
