# Delivery-as-a-Service Requirements Traceability

**Status:** Traceability baseline for the approved delivery product  
**Sources reviewed:** [Product definition](./product-definition.md), [Application interfaces](./app-interfaces.md), [Contracts](./contracts.md), [OpenAPI](./openapi.yaml), [Documentation index](./index.md), and the detailed module/guide files currently present  
**Rule:** This matrix records documented ownership and gaps. It does not create missing requirements or resolve conflicting contracts.

## 1. Coverage legend and current document inventory

| Marker | Meaning |
|---|---|
| **Detailed** | The referenced module file exists and contains detailed requirements |
| **Reference** | A source/reference file exists but is not a complete owning module |
| **Gap** | The index names an owning document, but that file is not currently present |
| **Mismatch** | Existing documents make incompatible or materially different statements requiring a decision |

Detailed module specifications currently present:

- [Module 01 — Identity, authentication & RBAC](./modules/01-identity-auth-rbac.md)
- [Module 06 — Quoting & pricing](./modules/06-quoting-pricing.md)
- [Module 13 — Public API & developer platform](./modules/13-public-api-developer-platform.md)
- [Module 21 — Billing & ledger](./modules/21-billing-ledger.md)

Additional existing delivery references:

- [Product definition](./product-definition.md)
- [Application interfaces](./app-interfaces.md)
- [Contracts](./contracts.md)
- [OpenAPI](./openapi.yaml)
- [Merchant quickstart](./guides/merchant-quickstart.md)
- [Roadmap](./roadmap.md)

All other module/reference paths named in [the documentation index](./index.md) are intended ownership targets but are currently documentation gaps.

---

## 2. Approved product surfaces

| Approved surface | Phase | Owning module/reference documents | Coverage / documented gap |
|---|---:|---|---|
| Business dashboard | 1 onward | Modules 01, 03, 05, 06, 13–15, 18, 20–23; [Application interfaces](./app-interfaces.md) | **Partial:** UI inventory exists; only modules 01, 06, 13, and 21 are detailed. Merchant dashboard interaction/accessibility/state specifications are absent. |
| Public integration API + OpenAPI + sandbox | API Phase 1; sandbox Phase 3 | [Module 13](./modules/13-public-api-developer-platform.md), modules 14–15, [OpenAPI](./openapi.yaml), [Contracts](./contracts.md), [Merchant quickstart](./guides/merchant-quickstart.md) | **Partial / mismatch:** Module 13 is detailed; modules 14–15 are absent. OpenAPI is a Phase 1 skeleton and does not yet express the full Module 13 contract or sandbox. |
| Commerce plugins (Shopify/WooCommerce style) | 3 | Module 16, [Application interfaces §7](./app-interfaces.md), [Roadmap Phase 3](./roadmap.md) | **Gap:** flow is documented, but the owning module is absent. |
| White-label customer tracking | 1; branding Phase 3 | Module 20, [Application interfaces §6](./app-interfaces.md), [Contracts](./contracts.md), [OpenAPI](./openapi.yaml) | **Gap:** screen/endpoint intent exists; owning module and tracking response schema are absent. |
| React Native rider mobile app | 1 onward | Modules 01, 08, 10–12, 17, 22; [Application interfaces §4](./app-interfaces.md); [Technical stack §6](./technical-stack.md#6-react-native-rider-application) | **Specified:** React Native/Expo architecture, secure storage, SQLite offline outbox, background location, push, proof-device boundaries, conflict handling, testing, and release controls are documented; domain capabilities remain owned by their modules. |
| Dispatcher / operations console | 1 onward | Modules 07, 08, 10–12, 24, 27; [Application interfaces §2](./app-interfaces.md) | **Gap:** screen inventory and manual-assign endpoint exist; owning operational modules are absent. |
| Platform admin | 1 onward | Modules 01, 04, 06, 21, 23–30; [Application interfaces §3](./app-interfaces.md) | **Partial:** identity, pricing, and ledger requirements exist; platform-admin and control modules are absent. |
| Partner fleet portal / API | 4 | Modules 01 and 09, modules 13, 15, 21, 23; [Application interfaces §5](./app-interfaces.md) | **Partial / gap:** partner role boundary appears in Module 01; partner fleet module, API contract, portal detail, and partner event schemas are absent. |

Surface checklist:

- [x] All eight approved product surfaces have an owning module/reference mapping.
- [ ] Every surface has a detailed owning module.
- [ ] Every API-backed surface has complete OpenAPI request, response, error, and security schemas.
- [ ] Accessibility, responsive behavior, empty/loading/error states, and browser support are documented for web surfaces.

---

## 3. Approved delivery modes

| Delivery mode | Owning module/reference documents | Coverage / documented gap |
|---|---|---|
| On-demand | Modules 05–08, [Product definition](./product-definition.md), [OpenAPI](./openapi.yaml) | **Partial:** approved and represented as `on_demand`; lifecycle/dispatch/rider modules are absent. |
| Scheduled | Modules 06 and 19, [Roadmap Phase 4](./roadmap.md), [OpenAPI](./openapi.yaml) | **Partial:** enum and pricing concerns exist; window semantics, validation, dispatch, cancellation, and missed-window behavior require absent Module 19. |
| Bulk | Modules 13, 14, 18, [Application interfaces](./app-interfaces.md), [OpenAPI](./openapi.yaml) | **Partial / mismatch:** product approves bulk and UI specifies Phase 3 CSV; OpenAPI exposes `bulk_item` as a delivery mode, while batch resource/file semantics are undocumented. |
| Multi-stop / routes | Modules 06, 07, 10, 19, [Application interfaces](./app-interfaces.md), [OpenAPI](./openapi.yaml) | **Partial:** represented as `multi_stop`; stop schema, route plan/version, optimization constraints, status semantics, and APIs are absent. |
| Multi-city | Modules 04, 06, 07, 19, 29, [Product definition](./product-definition.md) | **Partial / gap:** Module 06 requires explicit enabled products/rules; OpenAPI has no `multi_city` mode or inter-city contract. |
| Returns | Modules 05 and 12, [Product definition](./product-definition.md), [Contracts](./contracts.md) | **Partial / mismatch:** `returned` is an authoritative terminal status and contracts prefer a linked return job, but return-job schema/API and when `delivered → returned` is valid are not fully specified. |

Mode checklist:

- [x] All six approved modes have mapped owners.
- [ ] Bulk file/batch semantics are distinguished from a single delivery's service mode.
- [ ] Scheduled and multi-stop request/response schemas exist in OpenAPI.
- [ ] Multi-city representation is defined in OpenAPI.
- [ ] Return initiation, linked-job, charge, proof, and status rules are specified.

---

## 4. Integration contract traceability

### 4.1 Delivery lifecycle and transition contract

| Contract item | Owning module/reference documents | Coverage / documented gap |
|---|---|---|
| Happy path: `draft → quoted → awaiting_dispatch → assigned → rider_arriving_pickup → picked_up → in_transit → delivered` | Module 05, [Product definition §4](./product-definition.md), [Contracts §1](./contracts.md) | **Reference / gap:** authoritative references agree; detailed lifecycle module is absent. |
| Terminal/exception statuses: `cancelled`, `delivery_failed`, `returned` | Modules 05 and 12, product definition, contracts | **Reference / gap:** statuses exist; exception/return module is absent. |
| Allowed actor per transition | Modules 01, 05, 07, 08, 09, [Contracts §1](./contracts.md) | **Partial:** transition table exists; detailed ownership/authorization outside identity is absent. |
| Invalid transition returns `409` | Modules 05 and 13, [Contracts §1](./contracts.md) | **Partial:** contract statement exists; OpenAPI does not define the `409` response schema. |
| Every transition stores time, actor, optional location, and reason | Modules 05, 10, 27, product definition, contracts | **Reference / gap:** status payload example exists; entity/schema and retention rules are absent. |
| Cancellation only from approved pre-pickup states, subject to rules | Modules 05 and 12, contracts, merchant quickstart | **Reference / gap:** states are documented; fee/exception authorization rules remain unspecified. |
| Failure and return linkage | Modules 05 and 12, contracts | **Gap:** contracts state linked return job is preferred but do not define the full model. |

### 4.2 Roles and authorization contract

| Contract item | Owning module/reference documents | Coverage / documented gap |
|---|---|---|
| `platform_admin` | [Module 01](./modules/01-identity-auth-rbac.md), module 24 | **Detailed / gap:** role boundary exists; platform-admin module is absent. |
| `business_owner` | Module 01, module 03 | **Detailed / gap:** role exists; ownership-sensitive action matrix is not fully approved. |
| `business_admin` | Module 01, module 03 | **Detailed / gap:** named role exists; exact permission matrix remains a product-policy decision. |
| `business_dispatcher` | Module 01, modules 05 and 07 | **Detailed / gap:** tenant scope exists; lifecycle/dispatch modules are absent. |
| `business_finance` | Module 01, modules 21–23 | **Detailed / partial:** identity and ledger permissions exist; COD/invoice/settlement modules are absent. |
| `business_viewer` | Module 01 and all tenant-owned read models | **Detailed / gap:** identity scope exists; per-resource permission matrix is incomplete. |
| `rider` | Module 01, module 08 | **Detailed / gap:** own/assigned-job boundary exists; rider module is absent. |
| `partner_admin` | Module 01, module 09 | **Partial / gap:** Phase 4 role boundary exists; partner membership/resource policy is absent. |
| `ops_dispatcher` | Module 01, modules 07 and 24 | **Detailed / gap:** platform role is distinct from tenant membership; operation matrix is absent. |
| API key actor | Modules 01, 13, 14; contracts/OpenAPI | **Partial:** authentication and tenant binding are detailed; scopes, listing/revocation contract, and Module 14 are incomplete/absent. |
| Tracking visitor | Modules 01 and 20 | **Partial / gap:** sanitized token scope exists; tracking module and response schema are absent. |

### 4.3 Idempotency, webhook, and public API contract

| Contract item | Owning module/reference documents | Coverage / documented gap |
|---|---|---|
| `Idempotency-Key` required for `POST /v1/deliveries` | Modules 13–14, contracts, OpenAPI, merchant quickstart | **Detailed/reference:** requirement is consistent; Module 14 is absent. |
| Idempotency scoped per business/API key | Modules 13–14, contracts | **Mismatch:** Contracts say API key/business; Module 13 adds environment, credential, method, and route. Canonical scope needs a contract decision. |
| Store request hash and response; identical retry replays | Modules 13–14, contracts | **Detailed/reference:** behavior is documented; persistence/retention module is absent. |
| Same key with different body returns `409` | Modules 13–14, contracts, guide | **Detailed/reference:** stable behavior exists; OpenAPI response is missing. |
| Webhook events: delivery created/assigned/picked-up/in-transit/delivered/failed/cancelled/returned | Module 15, Module 13, contracts, guide | **Reference / gap:** event names exist; event envelopes and schemas are absent. |
| Financial events: `cod.collected`, `settlement.completed` | Modules 15, 21–23, contracts, guide | **Partial / gap:** events are named; permissions, payloads, evidence, and posting timing are incomplete. |
| HMAC signature over `timestamp.body` using `X-DaaS-Signature` and `X-DaaS-Timestamp` | Module 15, contracts | **Reference / gap:** algorithm statement exists; canonical byte encoding, tolerance, rotation, and verification examples require absent Module 15/guide. |
| Retry with backoff and dead-letter after configured failures | Modules 15 and 27, contracts | **Reference / gap:** no numeric threshold should be invented; retry classification and replay/dead-letter operations are absent. |
| Transactional outbox worker; Phase 1 dry-run allowed | Modules 15 and 27, contracts | **Reference / gap:** owning module is absent. |
| REST `/v1` and OpenAPI 3.x | [Module 13](./modules/13-public-api-developer-platform.md), [OpenAPI](./openapi.yaml) | **Detailed / partial:** style and source-of-truth intent exist; checked-in OpenAPI is incomplete. |
| Stable errors and request IDs | Module 13, OpenAPI | **Mismatch:** Module 13 requires structured errors and `X-Request-Id`; OpenAPI currently defines neither schemas nor headers. |
| Tenant reconciliation by `external_order_id` | Modules 05, 13, 21, contracts/OpenAPI/guide | **Mismatch:** Module 13 requires public `external_order_id`/snake_case; checked-in OpenAPI and guide use `externalOrderId`/camelCase. |
| Public money contract | Modules 06, 13, 21, OpenAPI | **Mismatch:** Module 13 requires decimal-string `{ amount, currency }`; OpenAPI uses numeric `codAmount`; modules 06/21 use integer minor units internally. Boundary conversion needs definition. |
| Sandbox isolation and simulator | Modules 13–15, roadmap Phase 3 | **Partial / gap:** Module 13 details intent; OpenAPI servers/routes and environment schemas are absent. |

### 4.4 REST operation coverage

| Contracted operation | Owning module(s) | OpenAPI status / gap |
|---|---|---|
| `POST /v1/auth/register` | 01 | Present; success/error response schemas absent. |
| `POST /v1/auth/login` | 01 | Present; token response/error schemas absent. |
| `GET /v1/me` | 01 | Present; response schema absent. |
| `POST /v1/businesses` | 03 | Present; request/response schemas absent. |
| `GET /v1/businesses/:id` | 03 | Listed in contracts; absent from OpenAPI. |
| `POST /v1/businesses/:id/branches` | 03 | Present; request/response schemas absent. |
| `POST /v1/businesses/:id/api-keys` | 01, 14 | Present; secret-once response, permissions, listing, and revocation are absent. |
| `POST /v1/businesses/:id/webhooks` | 15 | Present; request/response, verification, subscriptions, update/delete are absent. |
| `POST /v1/quotes` | 06, 13 | Present; request and response schemas are absent despite Module 06 detail. |
| `POST /v1/deliveries` | 05, 13, 14 | Present with partial request; response, errors, quote reference, and tracking URL schemas are absent. |
| `GET /v1/deliveries/:id` | 05, 13 | Present; response schema absent. |
| `GET /v1/deliveries?external_order_id=...` | 05, 13 | Required by Module 13; absent from contracts table and OpenAPI. |
| `POST /v1/deliveries/:id/cancel` | 05, 12, 13 | Present; request/response/error schemas absent. |
| `GET /v1/deliveries/:id/proof` | 11, 13 | Required by Module 13; absent from contracts table and OpenAPI. |
| `GET /v1/branches` | 03, 13 | Required by Module 13; absent from OpenAPI. |
| `GET /v1/service-areas` | 04, 13 | Required by Module 13; absent from OpenAPI. |
| `GET /v1/webhook-events/:id` | 13, 15 | Required by Module 13; absent from OpenAPI. |
| `POST /v1/sandbox/deliveries/:id/transitions` | 05, 13 | Required by Module 13; absent from OpenAPI. |
| `POST /v1/ops/deliveries/:id/assign` | 07 | Present; response/error/concurrency schemas absent. |
| `GET /v1/riders/me/jobs` | 08 | Present; response/filter/pagination schemas absent. |
| `POST /v1/riders/me/availability` | 08 | Present; request/response schemas absent. |
| `POST /v1/riders/jobs/:id/status` | 05, 08, 11, 22 | Present; status payload, proof/COD evidence, and errors are absent. |
| `GET /v1/track/:token` | 20 | Present; sanitized response schema, cache/rate behavior, and token errors are absent. |

---

## 5. Pricing and dispatch concerns

| Concern | Owning module/reference documents | Coverage / documented gap |
|---|---|---|
| Address/zone eligibility | Modules 04 and [06](./modules/06-quoting-pricing.md) | **Partial:** pricing rules detailed; city/zone model absent. |
| Route distance/duration via provider adapter | Modules 06 and 10 | **Detailed / gap:** adapter boundary is specified in Module 06; shared tracking/ETA behavior is absent. |
| Versioned effective-dated pricing rules | Module 06, module 29 | **Detailed / gap:** pricing behavior exists; generic configuration/flag governance absent. |
| Rule precedence by business/city/zone/platform | Module 06 | **Detailed.** |
| Fee components: base, distance, duration, package, mode, zone, COD, surcharge, discount, tax, rounding | Module 06, modules 21–23 | **Detailed / partial:** quote lines exist; tax/finance policy remains configurable. |
| Quote expiry, ownership, input equivalence, acceptance | Modules 05, 06, 13, 14 | **Detailed / gap:** quote behavior exists; delivery/idempotency modules absent and OpenAPI incomplete. |
| Immutable quote snapshot and accepted commercial basis | Modules 05, 06, 21 | **Detailed / partial:** pricing specifies it; delivery module absent. |
| Controlled price override with reason, adjustment, audit | Modules 06, 21, 27 | **Detailed / partial:** pricing and ledger support exist; audit module absent. |
| Production maps outage/fallback labeling | Modules 06 and 27 | **Detailed / gap:** configuration values intentionally unset. |
| Multi-city requires explicit enabled product/rule | Modules 04, 06, 19, 29 | **Detailed / gaps:** rule exists in Module 06; other owners absent. |
| Manual rider assignment/reassignment | Modules 07–08, contracts/OpenAPI, app interfaces | **Reference / gap:** endpoint/screen exist; ownership, races, history, and reassignment rules absent. |
| Automatic rider offers | Modules 07–08 | **Gap:** Phase 2 item lacks detailed specification. |
| Availability and capacity | Modules 07–09 | **Gap:** online/offline endpoint exists; capacity, freshness, and eligibility rules absent. |
| Assignment atomicity and one active assignee | Modules 05 and 07 | **Gap:** required control is in roadmap, not a detailed module. |
| Live location and ETA | Modules 08 and 10 | **Gap:** screens/phasing exist; ingestion, freshness, privacy, and calculation contracts absent. |
| Multi-stop optimization and route override | Modules 07, 10, 19 | **Gap:** Phase 4/UI intent exists; objective, constraints, versioning, and override behavior absent. |
| Partner dispatch/accept/decline/status source | Modules 07 and 09 | **Gap:** portal inventory exists; detailed contract absent. |

---

## 6. Finance model traceability

### 6.1 Approved commercial and ledger concerns

| Finance concern | Owning module/reference documents | Coverage / documented gap |
|---|---|---|
| Prepaid delivery fees | Modules [21](./modules/21-billing-ledger.md) and 23 | **Partial:** prepaid control account/posting illustration exists; funding, consumption, refund, and merchant terms need Module 23. |
| Postpaid invoicing | Modules 21 and 23 | **Partial / gap:** ledger phase and UI intent exist; invoice lifecycle/terms/credits module absent. |
| COD collection and settlement | Modules 21–23 | **Partial / gap:** ledger accounts/invariants exist; custody and settlement modules absent. |
| Rider earnings | Modules 08, 21, 23 | **Partial / gap:** accrual model exists; compensation, statement, and payout specifications absent. |
| Partner earnings | Modules 09, 21, 23 | **Partial / gap:** ledger control account exists; partner/settlement specifications absent. |
| Platform revenue | Module 21 | **Detailed:** account and illustrative recognition postings exist; actual recognition policy remains configurable/finance-approved. |
| Cash in transit — COD | Modules 21 and 22 | **Partial / gap:** separate control account/invariants exist; custody evidence/handoff module absent. |
| Immutable balanced journal | Module 21, contracts | **Detailed.** |
| Reversals instead of mutation | Module 21 | **Detailed.** |
| Idempotent event posting | Modules 15 and 21 | **Partial:** ledger behavior detailed; event/outbox module absent. |
| Reconciliation and period controls | Modules 21 and 23 | **Partial / gap:** ledger requirements exist; settlement/invoice operating detail absent. |
| Maker/approver separation | Modules 21, 23, 28 | **Detailed / gaps:** ledger requirement exists; settlement/security modules absent. |
| Multi-currency and FX | Module 21 | **Partial:** balance-per-currency invariant exists; FX is conditional and requires explicit approved rules. |

### 6.2 Logical account contract

| Logical account | Owning documents | Coverage |
|---|---|---|
| `merchant_delivery_charges` | Module 21, contracts | **Detailed.** |
| `merchant_cod_payable` | Module 21, contracts | **Detailed.** |
| `rider_earnings_payable` | Module 21, contracts | **Detailed.** |
| `partner_earnings_payable` | Module 21, contracts | **Detailed.** |
| `platform_revenue` | Module 21, contracts | **Detailed.** |
| `cash_in_transit_cod` | Module 21, contracts | **Detailed.** |

Finance checklist:

- [x] All approved money models map to ledger/control owners.
- [x] Balances are derived; posted entries are immutable and balanced per currency.
- [ ] The Phase 1 `delivery_fee_quoted` behavior is reconciled: Contracts says post a stub on confirmation, while Module 21 says quote creation is non-financial unless configured as a non-posted commitment and recognition timing is configurable.
- [ ] COD collection evidence and custodian handoff rules are detailed.
- [ ] Invoice, settlement, payout, refund, credit, reserve, processor fee, tax, and withholding contracts are approved.
- [ ] Public monetary representation is reconciled with internal minor-unit representation.

---

## 7. Core data concepts

| Core concept/entity | Owning module/reference documents | Coverage / documented gap |
|---|---|---|
| `User` | Module 01, contracts | **Detailed.** |
| `Business` | Module 03, contracts | **Gap:** entity is proposed; owning module absent. |
| `BusinessMembership` | Module 01, contracts | **Detailed.** |
| `Branch` | Module 03, contracts/OpenAPI | **Gap:** entity/operation named; owning module and schemas absent. |
| `City` | Module 04, contracts | **Gap.** |
| `ServiceZone` | Modules 04 and 06, contracts | **Partial:** pricing constraints exist; owning zone module absent. |
| `Rider` | Modules 01 and 08, contracts | **Partial:** identity relation exists; rider module absent. |
| `RiderLocation` | Modules 08 and 10, contracts | **Gap.** |
| `ApiKey` | Modules 01 and 14, contracts/OpenAPI | **Detailed / gap:** core data is detailed in Module 01; Module 14 and complete API schemas absent. |
| `IdempotencyRecord` | Modules 13–14, contracts | **Partial:** behavior exists; retention/state/schema module absent. |
| `WebhookEndpoint` | Module 15, contracts/OpenAPI | **Gap:** registration operation exists without schema. |
| `WebhookDelivery` | Modules 15 and 27, contracts | **Gap.** |
| `Delivery` | Module 05, contracts/OpenAPI | **Gap:** lifecycle references and partial create schema exist; owning module absent. |
| `DeliveryPackage` | Modules 05, 06, 13, contracts/OpenAPI | **Partial:** pricing/API concepts exist; canonical model and limits absent. |
| `DeliveryStatusEvent` | Modules 05 and 27, contracts | **Reference / gap:** payload example exists; owning model absent. |
| `DeliveryAssignment` | Modules 05 and 07, contracts | **Gap.** |
| `TrackingToken` | Module 20, contracts/OpenAPI | **Gap:** endpoint and unguessable-token rule exist; model/rotation/expiry absent. |
| `LedgerEntry` | Module 21, contracts | **Detailed:** Module 21 expands this into accounts, journal transactions, and entries. |
| `AuditLog` | Modules 01 and 27, contracts | **Partial:** identity audit fields exist; general audit module absent. |
| `Quote`, `QuoteLine`, `PricingRuleSet`, `PricingRule` | Module 06 | **Detailed:** missing from Contracts' proposed core entity list and OpenAPI schemas. |
| `Proof` | Modules 11 and 13 | **Reference / gap:** canonical API resource is named; owning module/schema absent. |
| `TrackingLink` | Modules 13 and 20 | **Reference / gap:** canonical API resource/tracking URL is named; owning module/schema absent. |
| COD custody/evidence records | Modules 21 and 22 | **Partial / gap:** finance dimensions/rules exist; operational entities absent. |
| Invoice, settlement, payout records | Modules 21 and 23 | **Partial / gap:** ledger dimensions exist; owning entities/state machines absent. |
| Partner fleet and partner rider mapping | Modules 01 and 09 | **Reference / gap:** role exists; entities absent. |
| Batch/import row | Module 18 | **Gap.** |
| Route/stop/window/route plan | Module 19 | **Gap.** |
| Notification/template/delivery attempt | Module 17 | **Gap.** |
| Support/dispute case | Module 26 | **Gap.** |
| Feature/configuration version | Module 29 | **Gap.** |
| Fraud/risk rule and case | Module 30 | **Gap.** |

---

## 8. Security and reliability requirements

| Requirement | Owning module/reference documents | Coverage / documented gap |
|---|---|---|
| Tenant isolation on every tenant-owned operation | Modules 01–05, 13, 21, 28 | **Detailed / gaps:** strong rules exist in Modules 01, 13, 21; general tenancy/security modules absent. |
| Password and API-key secret hashing; key shown once | Module 01, contracts/OpenAPI | **Detailed:** listing/revocation API contract incomplete. |
| TLS outside local development | Modules 01, 13, 28 | **Detailed/reference:** environment/release enforcement docs absent. |
| JWT signature/issuer/audience/expiry/type validation | Module 01 | **Detailed.** |
| Deny-by-default named permissions and resource scope | Module 01 | **Detailed:** exact per-role business policy remains configurable. |
| Public tracking token is unguessable and projection is sanitized | Modules 01 and 20, app interfaces | **Partial / gap:** security boundary exists; token lifecycle/rate/cache/schema absent. |
| Sensitive recipient data excluded from URLs/logs/metric labels/examples | Modules 13 and 28 | **Detailed / gap:** API requirement exists; general security/privacy module absent. |
| Audit security-sensitive, lifecycle, admin, override, finance, and support actions | Modules 01, 06, 21, 24, 27 | **Partial / gap:** detailed records exist in present modules; central audit module absent. |
| API and auth rate limits | Modules 01, 13, 14, 28 | **Partial / gap:** behavior exists without approved thresholds or Module 14. |
| Idempotent mutation and source-event deduplication | Modules 13–15 and 21 | **Partial:** API/ledger requirements exist; cross-module implementation contract absent. |
| Transactional outbox for external/internal event publication | Modules 15, 21, 27 | **Partial / gap:** contracts/ledger mention it; owning webhook module absent. |
| Bounded retry/backoff, jitter, dead-letter/quarantine | Modules 06, 13, 15, 17, 21, 27 | **Partial / gaps:** provider/API/ledger guidance exists; consistent asynchronous policy absent. |
| Stable machine-readable errors and request IDs | Module 13, OpenAPI | **Mismatch:** required in Module 13, missing from OpenAPI. |
| Provider timeout, circuit breaker, fallback assumptions | Module 06, module 27 | **Detailed / gap:** pricing behavior exists; platform-wide reliability module absent. |
| Immutable quote/rule/ledger history | Modules 06 and 21 | **Detailed.** |
| Balanced ledger, atomic journals, linked reversals | Module 21 | **Detailed.** |
| Proof/location/bank/tax data access, masking, and retention | Modules 10–11, 21–22, 28 | **Partial / gaps:** ledger data controls exist; operational/security modules absent; periods unapproved. |
| Maker/approver separation and step-up for sensitive finance actions | Modules 21, 23, 28 | **Detailed / gaps:** ledger specifies it; broader control modules absent. |
| Observability: metrics, logs, traces, correlation, alerts | Modules 01, 06, 13, 21, 27 | **Partial / gap:** detailed module-local requirements exist; central observability module absent. |
| Backup/disaster recovery and restore verification | Modules 21, 27, release/operations reference | **Partial / gap:** ledger restore invariants exist; platform RPO/RTO and runbooks are absent and must not be invented. |
| OpenAPI validation and breaking-change detection | Module 13, testing strategy reference | **Detailed / gap:** requirement exists; testing strategy document and CI contract are absent. |
| Configurable retention, residency, legal, tax, threshold, and SLA values | Modules 01, 06, 21, 28–29, index documentation rule | **Partial / gaps:** values are correctly left unset; approving-owner workflow is not fully documented. |

---

## 9. Phase-scope traceability

### Phase 1 — Foundation

| Approved phase item | Owning module/reference documents | Coverage |
|---|---|---|
| Tenancy, auth/RBAC | Modules 01–02 | **Partial:** Module 01 detailed; Module 02 absent. |
| Businesses / branches | Module 03 | **Gap.** |
| Delivery lifecycle | Module 05, contracts | **Reference / gap.** |
| Addresses / service zones | Modules 03–06 | **Complete Phase 1 specification:** Module 04 owns canonical cities, advanced geometry, versioned administration, deterministic coverage, integration snapshots, security, observability, and recovery; address ownership and pricing remain in their respective modules. |
| Manual dispatch | Module 07, app interfaces/OpenAPI | **Reference / gap.** |
| Rider basics | Module 08, app interfaces/OpenAPI | **Reference / gap.** |
| Public tracking | Module 20, app interfaces/OpenAPI | **Reference / gap.** |
| API keys, idempotency, signed webhooks | Modules 01, 13–15, contracts/OpenAPI | **Partial:** modules 01/13 detailed; 14/15 absent. |
| Audit log | Module 27, modules 01/06/21 | **Partial / gap:** module-local requirements exist; owner absent. |

### Phase 2 — Reliable city operations

| Approved phase item | Owning module/reference documents | Coverage |
|---|---|---|
| Quotes / pricing engine | Module 06 | **Detailed.** |
| Automatic rider offers | Modules 07–08 | **Gap.** |
| Live location / ETA | Module 10 | **Gap.** |
| Proof of pickup/delivery | Module 11 | **Gap.** |
| Exceptions / returns | Module 12 | **Gap.** |
| Notifications | Module 17 | **Gap.** |
| COD ledger | Modules 21–22 | **Partial:** ledger detailed; COD module absent. |
| Full ops dashboard | Modules 07, 10–12, 24, 27; app interfaces | **Reference / gap.** |

### Phase 3 — Business integrations

| Approved phase item | Owning module/reference documents | Coverage |
|---|---|---|
| Sandbox, OpenAPI portal | Module 13 | **Detailed intent:** OpenAPI sandbox contract/portal docs absent. |
| CSV batches | Module 18 | **Gap.** |
| Webhook logs / replay | Module 15 | **Gap.** |
| Shopify / WooCommerce plugins | Module 16, app interfaces | **Reference / gap.** |
| White-label branding | Module 20, app interfaces | **Reference / gap.** |
| Postpaid invoices | Modules 21 and 23 | **Partial:** ledger phase exists; Module 23 absent. |

### Phase 4 — Scale modes

| Approved phase item | Owning module/reference documents | Coverage |
|---|---|---|
| Scheduled windows | Module 19, Module 06 | **Partial:** pricing concern exists; owning route module absent. |
| Multi-stop optimization | Module 19, app interfaces | **Reference / gap.** |
| Partner fleet API / portal | Modules 09 and 13, app interfaces | **Partial / gap:** API module names outcome; partner module/API schemas absent. |
| Settlement / payout automation | Modules 21 and 23 | **Partial:** ledger controls exist; automation module absent. |
| Advanced reporting | Module 25 | **Gap.** |

Phase checklist:

- [x] Every item in the approved four-phase scope has at least one owning module/reference.
- [x] Detailed roadmap entry/exit criteria, dependencies, risks, and deferrals are in [roadmap.md](./roadmap.md).
- [x] Each phase item has a present detailed owning module and testable module acceptance criteria.

---

## 10. Integrated-delivery success criteria

| Approved success criterion | Owning module/reference documents | Verification trace / gap |
|---|---|---|
| 1. Merchant gets a quote | Modules 06 and 13, OpenAPI | Verify serviceability, amount/currency/breakdown, expiry, assumptions, tenant scope. Expand OpenAPI response schemas before implementation. |
| 2. Merchant creates a job once under retries | Modules 05, 13–14, contracts/OpenAPI | Verify identical replay creates one delivery and changed-body reuse returns `409`. |
| 3. Merchant receives a tracking URL | Modules 05, 13, 20 | Verify URL returned with delivery and token is unguessable/sanitized. |
| 4. Merchant sees a rider assigned | Modules 05, 07–08, 13, 15 | Verify assignment is authorized/atomic and visible via API/dashboard/webhook. |
| 5. Merchant follows pickup → transit → delivery | Modules 05, 08, 10, 13, 15, 20; contracts; workflows | Verify authoritative ordered timeline and retry-safe events. |
| 6. Merchant receives signed webhooks | Module 15, contracts, webhook guide | Verify signature/timestamp, event identity, retry, and consumer deduplication. |
| 7. Merchant retrieves proof | Modules 11 and 13 | Verify proof belongs to tenant/delivery and access/retention rules. Expand OpenAPI for proof schemas. |
| 8. Merchant sees correct charge / COD / settlement entries | Modules 06, 21–23; finance guide | Verify immutable postings, evidence, separate accounts, and reconciliation references. |
| 9. Merchant reconciles using `external_order_id` | Modules 05, 13, 21, OpenAPI | Verify API search and finance dimensions preserve the merchant value; resolve naming consistency. |

Success checklist:

- [x] All nine approved success criteria have module/reference owners.
- [x] End-to-end acceptance flows are documented in `workflows.md` and `testing-strategy.md`.
- [ ] The OpenAPI contract contains every operation and schema needed to execute and verify all nine criteria.

---

## 11. Consolidated documented gaps

### Module and reference coverage status

- [x] Modules 01–30 are present under `docs/delivery/modules/`.
- [x] Architecture, workflows, technical stack, data dictionary, glossary, decision register, NFRs, testing, release ops, roadmap, and guides are present.
- [x] VitePress documentation build succeeds with the delivery section linked.

### Contract mismatches requiring an explicit decision

- [ ] Public JSON naming: Module 13 requires `snake_case`; OpenAPI and merchant quickstart use camelCase such as `externalOrderId`, `businessId`, and `codAmount`.
- [ ] Public money representation: Module 13 requires decimal-string money objects; OpenAPI uses numeric amounts; internal modules require integer minor units.
- [ ] Idempotency scope: Contracts says API key/business; Module 13 adds environment, credential, method, and route.
- [ ] Phase 1 fee posting: Contracts describes a posted `delivery_fee_quoted` stub on confirmation; Module 21 distinguishes non-posted commitment from recognition and makes recognition event configurable.
- [ ] OpenAPI source-of-truth claim versus content: Module 13 requires complete schemas, examples, stable errors, request IDs, sandbox, proofs, lists, service areas, and event retrieval, while the checked-in file is only a partial Phase 1 skeleton.
- [ ] Bulk meaning: approved bulk/CSV behavior is not reconciled with the OpenAPI `bulk_item` delivery mode.
- [ ] Multi-city and returns: approved modes lack complete API and data contracts.
- [ ] Tracking ETA: application interfaces call Phase 1 ETA a stub, but the public tracking response does not define how the stub is labeled.

### Unapproved values that must remain configurable

- [ ] Prices/rates, quote TTL, service limits, dispatch/offer timeouts, retries, dead-letter threshold, rate limits, body limits, and operational SLAs.
- [ ] COD limits/fees, rider and partner compensation, invoice/payment terms, settlement frequency, payout thresholds, tax, withholding, processor fees, reserves, and FX.
- [ ] Retention, residency, KYC, proof/location handling, privacy rights, legal policies, escalation, dispute, and fraud thresholds.

No value above should be inferred from this matrix or from the roadmap.
