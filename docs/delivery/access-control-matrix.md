# Access Control Matrix

Authorization requirements for the multi-tenant Delivery-as-a-Service platform.

## 1. Principles

- Deny access by default and grant the minimum permissions required for a role.
- Enforce authorization on the server for every dashboard, mobile, API, webhook, export, and support action.
- Scope tenant users, API keys, branches, deliveries, reports, and financial records to one tenant.
- A public tracking token grants read-only access to one delivery's recipient-safe tracking projection. It is not a tenant session.
- Platform access does not imply unrestricted data access. Support and admin access must be purpose-limited and audited.
- Re-check authorization when an object identifier, branch, tenant, delivery, rider, or export filter changes.

## 2. Roles

| Role | Scope and purpose |
|---|---|
| Merchant owner | Full tenant administration, integrations, operations, and finance access. |
| Merchant admin | Tenant operations and configuration. Cannot transfer ownership or perform owner-only security actions. |
| Merchant operator | Creates and manages deliveries and branches needed for operations. |
| Merchant finance | Billing, COD, settlement, and finance-report access. |
| Merchant viewer | Read-only tenant operations and non-sensitive reports. |
| Dispatcher / ops | Cross-tenant operational dispatch for authorized cities or service areas. |
| Rider | Only assigned jobs and rider-owned availability, location, proof, and earnings data. |
| Partner fleet manager | Jobs offered or assigned to the partner fleet, its riders, and its settlement statements. |
| Partner rider | Only partner jobs assigned to that rider. |
| API client | Tenant-scoped machine actor limited by API-key scopes. |
| Tracking recipient | Token-scoped, read-only view of one delivery's recipient-safe tracking data. |
| Platform support | Time-bound troubleshooting access; no routine finance mutation or secret access. |
| Platform finance | Billing, COD, settlement, and financial reconciliation across authorized tenants. |
| Platform admin | Platform configuration, tenant governance, service areas, pricing, KYC, and role administration. |
| System worker | Narrow service identity for dispatch, webhooks, notifications, billing, and scheduled processing. |

Custom roles may narrow these grants but must never expand beyond the tenant and platform boundaries defined here.

## 3. Resource and action matrix

Legend: **M** = manage, **W** = operational write, **R** = read, **O** = own or assigned records only, **T** = token-scoped public projection, **S** = scoped by API key, **E** = exceptional time-bound access, **—** = no access.

### Tenant, branch, and delivery operations

| Resource / action | Owner | Admin | Operator | Finance | Viewer | Dispatcher | Rider | Partner manager | Partner rider | API client | Recipient | Support | Platform finance | Platform admin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Tenant profile: read | R | R | R | R | R | R | — | R | — | S | — | E | R | R |
| Tenant settings / branding: update | M | M | — | — | — | — | — | M¹ | — | S | — | E | — | M |
| Tenant membership / roles: manage | M | M² | — | — | — | — | — | M¹ | — | — | — | E | — | M |
| Tenant ownership / suspension | M³ | — | — | — | — | — | — | — | — | — | — | — | — | M |
| Branches: read | R | R | R | R | R | R | O | R¹ | O | S | — | E | R | R |
| Branches: create / update / archive | M | M | W | — | — | — | — | M¹ | — | S | — | E | — | M |
| Deliveries: list / detail | R | R | R | R⁴ | R⁴ | R | O | O | O | S | T | E | R⁴ | R |
| Deliveries: create / quote | M | M | W | — | — | W⁵ | — | — | — | S | — | E | — | — |
| Delivery details: edit before pickup | M | M | W | — | — | W | O⁶ | W⁶ | O⁶ | S | — | E | — | W⁷ |
| Delivery: cancel | M | M | W | — | — | W | — | W⁶ | — | S | — | E | — | W⁷ |
| Delivery status: operational transition | R | R | R | — | — | W | O | O | O | S⁸ | — | E | — | W⁷ |
| Assign / reassign owned rider | R | R | — | — | — | M | — | — | — | — | — | E | — | M |
| Assign / reassign partner rider | — | — | — | — | — | W⁹ | — | M | — | S⁹ | — | E | — | M |
| Rider availability | — | — | — | — | — | R | O | R¹ | O | S¹ | — | E | — | M |
| Rider live / last location | — | — | — | — | — | R | O¹⁰ | R¹ | O¹⁰ | S¹ | T¹¹ | E | — | R |
| Proof of pickup / delivery: capture | — | — | — | — | — | — | O | — | O | S⁸ | — | E | — | — |
| Proof: view / download | R | R | R | — | R¹² | R | O | O | O | S | T¹² | E | — | R |

¹ Partner tenant or partner fleet scope only.  
² Cannot grant owner, platform, support, or finance roles beyond the administrator's own grant authority.  
³ Merchant owner may transfer tenant ownership; only platform admin may suspend or restore a tenant.  
⁴ Financial users see delivery finance fields; viewers receive a non-sensitive operational projection.  
⁵ Only for exception handling or manually entered jobs under documented operations policy.  
⁶ Only while the job is offered or assigned, and only fields needed to perform delivery.  
⁷ Break-glass correction only; never silently rewrite delivery history.  
⁸ Only when explicitly granted to a trusted integration or partner service; status transitions remain state-machine constrained.  
⁹ Dispatcher selects a partner fleet; the partner manager assigns its internal rider.  
¹⁰ A rider may publish and inspect their own current location while on duty, but cannot browse historical location outside approved job context.  
¹¹ Recipient sees coarse or delayed location only while the delivery is active and policy permits it.  
¹² Recipient and viewer projections exclude internal notes, raw media metadata, and unrelated personal data.

### Integrations, finance, reporting, and administration

| Resource / action | Owner | Admin | Operator | Finance | Viewer | Dispatcher | Rider | Partner manager | Partner rider | API client | Recipient | Support | Platform finance | Platform admin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| API keys: list metadata | R | R | — | — | — | — | — | R¹ | — | — | — | E | — | R |
| API keys: create / scope / revoke | M | M | — | — | — | — | — | M¹ | — | — | — | E¹³ | — | M¹³ |
| API key secret: reveal | M¹⁴ | M¹⁴ | — | — | — | — | — | M¹,¹⁴ | — | — | — | — | — | — |
| Webhooks: list / inspect attempts | R | R | R | — | R¹⁵ | — | — | R¹ | — | S¹⁵ | — | E | — | R |
| Webhooks: create / update / disable / replay | M | M | — | — | — | — | — | M¹ | — | S¹⁶ | — | E | — | M¹³ |
| Webhook signing secret: reveal / rotate | M¹⁴ | M¹⁴ | — | — | — | — | — | M¹,¹⁴ | — | — | — | — | — | — |
| Billing profile / invoices: read | R | R | — | R | — | — | — | R¹ | — | S | — | E | R | R |
| Billing profile / payment method: update | M | M | — | M | — | — | — | M¹ | — | S¹⁷ | — | — | W | M |
| Invoice adjustment / credit | — | — | — | — | — | — | — | — | — | — | — | — | M | M |
| COD amount on delivery: set / amend | M | M | W¹⁸ | R | — | W¹⁸ | O¹⁹ | O¹⁹ | O¹⁹ | S¹⁸ | T²⁰ | E | R | W²¹ |
| COD collection: record / reverse | R | R | R | R | — | W²¹ | O | O | O | S¹⁹ | — | E | M²¹ | M²¹ |
| COD ledger / balance: read | R | R | — | R | — | — | O²² | R¹ | O²² | S | — | E | R | R |
| Settlements: statements / status | R | R | — | R | — | — | O²² | R¹ | O²² | S | — | E | R | R |
| Settlements: prepare / approve / release | — | — | — | — | — | — | — | — | — | — | — | — | M²³ | M²³ |
| Operational reports: view / export | R | R | R | R | R¹⁵ | R | O | R¹ | O | S | — | E | R | R |
| Financial reports: view / export | R | R | — | R | — | — | O²² | R¹ | O²² | S | — | E | R | R |
| Support case: create / view | M | M | W | W | R²⁴ | W | O | M¹ | O | S | — | M | R | R |
| Support case: investigate / respond | — | — | — | — | — | — | — | — | — | — | — | M | R²⁵ | R |
| Support impersonation / tenant session | — | — | — | — | — | — | — | — | — | — | — | E²⁶ | — | E²⁶ |
| Businesses / tenants: approve / suspend | — | — | — | — | — | — | — | — | — | — | — | — | — | M |
| Cities / zones / pricing: manage | — | — | — | — | — | — | — | — | — | — | — | R | R | M |
| Rider account / KYC: manage | — | — | — | — | — | R | O²⁷ | M¹,²⁷ | O²⁷ | S¹ | — | E | R²⁷ | M |
| Platform roles / policy: manage | — | — | — | — | — | — | — | — | — | — | — | — | — | M |
| Audit log: read | R | R | — | R²⁸ | — | R²⁸ | — | R¹,²⁸ | — | S²⁸ | — | E | R²⁸ | R |
| System health / webhook failures | — | — | — | — | — | R²⁹ | — | — | — | — | — | R | — | M |

¹³ Support or platform admin may revoke a compromised credential, but must never retrieve its secret or create an enduring tenant credential for personal use.  
¹⁴ Secret value is shown once at creation or rotation; afterward only masked metadata is available.  
¹⁵ Excludes payload fields the role could not access through the underlying resource.  
¹⁶ A machine actor may request replay only for its own endpoint and authorized event types.  
¹⁷ Prefer hosted payment-provider flows; raw card data must not enter platform interfaces or logs.  
¹⁸ COD amount may change only before pickup, with a reason and any required merchant or dispatcher approval.  
¹⁹ Trusted operational recording only and constrained to the assigned delivery.  
²⁰ Recipient sees amount due and payment state, not ledger or settlement data.  
²¹ Corrections and reversals require a reason and preserved original entry.  
²² Only the actor's own earnings or settlement statement, not tenant-wide ledgers.  
²³ Preparation and release should use separate actors when staffing permits; the same actor must not approve their own manual adjustment.  
²⁴ Only cases the viewer created or was explicitly added to, with attachments filtered by normal resource permissions.  
²⁵ Platform finance participates only in finance-related cases.  
²⁶ Requires explicit reason, short expiry, visible impersonation indicator, and tenant notification where policy requires. Sensitive actions require re-authentication and may be prohibited entirely while impersonating.  
²⁷ Rider may maintain ordinary profile data, but KYC verification and protected identity fields require authorized reviewers.  
²⁸ Limited to events within the role's normal scope; platform admins cannot alter audit records.  
²⁹ Operational health only for authorized regions; no infrastructure secrets or unrelated tenant payloads.

## 4. Tenant and object boundaries

1. Every tenant-owned record carries an immutable `tenant_id`; authorization derives the tenant from the authenticated principal, never from an untrusted request value alone.
2. Tenant users and API clients cannot query, join, export, count, infer, or receive events about another tenant's records.
3. Branch restrictions further narrow tenant access. A branch-scoped role or key can access only deliveries whose owning branch is in its grant.
4. Dispatchers are platform operational actors, not tenant members. Their access is limited by assigned city, zone, shift, and operational purpose.
5. Riders can access a delivery only while assigned or during a defined post-completion window. Reassignment removes the former rider's access except to their own earnings and immutable work history.
6. Partner fleets see only jobs explicitly offered or assigned to that partner. Partner rider identifiers must not become visible to unrelated tenants or partners.
7. Recipient tracking tokens resolve to one delivery and return a separate allowlisted representation. Tokens expire or are disabled according to retention and cancellation policy.
8. Support, finance, and admin searches require an explicit tenant context before exposing tenant data. Cross-tenant exports are limited to approved platform reporting purposes.
9. System workers use separate identities and narrowly scoped permissions. A webhook worker can deliver events but cannot manage tenant credentials; a billing worker cannot dispatch riders.
10. Archived, cancelled, returned, and deleted records retain the same authorization boundary for their full retention period.

## 5. Field-level sensitive data

| Data class | Allowed exposure | Required controls |
|---|---|---|
| Recipient name and contact | Merchant operational roles, assigned dispatcher/rider/partner, authorized support; recipient sees their own masked details | Mask in lists and logs; reveal only when needed for active fulfillment; prevent bulk export by default |
| Pickup / drop-off address and instructions | Operational roles and assigned actors; public tracking shows only recipient-safe location text | Hide unit/access codes after operational need ends; never expose one delivery's address through another tracking token |
| Rider phone, identity, KYC, and documents | Rider, authorized ops/KYC reviewers, platform admin; merchant and recipient receive only contact mechanisms required by policy | Encrypt at rest, malware-scan documents, prohibit download where possible, record every view or export |
| Live and historical rider location | Rider, authorized dispatch, assigned partner manager, platform admin/support by exception | Collect only on duty or active jobs; coarse/delay recipient view; restrict history and retention; never include in general exports |
| Proof photos, signatures, names, and metadata | Authorized merchant roles, assigned operational actors, recipient-safe proof summary, support by exception | Signed short-lived URLs, strip unnecessary metadata, redact unrelated people/data, prohibit indexing and public object URLs |
| Internal notes and exception reasons | Merchant operational roles, dispatch, assigned rider where actionable, support by exception | Separate from recipient-visible messages; remove credentials, health data, or unnecessary personal data |
| API keys and webhook secrets | Creator at one-time display only | Store hashes or encrypted secret material as appropriate, mask metadata, require re-authentication to rotate/revoke, never log |
| Webhook payloads and attempt logs | Same effective access as the event's underlying resource | Redact secrets and disallowed fields; signed delivery; bounded retention; replay authorization |
| Billing identity and payment data | Merchant owner/admin/finance and platform finance | Use payment-provider tokens; mask account details; require stronger authentication for changes |
| COD ledger and settlement bank details | Merchant owner/admin/finance, relevant partner manager, platform finance | Immutable double-entry-style history, encrypted bank data, maker-checker controls, no exposure to recipient |
| Earnings | Individual rider, relevant partner manager, authorized merchant/platform finance where applicable | Rider sees only own earnings; distinguish estimates from approved and paid amounts |
| Audit events, IP address, device data | Tenant owner/admin for tenant events; authorized platform roles | Append-only, access-controlled, retention-limited, redact credentials and proof content |
| Reports and exports | Only fields authorized for the requesting role and filters | Re-authorize at generation and download, short-lived link, watermark or attribution, expiry, download audit |

Sensitive values must not appear in URLs, analytics events, client-side error reports, notification previews, or general application logs.

## 6. Audit requirements

The audit log is append-only, tamper-evident, time-synchronized, and separate from editable business history. Each event records actor type and ID, effective role, tenant context, action, resource type and ID, timestamp, outcome, source channel, request or correlation ID, and changed fields. Sensitive values are redacted; changes store safe before/after summaries or references.

| Event category | Audit requirement |
|---|---|
| Authentication and authorization | Login success/failure, MFA and recovery changes, session revocation, denied privileged actions, role and membership changes |
| Tenant and branch administration | Ownership transfer, approval/suspension, settings and branding changes, branch create/update/archive |
| Delivery lifecycle | Creation, material edits, cancellation, every status transition, reason, actor, optional location, assignment/reassignment |
| Rider and partner operations | Availability changes, fleet acceptance/decline, rider assignment, KYC status changes, location-access exceptions |
| Proof | Capture, replacement, rejection, view by privileged/support actor, download, and redaction; do not copy proof media into audit payloads |
| Credentials and webhooks | Key create/scope/revoke, secret rotation, endpoint/event changes, delivery failures, manual replay, signature validation failures |
| Finance | Invoice/credit changes, COD record/reversal, ledger adjustment, settlement preparation/approval/release/failure, bank-detail changes, report export |
| Support and admin | Case access, sensitive-field reveal, impersonation start/end, break-glass grant, cross-tenant search/export, pricing/zone/policy changes |
| Data lifecycle | Export generation/download, retention override, anonymization, deletion request and completion |

High-risk actions require a reason and stronger authentication: ownership transfer, role escalation, secret rotation, bank-detail change, COD reversal, manual ledger adjustment, settlement release, support impersonation, and break-glass access. Alert on suspicious patterns such as repeated denied cross-tenant access, bulk sensitive exports, unusual proof downloads, credential churn, or self-approved financial adjustments.
