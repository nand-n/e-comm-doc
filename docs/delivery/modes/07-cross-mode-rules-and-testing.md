# Cross-mode Rules and Testing

**Status:** Proposed cross-mode contract; decisions marked **Proposed** require approval and registration  
**Scope:** On-demand, scheduled, bulk, multi-stop/routes, multi-city, returns, and their combinations  
**Primary phases:** Foundations in Phases 1–3; full combinations in Phase 4

This document defines how delivery modes compose without creating parallel lifecycle, security, or finance models. It supplements the [product definition](../product-definition.md), [delivery contracts](../contracts.md), mode documents, and [testing strategy](../testing-strategy.md). Where an existing source conflicts, the contradiction is listed as a proposed decision and remains open in the [decision register](../decision-register.md).

All prices, windows, horizons, capacities, limits, timeouts, retries, route constraints, lane rules, risk thresholds, proof requirements, financial rules, retention periods, and rollout gates are configurable. Examples in this document are not fixed business values.

## 1. Canonical model: dimensions, not six exclusive modes

The product definition names six “delivery modes.” They describe different concerns and must not be implemented as six mutually exclusive workflow engines.

| Dimension | Mutually exclusive values within the dimension | Meaning |
|---|---|---|
| Timing | `on_demand` or `scheduled` | When service is promised |
| Submission | `single` or `batch` | How one or more delivery requests enter the platform |
| Execution | `point_to_point` or `route` | Whether dispatch executes one job independently or as part of an ordered route |
| Geography | `intra_city` or `inter_city` | Whether pickup and destination use the same canonical city |
| Direction | `outbound` or `return` | Whether the job is original fulfillment or reverse logistics |

These are composable dimensions. Values inside one dimension are exclusive: one delivery cannot be both `on_demand` and `scheduled`, or both `outbound` and `return`, at the same version. Values across dimensions may combine when the tenant, cities, lane, fleet, package, finance, and rollout configuration allow them.

COD, proof type, fleet source, partner fulfillment, priority, and integration channel are attributes or policies, not delivery modes. A CSV batch is a submission aggregate, and a route is an execution aggregate; neither changes the authoritative lifecycle of its member deliveries.

### Proposed decision XM-001 — Normalize the six product labels into dimensions

**Proposed:** Retain the six approved customer-facing labels, but represent them canonically as the dimensions above. Map “bulk” to batch submission, “multi-stop/routes” to route execution, “multi-city” to inter-city geography, and “returns” to return direction.

This resolves the conflict between:

- the product definition, which lists six modes;
- `Delivery.mode` and the current OpenAPI enum, which contain only `on_demand`, `scheduled`, `bulk_item`, and `multi_stop`;
- the mode taxonomy's compatibility table, which marks on-demand plus return as incompatible even though its decision tree gives every return either scheduled or immediate release behavior;
- the bulk module, which defines a batch as an orchestrator of normal deliveries; and
- the returns module, which defines a return as a linked delivery with its own lifecycle.

Approval should resolve [C-014](../decision-register.md#open-configurable-decisions) and update the contracts, OpenAPI, data dictionary, and mode documents together.

## 2. Compatibility matrix

“Supported” means the combination is valid in the canonical model, not that it is enabled in every phase or market. “Conditional” means a named eligibility rule must approve it. Every combination remains feature-, tenant-, city-, lane-, and phase-gated.

| Combination | Compatibility | Required interpretation and guards |
|---|---|---|
| On-demand + single + point-to-point + intra-city + outbound | Supported baseline | Normal delivery contract and lifecycle |
| Scheduled + single + point-to-point + intra-city + outbound | Supported | Valid service window, capacity, timezone, and schedule policy |
| On-demand + batch | Supported | Batch rows create independent on-demand deliveries; batch does not become a delivery mode |
| Scheduled + batch | Supported | Every row has a valid explicit or approved default window; validation snapshot is preserved |
| On-demand + route | Conditional | Dynamic/manual route policy must allow insertion without weakening accepted promises |
| Scheduled + route | Supported | Route must satisfy every member delivery window and pickup-before-drop-off constraint |
| Intra-city + route | Supported | Route city and stop coverage must be compatible |
| Inter-city + point-to-point | Conditional | Enabled lane, service product, handoff model, currency, fleet, and custody policy |
| Inter-city + route | Conditional | Route may contain approved city legs/handoffs; no implicit cross-city pooling |
| On-demand + inter-city | Conditional | “On-demand” means no reserved future window, not guaranteed immediate arrival; lane cutoff and service promise apply |
| Scheduled + inter-city | Supported conditionally | Origin/destination timezones, lane calendar, capacity, and handoff windows must all validate |
| On-demand + return | Conditional | Reverse job is released as soon as eligible; authorization, custody, serviceability, quote, and return policy still apply |
| Scheduled + return | Supported conditionally | Reverse job has its own window, capacity reservation, authorization, custody, and quote |
| Outbound + COD | Conditional | COD eligibility, currency, amount, proof, custody, and settlement policy |
| Route + COD | Conditional | Stop-level collection and custodian limits; route totals are reporting aggregates only |
| Return + point-to-point | Supported conditionally | Authorized linked return, known custody, serviceable destination, and payer policy |
| Return + route | Conditional | Return delivery may join an eligible route without exposing unrelated stops |
| Return + inter-city | Conditional | Enabled reverse lane, lawful transport, known custody, and return destination coverage |
| Return + batch | Conditional | Each request remains idempotent and lineage-validated; duplicate active returns are rejected |
| Batch + route | Supported | Batch creation and route planning are separate steps; batch membership never implies shared assignment |
| Batch + inter-city | Conditional | Validate each row against its own lane, currency, package, and service rules |
| Scheduled + batch + route | Supported | Per-delivery promises survive batch defaults and route optimization |
| Return + inter-city + scheduled + route + COD | Conditional | All independent guards apply; no dimension suppresses custody, finance, security, or lifecycle controls |

Unsupported combinations must fail before confirmation with a stable, machine-readable reason. A disabled feature must never be accepted and then silently downgraded to a simpler service.

## 3. Precedence and conflict rules

### 3.1 Rule precedence

When rules overlap, apply the following order:

1. Hard tenant isolation, authorization, legal, safety, currency, ledger-balance, and custody invariants.
2. Authoritative delivery lifecycle and append-only history rules.
3. Explicit accepted delivery facts: tenant, package, endpoints, direction, accepted quote, currency, and customer promise.
4. Return authorization and lineage constraints.
5. Inter-city lane and city/zone eligibility.
6. Scheduled-window and capacity constraints.
7. Route hard constraints, including pickup-before-drop-off, vehicle capacity, custody, and COD limits.
8. Batch row values.
9. Batch defaults, merchant profile defaults, and integration defaults.
10. Optimization objectives and soft preferences.

A lower-priority rule may narrow an allowed action but may not override a higher-priority invariant. Optimization never changes an accepted address, window, COD amount, payer, currency, or return lineage.

### 3.2 Configuration precedence

Configuration resolution follows the typed, definition-specific model in [Module 29](../modules/29-configuration-feature-flags.md). The default resolution chain is request test override, client/user, partner, tenant, city, environment, then platform default, but each definition controls its allowed scopes.

For a delivery spanning cities, a single “nearest city wins” rule is unsafe. **Proposed XM-002:** each configuration definition declares one of:

- `origin`: resolve from pickup city;
- `destination`: resolve from drop-off city;
- `all_segments`: every city/lane value must allow the operation;
- `most_restrictive`: combine values using a definition-specific restrictive operator;
- `lane`: resolve from the versioned directed lane;
- `tenant_only` or `platform_only`: city does not participate.

The effective configuration snapshot and source must be stored with quote, confirmation, route plan, return authorization, and financial posting where needed for reproducibility. This proposal refines [C-002](../decision-register.md#open-configurable-decisions).

### 3.3 Request conflict rules

- An explicit row value overrides a batch default only if the field is permitted to vary.
- A route plan cannot override delivery facts; it may only propose execution sequence, assignment, ETA, and operational stop metadata.
- A return job derives lineage and permitted package scope from its authorization; caller-supplied parent or tenant data is never trusted alone.
- A schedule update after confirmation is a versioned reschedule command with revalidation and audit, not an in-place mode change.
- Changing intra-city to inter-city, outbound to return, or point-to-point to a materially different service after confirmation requires an approved amendment/requote flow or a new linked delivery.
- Conflicts use `409` when current state/version prevents the command and `422` when the requested combination is well-formed but ineligible. Authentication and authorization use the platform's non-disclosing `401`/`403`/tenant-safe `404` policy.

## 4. Shared and mode-specific data

### 4.1 Shared delivery data

Every delivery, regardless of combination, owns:

- `id`, `business_id`, `external_order_id`, branch/source references, and actor provenance;
- canonical timing, execution, geography, and direction dimensions;
- current status projection, immutable status events, version, and correlation IDs;
- immutable pickup/drop-off, package, contact, city/zone, and policy snapshots;
- quote, currency, charge, COD expectation, proof policy, and risk/configuration versions;
- assignment history, tracking token, outbox events, audit records, and financial source references.

The authoritative status machine remains:

`draft → quoted → awaiting_dispatch → assigned → rider_arriving_pickup → picked_up → in_transit → delivered`

with `cancelled`, `delivery_failed`, and `returned` under the contracted guards.

### 4.2 Dimension-specific data

| Dimension/value | Additional data |
|---|---|
| Scheduled | UTC start/end, authoritative IANA timezone, local representation, service-window/calendar version, capacity reservation, reschedule history |
| Batch submission | Batch ID, row identity, schema/rules version, row hash, row idempotency key, validation and commit result |
| Route execution | Route/plan/version, ordered stop IDs, stop type/status, planned/actual times, load/COD deltas, optimization run and constraint snapshot |
| Inter-city | Directed lane/version, origin/destination cities, legs/handoffs, carrier/fleet responsibility, timezone/currency/customs or jurisdiction facts where applicable |
| Return direction | Parent delivery, lineage root, authorization, package scope, reason, payer, custody origin, approved destination, active-return constraint |

Batch and route data belong to their aggregates. A delivery stores membership/version references needed for audit, but must not duplicate mutable aggregate state as an independent source of truth.

### Proposed decision XM-003 — Route members remain independent deliveries

**Proposed:** A route groups one or more independently identifiable, billable, trackable, evented deliveries. A merchant request with multiple recipients is represented as multiple linked deliveries or consignments, then routed; it is not one delivery whose single status hides divergent stop outcomes.

This adopts the rule in [Module 19](../modules/19-scheduling-multi-stop-routing.md) and resolves ambiguity created by the `multi_stop` delivery enum and the data dictionary's single pickup/drop-off shape. Approval belongs with [C-014 and C-015](../decision-register.md#open-configurable-decisions).

### Proposed decision XM-004 — Returns use direction plus lineage

**Proposed:** A return is a new delivery with `direction=return`, `parent_delivery_id`, and `lineage_root_id`. The original delivery may transition to `returned` only after the linked return reaches the configured completion condition. Return request alone does not transition the original.

This makes the stronger rule in [Module 12](../modules/12-exceptions-returns.md) authoritative over the looser “linked return preferred” wording in the contracts and lifecycle module. Approval should resolve [C-019](../decision-register.md#open-configurable-decisions).

## 5. Combined flows

### 5.1 Scheduled bulk

1. Create a batch with a schema version, timezone policy, commit policy, and optional permitted defaults.
2. Normalize each row independently. An explicit row window wins over a permitted batch default.
3. Validate tenant, branch, addresses, package, COD, city/zone, window, capacity, quote policy, and duplicate references against a recorded configuration snapshot.
4. In atomic mode, any invalid row prevents all creation; in partial mode, only valid rows continue.
5. Commit each delivery with a deterministic row idempotency key and its own quote, lifecycle, tracking token, and financial references.
6. If configuration or capacity has materially changed, mark validation stale and revalidate before commit.
7. Batch retries replay completed rows and never create duplicate capacity reservations or financial postings.

### 5.2 Cross-city scheduled

1. Resolve canonical origin/destination cities and the directed inter-city lane.
2. Validate lane activation, operating calendar, package/service eligibility, fleet/handoff capability, origin and destination timezones, and currency policy.
3. Convert the requested local promise to UTC while retaining timezone and local input; reject ambiguous or nonexistent local times unless an explicit configured resolution is accepted.
4. Reserve configured capacity for every required segment/handoff as one recoverable operation.
5. Quote from versioned lane, schedule, pricing, and policy facts.
6. Dispatch each leg without changing the delivery lifecycle improperly. Internal leg/handoff states supplement, but do not replace, canonical delivery states.
7. A segment failure opens an exception; it does not silently move the promised window or destination.

### 5.3 Multi-stop COD

1. Validate COD eligibility and currency for each delivery before route planning.
2. Build route stops with explicit expected collection and load/cash deltas.
3. Route lock verifies vehicle capacity, pickup-before-drop-off, rider/partner cash limits, proof requirements, and stop windows.
4. At each delivery stop, collect COD idempotently and post from verified collection evidence.
5. Custody remains attributed to the actual custodian; route totals are derived for reconciliation and cannot be edited.
6. One COD failure affects its delivery and exception case. Other route deliveries proceed only if safety, capacity, custody, and configured route policy permit.
7. Route completion is blocked or marked exceptional while member delivery, COD, or custody discrepancies remain unresolved according to configured policy.

### 5.4 Return cross-city

1. Authorize a return against the original tenant-owned delivery and selected package scope.
2. Confirm current custody, permitted return destination, payer, condition, reverse-lane eligibility, currency, and legal restrictions.
3. Create the linked return idempotently with its own quote, schedule if any, route membership if any, assignment, tracking token, proof, events, and ledger sources.
4. Preserve the original delivery's immutable history and financial entries.
5. Record every leg and custody handoff. A partner or city boundary never changes tenant ownership.
6. On configured return completion, transition the original to `returned` once and emit the approved event.
7. Return charges, refunds, earnings, COD resolution, and settlement holds use explicit postings and compensating entries; they are never inferred by reversing the outbound ledger.

## 6. Transition and aggregate invariants

The following invariants apply to every combination:

1. Each delivery follows only the authoritative lifecycle; mode dimensions do not add shortcuts.
2. Every accepted transition appends one event and atomically updates the status projection, outbox, and audit.
3. A delivery has at most one active assignment and at most one active route plan membership.
4. A route stop action can cause at most one valid delivery transition; route status cannot force member delivery status.
5. A batch state cannot force or roll back a created delivery state.
6. A delivery's timing, geography, and direction facts are immutable after the configured confirmation cutoff except through a versioned, authorized amendment.
7. Completed route stops, delivery events, custody events, proofs, quotes, and ledger entries are never rewritten by replan, reschedule, retry, or return.
8. Pickup precedes drop-off for every delivery and package. Return pickup is based on current custody, not assumed original destination.
9. A parent and return child share `business_id`; lineage cannot cross tenants or form a cycle.
10. At most one active return exists for the configured original/package scope.
11. Inter-city legs use an enabled directed lane and explicit handoffs; city changes never imply tenant changes.
12. Every monetary amount carries currency. No route, batch, lane, or settlement nets different currencies or control accounts.
13. Public tracking resolves exactly one delivery and never exposes batch rows, route membership, other stops, lane internals, or parent/child private data.
14. A mode combination accepted at quote/confirmation records the policy/configuration versions needed to explain eligibility and price.
15. Concurrent commands permit one serializable result; losers receive current version/state without partial side effects.

## 7. API representation recommendations

### 7.1 Canonical request shape

**Proposed:** Replace overloaded `mode` semantics with explicit fields in the next additive contract version:

```json
{
  "service": {
    "timing": { "type": "scheduled", "window": { "start": "...", "end": "...", "timezone": "..." } },
    "execution": { "type": "route" },
    "geography": { "type": "inter_city", "laneId": "..." },
    "direction": { "type": "return", "parentDeliveryId": "..." }
  }
}
```

Submission is represented by the endpoint/resource: direct delivery creation is `single`; batch APIs create `batch` membership. Server-derived fields such as canonical cities, lane version, tenant, lineage root, actor, and policy snapshot are not trusted from the caller.

### 7.2 Compatibility with the current enum

Until a versioned contract is approved:

- `on_demand` and `scheduled` map only to timing;
- `bulk_item` is accepted only as a deprecated compatibility alias for batch-created delivery metadata, not as different lifecycle behavior;
- `multi_stop` is accepted only as a deprecated compatibility alias for route intent/membership;
- inter-city and return creation require additive explicit fields/endpoints and must not be squeezed into an unknown enum value;
- responses should include canonical dimensions plus the legacy value during a documented deprecation window;
- ambiguous combinations fail with a migration error rather than being guessed.

This is a proposed resolution to the OpenAPI/data-dictionary mismatch tracked by [C-014](../decision-register.md#open-configurable-decisions).

### 7.3 Errors, idempotency, and events

- Use stable codes such as `mode_combination_unsupported`, `feature_not_enabled`, `window_unserviceable`, `lane_unavailable`, `route_constraint_unsatisfied`, `return_lineage_conflict`, `custody_unknown`, `currency_unsupported`, and `stale_configuration`.
- Return field paths and current aggregate versions where safe.
- Delivery, batch, route, return, COD, and finance mutations use endpoint-scoped idempotency and canonical request hashes.
- Replaying the same key/body returns the original outcome; changing the body returns `409`.
- Events carry canonical dimensions as additive facts, but existing approved delivery event names remain unchanged.
- Aggregate-specific events use stable IDs and references. Consumers must tolerate duplicates, additive fields, delayed delivery, and cross-aggregate reordering.

## 8. Financial attribution and reconciliation

Financial effects are attributed first to the individual delivery and source event, then optionally dimensioned by batch, route, stop, lane, city, direction, rider, partner, and lineage for reporting.

- Each delivery charge, surcharge, refund, earning, COD collection, adjustment, and reversal has one stable source reference and posting-rule version.
- Batch fees, route fees, inter-city leg costs, return charges, and schedule premiums must use explicit configurable allocation rules. Allocation snapshots and residual-rounding treatment are retained.
- A batch or route total is derived from member transactions unless an approved aggregate charge has its own journal source; totals are never editable balances.
- COD remains separate from delivery charges, rider/partner earnings, platform revenue, and personal advances.
- Multi-stop COD is attributed to delivery, stop, collector, current custodian, route, tenant, and currency.
- Inter-city charges and earnings identify lane and leg/partner where applicable without balancing across currencies.
- Return finance never deletes or reverses outbound finance automatically. Approved refunds or corrections use linked compensating entries.
- Settlement eligibility excludes held, disputed, unreconciled, wrong-tenant, wrong-currency, and duplicate sources.
- Reconciliation must trace from `external_order_id` and delivery through batch/route/return lineage to quote, invoice, ledger, COD custody, settlement, and payout.

The recognition event, allocation formula, payer, tax, refund, FX, rounding, earning, and settlement policies remain configurable and require finance/legal approval under [C-003, C-025–C-031](../decision-register.md#open-configurable-decisions).

## 9. Tenant and security isolation

- Every delivery, batch row, route membership, stop, lane decision, return authorization, exception, proof, custody record, event, idempotency record, and ledger dimension contains or validates `business_id`.
- A batch and route are single-tenant by default. Cross-tenant pooling is prohibited unless a future separately approved product defines privacy, commercial, operational, and legal boundaries.
- Platform routes that operationally contain work for more than one tenant, if ever approved, require an explicit platform aggregate; tenant APIs and riders still receive only the minimum data for their assigned deliveries.
- Partner scope never replaces merchant tenant scope. Partner actors see only explicitly assigned jobs/stops and permitted recipient data.
- Identical external order IDs, batch row keys, route labels, parent references, and idempotency keys may exist in different tenants without collision.
- Public tracking for an outbound and its return uses distinct tokens. Possession of one token does not authorize access to the other.
- Route optimization/provider payloads minimize recipient and tenant data, are purpose-bound, encrypted, retained configurably, and never become a public tracking surface.
- Cross-tenant resource substitution returns a non-disclosing denial and creates no timing, cache, export, webhook, finance, or audit leakage.
- Ops/admin cross-tenant actions require explicit permissions, affected-tenant context, reason where configured, and audit.

## 10. Conflict, retry, and failure handling

| Failure | Required behavior |
|---|---|
| Unsupported/disabled combination | Reject before confirmation; no downgrade or partial resource |
| Capacity or lane changes after quote | Apply recorded quote-honor policy or return stale/requote result; never decide silently |
| Batch worker restart | Resume checkpoints; replay completed rows; preserve exact counts |
| Atomic batch row failure | Create no deliveries or reservations |
| Partial batch row failure | Preserve successful rows and explicit failed-row results |
| Route optimization timeout | Keep prior route version unchanged; permit authorized manual planning |
| Stale route plan/application | `409`; do not apply any sequence changes |
| Concurrent route assignment/status action | Exactly one valid assignment/transition; loser refreshes |
| Segment/partner outage | Keep durable action pending, expose exception/manual fallback, preserve custody |
| COD post fails after collection | Preserve collection, mark finance posting pending, block affected settlement, retry/reconcile |
| Return saga partially succeeds | Reconcile authorization, child delivery, outbox, finance request, and original status; do not create another child |
| Webhook/notification failure | Commit domain result; retry independently and dead-letter configurably |
| Configuration unavailable | Use verified snapshot within configured stale policy, then documented safe default or fail closed |
| Offline duplicate/reordered rider action | Deduplicate by client action ID; reject stale conflicts; never reorder into an invalid lifecycle |

Retries must be bounded and configurable. Deterministic validation, authorization, conflict, and policy failures do not retry automatically. Reconciliation detects orphan memberships, duplicate reservations, route/delivery divergence, unknown custody, unposted finance, and lineage mismatch.

## 11. Migration and phased adoption

### Phase 1 — Preserve the base contract

- Operate on-demand, single, point-to-point, intra-city outbound delivery.
- Persist a forward-compatible dimension representation or deterministic mapping.
- Reject unsupported combinations explicitly.
- Preserve lifecycle, tenant, idempotency, outbox, audit, and ledger foundations.

### Phase 2 — Add operational controls

- Add COD, proof, exception, custody, and linked-return foundations.
- Backfill `direction=outbound` and derive geography from immutable canonical city snapshots.
- Introduce return lineage constraints before enabling automated returns.

### Phase 3 — Separate submission from service

- Introduce batch resources and deterministic row idempotency.
- Migrate `bulk_item` to batch membership without changing member delivery lifecycle.
- Expose canonical dimensions additively in responses/events and publish migration guidance.

### Phase 4 — Enable scale combinations

- Enable scheduled windows, routes, directed inter-city lanes, partner fulfillment, and supported return combinations behind typed flags/configuration.
- Migrate `multi_stop` to route membership and explicit execution shape.
- Run shadow validation and dual-read comparison before switching authoritative reads.
- Backfill in bounded, tenant-scoped, resumable jobs with checksums and reconciliation.
- Keep rollback additive: disable new combinations while preserving already accepted jobs and their recorded dimensions.

No migration may rewrite immutable status, proof, custody, audit, quote, or ledger history. Ambiguous legacy records are quarantined for explicit resolution rather than guessed. Deprecation duration, rollout cohorts, batch sizes, shadow thresholds, and rollback gates are configurable.

### Proposed decision XM-005 — Versioned additive migration

**Proposed:** Add canonical dimensions before deprecating `Delivery.mode`; dual-write only through one authoritative mapping, compare reads, then remove legacy aliases in a future API version. Record this decision against [C-014](../decision-register.md#open-configurable-decisions) before implementation.

## 12. Comprehensive cross-mode test matrix

Every scenario records the application version, schema, OpenAPI/event version, configuration snapshot, flags, timezones, currencies, random seed, and tenant fixtures. Configurable boundaries are tested below, at, and above their active values.

### 12.1 Positive and combination cases

| ID | Scenario | Assertions |
|---|---|---|
| P-01 | On-demand intra-city outbound | Quote/create/assign/complete uses canonical lifecycle and one financial source per effect |
| P-02 | Scheduled single | UTC plus timezone round-trip, capacity reservation, accepted promise, and tracking display agree |
| P-03 | On-demand batch partial commit | Valid rows create independent jobs; invalid rows do not; counts and links reconcile |
| P-04 | Scheduled atomic batch | Every row validates and all deliveries/reservations commit once |
| P-05 | Scheduled batch with row override | Permitted row window overrides default and records source/configuration |
| P-06 | Scheduled route | Every stop respects windows, precedence, capacity, and independent delivery status |
| P-07 | On-demand route insertion | Approved insertion creates new route version without changing completed stops or accepted facts |
| P-08 | Cross-city scheduled | Directed lane, both timezones, segment capacity, quote, handoffs, and final status reconcile |
| P-09 | Multi-stop COD | Each stop posts one collection, preserves custodian, and balances by currency |
| P-10 | Return cross-city scheduled | Child lineage, reverse lane, window, custody, proof, charges, and parent completion rule hold |
| P-11 | Batch then route | Batch membership persists while route membership changes independently |
| P-12 | Route stop failure | Failed member opens exception; unrelated members follow configured safe continuation policy |

### 12.2 Negative and validation cases

| ID | Scenario | Assertions |
|---|---|---|
| N-01 | Both on-demand and scheduled supplied | Stable validation error; no quote, reservation, or delivery |
| N-02 | Scheduled without complete valid window/timezone | Field error; no inferred server timezone |
| N-03 | Nonexistent/ambiguous local time | Configured explicit resolution or rejection; no silent shift |
| N-04 | Inter-city without enabled directed lane | `lane_unavailable`; no downgrade to intra-city |
| N-05 | Route violates pickup-before-drop-off | Plan cannot lock or apply |
| N-06 | Route exceeds vehicle/COD/custody capacity | Constraint details returned safely; no assignment |
| N-07 | Return has wrong-tenant parent | Tenant-safe denial; no existence disclosure |
| N-08 | Return lineage cycle or duplicate active child | `409`; one active child remains |
| N-09 | Batch row overrides immutable/disallowed default | Row error with field path; other rows follow commit policy |
| N-10 | COD currency differs from unsupported lane/merchant policy | Reject before confirmation/collection |
| N-11 | Legacy `bulk_item` without batch context | Migration/compatibility error; never invent batch membership |
| N-12 | Legacy `multi_stop` without route contract | Migration/compatibility error; never hide multiple outcomes |

### 12.3 Concurrency and ordering cases

| ID | Scenario | Assertions |
|---|---|---|
| C-01 | Same batch committed concurrently | One commit result; no duplicate rows, reservations, jobs, or postings |
| C-02 | Two workers create same row | Deterministic row idempotency replays one delivery |
| C-03 | Route replan races stop completion | Completed stop/history wins; stale plan returns `409` |
| C-04 | Two dispatchers assign route/delivery | At most one active assignment; complete assignment history |
| C-05 | Reschedule races route lock | One serial order; loser sees current version and no partial reservation |
| C-06 | Duplicate return requests | Same authorization/key returns same child |
| C-07 | Return completion races parent transition | Parent records `returned` once with one event/webhook/financial trigger |
| C-08 | COD collection races delivery completion | Delivery completes only when configured collection/exception guard is satisfied |
| C-09 | Offline stop events arrive out of order | Valid duplicates replay; stale invalid events conflict and do not reorder history |
| C-10 | Lane/config version activates during confirmation | One coherent snapshot governs outcome; mixed-version decision is impossible |

### 12.4 Retry, recovery, and injected failure cases

| ID | Scenario | Assertions |
|---|---|---|
| R-01 | API timeout after delivery commit | Same key returns original delivery and tracking response |
| R-02 | Worker crash after row creation before checkpoint | Recovery discovers/replays row without duplication |
| R-03 | Atomic batch database failure | Batch remains retryable and creates no partial deliveries |
| R-04 | Capacity provider timeout | No untracked reservation; retry/manual result is explicit |
| R-05 | Routing provider timeout/malformed plan | Existing route unchanged; diagnostics redacted; manual route remains available |
| R-06 | Partner outage during inter-city handoff | Custody remains with last acknowledged party; exception and retry are durable |
| R-07 | Ledger worker fails after COD collection | Collection remains immutable, posting retries once, settlement stays blocked |
| R-08 | Outbox worker restarts | Events deliver at least once with stable event IDs and correct tenant endpoints |
| R-09 | Return saga fails after child creation | Reconciliation links existing child; retry creates none |
| R-10 | Configuration cache stale or store unavailable | Verified snapshot/safe behavior follows definition; version telemetry identifies use |
| R-11 | Route action queued offline then route replanned | Client receives replay or conflict, never forced stale mutation |
| R-12 | Rollback disables a combination with active jobs | New requests reject; accepted jobs remain operable under stored snapshot |

### 12.5 Security and privacy cases

| ID | Scenario | Assertions |
|---|---|---|
| S-01 | Tenant A queries Tenant B batch/route/return IDs | Non-disclosing denial across detail, list, export, and aggregate APIs |
| S-02 | Same IDs/keys in two tenants | No cache, idempotency, uniqueness, queue, or webhook collision |
| S-03 | Rider reads unassigned route stop | Denied; recipient/package/COD data not leaked |
| S-04 | Partner accesses delivery outside assignment | Denied and audited without revealing merchant internals |
| S-05 | Outbound tracking token used for return | No access to return; tokens and payloads remain separate |
| S-06 | Public route tracking enumeration | One token reveals one delivery only; no route sequence, other stops, or lane internals |
| S-07 | Batch error/export contains formulas or PII | Formula-neutralized, authorized, redacted, tenant-scoped, and access-audited |
| S-08 | Route provider receives payload | Only approved minimum fields; no unrelated tenant/recipient/finance data |
| S-09 | Forged tenant/parent/lane in event | Worker validates persisted ownership and dead-letters mismatch |
| S-10 | Ops cross-tenant override | Named permission, reason/step-up as configured, affected tenant, and immutable audit required |
| S-11 | Restricted return/fraud notes in webhook/tracking | Fields absent from public and general merchant payloads |
| S-12 | Configuration explanation across tenants | Effective value may be explained only within actor scope; targeting lists remain hidden |

### 12.6 Finance and reconciliation cases

| ID | Scenario | Assertions |
|---|---|---|
| F-01 | Scheduled premium plus base charge | Explicit components sum exactly and use recorded pricing/configuration versions |
| F-02 | Batch-level charge allocation | Configured allocation conserves total including deterministic rounding residual |
| F-03 | Route fee allocation | Member attribution is reproducible; route total is not an editable balance |
| F-04 | Inter-city multi-leg earnings | Each rider/partner/leg accrual is unique and reconciles to delivery and lane |
| F-05 | Multi-stop COD in one currency | Collections equal cash-in-transit and merchant payable postings by custodian |
| F-06 | Mixed-currency route | Separate per-currency transactions; no cross-currency balancing or netting |
| F-07 | Return charge and outbound refund | New linked postings/compensating entries; outbound originals remain immutable |
| F-08 | Duplicate COD/return/webhook retry | No duplicate journal source or settlement eligibility |
| F-09 | Partial route failure | Charges/earnings follow configured member outcomes; unrelated deliveries are not reversed |
| F-10 | Disputed COD on one stop | Affected payable is held; other eligible tenant/currency amounts remain independently reconcilable |
| F-11 | Settlement selection | Excludes wrong tenant, currency, held, disputed, reversed, and unposted sources |
| F-12 | End-to-end reconciliation | External order → delivery → batch/route/lineage → quote/invoice/ledger/COD/settlement/payout is complete |

### 12.7 Property, migration, and resilience cases

| ID | Scenario | Assertions |
|---|---|---|
| M-01 | Generate all dimension combinations | Only configured compatible combinations confirm; all retain base invariants |
| M-02 | Generate random cross-aggregate command sequences | No invalid adjacent lifecycle pair, history rewrite, duplicate active assignment/return, or unbalanced posting |
| M-03 | Backfill legacy on-demand/scheduled | Canonical timing equals legacy value and checksums/reconciliation pass |
| M-04 | Backfill `bulk_item` | Only records with proven batch evidence gain membership; ambiguous records quarantine |
| M-05 | Backfill `multi_stop` | Only proven route evidence maps; no recipient outcome is collapsed |
| M-06 | Forward/rollback schema compatibility | Old and new readers remain safe during the configured compatibility window |
| M-07 | Shadow eligibility evaluation | Legacy and canonical decisions compare by tenant/config snapshot; differences are explainable |
| M-08 | High-volume scheduled batch/routes | Configured objectives met without tenant starvation or lost reservations |
| M-09 | City/tenant noisy neighbor | Rate limits, queues, caches, and workers preserve configured fairness |
| M-10 | Backup/restore during active combinations | Status, route, batch, lineage, custody, ledger, outbox, and idempotency reconcile after restore |

## 13. Release gates and acceptance criteria

A cross-mode capability is releasable only when:

- its compatibility, eligibility, configuration scopes, and safe disabled behavior are documented;
- canonical dimensions are represented without weakening the base lifecycle;
- OpenAPI, event, consumer, migration, and legacy-compatibility tests pass;
- positive, negative, concurrency, retry, failure, tenant-isolation, security, finance, and reconciliation suites pass for the enabled combinations;
- every accepted delivery records enough versioned facts to reproduce eligibility, promise, routing constraints, and financial attribution;
- rollback blocks new use safely while preserving active accepted work;
- unsupported combinations fail clearly and never silently downgrade;
- no batch, route, inter-city leg, return, partner, or public token crosses a tenant boundary;
- all ledger transactions remain immutable, balanced by currency, idempotent, and reconcilable;
- open proposals XM-001 through XM-005 are either approved in the [decision register](../decision-register.md) and reflected in authoritative contracts, or the affected combination remains disabled.

