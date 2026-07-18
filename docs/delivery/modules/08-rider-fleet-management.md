# 08 — Rider Fleet Management

## Purpose

Manage the platform-owned rider workforce safely: identity, rider KYC, vehicle/capabilities, city and zone eligibility, availability, workload, compliance, and operational suspension. This module supplies trustworthy rider readiness to dispatch and a focused rider experience for assigned work.

## Boundaries

**Owns:** owned-rider profiles, onboarding/KYC workflow, documents, vehicle/capability records, city/zone permissions, availability sessions, compliance status, suspension, and workload/readiness projection.

**Does not own:** partner-employed rider administration, dispatch ranking, delivery lifecycle, raw tracking policy, proof artifacts, payroll/earnings ledger, or settlement. It exposes eligibility and receives assignment/status summaries.

## Actor flows

### Rider onboarding and KYC

1. Admin creates/invites a rider identity; rider verifies contact credentials.
2. Rider submits required identity, license, vehicle, and city-specific documents.
3. Automated checks and/or an authorized reviewer mark each requirement verified, rejected, or needing resubmission.
4. Rider becomes `active` only when all required checks are approved, documents are current, training/consent are recorded, and at least one city is assigned.
5. Expiry or revocation moves the rider to restricted/suspended according to policy and removes them from new dispatch.

### Availability and work

1. Active rider starts an availability session from `/rider`.
2. Server verifies KYC, suspension, city/zone, location permission/freshness where required, and maximum active jobs.
3. Dispatch can now discover the rider. The rider receives offers/assignments and updates job statuses through the authoritative delivery flow.
4. Rider goes offline voluntarily, at shift end, or automatically after configured inactivity. Active custody remains visible and cannot be abandoned by toggling offline.

### Admin operations

Admins search riders, review KYC, assign cities/zones and vehicle types, suspend/reactivate with reasons, and inspect current workload. Urgent manual changes are audited and propagate to dispatch immediately.

## Data model and constraints

- `Rider`: user ID, public display name, contact references, lifecycle status, home city, onboarding timestamps, risk/compliance flags.
- `RiderKycCase`: required policy/version, status (`not_started`, `pending`, `under_review`, `approved`, `rejected`, `expired`), reviewer, reasons, submitted/decided timestamps.
- `RiderDocument`: type, encrypted object reference, issuer/country, identifier fingerprint, issue/expiry dates, verification status. Never store document binaries in general database columns.
- `RiderVehicle`: type, registration fingerprint, capacity weight/volume, capabilities, verification, active flag.
- `RiderServiceArea`: city and optional zones, permitted products, effective interval.
- `RiderAvailabilitySession`: online/offline times, declared city, start/end locations when policy permits, end reason, device/session ID.
- `RiderReadiness`: derived projection of status, KYC, vehicle, availability, location freshness, active load, and exclusion reasons.
- One user maps to at most one owned-rider profile. Only one availability session may be open per rider.
- KYC approval is policy-versioned and requires all mandatory checks. Expired mandatory documents make the rider ineligible for new jobs.
- Capacity and capability use canonical units/enums shared with package and dispatch contracts.

## API surface

Existing:

- `POST /v1/riders/me/availability` — set online/offline; returns readiness and exclusion reasons.
- `GET /v1/riders/me/jobs` — active/recent assigned jobs.

Additional:

- `GET /v1/riders/me` and `PATCH /v1/riders/me` for permitted self-service fields.
- `GET /v1/riders/me/kyc` and upload/submit endpoints using short-lived object-storage URLs.
- Admin CRUD/read endpoints for riders, KYC decisions, vehicles, service areas, suspend/reactivate.
- `GET /v1/ops/riders` with readiness, city/zone, load, last-location freshness, and filters.
- Internal readiness query/event consumed by dispatch.

KYC decisions require reason codes. Status conflicts return `409`; missing prerequisites return `422` with specific readiness failures.

## Algorithms and rules

Readiness is a pure evaluation:

`eligible = active_profile AND approved_current_kyc AND verified_active_vehicle AND open_availability AND service_area_match AND not_suspended AND load_below_limit`

Location freshness may be required by dispatch policy but raw coordinates remain owned by tracking. A rider remains able to complete an active job if a document expires mid-job; new offers stop and ops receives an alert.

Clearly configurable values:

- KYC document/check requirements by country, city, vehicle, and product
- document-expiry warning and grace periods
- reviewer roles and dual-review requirements for sensitive decisions
- maximum concurrent jobs by vehicle/product
- inactivity auto-offline timeout and maximum shift duration
- cities/zones/products allowed per rider
- required vehicle capacity/capabilities
- whether fresh location is required to become/remain dispatchable
- suspension reason policies and reactivation approvals

Manual compliance override is limited to authorized admins, time-bound where possible, cannot bypass legally mandatory checks, and records rationale.

## State transitions

Rider lifecycle:

`invited -> onboarding -> pending_review -> active <-> restricted -> suspended -> deactivated`

- `pending_review -> active` requires current KYC and service-area/vehicle prerequisites.
- `active -> restricted` occurs for remediable expiry or missing operational requirement.
- Any non-deactivated state may become `suspended` through authorized safety/fraud action.
- Deactivation is terminal for operations; records remain for legal/audit retention.

KYC: `not_started -> pending -> under_review -> approved | rejected`; `rejected -> pending` on resubmission; `approved -> expired` at policy/document expiry.

Availability: `offline -> online -> offline`. Suspension or critical compliance expiry forces offline for dispatch purposes, while explicit session closure is recorded separately.

## UI touchpoints

- Rider app: onboarding checklist, secure document upload, review status/rejection guidance, availability toggle, readiness warnings, assigned job list, vehicle/profile summary.
- Admin riders: filters by city/status/KYC/expiry, review queue, document metadata viewer, decision controls, service-area and vehicle management, suspension dialog, audit timeline.
- Ops assign modal/live map: concise readiness badge and exclusion reasons; no document images or unnecessary KYC details.
- Rider earnings screen consumes assignment/ledger data and is not calculated here.

## Security and privacy

KYC and identity documents are highly sensitive. Encrypt in transit and at rest, isolate object storage, use short-lived signed URLs, malware scan uploads, restrict access to designated reviewers, and audit every view/download/decision. Mask government IDs and vehicle identifiers in routine UI/logs. Apply retention/deletion policies consistent with legal obligations. Riders can access only their own record; dispatchers see eligibility, not underlying documents. Consent and policy version are recorded. Never place KYC data in webhooks or public tracking.

## Failures and retries

Uploads are direct-to-object-storage with checksum and resumable/retry-safe completion. Verification-provider calls are asynchronous and idempotent by case/check ID; callbacks are signed, timestamped, and deduplicated. Provider outage leaves cases pending and supports manual review, not automatic approval. Availability updates are idempotent and use server time. Readiness projections rebuild from source events after failure. When forced offline during active custody, alert ops and preserve job access so the rider can complete or hand off safely.

## Metrics and observability

Track onboarding funnel, KYC approval/rejection/resubmission time, expiring documents, active/online riders by city, availability-session duration, readiness exclusion reasons, suspension/reactivation rates, active load, auto-offline events, and verification-provider latency/errors. Access logs for KYC are immutable and monitored for unusual volume. Alert on approval backlog, mass readiness drops, approaching expiry concentrations, unauthorized access attempts, and projection lag.

## Phase boundaries

- **Phase 1:** admin-created rider user/profile, basic KYC status, city assignment, availability, job list, manual suspension, and readiness for manual dispatch.
- **Phase 2:** secure document workflow, policy-driven KYC, vehicle/capability checks, expiry automation, workload/readiness views, and earnings presentation.
- **Phase 3:** refined consent/retention and integration-driven notifications.
- **Phase 4:** richer multi-city/zone eligibility, advanced compliance policies, multi-vehicle support, and scale workforce analytics.

Partner riders remain in the partner fleet module; owned and partner identities must not be conflated.

## Acceptance criteria

- A rider cannot become dispatchable without active status, current approved KYC, required vehicle, service area, and an online session.
- KYC document access is permissioned, audited, encrypted, and excluded from logs/webhooks.
- Document expiry removes the rider from new offers without blocking safe completion of a job already in custody.
- Concurrent availability requests cannot create multiple open sessions.
- Suspension immediately removes new-dispatch eligibility and records actor/reason.
- Admin and ops views show only the KYC detail necessary for their role.
- Multi-city/zone eligibility is explicit and deterministic.
- Verification callbacks and retries cannot duplicate checks or reverse a newer decision.
