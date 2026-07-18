# Module 02 — Multi-tenancy

## Purpose

Define the isolation model that lets multiple merchant businesses use one SaaS platform without exposing or modifying each other's data. A business is the primary tenant. Tenant context must be explicit from request authentication through database access, queues, audit records, webhooks, caches, and observability.

This module is a cross-cutting platform boundary rather than a standalone UI feature.

## Responsibilities

- Define tenant ownership for business data.
- Resolve and validate tenant context for human and API requests.
- Enforce tenant-scoped reads, writes, uniqueness, idempotency, and asynchronous work.
- Support users who hold memberships in more than one business.
- Provide safe platform/operations access across tenants through explicit permissions.
- Ensure tenant identity is carried into audit, events, webhook delivery, and metrics.
- Establish rules for tenant provisioning, suspension, and data retention.

## Non-responsibilities

- User authentication and role definitions.
- Business profile, branch, city, zone, delivery, rider, or financial domain behavior.
- Pricing and plan/subscription billing.
- Physical database topology such as one database per tenant; Phase 1 assumes a shared application/database model with logical isolation.
- Tenant-specific white-label branding, which is Phase 3.

## Actors and permissions

| Actor | Tenant behavior |
|---|---|
| Business roles | Operate only within an active membership's `business_id` |
| Business API key | Permanently bound to one `business_id` |
| Rider | Access is assignment-scoped; tenant is derived from each delivery |
| `ops_dispatcher` | Cross-tenant operational access only for named ops permissions |
| `platform_admin` | Cross-tenant administrative access only for named admin permissions |
| Partner fleet, Phase 4 | Partner scope is separate; access to a business delivery requires an explicit assignment |
| Public tracking visitor | Token-scoped to one delivery; no general tenant access |

Cross-tenant roles must never acquire access merely by omitting a tenant filter. Their access is an explicit authorization path that still records the affected tenant.

## Tenant model and ownership

### Tenant root: `businesses`

`businesses.id` is the canonical tenant identifier. The businesses module owns its profile and lifecycle. Every tenant-owned record either:

1. contains a required `business_id`, or
2. belongs through a required parent whose tenant can be joined unambiguously.

For high-volume or security-sensitive entities, store `business_id` directly even where derivable to make filtering and constraints reliable.

### Required tenant ownership

| Entity | Tenant ownership |
|---|---|
| `business_memberships`, `branches`, `api_keys`, `webhook_endpoints` | Direct `business_id` |
| `deliveries`, `idempotency_records`, `ledger_entries` | Direct `business_id` |
| `delivery_packages`, `delivery_status_events`, `delivery_assignments` | Parent delivery plus direct `business_id` recommended |
| `tracking_tokens` | Delivery ownership; public lookup remains token-scoped |
| `webhook_deliveries` | Endpoint/event plus direct `business_id` |
| `audit_logs` | Nullable only for truly platform-global actions; tenant actions require `business_id` |
| `cities`, `service_zones`, platform riders | Platform-owned in initial scope, not merchant-owned |

Partner fleet ownership in Phase 4 requires a separate `partner_id`; it must not overload `business_id`.

## Data model

### Tenant-related fields on `businesses`

| Field | Constraints |
|---|---|
| `id` | UUID primary key and canonical tenant ID |
| `status` | Business lifecycle value; access behavior defined below |
| `created_at`, `updated_at` | Required timestamps |

### `tenant_context` (request-scoped value, not necessarily a table)

| Field | Constraints |
|---|---|
| `business_id` | Exactly one for tenant-scoped operations |
| `actor_type`, `actor_id` | Authenticated human/API/system identity |
| `permissions` | Effective permission set |
| `access_mode` | `tenant`, `operations`, `platform_admin`, `public_token`, or `system_job` |
| `request_id` | Required correlation identifier |

### Tenant-scoped uniqueness

Global uniqueness is forbidden where merchants can legitimately reuse a value. Required examples:

- branches: unique `(business_id, normalized_name)` if branch names are constrained unique.
- deliveries: external-order uniqueness policy is `(business_id, external_order_id)` when enabled.
- API key names: unique within the business among active keys.
- idempotency: unique `(business_id, credential_scope, idempotency_key)`.
- webhook endpoint identifiers: scoped to business.

Whether `external_order_id` must be unique for all time or may repeat after a retention period is **business-configurable**. Idempotency remains the authoritative retry mechanism.

### `tenant_provisioning_records` (optional implementation support)

| Field | Constraints |
|---|---|
| `business_id` | Primary/foreign key |
| `provisioning_version` | Required integer |
| `status` | `pending`, `ready`, `failed` |
| `last_error_code` | Nullable, no secrets |
| `created_at`, `updated_at` | Required timestamps |

This table is optional in the modular-monolith/shared-schema approach if business creation has no asynchronous provisioning.

## Request and job flows

### Human request

1. Authenticate bearer token and load current roles/memberships.
2. Resolve target business from route/body or selected tenant context.
3. Verify active membership and permission, or an explicit cross-tenant platform permission.
4. Create immutable request-scoped `tenant_context`.
5. Query and mutate only through tenant-aware repository/service methods.
6. Include tenant and actor in audit/events.

For a route such as `/v1/businesses/{businessId}/branches`, the path ID is the requested scope, not proof of access.

### API-key request

1. Authenticate `X-API-Key`.
2. Derive tenant exclusively from the stored key record.
3. If payload contains `businessId`, require exact equality.
4. Reject before accessing target data on mismatch.

### Resource-by-ID request

For `/v1/deliveries/{deliveryId}`, query using both delivery ID and authorized tenant, except for explicit ops/admin paths. Do not fetch globally and perform a late tenant check when a scoped query is possible.

### Background job

1. Outbox/job payload contains `business_id`, source event ID, and correlation ID.
2. Worker validates referenced records belong to that tenant.
3. Worker opens an explicit system-job context.
4. Retry/deduplication keys include tenant scope.
5. Logs, metrics, downstream calls, and resulting events retain tenant context.

### Tenant suspension

Suspension effects are **platform-configurable**, but the safe default is:

- deny new merchant writes and credential creation;
- permit platform admins/ops to inspect and resolve active operational work;
- do not silently cancel active deliveries;
- keep public tracking available for active jobs unless security requires revocation;
- continue required webhook/financial processing or pause it only through an explicit operational decision.

## API operations

Multi-tenancy applies to every operation. The relevant contracted operations include:

| Method/path | Tenant resolution |
|---|---|
| `POST /v1/businesses` | New tenant ID from created business; creator becomes owner |
| `POST /v1/businesses/{businessId}/branches` | Authorized path tenant |
| `POST /v1/businesses/{businessId}/api-keys` | Authorized path tenant |
| `POST /v1/businesses/{businessId}/webhooks` | Authorized path tenant |
| `POST /v1/quotes` | Authenticated business context and request data |
| `POST /v1/deliveries` | API key/membership tenant must match body `businessId` |
| `GET/POST /v1/deliveries/{deliveryId}...` | Delivery queried within tenant; ops route uses explicit ops access |
| `/v1/riders/...` | Rider identity plus assignment-derived tenant |
| `GET /v1/track/{token}` | Public token scope; no caller-selected tenant |

There is no contracted tenant-switching endpoint in `openapi.yaml`. A dashboard implementation may select a membership locally and send the relevant business path/body value; any dedicated context endpoint requires a future contract update.

## Validation and business rules

- Tenant ID is a UUID where exposed by current OpenAPI.
- Tenant context is required for every tenant-owned write.
- Body, route, authenticated credential, and persisted-resource tenant IDs must agree.
- Child entities cannot reference parents from another tenant; use composite checks or transactional validation.
- Idempotency keys are never global.
- Pagination cursors, exports, search indexes, and object-storage paths must be tenant-bound and tamper-resistant.
- A request spanning multiple merchant tenants is denied unless it is a named platform/ops operation.
- Tenant deletion behavior and retention duration are **platform-configurable compliance decisions**; hard deletion is not a Phase 1 requirement.

## Security and tenant isolation

- Centralize tenant-aware repositories/query builders; avoid optional tenant parameters.
- Prefer database constraints that include tenant IDs for cross-entity references where practical.
- If database row-level security is adopted, treat it as defense in depth, not a replacement for authorization.
- Include tenant ID in cache keys, rate-limit keys, idempotency keys, queue partition/deduplication keys, search documents, exports, and uploaded-object paths.
- Never accept `business_id` from an unsigned event or untrusted webhook as authorization.
- Webhook endpoints and secrets are loaded only by event tenant.
- Tracking tokens are cryptographically unguessable and map to exactly one delivery.
- Cross-tenant admin access is audited with reason/context where the workflow supplies one.
- Tests must use at least two tenants with colliding human-readable/external identifiers.

## Events and webhooks

Every internal tenant domain event uses an envelope containing:

| Field | Requirement |
|---|---|
| `event_id` | Globally unique |
| `event_type` | Versioned or backward-compatible name |
| `occurred_at` | UTC timestamp |
| `business_id` | Required for tenant events |
| `aggregate_type`, `aggregate_id` | Required |
| `actor_type`, `actor_id` | Required where an actor exists |
| `correlation_id` | Required |
| `payload` | Event-specific, tenant-safe data |

Merchant delivery webhooks listed in `contracts.md` are routed only to endpoints belonging to the event's `business_id`. Tenant provisioning/suspension events are internal unless a public contract is later approved.

## UI touchpoints

- `/app`: all counts, lists, searches, and links use selected business scope.
- `/app/deliveries`, `/app/branches`, `/app/developers`: no cross-business data in options, results, or cached state.
- `/ops`: cross-tenant board is explicitly operations-authorized and displays tenant identity.
- `/admin/businesses`: platform administration can enter a business context with audited actions.
- `/rider`: jobs may belong to different businesses; access is assignment-scoped, while merchant-private data remains filtered.
- `/t/[token]`: branding/status is loaded through token's delivery, never a tenant selector.

Frontend filtering is not a security control. Server responses must already be tenant-safe.

## Failure cases

- Authenticated user supplies a business with no active membership.
- API key business differs from payload/path business.
- Resource ID exists in another tenant; return tenant-safe `404`.
- Cross-tenant child reference is attempted.
- Background event lacks tenant metadata or references a mismatched aggregate; dead-letter and alert.
- Cache key omits tenant; treat detected leakage as a security incident.
- Suspended business has active deliveries requiring ops handling.
- Tenant context is lost across an asynchronous boundary; fail the job rather than execute unscoped.

## Observability and audit

- Structured logs include `business_id`, access mode, actor, request/correlation ID, and resource ID.
- Metrics may carry tenant only where cardinality and privacy are controlled; dashboards must still support tenant-level investigation through logs/traces.
- Traces propagate tenant context as protected internal metadata.
- Audit all tenant creation/status changes, membership/credential changes, cross-tenant admin access, and tenant-owned mutations.
- Automated checks detect queries/jobs missing required tenant context where the implementation stack permits.
- Alert on tenant-mismatch denials, mismatched event aggregates, and webhook endpoint/event tenant mismatches.

## Phased implementation

### Phase 1 — Shared-schema isolation

- Canonical `business_id` and tenant-aware repositories.
- Membership/API-key tenant resolution.
- Tenant-scoped branches, deliveries, developer credentials, idempotency, webhooks, and audit.
- Two-tenant isolation tests for every public operation.
- Explicit ops/admin cross-tenant policy paths.

### Phase 2 — Operational hardening

- Tenant-aware location, proof, COD, notifications, and queue processing.
- Leakage detection and improved traces/alerts.
- Suspension runbook for active operations.

### Phase 3 — Integration scale

- Tenant-scoped CSV imports, webhook replay, plugins, branding, invoices, and sandbox data.
- Tenant-safe exports and object storage.

### Phase 4 — Additional organization scope

- Separate partner-fleet organization boundary.
- Multi-city configuration while preserving business tenant ownership.
- Reassess partitioning only from measured scale/isolation requirements; no microservice split is implied.

## Acceptance criteria

- Every tenant-owned record has direct or unambiguous inherited business ownership.
- Business A cannot read, mutate, search, export, cache-hit, or receive webhooks for business B data.
- API-key tenant is authoritative and mismatched request business IDs are rejected.
- Resource-by-ID operations are tenant-scoped at query time.
- Idempotency replay/conflict behavior is isolated per business/credential.
- Queued jobs and domain events carry and validate tenant context.
- Platform/ops cross-tenant actions require explicit permissions and produce tenant-attributed audit records.
- Public tracking exposes only the delivery identified by its token.
- Automated tests cover two tenants using the same external order ID, branch name, and idempotency key without collision or leakage.
