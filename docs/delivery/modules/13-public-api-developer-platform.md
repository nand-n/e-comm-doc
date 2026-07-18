# 13 — Public API and Developer Platform

**Status:** Product specification  
**API style:** REST under `/v1`, described by OpenAPI 3.x  
**Primary outcome:** A merchant can integrate, test in a sandbox, create one delivery, track it, and reconcile it by `external_order_id`.

## Scope and boundaries

In scope: public merchant REST resources, developer documentation, OpenAPI publication, sandbox tenants, credentials, request/response conventions, SDK-ready examples, API versioning, and integration diagnostics. Operations, rider, and platform-admin routes may share infrastructure but are not part of the public merchant contract.

Out of scope: storefront/order management, arbitrary workflow scripting, GraphQL, marketplace discovery, plugin-specific UI, and exposing internal database models. `/v1` remains backward compatible; additive fields may appear without a version change, while breaking changes require a new major path.

## Actors

- Merchant developer integrates a store, ERP, OMS, or warehouse system.
- Business owner/admin creates credentials and grants developer access.
- Support/operations diagnoses requests without viewing credential secrets.
- Platform admin controls sandbox availability, API policy, and deprecations.
- Automated merchant client calls the API and consumes webhooks.

## Data and contracts

- `Business`, `Branch`, `Quote`, `Delivery`, `DeliveryPackage`, `DeliveryStatusEvent`, `Proof`, and `TrackingLink` are canonical API resources.
- Merchant correlation uses required `external_order_id` on delivery creation. It is tenant-scoped, searchable, returned unchanged, and is not the platform primary key.
- Resource IDs are opaque UUIDs. Times are ISO 8601 UTC. Money is `{ amount, currency }` using decimal strings and ISO 4217 codes; floats are forbidden for monetary contracts.
- JSON uses `snake_case` at the public boundary. Unknown response fields must be ignored by clients; unknown request fields are rejected until an explicit compatibility policy allows them.
- Lists use cursor pagination: `limit`, `after`, and `next_cursor`; filters include status, branch, creation range, and `external_order_id`.
- Every response carries `X-Request-Id`. Mutation responses include the current resource representation.
- The checked-in OpenAPI document is the source of truth for schemas, examples, security schemes, error responses, and deprecations. CI must validate it and detect accidental breaking changes.
- Sandbox data is isolated from production, visibly identified, non-billable, and uses separate credentials and webhook endpoints. Simulated lifecycle actions are available only in sandbox.

## Endpoints and events

Minimum public surface:

- `POST /v1/quotes`
- `POST /v1/deliveries`
- `GET /v1/deliveries/{delivery_id}`
- `GET /v1/deliveries?external_order_id=...`
- `POST /v1/deliveries/{delivery_id}/cancel`
- `GET /v1/deliveries/{delivery_id}/proof`
- `GET /v1/branches`
- `GET /v1/service-areas`
- `GET /v1/webhook-events/{event_id}` for supported event retrieval
- Sandbox-only `POST /v1/sandbox/deliveries/{delivery_id}/transitions`

Public events include `delivery.created`, `delivery.assigned`, `delivery.picked_up`, `delivery.in_transit`, `delivery.delivered`, `delivery.failed`, `delivery.cancelled`, and `delivery.returned`. Financial events are separately permissioned.

## Security

- Production calls require an API key over TLS; browser clients must never receive secret keys.
- Keys are tenant- and environment-scoped, shown once, hashed at rest, revocable, and assigned explicit scopes such as `deliveries:read` and `deliveries:write`.
- Tenant identity comes from the credential, not an untrusted `business_id`; any supplied tenant identifier must match.
- Sensitive recipient data is returned only where required and must not appear in URLs, logs, metrics labels, or examples.
- OpenAPI servers distinguish production and sandbox. CORS is denied for secret-key endpoints by default.
- Support access is audited; API responses never disclose stack traces or cross-tenant existence.

## Validation

- Validate media type, schema, field lengths, enum values, coordinates, phone formats, currencies, package limits, service zones, and business state.
- `external_order_id` must be non-empty, normalized only for surrounding whitespace, and limited to 128 characters.
- Quote references must belong to the credential's tenant, remain unexpired, and match delivery inputs where required.
- Requests larger than the documented body limit return `413`; unsupported media types return `415`.
- OpenAPI examples must pass schema validation and contract tests.

## Error semantics

All failures use:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "Request validation failed",
    "request_id": "req_...",
    "details": [{ "field": "dropoff.lat", "reason": "out_of_range" }]
  }
}
```

- `400` malformed input, `401` missing/invalid credential, `403` insufficient scope, `404` absent resource, `409` state/idempotency conflict, `422` valid schema but unserviceable request, `429` throttled, and `5xx` platform failure.
- Error `code` is stable and machine-readable; messages are safe for humans. Validation returns all safe field errors where practical.
- A tenant receives `404`, not ownership details, for another tenant's resource.

## Retry and idempotency

- `Idempotency-Key` is required for delivery creation and other documented non-safe mutations. Records are scoped by tenant, environment, credential, method, and route.
- The server stores a canonical request hash and completed response. Same key and body replays the original status/body; same key with a different body returns `409 idempotency_key_reused`.
- In-progress duplicates return a deterministic conflict or wait briefly; they never create a second resource.
- Clients may retry `408`, `429`, and transient `5xx` with exponential backoff and jitter, honoring `Retry-After`. `GET` is safe to retry.
- `external_order_id` supports reconciliation but does not replace `Idempotency-Key`.

## UI and admin touchpoints

- `/app/developers` provides environment selection, key management, webhook setup, OpenAPI download, quick-start examples, request logs, and sandbox controls.
- Delivery lists/details expose API origin, `external_order_id`, request ID, and webhook history.
- `/admin` exposes API health, key abuse controls, deprecation notices, sandbox controls, and tenant-level support diagnostics without secret values.

## Observability

- Measure request count, latency percentiles, status/error code, endpoint template, environment, and throttling; never label metrics with raw IDs.
- Structured logs correlate `request_id`, tenant, credential fingerprint, idempotency record, delivery ID, and `external_order_id` with PII redaction.
- Distributed traces cover API, persistence, outbox publication, and downstream providers.
- Alert on sustained `5xx`, latency SLO breach, auth anomalies, idempotency conflicts, OpenAPI drift, and sandbox simulator failures.

## Phased delivery

1. **Foundation:** production `/v1`, core quote/delivery/read/cancel endpoints, API keys, idempotency, stable errors, and baseline OpenAPI.
2. **Reliable operations:** proofs, filters, pagination, richer serviceability errors, request logs, and SLO dashboards.
3. **Developer platform:** isolated sandbox, simulator, portal examples, webhook event retrieval/replay, and schema compatibility checks.
4. **Scale:** additional route/batch resources, formal deprecation windows, generated SDKs if demand justifies them, and regional endpoints.

## Acceptance criteria

- A new merchant can obtain separate sandbox credentials and complete quote → create → retrieve → simulated delivery using only published OpenAPI guidance.
- Repeating delivery creation with the same key/body produces exactly one delivery and the same response.
- A delivery is retrievable by ID and tenant-scoped `external_order_id`.
- Cross-tenant access, browser exposure of keys, and production use of sandbox credentials are rejected.
- Every documented error has a stable code and request ID; rate-limit responses include retry guidance.
- Contract tests prove implementation and examples conform to OpenAPI and detect breaking `/v1` changes.
- Dashboard support staff can correlate a merchant request without access to its secret or unredacted recipient data.
