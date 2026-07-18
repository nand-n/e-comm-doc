# Delivery-as-a-Service Roadmap

**Status:** Delivery roadmap derived from the approved product definition  
**Sequence:** Phase 1 → Phase 2 → Phase 3 → Phase 4  
**Planning rule:** Phases describe dependency and acceptance order only. No duration, date, staffing, or effort estimate is implied.

## 1. Roadmap principles

- [ ] Preserve the approved modular-monolith architecture until an evidence-based decision changes it.
- [ ] Keep tenant isolation, lifecycle integrity, immutable financial records, idempotency, auditability, and signed outbound events as cross-phase invariants.
- [ ] Treat the checked-in OpenAPI document as the public API contract; contract changes precede implementation.
- [ ] Carry `business_id`, `delivery_id`, `external_order_id`, actor, request, and source-event references across operational, integration, audit, and finance records.
- [ ] Keep prices, SLAs, thresholds, retention periods, legal rules, tax treatment, and jurisdiction-specific policy configurable until approved by the responsible owner.
- [ ] Do not pull a later-phase feature forward unless its dependencies and the relevant phase exit criteria are satisfied.

## 2. Cross-phase dependency order

| Capability | Depends on |
|---|---|
| Tenant-owned delivery creation | Identity/RBAC, multi-tenancy, businesses/branches, cities/zones, lifecycle |
| Dispatch and rider actions | Lifecycle, riders, service zones, authorization, audit |
| Production pricing | Service zones, maps adapter, versioned rules, delivery and ledger references |
| Live tracking and proof | Assignment, rider identity, lifecycle events, restricted public projection |
| Webhooks | Domain events, transactional outbox, API credentials, retry and observability controls |
| COD and earnings | Verified operational events, immutable ledger, custody/compensation rules |
| Sandbox and plugins | Stable public API, OpenAPI conformance, idempotency, webhook diagnostics |
| Scheduling and multi-stop | Production pricing, routing adapter, dispatch capacity, lifecycle semantics |
| Partner fleets | Partner identity, partner assignment model, API/webhooks, earnings and settlement |
| Automated settlement/payout | Mature ledger, approvals, reconciliation, banking/processor policy |

---

## 3. Phase 1 — Foundation

### Goals

- Establish a secure multi-tenant platform boundary.
- Complete the basic on-demand delivery lifecycle using manual dispatch.
- Give merchants dashboard and API paths to create and retrieve one delivery safely.
- Give riders a production React Native application for availability, assigned work, status updates, secure sessions, and conflict-aware offline operation.
- Expose sanitized, token-based public tracking.
- Establish idempotency, signed webhook delivery, audit records, and the minimum immutable ledger foundation needed by later phases.

### Entry criteria

- [ ] Product definition, actor model, product surfaces, authoritative delivery statuses, and Phase 1 scope remain approved.
- [ ] Local architecture and technical-stack decisions needed to implement a modular monolith are documented.
- [ ] Data ownership and tenant-key conventions are documented.
- [ ] Phase 1 OpenAPI operations and error conventions are reviewed for consistency with module specifications.
- [ ] Configurable business and security decisions are identified without silently assigning values.

### Dependencies

- Product references: [Product definition](./product-definition.md), [Application interfaces](./app-interfaces.md), [Contracts](./contracts.md), and [OpenAPI](./openapi.yaml).
- Foundation ownership: modules 01–05.
- Operations ownership: modules 07–08, with simple Phase 1 zone support from module 04.
- Integration ownership: modules 13–15 and module 20.
- Control ownership: modules 21, 24, 27, and 28.

### Module deliverables

| Module / reference | Phase 1 deliverable |
|---|---|
| 01 Identity, authentication & RBAC | Registration/login, JWT validation, business memberships, rider/platform roles, tenant-scoped API keys, deny-by-default permissions, credential audit |
| 02 Multi-tenancy | Tenant context propagation, tenant-owned query constraints, cross-tenant denial tests, tenant-aware jobs/cache/log context |
| 03 Businesses & branches | Business creation/approval state, owner membership, branch CRUD, pickup branch data |
| 04 Cities & service zones | Complete canonical city and service-geography capability: advanced polygon/multipolygon, exclusion, radius and bounding-box geometry; immutable effective-dated versions; maker-checker administration; deterministic explainable evaluation; caching, audit, recovery, and all branch/quote/delivery integration contracts |
| 05 Delivery lifecycle | Delivery/package/status/assignment records, authoritative transition enforcement, actor/reason/time and optional location on every transition |
| 07 Dispatch & assignment | Operations board, available-rider view, manual assignment/reassignment rules, assignment audit |
| 08 Rider & fleet management | Rider profile/KYC status, online/offline availability, assigned-job list/detail, map deep-link, permitted status actions |
| 13 Public API & developer platform | Baseline `/v1` quote/create/read/cancel surface, stable errors, request IDs, `external_order_id` reconciliation, baseline OpenAPI |
| 14 API keys, idempotency & rate limits | Required create-delivery idempotency, request-hash replay/conflict behavior, scoped records, authentication and mutation throttles |
| 15 Webhooks, outbox & retries | Transactional outbox, signed delivery attempts, timestamps, retry/backoff, configurable dead-letter threshold, secret-safe diagnostics; dry-run mode allowed |
| 20 White-label tracking | Unguessable token, no-login sanitized status/timeline, tracking URL, Phase 1 ETA clearly identified as a stub |
| 21 Billing & ledger | Separate logical accounts, immutable balanced journal foundation, idempotent posting helper, clearly distinguished fee stub/commitment, tenant view, audit |
| 24 Platform administration | Tenant list/approval, basic city/zone and rider administration |
| 27 Audit & observability | Searchable audit events, correlation IDs, structured logs, baseline health signals for API, jobs, and webhooks |
| 28 Security, privacy & compliance | Secret handling, TLS requirement, password/key hashing, tenant isolation controls, public tracking data minimization, configurable retention markers |
| UI inventory | React web `/login`, `/register`, merchant overview/deliveries/branches/developers, `/ops`, `/admin`, and `/t/[token]`; React Native rider authentication, availability, jobs, job detail, navigation, offline/conflict, and settings states |

### Exit criteria

- [ ] A business user can register/login, create a business and branch, and cannot access another tenant.
- [ ] A merchant can create an API key whose secret is shown once, then use it to request a Phase 1 quote and create one delivery.
- [ ] Retrying the identical create request with the same idempotency key returns the original response; changing the body returns `409`.
- [ ] Delivery transitions follow the authoritative state machine and reject invalid transitions with `409`.
- [ ] Operations can manually assign an available rider; a rider can update only an assigned job.
- [ ] The merchant receives a public tracking URL that exposes only the sanitized delivery projection.
- [ ] Subscribed events are produced from an outbox and delivered with signature/timestamp headers without leaking secrets.
- [ ] Every transition and security-sensitive action has actor, tenant where applicable, time, target, and correlation/audit context.
- [ ] The ledger foundation is append-only, balanced by currency, and deduplicates source events.
- [ ] Contract, tenant-isolation, lifecycle, idempotency, webhook-signature, and ledger-invariant tests pass.

### Principal risks and controls

| Risk | Required control |
|---|---|
| Tenant data leakage | Resolve tenant from authenticated context and persisted ownership; deny by default; add cross-tenant tests |
| Duplicate deliveries or financial effects | Persist scoped idempotency records and source-event uniqueness; make retries replay-safe |
| Lifecycle divergence between UI/API/jobs | Centralize the state machine and emit status events from the committed transition |
| Secret exposure | Hash passwords/API keys, reveal key once, redact logs, isolate webhook secrets |
| Phase 1 quote mistaken for production precision | Label distance stub and assumptions; preserve quote snapshots and units |
| Public token enumeration or excess disclosure | Use cryptographically unguessable tokens, rate limits, and a minimal tracking projection |
| Outbox backlog or repeated webhook failure | Instrument queue age/failures, bounded retries, configurable dead-letter handling |
| Premature financial balances | Keep ledger entries immutable and explicitly distinguish commitments/stubs from recognized postings |

### Explicitly deferred from Phase 1

- [ ] Production maps-based pricing, automatic rider offers, live location/ETA, proof capture, exceptions/returns workflows, notifications, full COD accounting, rider earnings, and full operations dashboard → Phase 2.
- [ ] Sandbox developer platform, CSV batches, webhook logs/replay UI, commerce plugins, branding, and postpaid invoices → Phase 3.
- [ ] Scheduled windows, route optimization, partner fleets, multi-city product configuration, automated settlement/payout, and advanced reporting → Phase 4.
- [ ] Enterprise SSO, arbitrary workflow scripting, GraphQL, and microservice extraction are not approved phase deliverables. The React Native rider application is part of the approved foundation.
- [ ] Any numeric SLA, price, threshold, retention period, tax rule, or legal policy remains unapproved until its owner supplies it.

---

## 4. Phase 2 — Reliable city operations

### Goals

- Replace Phase 1 approximations with reliable city-level pricing, dispatch, location, ETA, evidence, exception, notification, and finance operations.
- Support automatic rider offers while preserving manual operations control.
- Establish verified proof, COD custody, rider earnings, and daily reconciliation.
- Make operational and integration failures diagnosable through full ops and health views.

### Entry criteria

- [ ] Phase 1 exit criteria are met in a production-like environment.
- [ ] Core tenant, delivery, assignment, status-event, idempotency, outbox, audit, and ledger records are stable and migratable.
- [ ] One or more launch cities have approved service-zone, pricing, rider, COD, and escalation configuration.
- [ ] Maps/routing provider selection and data-handling terms are documented.
- [ ] Finance approves recognition, custody, rider compensation, and reconciliation rules for the launch jurisdiction.

### Dependencies

- Stable modules 01–08, 13–15, 20–21, 24, 27–28 from Phase 1.
- A maps adapter contract shared by pricing, dispatch, tracking, and ETA without leaking provider-specific fields into domain models.
- Verified operational events as the source for proof, COD, earnings, and finance postings.

### Module deliverables

| Module / reference | Phase 2 deliverable |
|---|---|
| 06 Quoting & pricing | Production route metrics, versioned effective-dated rules, deterministic breakdowns, quote expiry/acceptance, admin preview/publish, controlled price adjustments |
| 07 Dispatch & assignment | Automatic offer policy, accept/expire/reoffer flow, reassignment controls, dispatch metrics and fallback to manual assignment |
| 08 Rider & fleet management | Rider KYC/availability hardening, rider earnings view, location permissions and operational readiness |
| 10 Live tracking & ETA | Location ingestion, last-known location, ETA provider/algorithm boundary, stale-location behavior, merchant/ops/public projections |
| 11 Proof of pickup & delivery | Photo/signature or approved proof types, metadata, access policy, immutable evidence references, retrieval API |
| 12 Exceptions & returns | Failure reasons, stuck-job detection, exception queue, return initiation and linked return-job policy |
| 17 Notifications & communications | Event-driven recipient/merchant/rider notifications, consent/template/provider configuration, retries and delivery status |
| 21 Billing & ledger | Delivery-charge recognition, verified COD payable/cash-in-transit, rider earnings accrual, daily reconciliation |
| 22 COD & cash custody | Collection evidence, custodian transitions, remittance/deposit workflow, shortages/overages, COD limits and controls |
| 24 Platform administration | Versioned pricing UI, operational city/zone/rider controls, system-health views |
| 27 Audit & observability | Full ops diagnostics, SLO dashboards, queue/webhook/maps/location health, anomaly alerts |
| 28 Security, privacy & compliance | Proof/location retention and access controls, step-up policy where approved, operational privacy controls |
| UI inventory | Live map, exceptions, pricing rules, system health, rider proof/earnings, tracking map/ETA/proof, finance COD balances |

### Exit criteria

- [ ] The same normalized quote input and pricing/map snapshot yields the same fee and breakdown.
- [ ] Published pricing rules and accepted quotes cannot be edited in place.
- [ ] Outside-zone and unsupported requests return stable machine-readable errors.
- [ ] Automatic offers do not create concurrent active ownership of one delivery and can fall back to manual dispatch.
- [ ] Ops and authorized viewers can distinguish fresh, stale, unavailable, and historical rider location/ETA.
- [ ] Required proof can be captured, authorized, retrieved, and associated with the correct transition.
- [ ] Failed/stuck deliveries enter a visible exception process; return handling preserves the original history.
- [ ] COD is posted only from verified collection evidence and remains traceable through custody and merchant payable.
- [ ] Rider earnings are independently accrued and reconcilable.
- [ ] Daily reconciliation surfaces missing, duplicate, late, and amount-mismatched operational/finance items without mutating history.
- [ ] Full operations and system-health surfaces expose actionable queue, webhook, maps, location, dispatch, and posting failures.

### Principal risks and controls

| Risk | Required control |
|---|---|
| Incorrect or unstable prices | Version rules and route snapshots; validate overlaps/gaps; preview before publish; preserve adjustments separately |
| Maps/provider outage | Adapter boundary, timeout/circuit breaker, bounded retry, labeled configured fallback |
| Assignment races | Atomic offer/assignment state, expiry, optimistic concurrency, one-active-assignment invariant |
| Stale or privacy-sensitive location | Freshness metadata, least-privilege access, retention controls, no unnecessary public precision |
| Fraudulent or mismatched proof | Bind proof to actor/delivery/transition/time; preserve metadata and audit access |
| COD loss or false collection | Post only from evidence, track custodian handoffs, reconcile deposits, surface variances |
| Notification duplication | Event identity and recipient deduplication; provider retry classification |

### Explicitly deferred from Phase 2

- [ ] Isolated sandbox, portal examples, webhook retrieval/replay, CSV batch import, commerce plugins, white-label branding, and postpaid invoicing → Phase 3.
- [ ] Scheduled windows, route optimization, partner fleets, inter-city products, payout automation, and advanced analytics → Phase 4.
- [ ] Demand-aware pricing, partner-commercial inputs, generated SDKs, and enterprise identity enhancements require later approval or demonstrated demand.
- [ ] Jurisdiction-specific tax, withholding, proof retention, location retention, and COD limits remain configurable pending legal/finance approval.

---

## 5. Phase 3 — Business integrations

### Goals

- Make merchant integration self-service, testable, observable, and safe before production.
- Add batch and commerce-platform ingestion without creating a second delivery lifecycle.
- Provide merchant branding and postpaid invoice/statement workflows.
- Preserve compatibility and reconciliation across API, plugin, CSV, dashboard, webhook, and finance views.

### Entry criteria

- [ ] Phase 2 operational and finance exit criteria are met.
- [ ] Public API resources, errors, lifecycle events, proof semantics, and webhook delivery behavior are stable enough for external automation.
- [ ] Sandbox isolation model and data-reset/simulation policy are approved.
- [ ] Plugin platform security/review requirements are documented.
- [ ] Finance approves postpaid recognition, credit, invoice, statement, period, and approval rules.

### Dependencies

- Stable modules 05–06, 11, 13–15, 17, and 21–22.
- Production and sandbox environment isolation for credentials, data, webhook endpoints, and billing behavior.
- Canonical delivery command/service shared by dashboard, public API, CSV, and plugins.

### Module deliverables

| Module / reference | Phase 3 deliverable |
|---|---|
| 01 Identity, authentication & RBAC | Developer key rotation workflows and plugin-specific least-privilege credentials if approved |
| 06 Quoting & pricing | Business-specific commercial rules, approved promotions, sandbox examples, invoice-ready fee presentation |
| 13 Public API & developer platform | Isolated sandbox, simulator, OpenAPI portal, quickstarts/examples, request diagnostics, compatibility checks |
| 14 API keys, idempotency & rate limits | Environment-scoped credentials, documented quotas/policies, key rotation, batch/plugin idempotency conventions |
| 15 Webhooks, outbox & retries | Merchant webhook logs, event retrieval, replay controls, duplicate-safe guidance, delivery diagnostics |
| 16 Commerce plugins | Shopify/WooCommerce-style connection, order trigger mapping, idempotent delivery creation, delivery ID metafield, fulfillment/tracking updates |
| 18 Bulk import & batches | CSV upload, schema/version, validation report, row-level idempotency/correlation, partial-failure policy, batch status |
| 20 White-label tracking | Business logo/colors and safe branding configuration without weakening token authorization |
| 21 Billing & ledger | Invoice/credit/statement source postings, approval workflows, accounting periods and close controls |
| 23 Invoicing, settlements & payouts | Postpaid invoice generation, credits, merchant statements, due/status model, tenant finance views |
| 27 Audit & observability | Sandbox/request/plugin/batch/replay diagnostics and contract-drift alerts |
| UI inventory | Bulk CSV import, invoices/COD balances, branding, expanded `/app/developers`, plugin configuration and diagnostics |

### Exit criteria

- [ ] A new merchant can use published guidance and isolated sandbox credentials to complete quote → create → retrieve → simulated lifecycle.
- [ ] Sandbox data, credentials, webhooks, and financial behavior cannot cross into production.
- [ ] Checked-in OpenAPI examples and implementation pass contract and compatibility tests.
- [ ] Webhook logs expose attempts safely, and authorized replay does not create duplicate merchant effects.
- [ ] CSV rows produce the same validated delivery commands as API/dashboard creation, with stable row results and retry behavior.
- [ ] Shopify/WooCommerce-style integrations store the platform delivery ID, surface the tracking URL, and handle duplicate/order-event retries.
- [ ] Branding changes affect presentation only and do not expose internal or cross-tenant data.
- [ ] Postpaid charges, credits, invoices, statements, and ledger references reconcile to delivery and `external_order_id`.
- [ ] Merchant support can correlate request, delivery, event, batch/plugin origin, invoice, and ledger records without viewing secrets.

### Principal risks and controls

| Risk | Required control |
|---|---|
| Sandbox/production crossover | Separate credentials, stores, webhook endpoints, visible environment markers, policy tests |
| API contract drift | OpenAPI validation, example tests, implementation contract tests, breaking-change detection |
| Duplicate plugin or batch creation | Canonical command path, stable source IDs, row/order-scoped idempotency |
| Replay causing downstream duplicates | Preserve event ID and original payload/signature semantics; document consumer deduplication |
| Plugin credential compromise | Least-privilege environment-scoped credentials, rotation/revocation, no browser exposure |
| Batch partial failure ambiguity | Explicit row state, validation report, retryable/non-retryable errors, no silent skips |
| Invoice/ledger mismatch | Generate from posted source records, immutable references, approval and period controls |

### Explicitly deferred from Phase 3

- [ ] Scheduled windows, multi-stop optimization, partner fleet API/portal, city-level scale configuration, automated settlement/payout, and advanced reporting → Phase 4.
- [ ] Generated SDKs are conditional on demonstrated demand.
- [ ] Marketplace/storefront functionality, arbitrary workflow scripting, GraphQL, and custom plugin ecosystems are outside the approved product.
- [ ] Promotions, quotas, invoice terms, taxes, late fees, credit limits, and deprecation windows remain configurable until approved.

---

## 6. Phase 4 — Scale modes

### Goals

- Add scheduled, multi-stop/route, multi-city, return-at-scale, and partner-fleet delivery modes.
- Apply mode-specific rollout controls on top of the complete Phase 1 city/zone foundation and introduce partner commercial/operational boundaries without weakening tenant or lifecycle controls.
- Automate approved settlement and payout flows with reconciliation and maker/approver controls.
- Provide advanced operational, service, and finance reporting.

### Entry criteria

- [ ] Phase 3 integration and finance exit criteria are met.
- [ ] Scheduling/window, routing objective, inter-city service, partner responsibility, compensation, settlement, and dispute policies are approved.
- [ ] Existing lifecycle semantics have documented extensions for route stops, partner handoff, return linkage, and scheduled commitments.
- [ ] Bank/payment-processor integration, custody, approval, failure, reversal, and reconciliation policies are reviewed by finance/legal/security.
- [ ] Mode/product rollout ownership and feature-flag controls are defined without duplicating or weakening Phase 1 geography versioning, approval, rollback, and audit.

### Dependencies

- Stable production pricing, dispatch, maps/routing, tracking, proof, exceptions, public API, webhooks, ledger, COD, invoicing, audit, and security modules.
- Partner identities and scoped authorization extending, not bypassing, the core actor/tenant model.
- Versioned configuration and feature flags for city/product/partner rollout.

### Module deliverables

| Module / reference | Phase 4 deliverable |
|---|---|
| 06 Quoting & pricing | Scheduled, multi-stop, inter-city, demand-aware and partner-commercial inputs where approved |
| 07 Dispatch & assignment | Route/partner dispatch strategy, handoff/reassignment, capacity and exception controls |
| 08 Rider & fleet management | Owned-fleet compensation and route work support at scale |
| 09 Partner fleet management | Partner tenant/scope, incoming job accept/decline, internal rider mapping, status publication, earnings reconcile |
| 10 Live tracking & ETA | Route/stop and partner location/ETA normalization with source/freshness disclosure |
| 12 Exceptions & returns | Route-stop, partner, inter-city and return exception handling |
| 13 Public API & developer platform | Scheduled/route/partner-relevant resources, formal deprecation policy, regional endpoints if required |
| 19 Scheduling, multi-stop & routing | Delivery windows, stop model, route optimization, constraints, versioned plan, re-optimization and manual override |
| 23 Invoicing, settlements & payouts | Automated merchant settlement and rider/partner payouts, approvals, retries, reversals, statements |
| 25 Reporting & analytics | Advanced service, route, city, partner, merchant, rider, COD, settlement, and profitability reporting |
| 26 Support & disputes | Cross-party case, evidence, ownership, SLA-configuration, dispute and adjustment workflow |
| 29 Configuration & feature flags | City/product/partner flags, effective-dated configuration, approval, rollout/rollback and audit |
| 30 Fraud & risk controls | COD, payout, partner, API, rider/location and proof risk rules; case management and explainable holds |
| 21 Billing & ledger | Partner earnings, automated payout/settlement postings, processor/bank reconciliation, controlled multi-currency support |
| UI inventory | Multi-stop builder, partner portal, settlement runs, route/city configuration and advanced reports |

### Exit criteria

- [ ] Scheduled deliveries enforce approved windows and expose missed-window exceptions.
- [ ] Multi-stop plans preserve stop order/history, constraint inputs, optimization version, and manual overrides.
- [ ] Multi-city availability requires explicit enabled products and pricing rules; absence is unavailable, never zero-priced.
- [ ] Partner fleets can accept/decline, assign internal riders, and publish authorized statuses without accessing unrelated tenant data.
- [ ] Owned rider and partner earnings remain independently reportable from merchant charges and COD.
- [ ] Automated settlement/payout is idempotent, approval-gated, reversible by linked entries, and reconciled to processor/bank evidence.
- [ ] City/product/partner features can be rolled out and rolled back through audited configuration without rewriting historical deliveries or quotes.
- [ ] Advanced reports state filters, currency, as-of time, source watermark, and operational-versus-posted meaning.
- [ ] Cross-party support/dispute cases preserve evidence and link any approved adjustment or reversal.
- [ ] Scale tests cover route size, partner throughput, city isolation, event ordering, payout retry, reporting consistency, and recovery.

### Principal risks and controls

| Risk | Required control |
|---|---|
| Route optimization produces infeasible plans | Validate hard constraints, retain algorithm/input version, allow audited manual override and re-plan |
| Partner status/data inconsistency | Normalize partner events, enforce transition rules, deduplicate, expose source/freshness, reconcile |
| Incorrect automated payout | Maker/approver separation, limits/holds, idempotency, reconciliation, linked reversals |
| City configuration drift | Versioned effective-dated configuration, schema validation, staged flags, rollback |
| Multi-currency imbalance | Balance per currency, explicit clearing/FX rules, no implicit conversion |
| Reporting misstates operational estimates as finance | Label posted/estimated state, currency, as-of time, filters and watermark |
| Fraud controls block legitimate work silently | Explainable rule/case records, least-privilege review, expiry/escalation and audit |

### Explicitly deferred or conditional after Phase 4

- [ ] Additional native mobile applications beyond the approved React Native rider app remain separate product decisions.
- [ ] Microservice extraction is conditional on measured modular-monolith limits, not a roadmap requirement.
- [ ] Generated SDKs, regional endpoints, enterprise SSO, advanced simulations, and additional commerce plugins depend on demonstrated demand and separate approval.
- [ ] New delivery modes, autonomous dispatch, dynamic marketplace bidding, and cross-border service are not approved.
- [ ] FX, tax, withholding, reserves, processor fees, data residency, financial retention, and jurisdiction-specific compliance require explicit finance/legal approval before activation.

## 7. Roadmap governance checklist

- [ ] A phase item is not complete until its module acceptance criteria and the phase exit criterion are both verifiable.
- [ ] Any public contract change updates OpenAPI, examples, compatibility tests, and relevant guides before release.
- [ ] Any financial event defines source evidence, posting rule, idempotency identity, accounts, reconciliation, reversal, and approval behavior.
- [ ] Any new actor or integration defines authentication, authorization scope, tenant/party ownership, audit, and data minimization.
- [ ] Any asynchronous workflow defines outbox/source identity, retry classification, deduplication, dead-letter/quarantine, observability, and recovery.
- [ ] Any configurable value identifies its approving owner and preserves historical version/snapshot semantics.
- [ ] Deferred items remain deferred until dependencies, policy decisions, and acceptance criteria are documented and approved.
