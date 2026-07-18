# 09 — Partner Fleet Management

## Purpose

Integrate third-party delivery companies into the hybrid fleet while retaining platform-level service, custody, security, and audit guarantees. Partners receive eligible jobs, accept or decline, assign their internal riders, publish normalized status/location/proof events, and reconcile earnings without gaining tenant-wide access.

## Boundaries

**Owns:** partner organization onboarding, contracts/capabilities, city/zone coverage, partner credentials, job offers, partner acceptance, internal-rider references, event normalization, service health, and partner operational portal/API.

**Does not own:** merchant quote calculation, global dispatch strategy, owned riders, delivery state machine authority, partner payroll, merchant COD payable, or final settlement ledger logic. The platform remains authoritative for delivery and financial state.

## Actor flows

### Partner onboarding

1. Platform admin creates a partner organization and records legal/compliance approval.
2. Partner admin configures operational contacts, webhook/API credentials, cities/zones, products, vehicles, capacity, hours, and status/proof capabilities.
3. Platform validates coverage and activates a contract version with effective dates and commercial references.
4. A sandbox/certification flow verifies signatures, idempotency, status ordering, and retries before production activation.

### Offer and fulfillment

1. Dispatch selects an eligible partner and sends a signed offer containing minimum necessary job details and response deadline.
2. Partner accepts or declines idempotently. Acceptance creates a partner assignment reservation.
3. Partner binds an internal rider reference within the configured deadline and may expose only display name/phone/location allowed by contract and consent.
4. Partner sends normalized pickup, transit, delivery, failure, location, and proof events. Platform validates and applies them to its state machine.
5. Completion feeds partner earnings/settlement modules; disputes retain the original event trail.

### Operations intervention

Ops can withdraw an unaccepted offer, release/reassign before pickup, suspend a partner/city lane, or manually map a delayed event. Soft overrides require reason; custody changes after pickup use the exception/handoff process.

## Data model and constraints

- `FleetPartner`: tenant-like organization, legal/compliance status, operational status, contacts, data-sharing policy.
- `PartnerContractVersion`: effective interval, covered products/cities/zones, service levels, commercial reference, COD/proof/location obligations.
- `PartnerServiceArea`: city, zone set or polygon reference, hours, capacities, vehicle/package limits.
- `PartnerCredential`: credential type, secret/public-key reference, scopes, expiry, rotation state; secrets are shown once.
- `PartnerOffer`: delivery, partner, payload version, deadline, status, response/reason, idempotency key.
- `PartnerAssignment`: platform assignment ID, partner job ID, optional partner rider reference/display fields, accepted/bound timestamps, status.
- `PartnerEvent`: partner event ID, type, source timestamp, received timestamp, normalized payload, validation/application status, rejection reason.
- `PartnerHealth`: derived acceptance, latency, event quality, capacity, and suspension state by lane.
- A partner job ID is unique within a partner. Partner event ID is unique within partner and deduplicates callbacks.
- Coverage must explicitly include origin city/zone and product; inter-city jobs require an enabled origin-destination lane.
- Partner assignment cannot create a second active delivery assignment.

## API surface

Partner-authenticated:

- `GET /v1/partner/offers` and `GET /v1/partner/offers/{id}`.
- `POST /v1/partner/offers/{id}/accept|decline`.
- `POST /v1/partner/assignments/{id}/rider`.
- `POST /v1/partner/assignments/{id}/events` for normalized status/location/proof metadata.
- `GET /v1/partner/assignments` and settlement-statement views.

Admin/ops:

- CRUD/read partner profile, credentials, contract versions, coverage/capabilities, activation/suspension.
- Offer, assignment, event, and health inspection.

Outbound partner integrations use signed webhooks or an adapter for partner-specific APIs. Payloads are versioned; authentication supports scoped API keys and preferably asymmetric signing/mTLS for high-trust integrations. `409` represents stale/duplicate-conflicting actions; invalid transitions return `409`; malformed or unsupported events return `422`.

## Algorithms and rules

Partner eligibility requires active compliance/contract, healthy lane, explicit product/city/zone coverage, current capacity, required status/location/proof capability, and package/COD support. Dispatch ranks eligible partners alongside owned fleet according to the hybrid strategy; this module returns facts and health signals, not the final choice.

Clearly configurable values:

- offer response and rider-binding deadlines
- allowed cities, zones, inter-city lanes, hours, products, package limits, and COD limits
- concurrent/daily capacity by lane
- required event types, maximum event lateness, and proof/location obligations
- acceptable acceptance/completion/error rates and circuit-breaker thresholds
- retry schedule, signature clock skew, and credential rotation window
- partner fallback order and cost/SLA inputs exposed to dispatch
- data fields shared with each partner

Events are ordered by source occurrence time plus authoritative state version, never arrival time alone. A late valid event may enrich history but cannot regress delivery state. Partner-specific statuses are mapped in an adapter to canonical statuses; unknown values quarantine for review.

## State transitions

Partner lifecycle: `draft -> certification -> active -> suspended -> active | terminated`.

Offer: `created -> sent -> accepted | declined | expired | withdrawn`.

Partner assignment: `reserved -> rider_pending -> active -> completed | released | failed`.

Partner events: `received -> validated -> applied | ignored_duplicate | quarantined | rejected`.

Delivery transitions remain authoritative in the platform. Partner `picked_up`, `in_transit`, and `delivered` events invoke the same guarded commands used by owned riders. Partner events can never bypass required proof or move a terminal delivery backward.

## UI touchpoints

- Partner portal: incoming offers, response countdown, active jobs, internal-rider binding, status/proof actions, and earnings statements.
- Admin: onboarding checklist, compliance, contracts, coverage map, credentials, certification, and suspend controls.
- Ops: partner availability/health, offer timeline, assigned partner/rider reference, stale-event alerts, and manual fallback.
- Merchant/tracking: normalized fleet/rider display only; partner identity/branding is shown according to business and contract policy.

## Security and privacy

Partner credentials are scoped to that organization and least-privilege endpoints, hashed/encrypted, rotatable, and revocable. Requests/events are signed, timestamp-checked, rate-limited, and replay-protected. Partners receive job data only after an offer and only fields needed to evaluate/fulfill it; sensitive recipient details may be withheld until acceptance. Partner admins cannot access other partners or merchant financial/configuration data. Rider personal data and raw location sharing follow explicit purpose, consent, retention, and contract terms. Every credential, coverage, status mapping, and manual override change is audited.

## Failures and retries

Outbound offers use an outbox, stable event ID, signed payload, exponential backoff, and deadline. Duplicate accept/event calls return the original result. Timeout withdraws/resolves the offer before dispatch falls back. Partner outage or error-rate threshold opens a lane-specific circuit breaker and alerts ops. Events received out of order are retained, deduplicated, and safely applied or quarantined. A status acknowledgment is not sent until durable receipt. Credential rotation supports overlap to prevent downtime. Manual portal actions remain available when a machine integration is degraded.

## Metrics and observability

Track offers, accept/decline/timeout rates, response and rider-binding latency, completion/failure/on-time rates, event delay/order/duplicate/rejection rates, proof/location compliance, active capacity, circuit state, partner-versus-owned share, reassignments, and disputes. Correlate logs by delivery, partner, offer, assignment, partner job/event ID, lane, and payload version. Publish partner scorecards and alert on SLA degradation, missing events, signature failures, capacity anomalies, and certification/credential expiry.

## Phase boundaries

- **Phases 1–2:** assignment model reserves an assignee type and manual external-provider notes only; no production partner access.
- **Phase 3:** API/webhook foundations and sandbox patterns may be reused, but partner operations remain deferred.
- **Phase 4:** partner onboarding, portal/API, certification, hybrid dispatch, multi-city lanes, normalized events, and settlement integration.

No Phase 4 partner event may weaken the canonical lifecycle, proof, audit, or tenant isolation established earlier.

## Acceptance criteria

- A partner can receive and act only on offers addressed to it and within its active coverage/capabilities.
- Duplicate offers, acceptances, and events are idempotent; conflicting duplicates are rejected.
- Exactly one platform assignment remains active even under partner and owned-fleet races.
- Partner statuses map to canonical transitions and cannot regress or skip required platform checks.
- Ops can suspend a degraded partner/lane and manually redirect unpicked jobs with a reason.
- Inter-city work requires an explicit enabled lane and capability.
- Secrets rotate/revoke safely, signatures are replay-protected, and cross-partner access is denied.
- Partner event delay, health, proof/location compliance, and assignment history are observable and auditable.
