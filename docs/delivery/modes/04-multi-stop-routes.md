# Mode 04 — Multi-stop Routes

**Status:** Implementation-ready product specification  
**Phase:** 4, built on scheduling and routing groundwork  
**Mode identifier:** `multi_stop`

## 1. Domain definition and boundaries

A multi-stop route is one executable, versioned plan that groups one or more independently owned deliveries into an ordered manifest for one vehicle/capacity provider. A delivery may contribute a pickup stop, a drop-off stop, or both. Depot, transfer, break, and operational stops may exist without a delivery.

The route is an execution coordinator, not a replacement delivery:

- Every delivery keeps its own `delivery_id`, `external_order_id`, tenant, quote, status machine, tracking token, proofs, webhook stream, COD records, ledger entries, cancellation rules, and return links.
- Route and stop state describe planning and physical execution. They never mark unrelated deliveries complete or collapse multiple delivery charges into one accounting object.
- A delivery may belong to at most one non-terminal route plan at a time. Cross-tenant route pooling is out of scope unless a later approved product explicitly introduces a platform-owned pooled route with strict data partitioning.
- Ordinary multi-stop routes are single-city. Cross-city routes use the geographic capability in [Mode 05 — Multi-city](./05-multi-city.md), including lanes, legs, hubs, and custody controls.

This mode owns route drafts, stop/action modeling, constraint snapshots, optimization runs, plan application, lock/start/replan/complete commands, route assignment coordination, and route/stop projections.

It does not own delivery lifecycle authority, service-zone geometry, pricing rules, rider/partner records, raw location collection, proof binaries, COD ledger balances, settlement, or merchant order state. Those remain with the modules defined in [Architecture](../architecture.md).

## 2. Actors and permissions

| Actor | Allowed actions |
|---|---|
| Merchant owner/admin/dispatcher | Create and read own-business routes, add eligible own deliveries, request optimization, accept a quote, and cancel where policy permits |
| Merchant viewer/finance | Read route summaries or route-linked financial views only within the business; no execution mutation |
| `ops_dispatcher` | Plan, manually sequence, lock, assign, start, replan, resolve exceptions, and override soft constraints across authorized scope |
| Platform admin | Configure calendars, route products, hard limits, providers, and city defaults; not routine execution |
| Assigned owned rider | Read assigned manifest and minimum stop data; execute only currently permitted stop actions |
| Assigned partner fleet | Accept route/handoff, bind capacity, and publish normalized stop/status/proof/location events |
| Recipient/public visitor | Read only the linked delivery through its tracking token; never route membership or other stops |
| Routing/maps provider | Receive minimized coordinates, windows, load dimensions, and constraints; no merchant contacts, COD details, or notes unless strictly required |

Route assignment and lifecycle commands are server-authorized. UI visibility is not authority.

## 3. End-to-end flow

1. The merchant creates normal deliveries or submits a route request containing delivery actions. Each delivery is quoted and confirmed independently into `awaiting_dispatch`.
2. The platform resolves city/zone, service calendar, package/load, windows, COD, skills, and route eligibility. Invalid deliveries remain independent and return structured errors.
3. A route draft is created idempotently. Stops and package action links are added with expected route version.
4. Capacity checks test city/date route capacity and required vehicle class. A capacity check is not an assignment reservation unless a named reservation is returned.
5. Pricing returns per-delivery quotes and, if configured, an informational route aggregate. The accepted commercial basis remains attached to each delivery.
6. Ops manually sequences stops or requests optimization. The optimizer stores a proposal against an immutable input version/hash.
7. An authorized actor explicitly applies a feasible plan. Locking revalidates hard constraints, serviceability, calendars, delivery versions, and capacity assumptions.
8. Dispatch selects an owned rider or route-capable partner. One route assignment coordinates assignment records on all included deliveries; activation is transactional or compensating and reconciliation-safe.
9. The rider starts the route, sees only the current and next operationally necessary stop details, and records arrival, action proof, custody/load changes, and departure.
10. Stop commands invoke guarded delivery commands. Each delivery independently advances through pickup and drop-off states and emits its normal events.
11. Live tracking calculates route-aware ETAs but publishes a recipient-safe ETA only for that delivery.
12. Failure, cancellation, urgent insertion, traffic, or capacity loss creates a new route version. Completed actions remain immutable.
13. The route completes only when every required stop is terminal or explicitly removed/resolved and every linked delivery is in a reconciled state.

## 4. Data model

### 4.1 `routes`

| Field | Constraints |
|---|---|
| `id` | Opaque UUID |
| `business_id` | Required tenant boundary |
| `city_id`, `depot_id` | Required city; depot optional |
| `service_date`, `timezone` | Required local operating date and IANA timezone |
| `status` | `draft`, `optimizing`, `planned`, `locked`, `assigned`, `active`, `completed`, `cancelled`, `failed` |
| `plan_version`, `aggregate_version` | Positive monotonic integers; plan changes and command concurrency are separately visible |
| `assignment_id` | Nullable route assignment |
| `constraint_snapshot` | Immutable versioned input used by the applied plan |
| `planned_distance_meters`, `planned_duration_seconds` | Nullable until planned |
| `actual_distance_meters`, `actual_duration_seconds` | Derived, nullable |
| `optimization_run_id`, `plan_source` | Nullable; source is `manual`, `optimized`, or `hybrid` |
| `locked_at`, `started_at`, `completed_at`, `cancelled_at` | State-dependent |
| `created_by`, `updated_by`, `created_at`, `updated_at` | Required audit metadata |

### 4.2 `route_stops`

| Field | Constraints |
|---|---|
| `id`, `route_id`, `business_id` | Same tenant; immutable identity |
| `sequence` | Unique positive integer within applied route version |
| `stop_type` | `pickup`, `dropoff`, `depot_start`, `depot_end`, `transfer`, `break` |
| `delivery_id` | Required for pickup/drop-off; absent for non-delivery stops |
| `address_snapshot`, `city_id`, `zone_id`, `zone_version` | Immutable execution snapshot |
| `window_start`, `window_end`, `timezone` | Optional valid window; UTC plus IANA timezone |
| `service_duration_seconds` | Non-negative |
| `status` | `pending`, `approaching`, `arrived`, `in_service`, `completed`, `failed`, `skipped`, `cancelled` |
| `planned_arrival_at`, `eta_at`, `actual_arrival_at`, `actual_departure_at` | Nullable and versioned where derived |
| `load_delta` | Signed weight/volume/package count by action |
| `cod_action` | `none`, `collect`, `remit`; amount/currency reference is delivery-owned |
| `proof_requirement_snapshot` | Required versioned requirements |
| `failure_reason`, `resolution` | Required for failed/skipped exceptions |
| `version` | Optimistic concurrency |

A delivery may have one pickup and one drop-off on the route. More complex split pickup/drop-off requires explicit package-action modeling and may not duplicate the delivery lifecycle transition.

### 4.3 `route_stop_package_actions`

Links a stop to a delivery package with `action` (`load`, `unload`, `verify`, `transfer_in`, `transfer_out`), quantity, weight/volume delta, custody-from/to, and immutable operation ID. This table is the basis for load and custody reconciliation.

### 4.4 `optimization_runs`

Stores route/version, normalized input hash, engine and algorithm version, provider request ID, state, objective weights, hard/soft constraints, proposed sequence, infeasible reasons, warnings, metrics, timestamps, and superseded-by reference. Provider output is never authoritative until applied.

### 4.5 `route_assignments` and `route_plan_memberships`

`RouteAssignment` records route, assignee type (`owned_rider`, `partner_fleet`), rider/partner/vehicle, state, effective interval, source, actor, and reason. `RoutePlanMembership` records delivery, route, plan version, active interval, and removal reason. A partial unique constraint enforces one active membership per delivery and one reserved/active assignment per route.

## 5. State machines

### 5.1 Delivery

The authoritative path remains:

`draft → quoted → awaiting_dispatch → assigned → rider_arriving_pickup → picked_up → in_transit → delivered`

The delivery reaches `picked_up` only after its pickup action passes proof/custody checks, and reaches `delivered` only after its drop-off action passes proof/COD checks. Other deliveries on the route do not affect that transition.

### 5.2 Route

```text
draft → optimizing → draft | planned
draft → planned
planned → locked → assigned → active → completed
planned | locked | assigned | active → planned        (replan)
draft | planned | locked | assigned → cancelled
active → completed | failed
```

- Optimization failure returns to `draft` and preserves the failed run.
- Replan from `active` freezes completed actions and increments `plan_version`.
- `cancelled` is allowed only when no unresolved physical custody remains.
- `failed` requires an ops resolution for all onboard packages and linked deliveries.

### 5.3 Stop

`pending → approaching → arrived → in_service → completed`

Exceptions: `pending|approaching|arrived|in_service → failed`; `pending → skipped|cancelled`. A failed stop can be rescheduled into a new stop/version, but its original record remains failed. Repeated status submissions replay by operation ID and never append duplicate proof or delivery events.

### 5.4 Cross-city leg

Ordinary routes have no cross-city leg. When combined with multi-city, each segment follows the leg machine in [Mode 05](./05-multi-city.md): `planned → capacity_reserved → tendered → accepted → ready → in_transit → arrived → custody_transferred → completed`, with documented exception states. Route start/complete cannot bypass leg or hub custody requirements.

## 6. Constraints and validation

Hard constraints must never be violated by optimization or ordinary manual edits:

- Pickup precedes the related drop-off; a package cannot be unloaded before a recorded load/custody action.
- Simulated load after every stop remains between zero and vehicle limits for weight, volume, package count, special handling, and configured COD cash exposure.
- Stop and delivery windows, city calendar, shift, mandatory breaks, service durations, maximum route duration/distance/stops, and depot rules are valid.
- Delivery, route, rider, vehicle, city, zone, product, package, skills, and partner capabilities are compatible.
- COD collection is linked to exactly one delivery/stop and cannot be aggregated into another delivery's finance record.
- Completed, in-service, and custody-critical stops are locked during replan.
- A cancelled delivery contributes no future actions, but an already loaded package requires return/transfer resolution.

Soft constraints—distance, lateness risk, fairness, preferred sequence, balanced workload, and customer preference—may warn and be overridden by authorized ops with a reason.

All thresholds, including maximum stops, route duration/distance, window width, service time defaults, load dimensions, COD exposure, break rules, insertion cutoff, optimization objective weights, and allowed hard-constraint override classes, are **Configurable**. Configuration must be versioned and shown in the route constraint snapshot.

## 7. Quote, pricing, and capacity

- Quote input includes every delivery's addresses/packages/windows/COD plus route product and whether merchant order is fixed or optimizable.
- Route metrics come from a routing adapter. Straight-line fallback, if enabled, is labeled provisional and cannot silently become the accepted production price.
- Each delivery receives an immutable quote and price breakdown. Shared route cost allocation may use configured stop, distance, weight, zone, or minimum-charge rules, but allocations must sum exactly to the route-level basis and remain reproducible.
- Explicit lines may include base delivery, incremental stop, route distance/time, weight/volume, scheduled window, COD, optimization, zone, surge, tax, and discount.
- Capacity is checked at quote, confirmation, lock, and assignment. Only a durable `CapacityReservation` with expiry reserves supply.
- Quote expiry, route changes, changed packages/windows, city/zone deactivation, or material provider-metric changes require revalidation/requote under the configured honor policy.
- Missing route pricing or capacity policy means unavailable, never zero-priced or unlimited.

Price amounts, allocation method, reservation TTL, overbooking, capacity buckets, and reprice tolerance are **Configurable**.

## 8. Assignment and partner handoff

Dispatch filters route-capable riders/vehicles by city, shift, capacity profile, skills, route duration, location, active workload, and COD exposure. Assignment activates the route assignment and delivery assignments consistently; a failed partial activation is reconciled before execution.

For partners:

1. Tender a versioned route manifest with minimized stop data, constraint summary, deadline, and stable handoff ID.
2. Partner accepts idempotently and binds suitable rider/vehicle within the deadline.
3. The platform validates partner city/zone/product/capacity/COD/proof/location capabilities.
4. Partner events are authenticated, deduplicated, mapped to stop and delivery commands, and rejected if they skip platform guards.
5. Partner rejection/timeout releases the reservation before fallback.
6. After any pickup, changing provider requires an explicit physical custody handoff with both-party proof; ordinary reassignment is forbidden.

## 9. Optimization, manual planning, and fallback

The engine minimizes a versioned weighted objective subject to hard constraints. Inputs include coordinates, matrix metrics, windows, service times, precedence pairs, load deltas, vehicle/shift, locked stops, breaks, and route start/end.

Optimization is asynchronous and side-effect free. `apply-plan` requires the same route/input version used by the run. A stale, timed-out, infeasible, or provider-failed run leaves the route unchanged.

Manual fallback must always support:

- map/list sequencing with immediate constraint simulation;
- inserting/removing unexecuted stops;
- locking completed/committed stops;
- route splitting into independently assignable drafts;
- selecting a fresh cached matrix or explicitly low-confidence estimates;
- paper/exported manifest plus later idempotent event reconciliation during extended outage.

Every manual edit increments the version and records actor, reason, before/after order, warnings, and overridden soft constraints.

## 10. Tracking, webhooks, proof, and finance

Each delivery retains an independent tracking projection. Public and merchant tracking may show that delivery's next relevant ETA and status, but never total stop count, sequence, other addresses, other recipients, route map, load, or rider future itinerary.

Stop events invoke existing approved delivery webhooks only when the linked delivery changes state: `delivery.assigned`, `delivery.picked_up`, `delivery.in_transit`, `delivery.delivered`, `delivery.failed`, `delivery.cancelled`, and `delivery.returned`. Route events are internal unless the public webhook contract is explicitly expanded. Payloads include aggregate version and event ID for ordering/deduplication.

Proof is delivery/action scoped. One photo, OTP, signature, or scan cannot satisfy another delivery unless the proof policy explicitly creates separately linked immutable evidence records.

Finance posts per delivery:

- accepted fee and later adjustment;
- COD collected/custody/payable entries;
- rider/partner earnings allocation;
- cancellation, replan, return, or failed-attempt adjustments.

Route totals are derived reconciliation views. They never replace balanced per-delivery ledger references.

## 11. APIs and events

Public/merchant and ops APIs:

- `POST /v1/routes` — idempotent draft creation.
- `GET /v1/routes/{route_id}` — tenant/ops-scoped detail and current version.
- `PATCH /v1/routes/{route_id}` — editable draft metadata with `expectedVersion`.
- `POST /v1/routes/{route_id}/stops` and `DELETE /v1/routes/{route_id}/stops/{stop_id}`.
- `POST /v1/routes/{route_id}/optimize` — idempotent run request.
- `GET /v1/routes/{route_id}/optimization-runs/{run_id}`.
- `POST /v1/routes/{route_id}/apply-plan`, `/lock`, `/assign`, `/start`, `/replan`, `/complete`, `/cancel`.
- `POST /v1/routes/{route_id}/stops/{stop_id}/status` — requires operation ID and expected versions.
- `GET /v1/riders/me/routes/{route_id}` — assigned manifest projection.

Internal events:

`route.created`, `route.optimization_requested`, `route.optimization_completed`, `route.optimization_failed`, `route.planned`, `route.locked`, `route.assigned`, `route.started`, `route.stop.arriving`, `route.stop.completed`, `route.stop.failed`, `route.replanned`, `route.completed`, `route.cancelled`, `route.failed`.

Every event carries `event_id`, `business_id`, route ID/version, related delivery/stop when applicable, occurred time, actor, trace ID, and schema version. Events omit unnecessary contact/location data.

## 12. UI requirements

- Merchant route builder: choose eligible deliveries, fixed/optimizable order, windows, quote breakdown, capacity status, validation errors, and confirmation.
- Ops route board: date/city/depot filters, unplanned work, map/list builder, load/time-window timeline, optimization compare/apply, warnings, lock/assign/start/replan controls, and provider health.
- Rider route view: ordered current/next stops, navigation, service window, package/load/COD/proof requirements, offline queue, and explicit failed-stop choices.
- Partner portal: tender deadline, route summary, capacity acceptance, rider/vehicle binding, execution and event health.
- Delivery detail: its route membership, own stops, own ETA/proof/finance, and exceptions without unrelated stop data.
- Admin: route products, calendars, capacities, constraints, providers, fallback policy, and optimization diagnostics.

## 13. Cancellation, failure, replan, and return

- Before pickup, cancellation removes only the delivery's pending actions and creates a new plan version. Applicable fee adjustments remain delivery-specific.
- After pickup, cancellation cannot discard the stop. The package must be delivered, held, transferred, or moved through a linked return job with continuous custody.
- Stop failure records reason/evidence and follows configured `continue`, `pause_route`, or `return_to_depot` policy. It never fails later deliveries implicitly.
- Vehicle/rider failure freezes completed history, records onboard inventory/COD, and replans remaining actions to eligible capacity. Physical handoff proof is required before another rider continues.
- Missed windows create an at-risk/failed attempt decision; the system must not fabricate arrival or completion.
- Return movement is preferably a linked independently quoted delivery. Route insertion follows normal validation and does not rewind the original timeline.
- Route completion reconciliation reports unresolved stops, onboard packages, unmatched custody actions, delivery/stop state mismatches, missing COD/proof, and active assignments.

## 14. Security, privacy, idempotency, and concurrency

- All route records and queries are tenant-scoped. Ops cross-tenant access is explicit and audited.
- Rider/partner projections reveal contact and instructions just in time; future recipient data and full manifests are minimized.
- Routing-provider payloads use pseudonymous IDs and minimum coordinates/windows. Provider retention and training use are contractually restricted.
- Public tokens never disclose route membership. Precise route/location and COD/load data are sensitive, encrypted, access-controlled, and retention-limited.
- Create, optimize, apply, assign, stop mutation, replan, complete, and cancel commands use idempotency keys or stable operation IDs. Same key/body replays; changed body returns `409`.
- Commands compare route, plan, stop, and delivery versions. Database constraints protect active membership/assignment. Locks are bounded and consistently ordered to avoid deadlocks.
- Offline rider actions retain operation ID, client time, sequence, proof references, and expected version. Server time/state remains authoritative; conflicts require guided recovery.
- Outbox publication and consumers are at-least-once and deduplicated by event ID. No external provider call is inside the authoritative state transaction.

## 15. Observability and audit

Metrics include draft/locked/active routes, unplanned deliveries, optimization latency/success/infeasible reasons, manual-edit rate, distance/duration/load utilization, late stops, stop service time, replans, failed stops, route completion gaps, capacity rejection, partner acceptance, ETA error, offline conflicts, and provider cost.

Logs/traces correlate business, route/version, stop, delivery/version, assignment, optimization/provider request, operation/event, and trace IDs while redacting addresses, contacts, raw coordinates, proof, and COD values.

Alert on work unplanned near cutoff, active route without fresh location, route-start delay, repeated replans, optimizer/circuit failure, impossible load/custody projection, unresolved failed route, duplicate-assignment constraint failures, and delivery/stop/finance reconciliation lag.

Audit route creation, stop changes, optimization application, constraint override, lock/unlock, assignment/reassignment, start, stop exception, custody handoff, replan, cancel/fail/complete, and sensitive manifest access.

## 16. Phased implementation

1. **Scheduling groundwork:** timezone-safe windows, city calendars, route eligibility fields, capacity placeholders, and delivery-safe tracking.
2. **Manual routes:** route/stop/package-action schema, builder, hard-constraint validator, owned-rider assignment, execution, per-delivery transitions, offline idempotency, and reconciliation.
3. **Optimization:** provider adapter, matrix cache, versioned asynchronous runs, compare/apply, ETA refresh, manual fallback, and plan-performance metrics.
4. **Scale:** partner route tenders, dynamic replan, richer capacity/skills, multi-depot, and combination with multi-city lanes/hubs.

## 17. Acceptance and test cases

1. Two deliveries sharing a route progress, track, webhook, prove, and post finance independently.
2. The validator rejects drop-off-before-pickup and any sequence whose simulated load is negative or exceeds capacity.
3. Concurrent route assignment and manual assignment produce exactly one active route/vehicle and one consistent assignment per delivery.
4. A stale optimization result cannot apply after any stop, constraint, or route-version change.
5. Provider outage leaves the draft intact and ops can manually plan, lock, execute, and reconcile the route.
6. Cancelling one unpicked delivery removes only its actions; other deliveries and historical versions remain unchanged.
7. Cancelling/failing after pickup requires custody resolution or a linked return and never loses package ownership.
8. Duplicate online/offline stop actions create one stop transition, one delivery transition, one proof link, and one COD posting.
9. A failed stop does not complete/fail later deliveries; continue/pause behavior follows the recorded configurable policy.
10. Replan preserves completed stops and historical ETAs/actions, increments the plan version, and requires rider acknowledgement.
11. Partner duplicate/out-of-order events cannot regress a stop or delivery and cannot bypass proof/COD requirements.
12. Public tracking for one delivery reveals no route membership, other stop, recipient, load, COD, or future itinerary.
13. DST and city-calendar tests preserve UTC instants and local display; blackout/closed periods are rejected.
14. Quote allocation sums exactly, remains reproducible from snapshots, and posts one immutable charge basis per delivery.
15. Route completion is rejected while any required stop, onboard package, custody transfer, proof, COD, assignment, or delivery reconciliation is unresolved.
16. Tenant and role tests deny cross-business route access, stale rider access, unauthorized overrides, and raw provider-payload access.
