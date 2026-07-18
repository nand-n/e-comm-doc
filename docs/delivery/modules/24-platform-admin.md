# Module 24 — Platform Administration

**Status:** Detailed delivery specification  
**Dependencies:** Identity/RBAC, tenancy, cities/zones, pricing, finance, audit, observability  
**Primary phases:** Phase 1 onward

## 1. Purpose

Provide a controlled administration plane for operating the multi-tenant delivery platform: tenant lifecycle, service geography, riders and partners, configuration, feature rollout, finance operations access, policy review, and system health.

## 2. Boundaries

### In scope

- Tenant approval/suspension, city and zone configuration, rider/partner administration.
- Versioned pricing, COD, settlement, retention, risk, notification, and operational policies.
- Role and permission administration, support impersonation controls, feature flags, and operational health.
- Approval workflow, effective dating, audit trail, and rollback through new versions.

### Out of scope

- Direct editing of merchant operational data, posted ledger entries, audit events, or historical policy versions.
- A generic database console or unrestricted production shell.
- Using platform-admin status as automatic finance, security, or privacy approval.

## 3. Actors and permissions

| Role | Typical permissions |
|---|---|
| Platform super-admin | Assign narrow admin roles, manage emergency access; no default finance posting |
| Tenant administrator | Approve, suspend, and configure tenant-level platform status |
| Operations administrator | Cities, zones, service hours, fleet settings |
| Rider/partner administrator | Onboarding status, capabilities, association; restricted identity data |
| Pricing administrator | Draft versioned pricing rules |
| Finance administrator/operator | Finance configuration/operations according to Modules 21–23 |
| Security administrator | Authentication policy, access reviews, security controls |
| Privacy/compliance reviewer | Approve retention, export/deletion and jurisdiction policy |
| Read-only auditor | Search configurations, actions, approvals, and system evidence |

Permissions are action- and scope-specific. High-risk actions require step-up authentication, reason, ticket/reference, and maker-checker approval. Super-admin cannot bypass immutable finance or audit controls.

## 4. Data model

- **AdminRole/AdminPermission/AdminAssignment:** scope, granted by, start/end, review date.
- **TenantLifecycleRecord:** business, state, reason, requested/approved/suspended timestamps.
- **ConfigurationNamespace:** owner scope, schema, sensitivity, approval requirement.
- **ConfigurationVersion:** immutable values, effective dates, author, diff, validation result, approval state.
- **FeatureFlag:** key, targeting scope, rollout percentage, dependencies, expiry, owner.
- **AdminChangeRequest:** action, target, proposed payload hash, risk, evidence, maker/approvers, decision.
- **ImpersonationSession:** requester, tenant/user target, approved purpose, capabilities, start/end, actions.
- **JurisdictionProfile:** geography, policy references, review statuses and effective dates; not a legal conclusion.
- **OperationalBanner/MaintenanceWindow:** scope, timing, message, owner.

Secrets are stored by secret reference, never plaintext configuration values.

## 5. Operations and APIs

Representative restricted APIs:

- `GET /v1/admin/businesses`
- `POST /v1/admin/businesses/{id}/approve`
- `POST /v1/admin/businesses/{id}/suspend`
- `POST /v1/admin/cities` and `/service-zones`
- `POST /v1/admin/riders` and `/partners`
- `POST /v1/admin/configurations/{namespace}/versions`
- `POST /v1/admin/change-requests/{id}/approve`
- `POST /v1/admin/configurations/{id}/activate`
- `POST /v1/admin/feature-flags`
- `POST /v1/admin/impersonation-sessions`
- `GET /v1/admin/system-health`
- `GET /v1/admin/audit-events`

All writes use idempotency, schema validation, expected version, impact preview, dry-run where practical, and audit correlation. Bulk actions must show target count and exclusions before approval.

## 6. Rules and states

- Configuration is immutable and versioned: draft a new version, validate, approve, schedule/activate; never overwrite active history.
- Effective dates use server time and explicit timezone semantics.
- Pricing, ledger posting, COD, payout, retention, and security policies pin the version applied to each transaction/event.
- Suspensions distinguish new-job blocking, API-key revocation, user-login restriction, payout hold, and read-only access; side effects must be explicit.
- Destructive deletion is replaced by archival/deactivation unless an approved privacy workflow requires erasure or anonymization.
- Feature flags require owner, reason, expiry/review date, fallback, and rollout audit.

Tenant states: `pending → active → suspended → closed`, with controlled reactivation from `suspended`.  
Configuration states: `draft → validation_failed|approval_pending → approved → scheduled → active → superseded`; `rejected`/`cancelled` alternatives.  
Change requests: `draft → submitted → approved|rejected → executed|failed|expired`.

Jurisdiction, identity/KYC, tax, COD, payment processor, retention, and communications policies must show `not_reviewed`, `review_pending`, `approved`, or `expired`. Activation requiring legal review is blocked unless status is approved.

## 7. Security and privacy

- Use phishing-resistant MFA where available for admins; enforce short sessions and reauthentication.
- Restrict admin surfaces by least privilege, environment, network/device risk, and tenant scope.
- Prevent self-grant, self-approval, and privilege escalation through role composition.
- Impersonation is disabled by default, time-limited, visibly indicated, capability-restricted, and fully audited; sensitive finance/security actions remain unavailable.
- Mask personal, bank, credential, webhook-secret, and identity-verification data.
- Export and bulk lookup controls include purpose, rate limits, watermarking where appropriate, and anomaly detection.
- Quarterly or configured access reviews revoke stale and expired assignments.

## 8. Failure handling

- Validation failure leaves configuration inactive and returns field-level errors.
- Activation is atomic; dependent services either observe the complete version or continue using the previous one.
- Failed activation records partial external side effects, prevents blind retry, and drives compensating action.
- Cache propagation exposes version/watermark and alerts on stale consumers.
- Misconfiguration rollback activates a previously validated value as a new version, preserving chronology.
- Emergency change follows a pre-authorized, time-bound path with retrospective independent review; it cannot alter ledger/audit history.
- Bulk jobs are resumable and item-idempotent, with per-target results.

## 9. Reports and metrics

- Active tenants, pending approvals, suspensions, and reactivation age.
- Admin role assignments, stale access, failed MFA, denied high-risk actions.
- Configuration changes by namespace, approver, failure, rollback, and propagation lag.
- Feature flags without owner/expiry and rollout exposure.
- Impersonation sessions, viewed records, actions, and duration.
- City/zone/rider/partner operational configuration coverage.
- Policies awaiting/approaching expiry of legal, finance, privacy, or security review.
- Admin API latency/error rate and high-risk action alerts.

## 10. Delivery phases

- **Phase 1:** Tenant, city/zone, rider administration; basic RBAC; audit search.
- **Phase 2:** Versioned pricing/COD configuration, system health, approvals, feature flags.
- **Phase 3:** Partner onboarding, impersonation controls, configuration propagation visibility, access reviews.
- **Phase 4:** Jurisdiction profiles, advanced policy orchestration, bulk operations, delegated regional administration.

## 11. Acceptance criteria

- An admin can perform only actions explicitly granted for their scope; platform-admin identity alone is insufficient.
- High-risk actions require distinct maker/approver identities and step-up authentication.
- Active configuration can be traced to immutable version, approver, effective date, and affected scope.
- Invalid or unapproved configuration never becomes active, and rollback preserves history.
- Tenant suspension previews and records each operational, authentication, and finance side effect.
- Admins cannot edit posted ledger entries, acknowledged custody records, issued documents, or audit events.
- Impersonation is time-bound, visible, restricted, and reconstructable from audit records.
- Secrets and sensitive identity/payment fields are never exposed in list views or configuration diffs.
- Services expose and converge on the intended configuration version within the defined SLA.
- Policies requiring jurisdiction or processor review cannot activate while review is missing or expired.
