# Module 01 — Identity, Authentication, and RBAC

## Purpose

Provide one identity and authorization boundary for the multi-tenant platform. The module authenticates dashboard users, riders, operations staff, and platform administrators; authenticates merchant integrations with API keys; and resolves every request to an actor, role, and permitted scope.

Phase 1 covers email/password login, JWT access, business memberships, rider identities, API keys, and audit records. Partner-fleet identity is introduced in Phase 4 without changing the core authorization model.

## Responsibilities

- Register and authenticate human users.
- Store credentials safely and issue authenticated sessions/tokens.
- Model business membership and role assignment.
- Authenticate API clients by business-scoped API key.
- Enforce role and resource-scope checks at the application boundary.
- Create, reveal once, revoke, and audit API keys.
- Expose the current actor profile and effective permissions.
- Record security-relevant activity in the audit log.

## Non-responsibilities

- Business approval/KYC policy; the businesses module owns business state.
- Rider availability, assignments, and job actions.
- Webhook signing secrets and delivery retries.
- Customer tracking authorization, which uses an unguessable tracking token.
- External identity providers, MFA, passwordless login, and enterprise SSO unless added later.

## Actors and permissions

| Actor/role | Scope | Core permissions |
|---|---|---|
| `platform_admin` | Platform-wide | Manage tenants and platform configuration; inspect audit records |
| `ops_dispatcher` | Platform operations | View operational deliveries/riders and perform dispatch actions |
| `business_owner` | One business | Full business administration, memberships, branches, developer credentials |
| `business_admin` | One business | Business administration except ownership-sensitive actions |
| `business_dispatcher` | One business | Read/create/manage that business's deliveries |
| `business_finance` | One business | Read money, invoice, COD, and settlement views |
| `business_viewer` | One business | Read-only business data |
| `rider` | Rider self + assigned jobs | Manage own availability and permitted transitions on assigned jobs |
| `partner_admin` | One partner fleet, Phase 4 | Manage partner fleet jobs and internal rider mapping |
| API key | One business | Merchant API operations allowed by the key's effective permissions |
| Tracking visitor | One delivery token | Read sanitized public tracking data only |

Role names above are fixed contract values. The exact permission matrix for business administration is a product-policy decision; implementation must use named permissions internally so it can be changed without duplicating role checks.

### Authorization rules

1. Authentication does not imply authorization.
2. A business role applies only through an active membership for the referenced `business_id`.
3. `platform_admin` and `ops_dispatcher` bypass tenant membership only for explicitly granted platform/operations permissions.
4. Riders can access only their own profile and deliveries currently or historically assigned to them, as required by the operation.
5. API-key requests are always tenant-bound; a body or path `businessId` must equal the authenticated key's business.
6. Public tracking must never return internal notes, complete audit data, credential data, or unrelated tenant information.

## Data model

Logical fields are implementation requirements; physical types may follow the selected database conventions.

### `users`

| Field | Constraints |
|---|---|
| `id` | UUID primary key |
| `email` | Required; normalized lowercase; unique on normalized value |
| `password_hash` | Required for password login; never returned |
| `name` | Required, non-empty |
| `status` | `active`, `disabled`; default `active` |
| `email_verified_at` | Nullable timestamp; verification enforcement is **business-configurable / phase-configurable** |
| `last_login_at` | Nullable timestamp |
| `created_at`, `updated_at` | Required timestamps |

Password plaintext must never be persisted or logged. Password hashing algorithm and work factor are security configuration, with an adaptive password hash required.

### `business_memberships`

| Field | Constraints |
|---|---|
| `id` | UUID primary key |
| `business_id` | Required foreign key to business |
| `user_id` | Required foreign key to user |
| `role` | One of the `business_*` roles |
| `status` | `active`, `invited`, `suspended`; Phase 1 may implement only `active` |
| `created_at`, `updated_at` | Required timestamps |

Unique constraint: `(business_id, user_id)`. A user may belong to multiple businesses, but every request must select or derive exactly one tenant scope.

### `platform_role_assignments`

| Field | Constraints |
|---|---|
| `id` | UUID primary key |
| `user_id` | Required foreign key |
| `role` | `platform_admin` or `ops_dispatcher` |
| `created_at` | Required timestamp |

Unique constraint: `(user_id, role)`. These assignments must not be represented as business memberships.

### `api_keys`

| Field | Constraints |
|---|---|
| `id` | UUID primary key |
| `business_id` | Required tenant foreign key |
| `name` | Required, unique within business among active keys |
| `key_prefix` | Required, non-secret lookup/display prefix |
| `secret_hash` | Required; only the hash is stored |
| `permissions` | Required set; defaults to the supported merchant API permission set |
| `last_used_at` | Nullable timestamp |
| `expires_at` | Nullable; expiration policy is **business-configurable** |
| `revoked_at` | Nullable; revoked keys cannot authenticate |
| `created_by_user_id` | Required actor reference |
| `created_at` | Required timestamp |

The full secret is returned exactly once at creation. Key generation must use cryptographically secure randomness. Key rotation is create-new, migrate, then revoke-old; secrets are never recovered.

### `auth_sessions` (if refresh/session tokens are implemented)

| Field | Constraints |
|---|---|
| `id` | UUID primary key |
| `user_id` | Required foreign key |
| `token_hash` | Required, unique |
| `expires_at` | Required |
| `revoked_at` | Nullable |
| `created_at`, `last_seen_at` | Required timestamps |

JWT duration, refresh support, and concurrent-session policy are **business-configurable platform security decisions**. If only short-lived JWTs are used in Phase 1, this table may be omitted.

## Authentication flows

### Bootstrap registration

1. Client calls `POST /v1/auth/register` with email, password, and name.
2. Service normalizes email, validates password, rejects an existing identity without revealing sensitive account details, hashes the password, and creates the user.
3. Creating a business remains a separate `POST /v1/businesses` operation.
4. The business creator receives `business_owner` membership from the businesses module in the same transaction as business creation.

Whether public registration is always open, invite-only, or requires email verification is **platform-configurable**.

### Login

1. Client calls `POST /v1/auth/login`.
2. Service verifies the normalized email and password using timing-safe library behavior.
3. Disabled users are rejected.
4. A JWT is issued containing subject and token metadata. Tenant memberships and current permissions should be loaded server-side rather than trusting mutable role claims for long periods.
5. Success/failure security events are recorded without logging the password or token.

### API-key authentication

1. Read `X-API-Key`.
2. Parse the non-secret prefix to locate candidate key.
3. compare the secret against `secret_hash`.
4. Reject revoked, expired, or tenant-mismatched keys.
5. Set actor type `api_key`, actor ID, business ID, and effective permissions.

### Authorization evaluation

Resolve the target resource's tenant from persisted data, not solely from request input. Evaluate required permission, actor scope, membership status, and resource-specific conditions. Return `404` instead of `403` where necessary to avoid confirming another tenant's resource exists.

## API operations

### Contracted in `openapi.yaml`

| Method | Path | Authorization | Behavior |
|---|---|---|---|
| `POST` | `/v1/auth/register` | Public | Create a user; `201` |
| `POST` | `/v1/auth/login` | Public | Verify credentials and issue JWT; `200` |
| `GET` | `/v1/me` | Bearer JWT | Return current user, roles/memberships, and effective context |
| `POST` | `/v1/businesses/{businessId}/api-keys` | Owner/admin permission | Create key; reveal secret once; `201` |

The OpenAPI contract currently defines only creation for API keys. Listing, revocation, membership invitations, password reset, and session revocation require future OpenAPI additions before public implementation.

### Error semantics

- `400` malformed input.
- `401` missing, invalid, expired, or revoked credentials.
- `403` authenticated but lacking a required permission.
- `404` target absent or intentionally hidden across tenant boundaries.
- `409` normalized email already registered or another uniqueness conflict.
- `429` authentication/key verification rate limit exceeded.

## Validation and business rules

- Email is trimmed, normalized, and validated before lookup.
- OpenAPI requires password length of at least 8; stronger composition or compromised-password checks are **platform-configurable**.
- Name must not be blank after trimming.
- A business membership role must be a business role, never a platform role.
- The last owner removal/role downgrade rule is a **business-configurable product decision**; until decided, prevent removing the only active owner.
- Permission checks are deny-by-default.
- Client-supplied actor, role, tenant, and user IDs never override authenticated context.
- API key names and optional permission sets are validated within the owning business.

## Security and tenant isolation

- Hash passwords and API secrets; encrypt only data that must be recoverable.
- Do not place secrets, password hashes, full API keys, or raw JWTs in logs.
- Apply rate limits to registration, login, and key authentication.
- Use HTTPS outside local development.
- Validate JWT signature, issuer, audience, expiry, and token type.
- All tenant-owned queries include `business_id` or join through an ownership relation.
- Cache entries include tenant and actor scope in their keys.
- Background jobs carry explicit tenant and actor metadata.
- Database constraints supplement application checks; authorization is still enforced in the service layer.

## Events and webhooks

Identity events are internal audit/domain events by default:

- `user.registered`
- `auth.login_succeeded`
- `auth.login_failed`
- `business.membership_created`
- `business.membership_role_changed`
- `api_key.created`
- `api_key.revoked`

These are not part of the merchant webhook event list in `contracts.md` and must not be sent externally unless the public contract is expanded. Audit publishing must omit secrets and credential material.

## UI touchpoints

- `/login` and `/register`: credentials and authentication errors.
- `/app`: tenant context and role-aware navigation.
- `/app/developers`: create/list/revoke API keys; secret shown once.
- `/admin`: platform-admin-only administration.
- `/ops`: operations permission boundary.
- `/rider`: rider login and rider-scoped session.
- All surfaces: unauthorized/expired-session handling and safe tenant switching for multi-business users.

## Failure cases

- Duplicate email registration.
- Invalid credentials, disabled account, expired JWT, or revoked API key.
- Membership removed while a token remains valid.
- Path/body business ID differs from authenticated tenant.
- API key secret display interrupted after creation; create a replacement because the secret cannot be recovered.
- Attempt to use one tenant's credential against another tenant's resource.
- Authorization policy or identity store unavailable; fail closed.

## Observability and audit

- Metrics: login attempts/outcomes, registration outcomes, auth latency, active/revoked API key use, authorization denials, rate-limit hits.
- Structured logs: request/correlation ID, actor type/ID, business ID, operation, result; never credential values.
- Audit records: actor, action, target type/ID, tenant, timestamp, request ID, source IP/user agent where legally appropriate, and safe before/after metadata.
- Alert on unusual failed-login volume, repeated revoked-key use, and platform-role changes.
- Audit retention and IP/user-agent retention are **platform-configurable compliance decisions**.

## Phased implementation

### Phase 1 — Foundation

- User registration/login and `GET /v1/me`.
- Password hashing, short-lived JWT validation, and rate limiting.
- Business memberships and all Phase 1 roles.
- Rider and platform role assignments.
- Business-scoped API-key creation/authentication/revocation support for the UI.
- Central permission middleware/policies and audit logging.

### Phase 2 — Hardening

- Session/device management, optional refresh rotation, and stronger anomaly monitoring.
- Email verification/password recovery if approved.
- Operational security dashboards.

### Phase 3 — Integration administration

- Developer-facing key rotation workflows and expanded API documentation.
- Plugin-specific least-privilege credentials if approved.

### Phase 4 — Partner identity

- `partner_admin` scope and partner-fleet membership.
- Enterprise identity enhancements only if separately approved.

## Acceptance criteria

- A valid registered user can log in and `GET /v1/me`; invalid credentials cannot.
- Passwords and API-key secrets are never stored in plaintext.
- A business owner can create a business-scoped API key and see its secret only in the creation response.
- Revoked or expired credentials are rejected.
- Every protected operation checks a named permission and resource scope.
- A user or API key from business A cannot read or mutate business B data, including by changing path/body IDs.
- A rider cannot update an unassigned delivery.
- Platform roles are distinct from business memberships.
- Security-sensitive actions produce secret-free audit records with actor, tenant where applicable, target, and timestamp.
- Public tracking remains independent of authenticated identity and returns only its documented sanitized payload.
