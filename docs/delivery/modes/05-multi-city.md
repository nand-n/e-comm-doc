# Mode 05 — Multi-city

**Status:** Implementation-ready product specification  
**Phase:** 4  
**Capability identifier:** `multi_city`

## 1. Domain definition and composition

Multi-city is a geographic execution capability for moving a delivery between two or more configured cities over explicitly enabled origin-destination lanes. It is not a mutually exclusive fulfillment mode.

It can combine with **on-demand**, **scheduled**, **bulk**, **multi-stop/routes**, and **returns**. The delivery retains its normal mode and adds `geography_capability = multi_city` plus an immutable itinerary/quote snapshot. Implementations must not introduce a separate multi-city delivery lifecycle.

A multi-city itinerary contains origin-city first mile, zero or more hub custody operations, one or more cross-city legs, destination-city last mile, and optional intermediate transfer cities. Each delivery remains independently identifiable, trackable, webhook-enabled, billable, COD-accounted, cancellable, and returnable. Lane, leg, manifest, hub, and route states coordinate execution but cannot override the authoritative delivery lifecycle.

## 2. Boundaries

This capability owns directed lane definitions and versions, lane/city/hub calendars, itinerary planning, cross-city legs, capacity reservations, manifests, transfer-hub operations, custody transfers, partner tender coordination, and cross-city projections/reconciliation.

It consumes city/zone serviceability, route metrics, pricing, delivery lifecycle, dispatch/fleet eligibility, location/ETA, proof, COD, ledger, and settlement through their owning modules.

It does not own city geometry, merchant orders, carrier status authority, partner payroll, proof binaries, ledger balances, or unrestricted national/international freight. Customs, dangerous goods, aviation, cross-border tax, and regulated freight are out of scope unless separately approved.

## 3. Actors and permissions

| Actor | Allowed actions |
|---|---|
| Merchant owner/admin/dispatcher | Quote/create/read own multi-city deliveries; select eligible product/schedule; cancel or return under policy |
| Merchant viewer/finance | Read own delivery/itinerary summary or financial detail according to role |
| `ops_dispatcher` | Plan/replan itineraries, reserve capacity, build manifests, tender/assign legs, manage hubs, resolve exceptions, and invoke audited fallback |
| Hub operator | Scan authorized packages/manifests and record receive/store/load/release and discrepancies at the assigned hub |
| Owned rider/driver | Execute assigned first-mile, linehaul, transfer, or last-mile work and custody actions |
| Partner admin/API | Receive only eligible tenders, bind capacity, and publish normalized location/status/proof/custody events |
| Platform admin | Configure cities, directed lanes, calendars, hubs, products, compliance, capacity, and providers |
| Recipient/public visitor | See only their delivery's safe milestone/ETA projection |

No partner or hub operator mutates canonical delivery status directly. Their events invoke platform commands after authentication, deduplication, authorization, and validation.

## 4. Complete actor/system flow

1. Merchant requests a quote with pickup/drop-off, package, COD, normal service mode, and requested window.
2. Geography resolves each endpoint to canonical city/zone. If cities differ, Quoting asks the multi-city capability for an eligible itinerary.
3. The planner finds a directed path whose cities, zones, hubs, products, package/COD limits, calendars, compliance, partners, and capacity policies permit the request.
4. Routing estimates first/last mile and every cross-city leg. Scheduling selects feasible local windows, hub cutoffs, departure/arrival windows, and transfer buffers.
5. Pricing returns per-delivery line items, promise range, itinerary assumptions, quote expiry, and whether capacity is estimated or reserved. Missing lane/rule/capacity returns a stable unavailable reason.
6. Merchant confirms idempotently. The platform revalidates quote equivalence/expiry and stores delivery, itinerary snapshot, tracking token, quote/charge, and outbox events. Delivery enters `awaiting_dispatch`.
7. The scheduler creates local route work, leg bookings/reservations, and manifest candidates without duplicating the delivery.
8. Dispatch assigns first-mile capacity. Pickup proof advances the delivery to `picked_up`; beginning movement advances it to `in_transit`.
9. At the origin hub, packages are scanned and transferred into hub custody with discrepancy checks.
10. A departure manifest is sealed. Eligible owned linehaul capacity or a partner accepts a versioned tender and binds vehicle/driver.
11. Leg departure, location, arrival, seal, and exception events update leg/manifest projections. They do not repeatedly transition the already `in_transit` delivery.
12. Each transfer hub records unload, receive, store, sort, and load with custody evidence. The next leg cannot depart with an unresolved package discrepancy.
13. At destination city, custody transfers to last-mile capacity and a local route/assignment is activated.
14. Last-mile delivery proof and COD validation permit `in_transit → delivered`.
15. Webhooks, tracking, finance, earnings, settlement, and reconciliation run independently per delivery.
16. Failed legs, missed connections, damage/loss, closure, cancellation, or return produce explicit exception/replan workflows and preserve historical itinerary, custody, and financial records.

## 5. Geographic and execution data models

### 5.1 City profile and calendar

`CityOperationalProfile` references canonical `City` and contains status, supported products, operating timezone, local dispatch/hub cutoffs, default hubs, compliance profile, and configuration version.

`ServiceCalendar` contains owner type/ID (`city`, `lane`, `hub`, `partner`), timezone, weekday intervals, exception/blackout dates, effective interval, status, and version. Evaluation returns UTC instants plus source timezone/version. An active city does not imply every lane/date is open.

### 5.2 Directed `lanes` and versions

| Field | Constraints |
|---|---|
| `id` | Stable opaque lane ID |
| `origin_city_id`, `destination_city_id` | Required and different; direction is significant |
| `status` | `draft`, `active`, `suspended`, `retired` |
| `version`, `effective_from`, `effective_to` | Immutable activated version and non-overlapping interval |
| `supported_products/modes` | Explicit combination matrix |
| `origin_zone_ids`, `destination_zone_ids` | Optional versioned restrictions |
| `origin_hub_ids`, `destination_hub_ids`, `permitted_transfer_hub_ids` | Explicit active hubs |
| `distance_meters`, `nominal_duration_seconds`, `provider_result_ref` | Versioned planning basis |
| `calendar_id`, `departure_schedule` | Required operating windows/frequency |
| `package/capability limits` | Weight, dimensions, volume, value, goods, temperature, skills |
| `cod_policy` | Allowed, ceiling, currency, remittance model, cash carrier |
| `capacity_policy_id`, `pricing_scope_ref`, `compliance_profile_id` | Required references |
| `created_by`, `activated_by`, `created_at` | Audit metadata |

`A → B` does not imply `B → A`; every reverse/return path requires its own lane.

### 5.3 Transfer hubs

`TransferHub` contains city/zone/version, status, address/coordinates, calendar, cutoffs, minimum transfer time, scan/storage/COD/security capabilities, interval capacity, operator scope, and security policy. Precise hub and security data are sensitive.

### 5.4 Delivery itineraries

`DeliveryItinerary` contains delivery/business, itinerary version, state, endpoint cities, selected product, promise range, lane/hub sequence, quote/constraint/calendar snapshots, planner version, source (`automatic`, `manual`), and supersession timestamps. Only one version is current; history is immutable.

### 5.5 Local routes and stops

`Route` contains tenant, city/depot, service date/timezone, route status/version, assignment, constraint snapshot, metrics, and plan source. `RouteStop` contains sequence, type, linked delivery/leg, address snapshot, window, service time, load delta, status, ETA/actual times, proof requirements, custody action, and version.

First/last-mile routes follow [Mode 04 — Multi-stop Routes](./04-multi-stop-routes.md). A delivery belongs to at most one active local route at a time, while its itinerary may reference multiple completed routes in different cities.

### 5.6 Cross-city legs

| Field | Constraints |
|---|---|
| `id`, `itinerary_id`, `delivery_id` | Same tenant delivery context |
| `sequence`, `lane_id`, `lane_version` | Ordered and immutable when executed |
| `origin_hub_id`, `destination_hub_id` | Required for hub-based leg |
| `status` | Leg machine below |
| `scheduled_departure/arrival_start/end`, `timezone_context` | UTC plus source zones |
| `actual_departure_at`, `actual_arrival_at` | Nullable |
| `capacity_reservation_id`, `manifest_id`, `assignment_id`, `partner_handoff_id` | Nullable by phase |
| `planned/actual metrics`, `eta`, `confidence` | Versioned projections |
| `custody_from`, `custody_to`, `seal_reference` | Sensitive state-dependent references |
| `exception_code`, `resolution`, `version` | Required on exception; optimistic version |

For consolidation, one physical manifest leg references many per-delivery leg records. This preserves independent delivery state, tracking, and finance.

### 5.7 Capacity, manifests, and custody

`LaneCapacityBucket` identifies lane/version, departure interval, provider/vehicle class, total and reserved weight/volume/package slots/COD exposure, status, and version. `CapacityReservation` has tenant/delivery or manifest scope, units, expiry, state, idempotency key, and release/consume reason.

`CrossCityManifest` stores lane departure, vehicle/provider, state, seal, item counts/load, version, and timestamps. `ManifestItem` references one delivery/package/leg and expected measurements/COD class.

`CustodyEvent` is append-only: package/delivery, event type (`received`, `stored`, `loaded`, `departed`, `arrived`, `unloaded`, `transferred`, `released`, `discrepancy`), from/to custodian/location, scan/seal/proof references, actor, client/server time, operation ID, and reason. Current custody is a derived projection.

## 6. State machines

### 6.1 Delivery

The unchanged lifecycle is:

`draft → quoted → awaiting_dispatch → assigned → rider_arriving_pickup → picked_up → in_transit → delivered`

`in_transit` covers linehaul and transfers. City/leg milestones enrich the timeline but do not add or skip delivery states. Exceptions follow the contracted `cancelled`, `delivery_failed`, and `returned` rules.

### 6.2 Route

`draft → optimizing|planned → locked → assigned → active → completed`

Cancellation, failure, and replan follow Mode 04. A local route completes independently of the full itinerary.

### 6.3 Stop

`pending → approaching → arrived → in_service → completed`

Exceptions are `failed`, `skipped`, and `cancelled`. Hub transfer stops require custody actions before completion.

### 6.4 Cross-city leg

```text
planned
  → capacity_reserved
  → tendered
  → accepted
  → ready
  → in_transit
  → arrived
  → custody_transferred
  → completed
```

Exceptions:

- `planned|capacity_reserved|tendered → cancelled`
- `tendered → declined|expired`, followed by new tender or replan
- `accepted|ready → failed`, with capacity/custody resolution
- `in_transit → delayed|failed`; `delayed → in_transit|arrived|failed`
- `arrived → custody_discrepancy`; resolution returns to `arrived` or ends `failed`

`completed` requires arrival, manifest reconciliation, and custody transfer. Late events cannot regress state.

### 6.5 Itinerary and manifest

Itinerary: `draft → quoted → confirmed → executing → completed`, with `replanning`, `cancelled`, and `failed`. Replan creates a new version and freezes completed legs/custody.

Manifest: `draft → open → sealed → departed → arrived → reconciled → closed`. `sealed → reopened` requires privileged reason/audit and a new seal version. Cancellation is allowed only before departure after every item is released/reassigned.

## 7. Lane eligibility, serviceability, and calendars

An itinerary is eligible only when:

- endpoints resolve to active city/zone versions;
- every lane and transfer hub is active/effective for product/date;
- city, lane, hub, partner, and vehicle calendars intersect with sufficient transfer buffers;
- package class, weight/dimensions/volume/value, goods, temperature, proof, location, and compliance are supported;
- COD amount/currency/custody/remittance obligations are supported end to end;
- every provider has explicit lane capability, health, and capacity;
- maximum legs/transfers/duration and required promise can be met;
- unsupported regulatory scope is absent.

Zone/lane changes after quote follow the explicit honor policy. Emergency lane suspension blocks new bookings and opens at-risk review for accepted work; it never silently cancels them.

All supported cities/zones/lanes, calendars, cutoffs, transfer buffers, maximum legs, package/COD limits, suspension behavior, and quote-honor rules are **Configurable** and versioned.

## 8. Quote, pricing, promise, and capacity

Pricing requires an explicit rule for first/last mile, every lane/leg, hub handling/storage, package characteristics, service mode, COD, partner/carrier, toll/fuel/demand/after-hours, tax/discount, failed attempt, cancellation, replan, and return where approved.

The quote stores itinerary/lane/calendar versions, route metrics/provider references, capacity assumption/reservation, departure and promise range, line items, expiry, and fallback confidence.

One delivery receives one reproducible quote even when transport is consolidated. Manifest carrier cost is an allocation input, not the merchant charge. Money never combines currencies without an explicit conversion record/rate source.

Capacity is evaluated for local routes, hubs, and each leg. Confirmation either atomically reserves all constrained segments or clearly returns a non-guaranteed assumption. Partial reservation failure releases acquired reservations idempotently. Missing pricing/capacity/configuration means `MULTI_CITY_UNAVAILABLE`, never free or unlimited service.

Quote TTL, promise confidence, reservation TTL, overbooking, allocation, repricing tolerance, storage grace, and currency conversion are **Configurable**.

## 9. Assignment, partner handoff, and custody

First/last mile uses normal dispatch. Linehaul eligibility additionally requires lane/version, departure, hub, vehicle/driver compliance, load, COD, proof/location capability, and capacity.

Partner handoff:

1. Create a stable handoff/tender ID for lane/manifest version.
2. Send a signed, minimized, versioned payload with deadline.
3. Partner accepts/declines idempotently and returns a unique partner job reference.
4. Platform activates one assignment/reservation and requires driver/vehicle binding by deadline.
5. Partner events carry partner event ID, source time, assignment/version, signature, and canonical mapping.
6. Timeout/decline releases capacity before fallback; concurrent acceptance yields one winner.

After pickup, provider/hub changes require a custody event identifying package, from/to custodians, time/location, scan/proof, condition, seal, and both-party confirmation or approved exception. A message alone cannot transfer cash or package custody. COD cash and package custodians may differ and are tracked independently.

## 10. Planning, optimization, and manual fallback

The planner searches only enabled directed lanes and optimizes configured price, duration, transfers, risk, capacity, and partner-health objectives while obeying calendars, cutoffs, buffers, hub capacity, package/COD/compliance, and committed windows.

Inputs/proposals are versioned. A proposal does not reserve capacity or mutate work until applied. Replanning preserves completed legs, departed manifests, custody, accepted quote, and delivery events.

Manual fallback lets authorized ops select another enabled path/departure/hub/provider, split or rebuild manifests without duplicating deliveries, plan local routes manually, reconcile offline scans by operation ID, use fresh cached data with reduced confidence, or hold/continue/return through an approved path.

Legal, goods, capacity, pickup-before-dropoff, custody, and COD constraints cannot be overridden. Permitted operational overrides require reason, actor, scope, expiry, and audit.

## 11. Tracking, webhooks, proof, and finance

Tracking remains per delivery. Recipient-safe milestones may say `at origin facility`, `in inter-city transit`, `at destination facility`, and `out for delivery`, while canonical status remains `in_transit`. Public output never exposes other manifest items, hub security, future vehicle route, partner internals, or raw custody.

ETA combines current local/linehaul location or hub milestone, remaining route, schedule/cutoff, transfer buffers/calendar, and destination capacity. It returns range, confidence, and freshness; stale/provider-fallback data are labeled.

Existing approved delivery webhooks remain independent. Leg/manifest events are internal unless the contract adds versioned merchant names. A delivery webhook contains only that delivery's safe projection and aggregate version.

Proof is delivery/package/custody-action scoped. Finance is also per delivery: merchant charge, owned/partner earnings allocation, COD collection/custody/remittance/payable, settlement holds, failures, storage, reroute, loss/damage, cancellation, and return use immutable entries/adjustments. Lane/manifest totals are reconciliation dimensions, not balances.

## 12. APIs and events

Merchant/public:

- `POST /v1/quotes` accepts normal `mode` plus cross-city endpoints, window, package, and COD.
- Idempotent `POST /v1/deliveries` accepts the multi-city quote ID.
- `GET /v1/deliveries/{id}` and `GET /v1/track/{token}` expose safe milestones/promise/ETA.

Ops/admin:

- Versioned CRUD/activate/suspend for city profiles, lanes, calendars, hubs, products, and capacity policies.
- `POST /v1/ops/deliveries/{id}/itineraries:plan`
- `POST /v1/ops/deliveries/{id}/itineraries/{version}:apply|replan`
- `POST /v1/ops/legs/{id}/reserve|tender|assign|depart|arrive|transfer|fail`
- Manifest create/add/remove/seal/reopen/depart/arrive/reconcile/close commands.
- `POST /v1/hubs/{hub_id}/scans` and discrepancy resolution.
- Partner offer/accept/bind/event endpoints.

Stable errors include `LANE_NOT_ENABLED`, `LANE_SUSPENDED`, `NO_ELIGIBLE_ITINERARY`, `CALENDAR_CLOSED`, `CUTOFF_MISSED`, `HUB_UNAVAILABLE`, `CAPACITY_UNAVAILABLE`, `PACKAGE_NOT_ELIGIBLE`, `COD_NOT_SUPPORTED`, `QUOTE_EXPIRED`, `ITINERARY_VERSION_CONFLICT`, `MANIFEST_SEALED`, and `CUSTODY_MISMATCH`.

Internal events:

`itinerary.planned`, `itinerary.confirmed`, `itinerary.replanned`, `itinerary.completed`, `lane.capacity_reserved`, `lane.capacity_released`, `leg.tendered`, `leg.accepted`, `leg.departed`, `leg.delayed`, `leg.arrived`, `leg.failed`, `custody.received`, `custody.transferred`, `custody.discrepancy`, `manifest.sealed`, `manifest.departed`, `manifest.arrived`, `manifest.reconciled`, and `lane.suspended`.

Events carry event/schema ID, business/delivery where applicable, itinerary/leg/manifest/lane versions, actor, occurred/recorded times, source, trace ID, and minimum payload.

## 13. UI requirements

- Merchant quote/create: endpoint cities, eligible normal modes plus multi-city capability, promise range, cutoff, price breakdown, capacity confidence, restrictions, and requote.
- Merchant delivery detail: own milestones, current city/leg-safe description, ETA, proof, charge, COD, return, and support actions.
- Ops network board: lane/hub status, calendars, capacity, departures, connections, manifests, partner health, custody discrepancies, and replan.
- Ops itinerary view: versions, local routes/stops, legs, assignments, custody, ETA history, exceptions, and reconciliation.
- Hub app: receive/store/sort/load/release scans, expected versus actual, seal, condition, offline queue, and discrepancy workflow.
- Driver/rider app: only assigned work, navigation, manifest/package scans, seal/custody/proof/COD obligations, and offline-safe events.
- Partner portal: tenders, capacity acceptance, driver/vehicle binding, events, and statement references.
- Admin: city profiles, directed lanes, calendars, hubs, product/capability matrix, capacities, pricing linkage, compliance, certification, and provider health.

## 14. Cancellation, failure, replan, and return

- Before pickup, cancellation releases reservations, local work, tenders, and manifest membership idempotently.
- After pickup, ops selects continue, secure hold, intercept, return, or approved destination change while preserving custody and applying finance policy.
- Before departure, leg failure releases/rebooks capacity and replans downstream connections.
- In transit, breakdown/closure/delay records location/custody and selects rescue vehicle, alternate enabled path, wait, or return. Rescue requires physical handoff.
- Missed connection holds packages at an authorized hub, updates promise, and reserves a later departure.
- Missing/extra/damaged/seal-mismatched items are quarantined; manifest truth is preserved and custody transfer cannot auto-complete.
- Destination unavailability results in hold, alternate approved hub/zone, reschedule, or return—not fabricated completion.
- Returns are linked, independently quoted deliveries over enabled reverse lanes. Original delivery/finance history is never rewound.
- Loss/damage and COD discrepancy require proof, custody audit, settlement hold where approved, and explicit resolution.

## 15. Security and privacy

- Tenant scope applies to deliveries, itineraries, reservations, manifests, and finance. Shared manifests never expose one merchant's data to another.
- Hub/partner/driver credentials are organization-, role-, lane-, and action-scoped; requests are signed, timestamp checked, replay protected, rate limited, rotatable, and revocable.
- Just-in-time disclosure withholds recipient contact from linehaul/hub actors unless necessary. Public tracking is tokenized and sanitized.
- Locations, routes, package value/description, COD, custody, seals, facility security, proof, and contacts are sensitive; encrypt, minimize, access-control, and retain under **Configurable** policy.
- Provider payloads use pseudonymous IDs/minimum fields and restrict retention/training use.
- Lane activation/suspension, manifest reopen, custody override, destination change, proof waiver, COD adjustment, and cross-tenant access require least privilege, reason, and audit.

## 16. Idempotency and concurrency

- Delivery creation requires `Idempotency-Key`; itinerary apply/replan, reserve/release/consume, tender/accept, manifest mutation, scan/custody, leg transitions, and return creation use scoped keys or operation IDs.
- Same key/body replays; changed content returns `409`.
- Optimistic versions protect delivery, itinerary, leg, capacity bucket, manifest, route/stop, and custody projection.
- Capacity uses transactional conditional updates and cannot over-allocate beyond explicit configured policy.
- Consistent lock order—delivery, itinerary, leg/manifest, capacity, assignment—prevents deadlocks.
- A manifest seal blocks changes; reopen creates a new seal/version and cannot rewrite departed history.
- Offline/partner events deduplicate by source operation ID, preserve client/server times, and cannot regress state/custody.
- Transactional outbox and idempotent consumers handle events, finance, and webhooks; external calls are not assumed exactly once.

## 17. Observability, reconciliation, and audit

Metrics include quote/eligibility failures, capacity utilization, fill rate, on-time departure/arrival, transit/dwell time, missed connections, replans, hub throughput/storage age/discrepancy, offline scan lag, seal mismatch, tender/partner latency, ETA error/freshness, custody gaps, loss/damage, COD exposure/remittance age, completion/failure/return, and finance lag.

Logs/traces correlate business/delivery, itinerary/version, lane/version, leg, route/stop, manifest/item, hub, reservation, assignment/handoff, partner event, operation/event, and trace IDs while redacting PII/location/value.

Reconciliation detects expired reservations, confirmed itineraries without work, duplicated/missing manifest items/legs, manifest/leg mismatches, custody gaps/impossible order, unresolved scans/seals, absent destination work, delivered jobs with unresolved custody/proof/COD/finance, partner acceptance without assignment, and stale tracking/webhook projections. Repairs use normal idempotent commands.

Audit all configuration, itinerary changes, reservations, tenders, assignments, manifest seal/reopen, scans/custody, overrides, exceptions, returns, and sensitive access.

## 18. Configurable values

Explicitly **Configurable**:

- city/zone/lane/product/mode combinations;
- lane direction, schedules, cutoffs, calendars, blackouts, transfer buffers, legs/transfers/duration;
- hub capabilities, hours, storage/grace, security, and proof;
- package/vehicle/value/goods/temperature/skills/compliance limits;
- COD currencies/ceilings/custody/remittance/settlement holds;
- capacity units, buckets, reservation TTL, overbooking, and release;
- price lines, tax/surcharges, allocation, currency conversion, quote TTL, and honor/reprice;
- planner weights, fallbacks, partner preference/health, and tender/binding deadlines;
- ETA confidence/freshness, notifications, and promise targets;
- cancellation, storage, replan, loss/damage, failure, return, refund, and dispute;
- PII/location/proof/custody/manifest/event retention and legal hold.

## 19. Phased implementation

1. **Geographic foundation:** city profiles, directed/versioned lanes, calendars, hubs, itinerary snapshots, eligibility API, and configuration/audit.
2. **Manual execution:** per-delivery legs, capacity reservations, owned assignments, manifests/scans/custody, fallback, tracking milestones, and reconciliation.
3. **Partner and scheduling:** signed tenders, certification, departures/cutoffs, partner events, route-aware ETA, COD/earnings/settlement allocation, and public docs.
4. **Scale and optimization:** automated planning, bulk consolidation, multi-stop first/last mile, dynamic replan, transfer hubs, and capacity forecasting.

## 20. Acceptance and test cases

1. Different-city delivery is rejected unless every directed lane/hub/product/calendar requirement has an eligible version.
2. `A → B` does not enable `B → A`; return without a reverse path fails with a stable reason.
3. Multi-city combines with on-demand, scheduled, bulk, routes, and returns without changing delivery status enums.
4. Consolidated deliveries retain separate IDs, quotes, tracking, proofs, webhooks, COD, ledger, cancellations, and returns.
5. Cross-timezone/DST calendars produce correct UTC cutoffs, departures, buffers, and display.
6. Concurrent reservations cannot exceed weight/volume/package/COD capacity; partial failure releases prior holds once.
7. Missing pricing never yields zero; changed inputs cannot accept an old quote.
8. Stale itinerary/optimization cannot apply after delivery, lane, calendar, capacity, or completed-leg changes.
9. Partner races produce one assignment and safely retract/release losers.
10. A package cannot depart without pickup, manifest inclusion, required scans/proof, valid load, and custody.
11. Leg arrival cannot complete until manifest and custody reconcile.
12. Duplicate/offline/out-of-order scans/events do not duplicate or regress custody, status, proof, COD, or finance.
13. Missed connection replans only remaining work and records secure hub custody.
14. Provider replacement after pickup requires two-sided custody handoff; logical reassignment alone is rejected.
15. Cancellation before pickup releases all work; after pickup requires custody-preserving resolution.
16. Return uses an independently validated/priced itinerary and never rewinds original delivery/ledger history.
17. Public tracking reveals one delivery's safe milestone/ETA and no manifest peers, hub security, partner internals, COD, or custody.
18. Tenant/partner/hub/rider/admin tests deny cross-scope access; privileged overrides are audited.
19. Lane suspension blocks new work, flags accepted work for review, and never silently cancels it.
20. Reconciliation detects and repairs reservation, manifest, leg, route/stop, custody, assignment, tracking, proof, COD, and finance mismatches idempotently.
