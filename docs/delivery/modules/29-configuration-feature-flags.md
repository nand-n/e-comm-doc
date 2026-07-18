# Module 29 — Configuration and Feature Flags

## 1. Purpose and boundaries

This module provides typed, auditable configuration and controlled feature rollout for the multi-tenant delivery platform. It lets operators change approved behavior without a deployment while preserving tenant isolation, deterministic evaluation, safe defaults, and rollback.

It owns:

- Configuration definitions, values, scope, validation, versioning, activation, and history.
- Feature-flag definitions, targeting rules, percentage rollout, prerequisites, expiration, and emergency disable.
- Resolution precedence across platform, environment, city, tenant, partner, and user or API-client scopes.
- Read APIs and administration workflows for configuration and flags.
- Cache invalidation, evaluation telemetry, and audit records.

It does not own:

- Application secrets or cryptographic key material; those remain in the secrets manager.
- Business master data such as businesses, branches, cities, zones, riders, or pricing rules.
- Authorization policy definitions, although RBAC controls who may administer configuration.
- Experiment analytics or product experimentation statistics beyond flag-evaluation telemetry.
- Deployment orchestration; release operations consume this module's controls.

Every operational threshold, limit, timeout, retry count, percentage, retention period, cache duration, and expiry window described here is configurable, validated, scoped, and given a safe default. No threshold is hard-coded as an irreversible product rule.

## 2. Actors and permissions

| Actor | Capabilities |
|---|---|
| Platform admin | Define platform configuration and flags; approve high-risk changes; inspect all scopes and audit history |
| Operations lead | Manage approved operational values and emergency flags within assigned cities or tenants |
| Tenant admin | Manage tenant-exposed configuration and opt-in flags for their own business only |
| Partner admin | Manage partner-exposed settings for their own fleet only |
| Release operator | Create rollout rules, progress staged rollout, pause, and roll back |
| Application service | Resolve configuration and evaluate flags using service identity |
| Auditor / support | Read definitions, effective values, evaluation explanations, and change history |

RBAC is combined with scope checks. Tenant and partner actors cannot discover definitions or values not explicitly exposed to their scope. Sensitive configuration values are redacted even when their metadata is visible.

## 3. Data and configuration

### 3.1 Core records

- `ConfigDefinition`: stable key, description, owner, type, schema, default, allowed scopes, sensitivity, mutability, risk class, and deprecation state.
- `ConfigValue`: definition key, scope type and identifier, environment, typed value, effective interval, status, version, author, approver, and change reason.
- `FeatureFlag`: stable key, description, owner, lifecycle state, safe default, prerequisites, allowed scopes, risk class, expiry, and removal ticket.
- `FlagRule`: ordered targeting rule with scope selectors, attributes, rollout allocation, variant, effective interval, and version.
- `ConfigSnapshot`: immutable, checksummed set of active definitions and values used for deterministic evaluation.
- `ConfigAuditEvent`: append-only record of proposal, validation, approval, activation, rollback, expiry, and access to sensitive metadata.

### 3.2 Types and validation

Supported values include boolean, integer, decimal, string, enum, duration, timestamp, structured object, and lists of typed values. Definitions may specify configurable minimums, maximums, formats, allowed values, object schemas, and cross-field constraints.

Changes are rejected when they:

- Fail type or schema validation.
- Exceed the definition's configurable safety envelope.
- Target an unsupported scope.
- Overlap an incompatible effective interval.
- Introduce a prerequisite cycle.
- Reference a tenant, city, partner, user, or client outside the actor's authorized scope.

### 3.3 Resolution precedence

The default precedence is:

`request override for tests → user/API client → partner → tenant → city → environment → platform default`

The allowed layers and their precedence are configurable per definition. Resolution returns the effective value, source scope, definition version, snapshot version, and evaluation reason. Missing, invalid, expired, or unavailable overrides fall back to the nearest valid value and ultimately to the safe default.

### 3.4 Flag targeting

Rules may target environment, city, tenant, partner, role, user, API client, application version, delivery mode, or explicitly approved non-sensitive attributes. Stable percentage rollout uses a configurable hash key and salt so a subject remains in the same cohort. Rollout percentages, cohort boundaries, minimum application versions, rule priority, flag expiry, and stale-flag warning windows are all configurable.

Personal or sensitive attributes must not be used for targeting unless explicitly approved and documented. Targeting snapshots store identifiers or irreversible hashes, not unnecessary personal data.

## 4. Workflows

### 4.1 Create a definition

1. An authorized owner submits a typed definition, safe default, scopes, validation envelope, risk class, and ownership metadata.
2. The system validates uniqueness, schema, naming, and scope compatibility.
3. High-risk definitions require configurable approval policy before publication.
4. Publication creates an immutable version and emits a change event.
5. Services can resolve the definition only after its activation time.

### 4.2 Change a configuration value

1. The actor selects a definition and authorized scope.
2. The system displays current and proposed effective values plus affected scopes.
3. Validation and optional dry-run determine the impact.
4. Approval is collected according to configurable risk policy.
5. The value activates immediately or at a scheduled time.
6. A new snapshot is published; caches are invalidated.
7. Health metrics are observed for a configurable period; operators may roll back to a prior version.

### 4.3 Roll out a feature

1. Create the flag disabled by default with owner, expiry, success signals, and rollback condition.
2. Enable it for internal or sandbox subjects.
3. Expand through configurable tenant allowlists, cities, partners, application versions, or stable percentages.
4. Pause automatically or manually when configurable guardrails are breached.
5. Promote to the next stage only after the configurable observation window.
6. Set the final default, remove targeting rules, and remove the flag by its configurable expiry deadline.

### 4.4 Emergency disable

An authorized operator invokes a kill switch with a reason and incident reference. The system prioritizes the emergency rule, publishes invalidation, and confirms propagation. Emergency access and any bypass of normal approval are separately audited and reviewed after the incident.

### 4.5 Explain an evaluation

Authorized support users can request an explanation for a subject and snapshot. The response identifies the matched rule and value source without exposing secret values, cross-tenant data, or targeting lists outside their scope.

## 5. APIs and events

Administrative endpoints are internal and versioned:

- `GET /internal/config/definitions`
- `POST /internal/config/definitions`
- `POST /internal/config/values`
- `POST /internal/config/values/{id}/approve`
- `POST /internal/config/values/{id}/activate`
- `POST /internal/config/values/{id}/rollback`
- `GET /internal/config/effective`
- `POST /internal/feature-flags`
- `POST /internal/feature-flags/{key}/rules`
- `POST /internal/feature-flags/{key}/pause`
- `POST /internal/feature-flags/{key}/emergency-disable`
- `POST /internal/feature-flags/{key}/evaluate`

Mutation APIs require idempotency keys and optimistic version checks. Bulk changes are atomic where possible; otherwise each item reports an independent result and no partial activation occurs without explicit confirmation.

Published events include:

- `configuration.definition.published`
- `configuration.value.activated`
- `configuration.value.rolled_back`
- `configuration.snapshot.published`
- `feature_flag.rule.activated`
- `feature_flag.rollout.paused`
- `feature_flag.emergency_disabled`
- `feature_flag.expired`

Events contain identifiers, scope, version, actor, reason, and timestamps, but never secret values. Consumers must handle duplicate and out-of-order delivery.

## 6. Security and privacy

- Administrative mutations require strong authentication, RBAC, scope authorization, and configurable step-up authentication for high-risk actions.
- High-risk production changes use configurable separation-of-duties approval; the requester cannot approve their own change when that policy applies.
- Values marked sensitive are encrypted at rest and redacted in APIs, logs, events, exports, and audit views.
- Secrets, credentials, signing keys, and private certificates are referenced by secret identifier and never stored as ordinary configuration.
- Service reads use least-privilege service identities and environment boundaries.
- All mutations and privileged reads are append-only audited with actor, before/after hashes, reason, approval, and correlation ID.
- Evaluation attributes are minimized and retained for a configurable period.
- Test overrides are unavailable in production unless an explicitly controlled emergency policy permits them.

## 7. Failure handling

- If the configuration store is unavailable, services use the latest verified local snapshot for a configurable stale-use window, then apply safe defaults or fail closed according to each definition's policy.
- Invalid or unsigned snapshots are rejected; the prior verified snapshot remains active.
- Cache invalidation is at-least-once and versioned, so stale messages cannot replace newer state.
- A partially propagated rollout is detected by snapshot-version telemetry and can trigger a configurable automatic pause.
- Conflicting updates return `409`; validation failures return `422`; unauthorized scope access returns `403` without revealing resource existence.
- Expired flags resolve to their defined safe behavior and alert the owner; expiry behavior is configurable per risk class.
- Evaluation code must not block critical delivery workflows on a remote network call when a valid local snapshot exists.
- Rollback creates a new immutable version rather than deleting history.

## 8. Observability

Metrics include:

- Resolution and evaluation count, latency, cache hit ratio, and errors by key and version.
- Active snapshot age and version distribution by service instance.
- Default and fallback usage, invalid snapshot count, and propagation lag.
- Flag evaluations by variant and authorized scope dimensions.
- Number and age of stale, expired, ownerless, or fully rolled-out flags.
- Change success, rollback, emergency-disable, and approval latency.

Logs include key, version, selected source, rule identifier, actor or subject hash, correlation ID, and reason; values and sensitive targeting data are excluded. Traces annotate the resolved snapshot and flag variant. Alerts use configurable thresholds, windows, routing, and suppression rules.

## 9. Delivery phases

### Phase 1 — Foundation

- Typed definitions, platform/environment/tenant scopes, safe defaults, immutable versions, local snapshot cache, RBAC, and audit log.
- Boolean flags, tenant allowlists, emergency disable, and manual rollback.

### Phase 2 — Operational safety

- City and user/client scopes, scheduled activation, approval workflows, percentage rollout, propagation monitoring, and automatic guardrail pause.

### Phase 3 — Tenant integrations

- Tenant self-service for explicitly exposed settings, sandbox overrides, application-version targeting, exportable evaluation explanations, and integration rollout controls.

### Phase 4 — Scale

- Partner scope, variants, advanced prerequisites, fleet-wide snapshot distribution, automated expiration governance, and policy-driven cleanup.

## 10. Acceptance criteria

- Every definition is typed, owned, versioned, validated, scoped, and has a documented safe default.
- Every threshold, timeout, limit, retry count, percentage, retention period, and rollout window is configurable rather than embedded as an unchangeable constant.
- Effective-value tests prove precedence and tenant, city, partner, user, and environment isolation.
- The same subject and snapshot produce deterministic flag results across service instances.
- Unauthorized actors cannot read, infer, or mutate another tenant's or partner's values or targeting rules.
- Production changes produce immutable audit records and satisfy the configured approval policy.
- Services continue with the latest verified snapshot or documented safe behavior during store and invalidation outages.
- Rollback and emergency disable propagate within a configurable objective and are observable by snapshot version.
- Events contain no secret values and are safe under duplicate and out-of-order delivery.
- Expired and stale flags are reported, safely resolved, and assigned to an accountable owner for removal.
