# 10 — Live Tracking and ETA

## Purpose

Provide operations, merchants, riders, partners, and recipients with a privacy-conscious view of delivery progress and an explainable ETA. Collect rider location at controlled intervals, normalize owned/partner signals, calculate route-based ETA through a maps provider adapter, and publish only the precision appropriate to each audience.

## Boundaries

**Owns:** location-ingestion policy, location records, freshness/quality, active-trip projection, ETA calculation/versioning, map-safe tracking payloads, and stale/no-movement signals.

**Does not own:** rider availability, dispatch choice, canonical delivery status, provider-specific SDK behavior, exception resolution, or notifications. It emits facts/signals consumed by dispatch and exceptions.

## Actor flows

### Owned rider tracking

1. Rider app starts an authorized tracking session when online or assigned, according to consent and city policy.
2. App sends batched location samples at server-controlled foreground/background intervals, including sample time, accuracy, speed/heading where available, and sequence.
3. Server authenticates the rider/device, validates bounds and plausibility, associates samples with active assignments, and stores accepted points.
4. On relevant movement/status/interval triggers, the ETA service requests a route estimate via the maps adapter and updates projections.
5. Ops sees precise/fresh operational location; merchant and public tracking receive reduced precision and cadence.

### Partner tracking

Partner events pass through the partner adapter with partner rider/assignment identity, source timestamp, accuracy where known, and consent/contract constraints. They enter the same normalized freshness and ETA pipeline but retain source metadata and trust level.

### Recipient tracking

The unguessable tracking token returns status, ETA range/text, last-updated time, and a privacy-filtered map position only during configured delivery stages. After completion/cancellation, live position disappears and a terminal summary remains.

## Data model and constraints

- `TrackingSession`: rider/device, assignment context, purpose, consent/policy version, start/end times, state.
- `RiderLocation`: rider, optional assignment, sampled/received times, encrypted coordinates, accuracy, speed/heading, source, sequence, quality flags.
- `DeliveryTrackingProjection`: delivery, current status, source/freshness, privacy-filtered location, route progress, ETA lower/upper/point, confidence, calculation time/version.
- `EtaEstimate`: origin/destination or route reference, maps result metadata, traffic mode, inputs hash, output duration/distance, confidence, expiry.
- `LocationPolicy`: audience, stage, city, foreground/background interval, precision, retention, and maximum age.
- Samples are unique by rider/device/session/sequence. Server records received time but preserves source sample time.
- Coordinates must be valid; implausible jumps, future timestamps, excessive age, or impossible speed are flagged/rejected according to policy.
- Raw location is append-only during retention. Public/merchant projections are derived and never expose historical trails.
- ETA uses a route destination appropriate to state: pickup before `picked_up`, drop-off afterward.

## API surface

- `POST /v1/riders/me/locations` — batched, sequence-based samples and returned next recommended interval.
- `POST /v1/partner/assignments/{id}/locations` or normalized partner events.
- `GET /v1/ops/tracking/deliveries/{id}` — precise authorized operational projection/history window.
- `GET /v1/deliveries/{id}/tracking` — tenant-filtered projection.
- Existing `GET /v1/track/{token}` includes status, ETA, freshness, and privacy-filtered current location.
- Internal maps adapter: route distance/duration, optional traffic-aware ETA, provider result ID/quality.

Ingestion acknowledges the highest durable sequence. Partial batch errors identify rejected samples. Rate violations return `429` with the next permitted interval.

## Algorithms and rules

The server chooses a controlled collection interval from delivery state, movement, battery/network hints, and policy. The client may collect more conservatively for device health but must not transmit more frequently than instructed.

Illustrative policy:

- offline/no assignment: no background collection
- online awaiting work: low-frequency or no collection per dispatch need
- approaching pickup/in transit: higher frequency
- stationary or app background: adaptive lower frequency
- terminal/no active work: stop session

ETA combines current accepted location, route to the next stop, traffic where available, stop service time, and confidence based on sample age/accuracy/provider quality. Public ETA should be a range or rounded time, not false precision. Recalculate only when minimum time, movement, route deviation, or status trigger is met to control cost.

Clearly configurable values:

- foreground/background intervals by state, with minimum/maximum bounds
- sample batch size, accepted age, clock skew, accuracy threshold, and maximum plausible speed
- freshness labels and stale/no-movement thresholds
- ETA recalculation interval, movement distance, deviation threshold, and cache TTL
- public/merchant/ops coordinate precision and update cadence
- stages during which each audience may see a map
- raw and derived location retention
- maps timeout/fallback, traffic usage, and provider per-city
- stop service-time assumptions and ETA confidence bands

All provider calls go through a stable maps adapter. Provider migration must not change public contracts.

## State transitions

Tracking session: `created -> active -> paused -> active | ended`; suspension/terminal work ends or pauses according to safety policy.

Location sample: `received -> accepted | rejected | quarantined`; accepted points may be `fresh -> stale -> expired` as time passes.

ETA projection: `unavailable -> calculating -> current -> stale -> unavailable`; stale estimates remain labeled and never silently appear current.

Delivery state drives visibility:

- before `assigned`: no rider position
- `assigned`/`rider_arriving_pickup`: pickup-bound ETA under configured disclosure
- `picked_up`/`in_transit`: drop-off ETA/location
- terminal states: live location removed; proof/status summary remains

## UI touchpoints

- Rider app: explicit location permission rationale, current tracking indicator, network/GPS warnings, and server-directed update behavior.
- Ops live map: owned/partner source, precise location, accuracy, freshness, ETA confidence, route, and no-movement warning.
- Merchant delivery detail: coarser map, last updated, ETA range, and stale label.
- Public tracking: privacy-filtered map/last location, status stepper, ETA text/range, and no internal rider history.
- Admin system health: maps usage, provider errors, ingestion lag, and policy configuration.

## Security and privacy

Location collection is purpose-limited, consent/policy-versioned, and restricted to operational periods. Raw coordinates are encrypted, access-controlled, audited, retained briefly, and excluded from routine logs/analytics. Public tokens are unguessable, rate-limited, revocable, and reveal no phone, home/base, historical trail, partner internals, or exact location outside allowed stages. Ops precision is role-gated; merchant access is tenant-scoped. Prevent tracking-token indexing/referrer leakage and use no-store/private cache policy where appropriate.

## Failures and retries

The app queues a bounded encrypted local batch during network loss and retries with the same session/sequence IDs. Server deduplicates and accepts out-of-order samples within the age window. Maps failures use a recent estimate or configured distance/speed fallback labeled low confidence; status tracking continues without ETA. Provider adapter uses timeout, bounded transient retries, cache, and circuit breaker. Partner gaps mark source stale and alert ops. Bad GPS is quarantined without ending the trip. Ingestion and projection update are decoupled so ETA failure cannot lose location data.

## Metrics and observability

Track active sessions, samples/rider/minute, accepted/rejected/duplicate/late rates, ingestion and projection lag, location freshness by fleet source, GPS accuracy, ETA availability/confidence/error against actual arrival, maps calls/cache/latency/errors/cost, public tracking traffic, stale/no-movement alerts, and policy violations. Correlate by delivery/assignment/session and use coarse geography in analytics. Alert on systemic freshness drops, ingestion backlog, maps circuit opening, abnormal sampling volume, and unauthorized access.

## Phase boundaries

- **Phase 1:** status-only public tracking and stub ETA text; rider navigation deep-links to an external maps app.
- **Phase 2:** controlled owned-rider location ingestion, maps adapter, live ops/public views, freshness, ETA, and no-movement signals.
- **Phase 3:** white-label tracking and notification-facing ETA contracts.
- **Phase 4:** normalized partner location, multi-stop/inter-city ETA, city-specific providers/policies, and advanced prediction.

Phase 1 tracking token and payload must allow additive Phase 2 fields without exposing provisional precision.

## Acceptance criteria

- Location transmission follows server-controlled bounded intervals and stops when policy no longer permits it.
- Duplicate/out-of-order batches do not duplicate points or regress the current projection.
- Ops, merchant, and public audiences receive distinct configured precision/cadence.
- Terminal deliveries expose no live rider location.
- Stale or fallback ETA is visibly labeled and never represented as current/high confidence.
- A maps provider can be replaced through the adapter without changing domain/public schemas.
- Owned and partner samples normalize to one projection while preserving source/trust metadata.
- Raw location access and retention are controlled, auditable, and absent from normal logs.
