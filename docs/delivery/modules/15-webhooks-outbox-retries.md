# 15 — Webhooks, Transactional Outbox, and Retries

**Status:** Product specification  
**Delivery model:** At least once, ordered per aggregate where practical, cryptographically signed.

## Scope and boundaries

In scope: merchant endpoint registration, event envelopes, transactional outbox creation, asynchronous delivery, HMAC signing, retries, disablement, dead-letter handling, delivery logs, replay, and sandbox testing.

Out of scope: exactly-once delivery, arbitrary event transformations, inbound partner callbacks, notification channels, and using webhooks as the source of truth. Consumers must reconcile through REST `/v1`.

## Actors

- Merchant admin registers endpoints, selects events, rotates secrets, and replays failures.
- Merchant webhook consumer verifies signatures and processes events idempotently.
- Domain service writes business state and outbox records atomically.
- Webhook worker dispatches attempts and schedules retries.
- Support/platform admin diagnoses global failures and protects platform health.

## Data and contracts

`WebhookEndpoint` includes tenant, environment, HTTPS URL, description, subscribed event types, status, signing-secret hash/encrypted material, secret version, timestamps, and failure counters.

`OutboxEvent` includes immutable event ID, type, aggregate type/ID, tenant, environment, schema version, payload, occurrence time, sequence, and publication state. It is inserted in the same database transaction as the domain change.

`WebhookDelivery` includes endpoint/event IDs, state, attempt count, next attempt, last status/error class, response excerpt hash/redacted excerpt, timing, and terminal reason. `WebhookAttempt` records each network attempt.

Envelope:

```json
{
  "id": "evt_...",
  "type": "delivery.delivered",
  "api_version": "2026-07-18",
  "created_at": "2026-07-18T12:00:00Z",
  "business_id": "uuid",
  "data": { "object": {} }
}
```

Delivery headers include `X-DaaS-Event-Id`, `X-DaaS-Timestamp`, `X-DaaS-Signature: v1=<hex-hmac>`, and `User-Agent`. The signature input is the exact bytes of `timestamp + "." + body`.

## Endpoints and events

- `GET /v1/businesses/{business_id}/webhook-endpoints`
- `POST /v1/businesses/{business_id}/webhook-endpoints`
- `PATCH /v1/businesses/{business_id}/webhook-endpoints/{endpoint_id}`
- `DELETE /v1/businesses/{business_id}/webhook-endpoints/{endpoint_id}`
- `POST /v1/businesses/{business_id}/webhook-endpoints/{endpoint_id}/rotate-secret`
- `POST /v1/businesses/{business_id}/webhook-endpoints/{endpoint_id}/test`
- `GET /v1/businesses/{business_id}/webhook-deliveries`
- `GET /v1/businesses/{business_id}/webhook-deliveries/{delivery_id}`
- `POST /v1/businesses/{business_id}/webhook-deliveries/{delivery_id}/replay`

Events include the authoritative delivery events in `contracts.md`, plus `cod.collected` and `settlement.completed` when permissions and phases enable them. Event names and payload versions are registered contracts in OpenAPI or an adjacent event schema catalog.

## Security

- Production endpoint URLs require HTTPS, except documented local sandbox tooling. Reject credentials in URLs.
- Block loopback, link-local, private/internal ranges, cloud metadata hosts, unsafe redirects, and DNS rebinding; resolve and validate each connection.
- Use per-endpoint secrets with high entropy. Show once and permit versioned overlap during rotation.
- Include a timestamp in the signed payload and recommend a five-minute verification tolerance. Compare signatures in constant time.
- Egress uses strict connect/read/total timeouts, response-size limits, no cookies, and a controlled user agent.
- Payloads contain only tenant-authorized fields. Secrets and full response bodies are redacted from logs/UI.

## Validation

- Validate URL syntax, DNS/IP policy, event allowlist, endpoint count, and tenant/environment ownership.
- Test registration may require a signed challenge before activation; a failed challenge leaves the endpoint inactive.
- Payloads must validate against the event schema before outbox insertion or dispatch.
- Replay requires an existing event belonging to the tenant and does not alter the immutable original event.
- Consumer acknowledgment is any `2xx`; redirects and all other statuses are failures.

## Error semantics

- Management APIs use standard REST errors: `400 invalid_endpoint`, `403 event_not_allowed`, `409 endpoint_exists`, and `422 endpoint_unreachable` for optional verification failures.
- Network failures are classified as DNS, connect, TLS, timeout, response-too-large, `4xx`, `429`, or `5xx`.
- `410` may disable an endpoint immediately; repeated `401/403/404` may disable after policy threshold. `429` and `5xx` remain retriable.
- A failed webhook never rolls back or changes the delivery. REST remains available for reconciliation.

## Retry and idempotency

- Delivery is at least once. Consumers deduplicate on immutable event `id`, not delivery status or timestamp.
- Suggested retry schedule with jitter: immediate, 1 minute, 5 minutes, 30 minutes, 2 hours, 8 hours, then daily until the configured maximum age/attempt count.
- Honor a bounded `Retry-After` for `429` and `503`. Cap concurrency per endpoint and tenant to avoid retry storms.
- Outbox workers claim records safely, use leases, and recover abandoned work. Publishing the same outbox event more than once must retain the same event ID.
- Replay creates a new delivery attempt series for the same event ID and current endpoint secret; it is auditable and rate-limited.
- Ordering is best effort per delivery aggregate. Consumers must tolerate duplicates and out-of-order arrival and fetch current `/v1/deliveries/{id}` state when needed.

## UI and admin touchpoints

- `/app/developers/webhooks` supports endpoint CRUD, subscriptions, reveal-once secret, rotation, test event, status, and failure warnings.
- Delivery log filters by endpoint, event type, event ID, status, and date; detail shows attempts, safe response excerpt, request ID, next retry, and replay action.
- Delivery detail links related webhook events.
- `/admin/system-health` shows outbox lag, queue depth, retry age, disabled endpoints, and provider/network incident controls.

## Observability

- Metrics: outbox age/depth, events created, dispatch latency, success rate, attempts, status classes, endpoint disablement, dead letters, replay count, and worker lease recovery.
- Trace from domain transaction through outbox claim to each HTTP attempt; correlate event ID, endpoint ID, tenant, and request ID.
- Alert on missing outbox publication, oldest-event SLO breach, broad TLS/DNS failures, retry queue growth, and anomalous endpoint latency.
- Maintain an audit trail for endpoint changes, secret rotations, manual replay, and admin intervention.

## Phased delivery

1. **Foundation:** transactional outbox, core delivery events, signed POST, basic retries, dry-run mode, and endpoint management.
2. **Reliability:** attempt records, dead letters, SSRF hardening, endpoint disablement, dashboards, and alerts.
3. **Developer platform:** searchable logs, manual replay, test events, schema catalog, sandbox, and secret rotation overlap.
4. **Scale:** partitioned workers, per-aggregate sequencing, regional egress, adaptive backpressure, and bulk replay safeguards.

## Acceptance criteria

- A committed domain transition creates exactly one immutable outbox event in the same transaction; a rolled-back transition creates none.
- Every delivery is signed over timestamp and exact body, and the documented verification example succeeds.
- Duplicate attempts use the same event ID; an idempotent consumer can safely process them once.
- Timeouts, `429`, and `5xx` retry with jitter without blocking API requests or other tenants.
- Unsafe/internal URLs and redirect escapes are rejected.
- Merchants can inspect attempts and replay a terminal failure; all replay/rotation actions are audited.
- Queue lag and dead-letter conditions are visible and alertable, and webhook failure never changes delivery state.
