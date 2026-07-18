# Module 03 — Businesses and Branches

## Purpose

Represent merchant businesses as SaaS tenants and their branches as reusable delivery origins. A business owns deliveries, memberships, integration credentials, webhook endpoints, and financial records. A branch stores an operational pickup location and contact so merchants do not repeatedly enter the same origin.

## Responsibilities

- Create and retrieve business tenant profiles.
- Establish the creator's owner membership atomically.
- Support platform approval/state needed by the Phase 1 admin business list.
- Create and manage branches belonging to a business.
- Store branch address, geolocation, and pickup contact.
- Validate branch/city/zone compatibility for delivery use.
- Provide tenant identity and branch snapshots to downstream modules.
- Audit business and branch changes.

## Non-responsibilities

- Authentication, credential storage, and role evaluation.
- City/service-zone geometry and coverage policy.
- Delivery addresses after they are snapshotted onto a delivery.
- Quote calculation, dispatch, COD, invoicing, or settlement.
- Partner-fleet organization profiles.
- Commerce-store profiles and white-label branding, which are Phase 3 concerns.

## Actors and permissions

| Operation | Owner | Admin | Dispatcher | Finance | Viewer | Ops | Platform admin |
|---|---:|---:|---:|---:|---:|---:|---:|
| Read own business/branches | Yes | Yes | Yes | Yes | Yes | Operational need | Yes |
| Create business | Bootstrap user | Bootstrap user | No | No | No | No | Yes |
| Update business profile | Yes | Yes | No | No | No | No | Yes |
| Create/update branch | Yes | Yes | **Business-configurable** | No | No | No | Yes |
| Deactivate branch | Yes | Yes | **Business-configurable** | No | No | No | Yes |
| Approve/suspend business | No | No | No | No | No | No | Yes |

Only contracted operations are mandatory for the initial public API. The fuller permission matrix supports dashboard implementation but must be finalized before exposing additional endpoints.

## Data model

### `businesses`

| Field | Constraints |
|---|---|
| `id` | UUID primary key |
| `name` | Required, trimmed, non-empty |
| `legal_name` | Nullable; KYC depth is **phase-configurable** |
| `status` | `pending`, `active`, `suspended`; approval requirement is **platform-configurable** |
| `default_currency` | Required ISO currency code; changing after financial entries exist requires controlled policy |
| `default_country` | Nullable ISO country code |
| `timezone` | Required IANA timezone, used for dashboard/business dates |
| `created_by_user_id` | Required creator reference |
| `approved_at`, `approved_by_user_id` | Nullable; set together |
| `suspended_at`, `suspension_reason` | Nullable; reason is internal |
| `created_at`, `updated_at` | Required timestamps |

Business slugs, tax identifiers, billing plans, branding, and KYC fields are not required by the approved Phase 1 contract. Add them only with an approved use case and privacy rules.

Business name need not be globally unique. Human-readable uniqueness is not an isolation mechanism.

### `branches`

| Field | Constraints |
|---|---|
| `id` | UUID primary key |
| `business_id` | Required tenant foreign key |
| `name` | Required, trimmed, non-empty |
| `status` | `active`, `inactive`; default `active` |
| `address_line1` | Required |
| `address_line2` | Nullable |
| `city_id` | Required foreign key to configured city |
| `city_label_snapshot` | Optional display snapshot; city ID remains authoritative |
| `region` | Nullable |
| `postal_code` | Nullable |
| `country` | Required ISO country code |
| `lat` | Required; decimal in `[-90, 90]` |
| `lng` | Required; decimal in `[-180, 180]` |
| `contact_name` | Required for pickup operations |
| `contact_phone` | Required, normalized for operational use |
| `pickup_notes` | Nullable; length-limited, treated as merchant-visible operational data |
| `service_zone_id` | Nullable cached/selected zone reference; must belong to `city_id` |
| `created_by_user_id`, `updated_by_user_id` | Required actor references |
| `created_at`, `updated_at` | Required timestamps |

Recommended unique constraint: `(business_id, normalized_name)` for active branches. Whether duplicate names are allowed is **business-configurable**; IDs are always canonical.

Do not hard-delete a branch referenced by a delivery. Deactivation prevents selection for new work while historical deliveries retain their snapshots.

### Delivery origin snapshot

When a branch is used, copy the pickup address/contact values into the delivery's immutable operational address snapshot and retain nullable `branch_id`. Later branch edits must not rewrite an existing delivery.

## State and flows

### Business lifecycle

```text
pending → active → suspended
             ↑         |
             └─────────┘  (reactivation by platform admin)
```

If approval is not required, creation may enter `active` directly. This is **platform-configurable**. State changes must be explicit and audited.

- `pending`: profile exists; permitted setup actions are **platform-configurable**.
- `active`: normal tenant operations.
- `suspended`: new merchant operations are restricted according to the multi-tenancy suspension policy; active deliveries are not silently cancelled.

### Business creation

1. Authenticate bootstrap user.
2. Validate profile and platform registration policy.
3. In one transaction, insert business and active `business_owner` membership.
4. Emit internal `business.created`.
5. Return business ID/status.
6. Any external approval/KYC workflow is deferred unless configured.

Failure before transaction commit leaves neither an ownerless business nor a membership pointing to a missing business.

### Branch creation

1. Authorize actor for path `businessId`.
2. Normalize and validate branch/contact/address data.
3. Resolve `city_id` and evaluate the coordinate against active service zones.
4. Coverage behavior is **business-configurable**: reject branches outside coverage, or allow saving but mark them unusable for quoting. Phase 1 should choose one policy explicitly.
5. Insert tenant-scoped branch and audit.

### Branch update/deactivation

- Updating address/geolocation revalidates city/zone coverage.
- Existing delivery snapshots remain unchanged.
- Inactive branches cannot be selected for new quotes/deliveries.
- Reactivation requires current coverage validation.

## API operations

### Contracted operations

| Method | Path | Authorization | Behavior |
|---|---|---|---|
| `POST` | `/v1/businesses` | Authenticated bootstrap user | Create tenant and owner membership; `201` |
| `GET` | `/v1/businesses/{id}` | Mentioned in `contracts.md`; tenant member or platform permission | Return tenant-safe business profile |
| `POST` | `/v1/businesses/{businessId}/branches` | Owner/admin or approved branch permission | Create branch; `201` |

`GET /v1/businesses/{id}` appears in `contracts.md` but is not currently declared in `openapi.yaml`; align the OpenAPI document before treating it as a public API.

The current OpenAPI does not define request/response schemas for business or branch creation. Before implementation, add schemas covering the required fields above and standard errors.

### UI-required future operations

The Branches CRUD screen requires list, get, update, and deactivate operations. These are not yet in the public contract. Candidate paths such as `GET /v1/businesses/{businessId}/branches` and `PATCH /v1/businesses/{businessId}/branches/{branchId}` must be formally added rather than assumed.

## Validation and business rules

- Business and branch names are trimmed and length-limited.
- Currency, country, timezone, phone, latitude, and longitude use validated canonical formats.
- `city_id` must reference an active city.
- If `service_zone_id` is supplied, it must be active, contain the coordinate under the approved boundary rule, and belong to the branch city.
- Client-supplied `business_id` cannot differ from path/authenticated scope.
- Only active branches are valid for new delivery creation.
- Branch pickup contact is required so the rider can complete pickup.
- Branch address edits cannot mutate delivery history.
- Business status gates new operations but does not itself transition deliveries.
- Suspension reason is not exposed to public tracking or merchant API keys unless explicitly approved.
- Maximum branch count, required approval, and whether an out-of-zone branch may be stored are **business-configurable**.

## Security and tenant isolation

- Every branch query and uniqueness check includes `business_id`.
- Business membership is checked before returning profiles or branch contacts.
- Avoid exposing legal/KYC/internal suspension data to roles that do not need it.
- Contact details and notes are operational personal data; mask or omit them from non-operational views.
- Platform admin changes use explicit admin authorization and audit.
- Address content is rendered as text; never trust merchant-provided notes as HTML.
- Exports, cache keys, and search indexes include tenant scope.

## Events and webhooks

Internal events:

- `business.created`
- `business.activated`
- `business.suspended`
- `business.reactivated`
- `branch.created`
- `branch.updated`
- `branch.deactivated`

These are not merchant webhook events in the approved contract. They feed audit, cache invalidation, and internal workflows only unless the webhook contract is expanded. Event payloads include `business_id`, actor, aggregate ID, safe changed fields, timestamp, and correlation ID.

Delivery webhooks may include a safe branch reference or pickup snapshot only if the delivery webhook schema approves it; never read mutable branch data to reconstruct historical webhook content.

## UI touchpoints

- `/register`: creates user only; business onboarding follows.
- `/app`: business name/status and selected tenant context.
- `/app/branches`: list, create, edit, deactivate, and show coverage validation.
- `/app/deliveries/new`: select active branch and populate pickup snapshot.
- `/app/deliveries/[id]`: display historical pickup snapshot, optionally link current branch.
- `/admin/businesses`: list, approve/activate/suspend, and inspect tenant status.
- `/admin/cities` / zones screen: branch coverage diagnostics may link to zone configuration.

## Failure cases

- Business created without owner because transaction boundaries are wrong.
- Duplicate active branch name under a policy that requires uniqueness.
- Branch coordinates are invalid, outside configured coverage, or inconsistent with city.
- City/zone becomes inactive while branch remains active; quote/delivery validation must catch it.
- Attempt to update/deactivate another tenant's branch.
- Branch is deactivated between quote and delivery confirmation.
- Business suspended while active deliveries exist.
- Delivery incorrectly reads an updated branch instead of its stored snapshot.

## Observability and audit

- Metrics: business/branch create outcomes, active/pending/suspended counts, branch coverage failures, inactive-branch selection attempts.
- Structured logs: business ID, branch ID, actor, operation, result, request/correlation ID.
- Audit: business creation/state/profile changes; branch create/address/contact/status changes; actor and safe before/after values.
- Do not log full contact phone or unrestricted pickup notes.
- Alert on provisioning failures, ownerless businesses, and repeated cross-tenant branch attempts.

## Phased implementation

### Phase 1 — Tenant and pickup foundation

- Business creation with atomic owner membership.
- Minimal profile/status and admin list/approval behavior.
- Branch CRUD needed by the Phase 1 UI, after API contract expansion.
- Address/contact/geolocation and city/zone validation.
- Delivery pickup snapshots and audit logs.

### Phase 2 — Operational enrichment

- Notification/proof/COD views consume branch snapshots safely.
- Optional branch-level operational reporting.

### Phase 3 — Merchant administration

- Branding and integration settings where approved.
- CSV/plugin workflows choose a branch or provide explicit pickup data.
- Invoice views use business billing identity from a separately approved schema.

### Phase 4 — Multi-city scale

- Multi-stop origins and scale reporting.
- Partner fleet organizations remain separate from merchant businesses.

## Acceptance criteria

- Creating a business creates exactly one tenant and an active owner membership atomically.
- A business's profile and branches are inaccessible to another business.
- A permitted actor can create a branch with a valid city, coordinate, address, and pickup contact.
- Invalid latitude/longitude, inactive city, cross-city zone, and disallowed out-of-coverage branch are rejected with actionable validation errors.
- Inactive branches cannot be used for new quotes or deliveries.
- Existing delivery pickup data does not change after a branch is edited or deactivated.
- Business and branch state changes are audited with actor, tenant, target, timestamp, and safe before/after data.
- API behavior does not claim list/update/deactivate endpoints as public until OpenAPI is expanded.
