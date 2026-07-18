# 19 — Scheduling and Multi-stop Routing

**Status:** Product specification  
**Phase:** 4 (with scheduled-window groundwork earlier)

## Scope and boundaries

In scope: scheduled pickup/delivery windows, tenant/city calendars, capacity checks, route drafts, ordered multi-stop manifests, optimization requests, manual adjustment, rider assignment, route execution, stop-level status, ETA refresh, and route-level reconciliation.

Out of scope: guaranteed traffic prediction, unrestricted vehicle-routing research, cross-tenant pooling by default, partner-fleet internals, warehouse picking, and changing the authoritative delivery status machine. A route groups deliveries; each delivery remains independently identifiable, billable, trackable, and evented.

## Actors

- Merchant schedules a delivery or submits stops.
- Dispatcher creates/optimizes/locks routes and handles exceptions.
- Rider executes an assigned route and advances stops.
- Recipient sees only their delivery and relevant ETA.
- Routing provider/engine returns proposed sequences and estimates.
- Platform admin configures city calendars, capacity, constraints, and provider policy.

## Data and contracts

`ServiceWindow` contains timezone, `start_at`, `end_at`, type (`pickup|delivery`), and optional customer preference. Store UTC instants plus authoritative IANA timezone.

`Route` contains tenant/city/depot, service date, status (`draft|optimizing|planned|locked|assigned|active|completed|cancelled`), rider/vehicle, version, metrics, constraint snapshot, and optimization metadata.

`RouteStop` contains route, sequence, type (`pickup|dropoff|depot|break`), linked delivery, address snapshot, service duration, window, load delta, status, ETA/actual times, proof references, and exception reason.

`OptimizationRun` stores input version/hash, engine/version, constraints, state, proposed sequence, objective metrics, warnings, timestamps, and supersession. Optimization output is a proposal until explicitly applied.

Constraints include vehicle capacity, package weight/volume, COD/cash policy, skills, stop windows, shift/break limits, service zones, pickup-before-dropoff precedence, route duration, and locked stops.

## Endpoints and events

- `GET /v1/service-windows?branch_id=...&date=...`
- Scheduled fields on `POST /v1/quotes` and `POST /v1/deliveries`
- `POST /v1/routes` with `Idempotency-Key`
- `GET/PATCH /v1/routes/{route_id}`
- `POST /v1/routes/{route_id}/stops`
- `POST /v1/routes/{route_id}/optimize` with `Idempotency-Key`
- `POST /v1/routes/{route_id}/apply-plan`
- `POST /v1/routes/{route_id}/lock`
- `POST /v1/routes/{route_id}/assign`
- `POST /v1/routes/{route_id}/start`
- `POST /v1/routes/{route_id}/stops/{stop_id}/status`
- `POST /v1/routes/{route_id}/complete`

Events include `delivery.scheduled`, `route.created`, `route.optimization_completed|failed`, `route.planned`, `route.assigned`, `route.started`, `route.stop.arriving|completed|failed`, `route.replanned`, and `route.completed`.

## Security

- Merchant credentials may create/read only their tenant's routes; operations scopes and RBAC control planning, lock, assignment, and execution.
- Rider access is limited to currently assigned route/stops, with recipient data revealed only when operationally needed.
- Public tracking tokens expose one delivery, never the full route, other stops, rider schedule, or optimization constraints.
- Treat route/provider payloads as sensitive location data. Minimize, encrypt, retain briefly, and contractually restrict routing providers.
- Every manual sequence edit, optimization application, reassignment, and override is audited with actor and prior/new version.

## Validation

- Windows require valid timezone, future policy, `start < end`, minimum/maximum width, business calendar, serviceability, and capacity.
- Route stops must share permitted tenant/city/date, have valid addresses, and obey pickup-before-dropoff and load constraints.
- Optimizing requires a stable route version and sufficient geocoding. Stale output cannot apply after stops/constraints change.
- Lock validates all hard constraints. Assignment validates rider availability, vehicle capability, shift, city, and conflicts.
- Stop completion follows delivery state rules; proof/COD requirements are enforced at the corresponding stop.
- Manual changes that violate soft constraints warn; hard-constraint overrides require explicit permission and reason or are rejected.

## Error semantics

- `409 capacity_unavailable`, `route_version_conflict`, `route_locked`, `rider_schedule_conflict`, or invalid lifecycle transition.
- `422 window_unserviceable`, `constraint_unsatisfied`, `address_unroutable`, or `optimization_infeasible` with structured constraint details.
- Optimization timeout/provider outage leaves the route draft unchanged and may return/record `optimization_failed`; manual planning remains available.
- Stop failure affects its linked delivery according to the status machine but does not automatically fail unrelated stops or the route.
- Responses include current route version so clients can recover from optimistic-concurrency conflicts.

## Retry and idempotency

- Route creation, optimization request, plan application, assignment, and stop mutations require or support documented idempotency keys.
- Optimization deduplicates on route version plus normalized constraints. Same request returns the same run; changed version creates a new run.
- External engine calls use bounded timeout/retry and provider request IDs. Retrying cannot apply a plan automatically.
- Mobile stop actions queue offline with unique action IDs and reconcile against current state; duplicates replay, conflicts require rider guidance.
- Replanning creates a new route version, preserves completed/locked stops, emits an event, and never rewrites historical ETAs/actions.

## UI and admin touchpoints

- Merchant delivery form offers available windows in branch/city timezone and shows fee/capacity implications.
- `/ops/routes` provides date/city board, map/list builder, unplanned deliveries, drag reorder, constraint warnings, optimize/compare/apply, lock, assign, and replan.
- Rider route view shows ordered actionable stops, navigation deep links, load/COD/proof requirements, offline actions, and progress.
- Delivery detail shows scheduled window, route assignment, ETA history, and route exceptions without exposing other tenants/recipients.
- `/admin` configures calendars, blackout dates, capacity, routing provider, vehicle/constraint defaults, and optimization health.

## Observability

- Metrics: scheduled demand/capacity, window rejection, unplanned deliveries, optimization queue/latency/success, infeasible reasons, route distance/duration, on-time rate, stop service time, replans, and provider cost.
- Correlate route/version, optimization run, delivery/stop, rider, provider request, domain event, and API request ID with location redaction.
- Alert on unplanned work near cutoff, optimization/provider degradation, route-start delay, missed windows, stale ETAs, excessive replans, and mobile sync conflicts.
- Compare planned versus actual metrics to improve defaults without silently changing committed customer promises.

## Phased delivery

1. **Scheduling groundwork:** timezone-safe windows on quote/delivery, calendars, validation, capacity placeholders, and tracking display.
2. **Manual routes:** route/stop model, dispatcher builder, lock/assign, rider ordered stops, and stop events.
3. **Optimization:** pluggable engine adapter, versioned runs, constraints, compare/apply, ETA refresh, and provider fallback.
4. **Scale:** multi-depot/city, richer vehicle skills/capacity, dynamic replanning, partner handoff, and measured optimization improvements.

## Acceptance criteria

- Scheduled promises are stored as UTC plus IANA timezone and display correctly across timezone/DST boundaries.
- Capacity and serviceability are checked before confirmation; unavailable windows return a machine-readable alternative path.
- A delivery belongs to at most one active route plan and remains independently accessible by ID and `external_order_id`.
- Optimization cannot violate hard constraints or overwrite a newer route version; applying a plan is explicit and audited.
- Duplicate/offline route actions do not duplicate transitions, proof, or COD records.
- Public tracking reveals only the recipient's delivery and an appropriate ETA, never route membership or other stops.
- Dispatchers can complete a route manually during routing-provider failure, and planned-versus-actual performance is observable.
