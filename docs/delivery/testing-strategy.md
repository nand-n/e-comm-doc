# Delivery Platform Testing Strategy

## 1. Purpose and principles

This strategy defines how the multi-tenant Delivery-as-a-Service platform is verified from isolated domain logic through production-like end-to-end journeys. Tests protect delivery-state correctness, tenant isolation, financial integrity, integration compatibility, mobile reliability, and safe operations.

Principles:

- Test externally visible behavior and domain invariants, not implementation details.
- Keep the test pyramid broad at unit and contract levels and selective at end-to-end level.
- Make tests deterministic: freeze time, seed randomness, isolate networks, and control concurrency.
- Treat tenant isolation and financial invariants as release-blocking properties.
- Exercise retries, duplicate delivery, reordering, timeout, partial failure, and recovery.
- Use production-compatible schemas and protocols without using production personal data or secrets.
- Require every threshold, timeout, retry count, load target, error budget, data volume, clock tolerance, retention period, and pass/fail boundary in test infrastructure and scenarios to be configurable.

## 2. Test levels and ownership

| Level | Primary purpose | Typical owner | Execution |
|---|---|---|---|
| Unit | Pure rules, validation, calculations, authorization predicates | Module team | Every change |
| State-machine / property | Lifecycle transitions and invariants over generated sequences | Delivery team | Every change |
| Contract | OpenAPI, event schemas, consumer expectations, compatibility | API and integration teams | Every change |
| Integration | Database, queues, caches, object storage, providers | Module team | Every change and nightly |
| Tenant isolation | Prevent cross-tenant reads, writes, inference, and cache leakage | Security and module teams | Every change |
| Webhook | Signing, retries, ordering, replay, endpoint behavior | Integration team | Every change |
| Finance invariant | Ledger balance, idempotency, reconciliation, settlement | Finance platform team | Every change |
| Mobile / offline | React Native rider behavior, native integrations, and conflict-aware offline operation | Rider team | Every change and device matrix |
| Load / resilience | Capacity, latency, saturation, degradation, recovery | Platform team | Scheduled and pre-release |
| End-to-end | Critical actor journeys across deployed components | Quality owners | Pre-merge smoke and pre-release |

## 3. Unit testing

Unit tests cover:

- Input validation and normalization for addresses, packages, money, timestamps, IDs, and phone/contact fields.
- RBAC and scope predicates for platform, tenant, rider, partner, operations, and finance actors.
- Quote and pricing calculations using exact decimal or minor-unit arithmetic.
- Idempotency request hashing and same-key/different-body conflict behavior.
- Configuration precedence, feature-flag evaluation, and safe defaults.
- Risk rules, score bands, hold logic, and reason codes.
- Webhook canonicalization and signature generation/verification.
- ETA, zone, assignment, cancellation, return, and proof eligibility rules.
- Serialization, redaction, and public-tracking data minimization.

Each branch of domain logic includes positive, boundary, negative, and malformed-input cases. Time-sensitive tests use an injected clock. Random or percentage behavior uses seeded generators. Configurable thresholds are tested below, at, and above the configured boundary rather than copied as fixed assumptions.

## 4. Delivery state-machine testing

The authoritative lifecycle is:

`draft → quoted → awaiting_dispatch → assigned → rider_arriving_pickup → picked_up → in_transit → delivered`

Terminal and exception states are `cancelled`, `delivery_failed`, and `returned`, with allowed transitions defined in `contracts.md`.

Tests must verify:

- Every documented transition succeeds for an authorized actor.
- Every undocumented transition returns `409` and leaves state, assignment, ledger, and outbox unchanged.
- Each successful transition appends exactly one immutable status event with time, actor, optional location, and reason.
- Repeating a command with the same idempotency key returns the original outcome.
- Concurrent transitions serialize to one valid history; losers receive a conflict and cannot overwrite it.
- Cancellation, failure, and return rules respect actor, phase, proof, and configurable policy.
- Event publication occurs only after the state transaction commits.

Property-based tests generate long command sequences and assert that history begins from a valid state, every adjacent pair is allowed, terminal-state rules hold, timestamps are ordered under the configured clock policy, and no deleted or rewritten history appears. Model-based tests compare the implementation to a small reference state machine.

## 5. API and event contract testing

### 5.1 REST/OpenAPI

- Validate requests and responses against `openapi.yaml`.
- Verify status codes, content types, required headers, pagination, filtering, error shape, and redaction.
- Verify `Idempotency-Key` behavior and `409` conflicts.
- Run compatibility checks so additive changes remain backward compatible and breaking changes require a new API version.
- Generate SDK or client fixtures from the committed schema where practical, then run them against the service.

### 5.2 Events

- Validate envelope and payload against versioned schemas.
- Require event ID, type, version, occurred time, tenant context where applicable, aggregate ID, and correlation ID.
- Test unknown additive fields, unknown event versions, duplicates, delayed messages, and out-of-order delivery.
- Prove consumers are idempotent and do not assume queue order across partitions.
- Use consumer-driven contracts for internal consumers and merchant webhook payloads.

Contract artifacts are immutable once released. Compatibility policy, supported versions, deprecation window, and schema-check severity are configurable.

## 6. Integration testing

Integration suites run against real, ephemeral instances of the relational database, queue or outbox worker, cache, and object storage emulator where available. Provider boundaries use protocol-faithful fakes plus a smaller sandbox suite against actual third-party test environments.

Scenarios include:

- Transaction commit/rollback and outbox atomicity.
- Database constraints, optimistic concurrency, indexes, and tenant filters.
- Migration from the oldest supported schema version to the current version.
- Cache miss, stale entry, invalidation, restart, and failover behavior.
- Queue redelivery, worker crash after side effect, dead-letter routing, and replay.
- Proof upload, checksum, authorization, expiry, and object deletion.
- Notification, map, identity, payment, and webhook-provider timeout or malformed response.
- Service restart during delivery transition, assignment, ledger posting, and settlement.

All external failures are injected using configurable latency, error rate, retry, and outage profiles.

## 7. Tenant-isolation testing

Tenant-isolation tests are mandatory and release-blocking. At minimum, create two unrelated tenants plus platform, partner, rider, and public-tracking identities.

Verify isolation across:

- API resource identifiers, list filters, search, pagination cursors, exports, and aggregates.
- Database queries, joins, uniqueness rules, row-level controls if used, and background jobs.
- Idempotency keys, cache keys, object-storage paths, queue messages, logs, metrics, and traces.
- API keys, webhook endpoints, configuration, flags, risk cases, reports, invoices, COD, and settlements.
- Rider assignments shared operationally but not exposed beyond authorized delivery context.
- Public tracking tokens, including attempts to enumerate or substitute tokens.

Tests replace a valid resource ID with another tenant's ID and assert a non-disclosing denial with no side effect. Property-based authorization tests generate actor/resource/action combinations. Cache and job tests deliberately reuse identical external order IDs and idempotency keys across tenants to prove scoping.

## 8. Webhook testing

Webhook tests verify:

- HMAC uses the exact timestamp and raw request body required by the contract.
- Signature and timestamp headers are present; altered body, signature, or timestamp fails verification.
- Replay outside the configurable tolerance is rejected by reference consumers.
- Successful deliveries are not retried.
- Timeout, connection reset, redirect, rate limit, and configurable server-error responses follow the configured backoff and retry policy.
- Duplicate attempts retain the same event identity and unique attempt identity.
- Dead-letter routing occurs after the configured attempt or age threshold.
- Replay from logs or dead letter is authorized, audited, and idempotent.
- Secret rotation supports the configured overlap window without exposing either secret.
- One slow or failing endpoint does not block another tenant.
- Out-of-order delivery is tolerated and payload versions remain compatible.

A local webhook receiver records raw bytes, headers, timing, and responses. Fuzz tests cover invalid URLs, oversized responses, TLS errors, DNS changes, and restricted network destinations.

## 9. Finance-invariant testing

Financial tests use integer minor units or approved decimal arithmetic and never binary floating point.

Required invariants:

- Ledger entries are append-only and immutable.
- Every balanced transaction has equal debits and credits in the same currency.
- Repeating the same business operation never posts duplicate entries.
- A confirmed delivery fee, COD collection, adjustment, refund, rider earning, partner earning, settlement, and reversal each have a unique source reference.
- Account balance equals the sum of posted entries at any point in replay.
- Settlement cannot exceed eligible payable balance or include held, reversed, wrong-tenant, or wrong-currency entries.
- Reversal links to the original entry and does not edit it.
- Failed transactions leave neither partial ledger rows nor side effects.
- Reconciliation totals equal source-operation totals, with documented treatment of pending and disputed items.
- Rounding follows configurable currency rules and conserves value.

Property-based tests generate deliveries, COD amounts, fees, adjustments, retries, failures, and settlement batches, then replay the ledger in different valid event orders. Concurrency tests race duplicate collection and payout commands. Golden reconciliation fixtures cover configurable currencies, precision, rounding modes, limits, and date boundaries.

## 10. Rider mobile and offline testing

Test the React Native rider application on a configurable supported physical-device, simulator/emulator, mobile operating-system, screen-size, language, and accessibility matrix. Browser testing applies to React web surfaces separately and is not a substitute for native-device validation.

Scenarios include:

- Fresh install, upgrade, expired session, background/resume, and storage pressure.
- Signed development/release-like builds, Expo/prebuild output, native module compatibility, update-channel behavior, and rollback.
- Online to offline transitions before, during, and after a status action.
- Queued command retry with stable idempotency identity after reconnect.
- Duplicate taps, app restart, process termination, and concurrent use on two devices.
- Server state advancing while an offline command is queued; the client surfaces conflict and refreshes rather than forcing stale state.
- Delayed, denied, inaccurate, or spoof-suspected location.
- Camera or signature permission denial, interrupted proof upload, compression, checksum, and retry.
- Low bandwidth, high latency, packet loss, captive portal, and intermittent connectivity.
- Accessible controls, readable status, touch targets, localization, time zones, and right-to-left layouts where supported.

Offline duration, queue size, retry timing, media size, location accuracy, and bandwidth profiles are configurable. No client test may assume an unlimited offline queue or silent conflict resolution.

## 11. Load, resilience, and soak testing

Workload models represent quote bursts, delivery creation, dispatcher reads, rider status updates, location updates, public tracking, webhook fan-out, reports, and settlement batches. Tenant distribution includes ordinary tenants and configurable high-volume tenants without allowing one tenant to monopolize shared capacity.

Tests measure:

- Throughput and latency percentiles by endpoint and operation.
- Database connections, locks, query latency, queue depth, worker lag, cache behavior, CPU, memory, and network.
- Per-tenant fairness, rate limits, backpressure, and noisy-neighbor impact.
- Recovery after database failover, cache loss, worker restart, provider slowdown, and webhook endpoint failure.
- Memory/resource leaks and queue growth during configurable soak periods.
- Autoscaling and degradation behavior at configurable saturation points.

Load volumes, ramp shape, concurrency, payload mix, geographic latency, test duration, service objectives, and pass/fail thresholds are environment-specific configuration. Tests must not encode production capacity as a permanent constant. Results include the tested configuration and software version.

## 12. End-to-end journeys

Keep E2E coverage focused on critical outcomes:

1. Merchant registers, creates a business and branch, obtains a quote, creates an idempotent delivery, and receives a tracking URL.
2. Dispatcher assigns a rider; rider advances through pickup and delivery; recipient sees a safe public timeline.
3. Merchant receives correctly signed lifecycle webhooks and can replay a failed delivery.
4. Invalid lifecycle action is rejected without partial side effects.
5. Merchant cancels within allowed policy and receives the expected webhook and financial treatment.
6. Delivery with COD produces correct collection, payable, hold if applicable, settlement, and reconciliation records.
7. Proof capture is authorized and becomes available only to permitted actors.
8. Tenant A cannot access Tenant B through APIs, UI, exports, tracking, webhook tools, or identifiers.
9. Rider works offline, reconnects, and resolves queued commands without duplicate transitions.
10. Feature rollout and rollback change only the targeted cohort.
11. A risky action is held, manually reviewed, released, and completed without ledger mutation during the hold.
12. Backup restoration supports a representative read and write journey in an isolated environment.

E2E tests use role-specific clients and assert API, UI, event, audit, and ledger outcomes. Critical smoke tests run after deployment; broader journeys run before release and on a configurable schedule.

## 13. Test data and environments

### 13.1 Data generation

- Use factories with explicit tenant and actor ownership.
- Generate valid and invalid addresses, zones, packages, delivery modes, status histories, currencies, COD, proofs, schedules, and partner assignments.
- Seed randomness and print the seed on failure.
- Maintain small human-readable golden fixtures for contracts and finance; use generators for breadth.
- Include boundary values derived from current configuration.
- Create clock fixtures for daylight-saving changes, leap dates, time zones, month-end, and settlement cutoffs.

### 13.2 Privacy and safety

- Never copy production personal data, API keys, webhook secrets, proof media, or payment credentials into test environments.
- Synthetic data is the default. Any approved sanitized dataset has documented provenance, irreversible transformation, access control, and configurable expiry.
- Test secrets come from environment-specific secret management and rotate independently.
- Outbound email, SMS, webhook, payout, and notification destinations are allowlisted or intercepted.

### 13.3 Isolation and cleanup

Each test run receives unique namespaces, tenants, identifiers, object prefixes, and queues. Parallel runs cannot share mutable fixtures. Cleanup is idempotent; retained failed-run data has configurable access and expiry. Database snapshots and test artifacts record schema, configuration snapshot, feature flags, application version, and seed.

## 14. CI gates and reporting

- Pull requests run unit, state-machine, schema/contract, tenant-isolation, and focused integration tests.
- Mainline runs the complete integration, webhook, finance, mobile, and E2E suites.
- Load, resilience, soak, restore, and provider-sandbox suites run on configurable schedules and before risk-classified releases.
- Flaky tests are quarantined only with owner, issue, evidence, and configurable expiry; release-blocking safety tests cannot be silently quarantined.
- Coverage targets, mutation-test targets, retry policy, timeout, parallelism, and required suites are configurable by risk class.
- Reports retain logs, traces, screenshots, videos, seeds, request/response samples with redaction, schema versions, and configuration snapshots for a configurable period.

A release is blocked by failures in state integrity, tenant isolation, financial invariants, migration, security-critical contracts, or required restore verification. Any authorized exception is time-bound, documented, risk-accepted, and audited.

## 15. Exit criteria

A release candidate is test-ready when:

- Changed behavior has unit and applicable property/state-machine coverage.
- OpenAPI and event schemas pass compatibility and consumer contracts.
- Database and event migrations pass forward and rollback/compatibility scenarios.
- Tenant-isolation and finance-invariant suites pass without retries masking failure.
- Critical webhook, mobile/offline, and E2E journeys pass.
- Required load and resilience results meet the configured objectives for the tested profile.
- Defects are triaged against configurable severity policy with owners and disposition.
- Test evidence identifies the application, schema, configuration, flags, environment, and data seed used.
