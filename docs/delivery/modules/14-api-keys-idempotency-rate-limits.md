# 14 — API Keys, Idempotency, and Rate Limits

**Status:** Product specification  
**Purpose:** Protect the public `/v1` API while making client retries safe and predictable.

## Scope and boundaries

In scope: server-to-server API credentials, scopes, rotation/revocation, idempotency records, quotas, burst limits, response headers, abuse controls, and operator tooling. These controls apply independently to production and sandbox.

Out of scope: user JWT/session design, OAuth marketplace installation flows, webhook signing secrets, billing plans themselves, and general DDoS infrastructure. An API key authenticates a tenant integration; it does not grant platform-admin, rider, or operations privileges.

## Actors

- Business owner/admin creates, scopes, rotates, and revokes keys.
- Merchant integration uses a key and supplies idempotency keys.
- Platform admin defines policy and handles abuse or emergency revocation.
- Support inspects metadata and request correlation without seeing secrets.
- API gateway/service authenticates, throttles, and coordinates idempotency.

## Data and contracts

`ApiKey` contains `id`, `business_id`, `environment`, `name`, `prefix`, `secret_hash`, scopes, status, creator, `created_at`, optional `expires_at`, `last_used_at`, and revocation metadata. The plaintext secret is shown once. A recognizable non-secret prefix supports identification.

`IdempotencyRecord` contains credential/tenant/environment scope, method, normalized route, key, canonical request hash, state (`processing|completed|failed_retriable`), response status/body/selected headers, resource reference, timestamps, and expiry.

`RateLimitPolicy` defines sustained rate, burst capacity, concurrency where needed, route cost, and overrides. `RateLimitDecision` may be emitted for audit without persisting every successful request.

Required headers:

- Request: `X-API-Key`, and `Idempotency-Key` on documented mutations.
- Response: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`; `Retry-After` on `429`.
- `Idempotency-Replayed: true` identifies a stored response replay.

## Endpoints and events

- `GET /v1/businesses/{business_id}/api-keys`
- `POST /v1/businesses/{business_id}/api-keys`
- `POST /v1/businesses/{business_id}/api-keys/{key_id}/rotate`
- `DELETE /v1/businesses/{business_id}/api-keys/{key_id}`
- `GET /v1/businesses/{business_id}/api-usage`

Key-management endpoints use an authenticated dashboard session and RBAC, not the key being managed. Audit/domain events: `api_key.created`, `api_key.rotated`, `api_key.revoked`, `api_key.expired`, `rate_limit.exceeded`, and `api_key.suspected_compromise`.

## Security

- Generate at least 256 bits of cryptographic entropy. Store only a slow or keyed cryptographic hash and a display prefix; redact secrets from logs and telemetry.
- Secret values are returned exactly once over TLS and are never recoverable by staff.
- Least-privilege scopes include `quotes:read`, `deliveries:read`, `deliveries:write`, `proofs:read`, `batches:write`, and `webhooks:manage`.
- Environment and tenant are derived from the key. Cross-environment use fails authentication.
- Rotation creates a new secret and permits an explicit short overlap window; revocation takes effect promptly and invalidates caches.
- Failed-key attempts are throttled without revealing whether a prefix exists. Management actions require owner/admin role and audit logging.

## Validation

- Key names are required, tenant-unique among active keys, and length-limited; requested scopes must be allowed for the actor and plan.
- Expiry must be in the future and within policy. A tenant may not exceed its active-key limit.
- `Idempotency-Key` accepts 16–128 printable ASCII characters and must not contain PII. Empty, oversized, or malformed values return `400`.
- Canonical request hashing includes method, normalized path, relevant query, content type, and canonical body; credential headers and transport details are excluded.
- Rate-limit overrides require bounded values, effective dates, reason, and authorized admin.

## Error semantics

- `401 invalid_api_key`, `401 api_key_expired`, and `401 api_key_revoked` may share a generic public message.
- `403 insufficient_scope` identifies required scope without leaking resource ownership.
- `409 idempotency_key_reused` means the key was previously used with materially different input.
- `409 idempotency_in_progress` includes short `Retry-After` guidance when processing has not completed.
- `429 rate_limit_exceeded` includes stable code, limit headers, request ID, and retry delay.
- Key creation cannot return a secret twice; a lost secret must be rotated.

## Retry and idempotency

- Required on `POST /v1/deliveries`, batch creation, route creation, and any payment/financial mutation. Optional support on other creates must be documented in OpenAPI.
- Claiming the idempotency record and beginning the business mutation must be concurrency-safe. Completion and resource creation must not permit a duplicate after a crash.
- Identical retries replay the original success or deterministic client-error response. Transient failures may leave a retriable state rather than permanently caching a `5xx`.
- Default retention is at least 24 hours and must exceed the documented client retry window; financial mutations may retain records longer.
- Limits are token-bucket or equivalent, scoped at least by environment and credential, with tenant-level aggregate protection. Expensive endpoints may consume multiple units.
- Sandbox has lower limits but identical headers and semantics. Clients use exponential backoff with jitter and honor `Retry-After`.

## UI and admin touchpoints

- `/app/developers/api-keys`: list prefix, name, scopes, environment, creator, age, expiry, and last use; create, copy once, rotate, and revoke.
- A creation modal warns that the secret cannot be shown again and offers a secure copy/download action.
- Usage view shows request volume, error rate, throttling, top endpoint templates, and current policy.
- `/admin` supports emergency revoke, bounded policy overrides, abuse flags, and audit history; secret material is never displayed.

## Observability

- Metrics: auth successes/failures, key age, active keys, rotation/revocation, idempotency claims/replays/conflicts/waits, throttle decisions, and policy utilization.
- Logs use key ID/prefix, never secret; correlate request ID, tenant, route template, idempotency hash fingerprint, and decision reason.
- Alert on credential stuffing patterns, sudden geographic/volume changes, high conflict rates, repeated throttling, stale unrotated keys, and revocation propagation failure.
- Test dashboards distinguish legitimate `429` load shedding from platform capacity failures.

## Phased delivery

1. **Foundation:** hashed keys, basic scopes, create/revoke UI, required delivery idempotency, per-key limits, and standard headers.
2. **Hardening:** rotation overlap, aggregate tenant limits, concurrency-safe recovery, usage dashboard, expiry, and security alerts.
3. **Developer platform:** sandbox policies, granular scopes, endpoint costs, self-serve usage export, and richer idempotency diagnostics.
4. **Scale:** plan-aware dynamic policy, regional cache invalidation, anomaly detection, and automated compromise response.

## Acceptance criteria

- A key secret is visible once, absent from storage/logs, and unusable promptly after revocation.
- A read-only key cannot mutate deliveries; credentials cannot cross tenant or environment boundaries.
- Concurrent identical create requests result in one resource and deterministic replay responses.
- Reusing an idempotency key with a different request returns `409` and creates nothing.
- Every throttled response includes standard limit headers, `Retry-After`, stable error code, and request ID.
- Rotation supports the configured overlap and records who rotated/revoked each key.
- Operators can diagnose auth, replay, and limit decisions using non-secret identifiers.
