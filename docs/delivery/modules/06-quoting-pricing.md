# 06 — Quoting and Pricing

## Purpose

Produce a reproducible delivery price and service promise before a merchant confirms a job. A quote answers whether the route is serviceable, which delivery products are available, the fee breakdown, currency, expiry time, and the assumptions used. The accepted quote becomes the immutable commercial basis of the delivery charge.

## Boundaries

**Owns:** address/zone eligibility checks, distance-duration lookup through the maps adapter, pricing-rule selection, surcharge/discount calculation, quote expiry, quote acceptance validation, and pricing explanations.

**Does not own:** dispatch capacity reservation, rider/partner compensation, COD settlement, invoice collection, route optimization, or final ETA after assignment. Capacity signals may make an option unavailable but do not reserve a rider.

## Actor flows

### Merchant quote and confirmation

1. Merchant submits business, pickup/drop-off coordinates, packages, mode, requested window, and optional COD amount.
2. The service validates tenant access and resolves each coordinate to a city and active service zone.
3. The maps provider adapter returns normalized route distance and duration; straight-line distance is never used for billing except an explicitly marked fallback.
4. Active, effective-dated pricing rules are selected for the business/city/zone/product.
5. The engine returns one or more options with breakdown, expiry, assumptions, and a `quote_id`.
6. Merchant creates the delivery referencing the quote. The server verifies ownership, request equivalence, expiry, and that the quote is unused or reusable under policy.
7. The quoted amount is copied to the delivery and an immutable `delivery_fee_quoted` ledger entry is posted when the job is confirmed.

### Pricing administrator

1. Admin drafts a versioned rule set, previews it against sample routes, and publishes it with an effective time.
2. Existing quotes retain their rule snapshot; new quotes use the published version.
3. Admin may deactivate a broken rule set and select a replacement. This does not rewrite accepted prices.

### Operations override

Authorized ops may override an accepted charge with a reason and supporting note. The original quote remains intact; adjustment ledger entries record the delta and audit event. Overrides do not mutate a historical quote.

## Data model and constraints

- `PricingRuleSet`: `id`, scope (`platform`, `business`, `city`, `zone`), currency, priority, effective interval, status, version, created/published actors. Effective intervals at the same scope and priority must not overlap.
- `PricingRule`: base fee, included distance/time, per-distance and per-time rates, minimum/maximum fee, package thresholds, service mode, COD handling fee, surge/surcharge definitions, tax policy, and rounding policy.
- `Quote`: tenant/business, normalized input hash, route metrics, city/zone IDs, currency, subtotal, adjustments, tax, total, expiry, pricing version, map provider result reference, status, and timestamps.
- `QuoteLine`: typed amount (`base`, `distance`, `time`, `weight`, `zone`, `scheduled`, `COD`, `surge`, `discount`, `tax`, `rounding`) with rule reference and human-readable explanation.
- Money uses integer minor units plus ISO 4217 currency. A quote contains exactly one currency; totals equal the sum of lines.
- Distances are stored in meters and durations in seconds. Weight is stored in grams. Inputs and outputs state units explicitly.
- Coordinates must resolve to one active city and at least one eligible zone. Ambiguous overlapping zones use deterministic priority, then the smallest containing polygon.
- Quote IDs are unguessable and tenant-bound. The input hash covers commercially material fields so a quote cannot be attached to a changed delivery.
- Published rule versions and accepted quote snapshots are immutable.

## API surface

The existing `POST /v1/quotes` is expanded to accept `businessId`, pickup/drop-off, packages, mode, requested window, and COD. It returns `quoteId`, options, route metrics, zones, line-item breakdown, currency, `expiresAt`, and assumptions.

Related surfaces:

- `POST /v1/deliveries` accepts `quoteId`; remains idempotent through `Idempotency-Key`.
- `GET /v1/quotes/{quoteId}` retrieves a tenant-owned quote.
- Admin: list, preview, create, publish, and retire versioned pricing rule sets.
- Ops: `POST /v1/ops/deliveries/{id}/price-adjustments` with amount, reason code, and note.

Expected errors include `422 OUTSIDE_SERVICE_AREA`, `422 UNSUPPORTED_PACKAGE`, `409 QUOTE_EXPIRED`, `409 QUOTE_INPUT_MISMATCH`, `409 PRICING_VERSION_UNAVAILABLE`, and `503 ROUTING_UNAVAILABLE`.

## Algorithms and rules

Rule precedence is: business-zone override, business-city override, business default, platform-zone, platform-city, platform default. Within a scope, highest priority wins; equal priority is rejected at publish time.

Price calculation is deterministic:

`subtotal = base + excess_distance + excess_duration + package + mode + zone + COD + active_surcharges - discounts`

Tax and rounding are then applied according to the published rule snapshot. A configured minimum is applied before tax; an optional cap is applied only when the selected product allows it.

Clearly configurable values:

- `QUOTE_TTL_SECONDS`
- included and billable distance/time units and rates
- minimum/maximum charge
- package weight/dimension thresholds
- COD fee fixed/rate/cap
- scheduled, cross-zone, cross-city, weather, demand, and after-hours surcharges
- tax rate/inclusion policy and monetary rounding increment
- rule precedence priorities
- maps timeout, cache TTL, and permitted fallback multiplier
- maximum route distance/duration per product

Multi-city routes require both cities to be enabled for the product and an explicit inter-city rule. Absence of that rule means unavailable, not zero-priced. Maps access is exclusively through a provider adapter exposing geocode, route distance/duration, and provider metadata. Provider-specific response fields never enter the pricing domain.

## State transitions

Quote states: `draft -> priced -> accepted | expired | invalidated`.

- `priced -> accepted` occurs atomically with confirmed delivery creation.
- `priced -> expired` occurs logically at `expires_at`; a sweeper may materialize the state later.
- `priced -> invalidated` is reserved for fraud, malformed map data, or emergency rule withdrawal.
- Repeated acceptance for the same idempotent delivery request returns the original result. A quote cannot be accepted by another tenant or materially different request.

Delivery lifecycle remains `draft -> quoted -> awaiting_dispatch`; accepting a quote must not skip or alter the authoritative delivery state machine.

## UI touchpoints

- Merchant create-delivery screen: service options, itemized fee, route assumptions, expiry countdown, and clear refresh action.
- Merchant delivery detail: accepted quote and later adjustments shown separately.
- Admin pricing rules: scope, versions, effective dates, test calculator, validation conflicts, and publish/retire controls.
- Ops delivery detail: price snapshot and permission-gated adjustment dialog requiring a reason.
- API documentation: units, idempotent confirmation example, errors, and line-item schema.

## Security and privacy

Tenant authorization applies before quote lookup or calculation. Contact names, phone numbers, and free-form notes are not required for quoting and should not be stored in quote inputs. Logs use rounded/redacted coordinates and never expose API keys. Pricing administration and overrides require least-privilege roles and audit records. Public tracking never exposes fee details. Rate-limit quote generation by business/API key and detect high-volume coordinate enumeration.

## Failures and retries

- Maps calls use bounded timeout and retry only transient/time-out responses with jitter. Circuit breaking prevents provider failure from exhausting workers.
- A cached route may be used only within configured age and coordinate tolerance and must be identified in quote assumptions.
- A configured fallback estimate may support a provisional quote; it must be labeled and can be disabled per city/product.
- Pricing evaluation is side-effect free, so clients may retry. Quote persistence and delivery confirmation are transactional.
- Rule publication validates gaps, overlaps, currencies, negative totals, and unreachable caps before activation.
- Ledger posting uses an outbox/idempotent consumer so retry cannot duplicate the charge.

## Metrics and observability

Measure quote request rate, success/unserviceable/error ratios, p50/p95 latency, map-provider latency/error/cache-hit rates, quote-to-delivery conversion, expiry rate, fee distribution by city/product, override count/value, fallback use, and pricing rule/version usage. Structured logs carry `request_id`, `business_id`, `quote_id`, rule version, city/zone IDs, and map adapter result ID without raw personal data. Alert on pricing error spikes, missing active rules, excessive fallback use, and material fee-distribution shifts.

## Phase boundaries

- **Phase 1:** zone eligibility and clearly marked distance stub, quote record, quote reference on delivery, and quoted-fee ledger stub.
- **Phase 2:** production maps adapter, versioned pricing engine, breakdowns, admin pricing UI, controlled operational adjustments.
- **Phase 3:** business-specific contracts, promotions where approved, API/sandbox examples, and invoice presentation.
- **Phase 4:** scheduled/multi-stop/inter-city products, demand-aware rules, partner-commercial inputs, and advanced simulations.

Phase 1 interfaces must retain IDs, units, and snapshots needed for later phases; provisional calculations must never be presented as production route precision.

## Acceptance criteria

- Same normalized input and rule/map snapshot produces the same amount and breakdown.
- Outside-zone, unsupported multi-city, and package-limit requests return stable machine-readable errors.
- A quote cannot be accepted after expiry, across tenants, or with materially changed delivery fields.
- Delivery confirmation stores the quote snapshot and posts exactly one quoted-fee ledger entry under retries.
- Published pricing rules and accepted quotes cannot be edited in place.
- Admin can preview and publish a non-overlapping effective-dated rule set.
- An authorized override preserves the original charge, records an adjustment, and creates an audit event.
- Map-provider substitution requires no pricing-domain schema change.
