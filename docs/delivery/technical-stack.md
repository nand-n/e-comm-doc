# Delivery Platform Technology Stack

**Status:** Implementation baseline  
**Architecture:** Multi-tenant modular monolith with independently scalable process roles  
**Scope:** Target application and platform stack; this repository currently contains documentation only and this specification does not create application code.

This document turns the approved [architecture](./architecture.md) into concrete implementation choices. Domain behavior remains governed by [Delivery Contracts](./contracts.md), the public interface by [OpenAPI](./openapi.yaml), quality controls by the [Testing Strategy](./testing-strategy.md), and security controls by [Security, Privacy, and Compliance](./modules/28-security-privacy-compliance.md).

All capacities, timeouts, retry counts, rate limits, queue thresholds, SLO targets, retention periods, recovery objectives, location intervals, cache TTLs, and support windows are configuration owned and approved by the accountable product, security, privacy, finance, and reliability owners. Examples in implementation must not silently become production policy.

---

## 1. Stack decisions

### 1.1 Required baseline

| Concern | Selected technology | Decision |
|---|---|---|
| Language | TypeScript on supported Node.js LTS | One strict language and toolchain across server, web, mobile-support packages, and generated clients |
| Repository | pnpm workspaces and Turborepo | Deterministic workspace installs, task caching, and explicit package boundaries |
| Web | React, Vite, React Router | Client-rendered authenticated consoles and recipient-safe tracking surfaces |
| Mobile | React Native with Expo and Expo prebuild | Native rider application with background location, secure storage, camera, push, and offline operation |
| API | NestJS with Fastify adapter | Structured modular-monolith boundaries with an efficient HTTP runtime |
| API contract | OpenAPI 3.x over REST | Versioned, language-neutral external contract and generated clients |
| Primary database | PostgreSQL with PostGIS | Transactional source of truth, relational integrity, geospatial queries, and durable outbox |
| Database access | TypeORM (entities, migrations, and repositories) on the `pg` driver | Mature TypeScript ORM with decorator entities, transactions, and an explicit query-builder/raw-SQL escape hatch for PostGIS and performance-critical queries |
| Cache and ephemeral coordination | Redis | Cache, rate-limit counters, short-lived locks, presence, and transient real-time coordination only |
| Background jobs | BullMQ workers backed by Redis, rebuilt from a PostgreSQL outbox/work registry | Operational scheduling and retries without making Redis authoritative |
| Object storage | S3-compatible object storage | Direct, controlled proof/document upload and durable binary storage |
| Observability | OpenTelemetry, Prometheus, Grafana, Loki, Tempo, and Sentry | Correlated metrics, logs, traces, and actionable application errors |
| Delivery | OCI containers, managed container runtime, GitHub Actions, and Terraform | Immutable releases without requiring a Kubernetes control plane |
| Documentation | VitePress | Version-controlled product, operating, and integration documentation |

These choices are the baseline, not a menu. Teams must not introduce a second framework, ORM, queue, state store, API style, or telemetry stack for convenience.

### 1.2 Conditional technologies

The following are adopted only after measurements, an owner, an operating plan, and an approved architecture decision record (ADR) demonstrate need:

- Kubernetes, when managed containers can no longer meet independently measured scheduling, networking, scaling, or platform-control requirements and an operations team can own the additional control plane.
- Kafka or another event-streaming platform, when PostgreSQL outbox plus BullMQ cannot meet measured durable fan-out, replay, ordering, or throughput requirements.
- A dedicated search engine, when indexed PostgreSQL full-text/trigram search cannot meet measured query, relevance, or scale requirements.
- Read replicas, when observed read load and acceptable replica lag justify the consistency and operational complexity.
- Table partitioning, when table growth, vacuum behavior, index size, or retention operations demonstrate a benefit using production-like data.
- Multi-region active operation, when approved resilience or data-residency requirements justify conflict, consistency, and failover complexity.
- A workflow engine, when long-running business workflows cannot be made observable and recoverable with the durable work registry and idempotent workers.
- A dedicated feature-flag service, warehouse, lake, or business-intelligence platform when approved use cases exceed the baseline configuration and reporting capabilities.

An approved need for one conditional tool does not authorize the others.

## 2. Architecture and runtime boundaries

The backend remains one modular-monolith codebase. NestJS modules reflect the domain ownership defined in [Architecture](./architecture.md#3-modular-monolith-boundaries), and module APIs—not database-table access—are the supported cross-module boundary.

### 2.1 Process roles

The same build artifacts may start with different role configuration:

| Role | Responsibility | Scaling signal |
|---|---|---|
| `api` | REST, authentication, upload initiation, SSE, and WebSocket connections | Request latency, concurrency, CPU/memory, connection count |
| `worker-webhooks` | Signed webhook delivery and retry | Oldest due attempt, queue age, destination concurrency |
| `worker-notifications` | Email, SMS, and push provider calls | Queue age, provider quotas, failure rate |
| `worker-dispatch` | Offers, assignment timeouts, and dispatch orchestration | Due work, offer latency, city/tenant partitions |
| `worker-media` | Malware scan coordination, metadata extraction, image transformation | Pending bytes/items and scanner latency |
| `worker-routing` | Route optimization and large batch work | Pending routes, job cost, provider quota |
| `worker-finance` | Ledger-derived processing, reconciliation, invoice/settlement workflows | Due work, reconciliation lag; isolated from general jobs |
| `scheduler` | Claims due durable work and enqueues bounded jobs | Database due-work lag; singleton lease with safe takeover |

These are deployment roles, not microservices. They share versioned domain packages and the PostgreSQL database, use separate least-privilege identities where practical, and can be scaled or paused independently. High-risk finance and settlement workers use dedicated queues, concurrency limits, permissions, and deployment controls.

### 2.2 Failure isolation

- API requests never wait for webhook, notification, media-processing, routing, or partner-provider completion.
- Queue names and worker pools are partitioned by workload class. Slow media or a failing merchant endpoint cannot starve rider status or finance processing.
- Per-provider and per-tenant concurrency, rate, retry, and circuit-breaker policies prevent noisy neighbors.
- Every external call has an explicit deadline, bounded retry policy, idempotency strategy, and terminal reconciliation path.
- Backpressure stops accepting or defers non-critical work before database, queue, provider, or worker saturation becomes an outage.
- Readiness checks fail only for dependencies required to safely serve that role. Liveness checks detect a stuck process without turning a downstream outage into a restart loop.
- Graceful shutdown stops intake, drains or returns leases, closes real-time connections with reconnect instructions, and respects the platform termination window.

## 3. Repository and package layout

The future implementation uses this logical workspace:

```text
apps/
  api/                 # NestJS HTTP and real-time entry point
  worker/              # NestJS standalone worker entry points
  web/                 # React merchant, operations, admin, and tracking surfaces
  mobile/              # React Native / Expo rider application
  docs/                # VitePress documentation
packages/
  contracts/           # Zod domain schemas, event envelopes, shared value objects
  api-client/          # Generated TypeScript client from committed OpenAPI
  database/            # TypeORM entities, migrations, repositories, SQL helpers
  ui/                  # Accessible React web components and tokens
  mobile-ui/           # Rider-specific React Native components and tokens
  config/              # Typed environment/configuration loading
  observability/       # Logging, tracing, metrics, and redaction conventions
  testing/             # Factories, fixtures, protocol fakes, test utilities
  eslint-config/       # Shared lint policy
  tsconfig/            # Shared strict TypeScript configurations
infra/
  terraform/           # Environment infrastructure modules
  containers/          # Container build definitions
scripts/               # Small, reviewed operational and repository scripts
```

The current repository is documentation-only. This layout is a target for later implementation; no empty packages or application scaffolding should be created merely to mirror the diagram.

### 3.1 Dependency rules

- Applications may depend on packages; packages never depend on applications.
- Domain modules do not import React, NestJS controllers, provider SDKs, or persistence implementations.
- `contracts` contains stable values and schemas, not business workflows or a dumping ground for shared utilities.
- Generated `api-client` code is never manually edited. CI regenerates it and fails on an uncommitted diff.
- Web and mobile consume the generated client but do not import server entities, repositories, or internal DTOs.
- Provider SDKs remain inside adapter packages or backend modules and cannot leak provider-specific types into domain APIs.
- Turborepo task inputs include lockfile, toolchain, environment schema, generated artifacts, and relevant source so cache hits remain correct.

## 4. TypeScript and engineering toolchain

- Use a supported Node.js LTS release pinned in the repository and container image.
- Pin the package manager through `packageManager`, commit `pnpm-lock.yaml`, and require frozen-lockfile installs in CI.
- Enable TypeScript strict mode, including strict null checks, unchecked indexed-access checks, and exact optional-property behavior where package compatibility permits.
- Use ESLint for correctness and architectural rules and Prettier for formatting. Avoid overlapping style rules.
- Use Node's built-in test runner only where a package has no framework needs; the standard application test runner is Vitest for shared, web, and backend unit tests.
- Use Changesets only if independently versioned publishable packages are introduced. Internal workspace packages otherwise release with the application.
- Use conventional, reviewable commit and pull-request checks; commit-message tooling is not required unless release automation demonstrates a need.

Production builds compile from a clean checkout, run type checks and tests, and produce only runtime dependencies. Source maps are generated, access-controlled, and uploaded to Sentry without exposing them as public assets.

## 5. Web frontend

### 5.1 Required libraries and patterns

- React with Vite for merchant, dispatcher, partner, finance, support, platform-admin, and public-tracking interfaces.
- React Router for route composition, authorization-aware layouts, lazy loading, and error boundaries.
- TanStack Query for server-state fetching, mutation, invalidation, retry, and cancellation.
- TanStack Table for accessible, server-driven operational tables; filtering, sorting, and pagination remain API-owned for large datasets.
- React Hook Form with Zod schemas for form state and client-side feedback. Server validation remains authoritative.
- An accessible component system built on a maintained headless primitive library, with project-owned design tokens and components in `packages/ui`.
- MapLibre GL JS behind a project map adapter. The adapter owns source/layer setup, marker clustering, geospatial redaction, and provider-specific tile configuration.
- A maintained i18n library with namespaced resources, pluralization, interpolation safety, locale-aware dates/numbers/currency, and right-to-left readiness.

The application uses generated OpenAPI clients through small feature-specific service hooks. It does not duplicate HTTP paths, response models, authentication refresh behavior, or error parsing in components.

### 5.2 Web production rules

- Use route- and feature-level code splitting and enforce owner-approved bundle budgets in CI.
- Set a strict Content Security Policy, frame restrictions, secure cookies, referrer policy, and permissions policy appropriate to each surface.
- Prefer same-origin API access behind the edge/load balancer. Any cross-origin use has an explicit allowlist and credential policy.
- Never persist bearer tokens, API keys, proof URLs, or unrestricted personal data in `localStorage`.
- Treat browser caches and service workers as non-authoritative. A service worker may cache static assets and public shell resources, but the primary rider workflow remains in the native mobile application.
- Public tracking renders a recipient-safe projection and does not hydrate privileged data into page source.
- Every operation that changes lifecycle, finance, access, or configuration state confirms authoritative server success and handles `409` conflicts explicitly.
- Accessibility tests cover keyboard use, focus, labels, announcements, contrast, reduced motion, zoom, and screen-reader semantics against the owner-approved conformance target.

Server-side rendering is not a baseline dependency. It may be added for a separately approved public marketing or search-indexing requirement, not to replace the React/Vite operational application.

## 6. React Native rider application

The rider application is React Native, not a PWA. Expo is used for the development workflow, updates, build integration, permissions, and compatible native APIs. Expo prebuild produces native projects whenever required by background location, mapping, secure storage, camera/proof capture, push, security controls, or a provider SDK.

### 6.1 Mobile stack

- Expo Router for typed route organization and deep-link handling.
- TanStack Query for online server state and controlled revalidation.
- Zod for validating persisted command payloads, deep links, push payloads, and API boundaries.
- Platform secure storage for refresh credentials and device-bound secrets; ordinary application data does not share the credential store.
- SQLite as the durable local cache and offline command outbox.
- A React Native map component hidden behind the same domain-level map adapter contract as web, with a native implementation.
- Expo Notifications behind a push adapter that supports provider token registration, rotation, revocation, and receipt handling.
- Background location behind a location adapter with platform-specific permission, accuracy, batching, and lifecycle handling.
- Sentry React Native and OpenTelemetry-compatible correlation metadata for mobile diagnostics, with strict data scrubbing.

### 6.2 Offline command model

SQLite stores:

- a bounded, versioned projection of assigned jobs and route stops;
- pending commands with stable client-generated command and idempotency IDs;
- dependency order, attempt metadata, payload schema version, and creation time;
- upload metadata and checksums, but not long-lived unrestricted proof URLs;
- the last server version/watermark needed for conflict detection.

The sync engine:

1. validates a command before enqueueing it;
2. persists it before reporting an offline action as queued;
3. sends commands in dependency order with the original idempotency identity;
4. applies the authoritative server response transactionally to the local projection;
5. stops dependent commands on authorization, validation, or version conflict;
6. refreshes server state and asks the rider to resolve conflicts instead of overwriting newer state;
7. uses bounded exponential backoff with jitter and owner-approved network/battery constraints;
8. expires or quarantines commands only through explicit policy and visible recovery behavior.

SQLite is not a second source of truth. Server lifecycle, assignment, ledger, and proof metadata always win. Offline schema migrations must be forward-tested, crash-safe, and compatible with the supported mobile upgrade window.

### 6.3 Background location and mobile constraints

- Location collection occurs only during an approved rider state and purpose, with visible permission and privacy behavior.
- The server accepts location samples through a batch-capable, idempotent endpoint and rejects implausible, stale, unauthorized, or oversized input according to configurable risk policy.
- Mobile sampling adapts to motion, accuracy, battery, connectivity, and operating-system limits; no design assumes continuous execution.
- Foreground service/notification requirements on Android and background modes on iOS are implemented in native configuration and reviewed for store policy.
- Location, proof, and contact data have class-specific local retention and secure deletion rules.
- A denied permission, killed process, revoked token, full disk, clock skew, or unavailable push service has an explicit rider-visible fallback.

Expo Go is for development convenience only and is not evidence that production native capabilities work. Development builds and physical-device tests are required for native modules. EAS Build/Submit/Update may be used for signed builds and controlled releases; signing keys, profiles, and store credentials remain in managed secrets with restricted access. Over-the-air updates are limited to compatible JavaScript/assets, are signed and rollout-controlled, and cannot bypass native-store review for native code or permission changes.

## 7. Backend application

### 7.1 NestJS runtime

- NestJS uses the Fastify adapter for HTTP.
- Controllers translate transport inputs into application commands/queries and contain no domain or persistence logic.
- Modules expose explicit application interfaces and enforce the dependency graph in [Architecture](./architecture.md#32-dependency-and-transaction-rules).
- Standalone NestJS application contexts run worker roles without opening HTTP listeners unless a dedicated health endpoint is required.
- DTOs are generated or mapped from the OpenAPI/domain schemas. Runtime validation and normalization occur at every untrusted boundary.
- Errors use one versioned problem-details shape with stable machine codes, correlation ID, safe detail, and field errors.
- An injected clock, ID generator, actor context, tenant context, transaction boundary, and provider interfaces keep business logic deterministic.

Use Zod as the canonical runtime schema library for shared domain values and generated-client validation where required. NestJS transport integration must be standardized in one package; do not mix decorator validation and Zod ad hoc across modules.

### 7.2 REST and real-time transport

- REST is the authoritative command/query interface.
- OpenAPI is committed, linted, compatibility-checked, and used to generate TypeScript clients for web and mobile.
- Version public APIs in the URL and version event/webhook payloads independently.
- Require idempotency keys for duplicate-sensitive commands and preserve request hash, status, and response according to [Delivery Contracts](./contracts.md#4-idempotency).
- Use WebSocket for authenticated, bidirectional operations views where subscriptions or presence justify it.
- Use SSE for simple one-way recipient-safe tracking streams where supported.
- Every real-time stream carries event/version or cursor information and supports reconnect/resume.
- Clients always perform an authoritative REST snapshot after reconnect or detected sequence gap. Polling is the supported degradation path.
- Real-time channels publish projections only; they never replace committed PostgreSQL state or command authorization.

WebSocket/SSE fan-out may use Redis Pub/Sub for ephemeral cross-instance notification. Since Pub/Sub is lossy, reconnect and snapshot behavior is mandatory.

### 7.3 Authentication and authorization

- NestJS guards resolve a typed principal and tenant context before application execution.
- Human authentication uses short-lived signed access tokens and rotating, revocable refresh sessions stored server-side as hashed token material.
- Use `jose` for standards-based token signing/verification and key rotation.
- Passwords, where platform-managed credentials are approved, use Argon2id through a maintained native implementation with owner-approved cost parameters and rehash-on-login.
- Use NestJS Passport integration only for standardized authentication strategies; authorization remains project-owned and deny-by-default.
- Merchant API keys are generated with cryptographic randomness, shown once, prefix-identifiable, and stored as a keyed or password-strength hash as defined by the security design.
- Webhook secrets are encrypted with managed KMS keys because they must be retrievable for signing.
- Administrative and finance roles require MFA/step-up according to [Security, Privacy, and Compliance](./modules/28-security-privacy-compliance.md).

An external identity provider may be integrated behind an identity adapter for enterprise federation or separately approved buy-versus-build reasons. Domain roles, tenant membership, rider status, API keys, and audit policy remain platform-owned.

## 8. PostgreSQL and data access

PostgreSQL is the source of truth for delivery lifecycle, assignments, idempotency records, durable outbox/work state, audit references, ledger entries, COD custody, settlements, and configuration.

### 8.1 Schema and query policy

- Enable PostGIS from the first production schema that stores service zones or spatial indexes.
- Store coordinates in explicit geospatial types with a defined spatial reference; validate latitude/longitude before conversion.
- Use GiST/SP-GiST indexes where query plans demonstrate benefit for zones, proximity, or route-support queries.
- Use UUID-compatible non-sequential public identifiers generated by the application; internal indexing choices are documented per table.
- Store money as integer minor units when currency precision permits or approved fixed-precision numeric values otherwise; never use floating point.
- Store timestamps as timezone-aware instants and preserve the business timezone separately where calendar interpretation matters.
- Enforce tenant ownership, foreign keys, uniqueness, valid enums/check constraints, and immutable ledger/audit constraints in the database in addition to application validation.
- Use optimistic aggregate versions or row locks for lifecycle transitions where concurrent commands could violate invariants.
- Use explicit transactions with the narrowest practical scope. Never hold a transaction open across provider calls.

TypeORM is the selected schema, entity, and repository layer, running on the `pg` driver for pooling and the explicit SQL escape hatch. Neither Prisma nor Drizzle is used. PostGIS, reporting, lock-sensitive, and performance-critical queries may use the TypeORM query builder or reviewed raw SQL with typed mapping and integration tests. Raw SQL must use parameters and remains subject to tenant and authorization repository rules. Entity synchronization is disabled in every environment; schema changes flow only through reviewed migrations.

### 8.2 Migrations

- Commit forward-only migration files generated and reviewed with the schema change.
- CI creates a fresh database, applies all migrations, and tests upgrade from the oldest supported deployment schema.
- Production uses an expand/migrate/contract sequence so the current and next application revisions can coexist during rollout.
- A dedicated migration task runs once with a least-privilege migration identity before traffic shifts.
- Large backfills are resumable, observable jobs with bounded batches; they are not hidden inside startup.
- Destructive changes require verified backup/restore readiness, owner approval, compatibility evidence, and a separate later release.
- Application instances never auto-run migrations on boot.

### 8.3 Connections and scaling

- Use a small, explicitly sized TypeORM/`pg` connection pool per process role.
- Derive total possible connections across maximum replicas and workers before deployment; leave capacity for migrations, operations, failover, and monitoring.
- Use PgBouncer in transaction-pooling mode when aggregate connection demand or serverless task churn requires it. Code must not depend on session state, session advisory locks, or prepared-statement behavior incompatible with the configured pool mode.
- Use transaction-level PostgreSQL advisory locks only for short, database-authoritative coordination with documented keys and timeouts. Redis locks are not used to protect financial or lifecycle invariants.
- Add replicas only for lag-tolerant reads. Commands, read-after-write views, idempotency, assignment, and finance continue to use the primary.
- Partition only tables with a measured maintenance/query/retention benefit and a documented partition-key access pattern.

### 8.4 Backups, recovery, and RLS

- Managed PostgreSQL provides encrypted automated backups, continuous write-ahead-log archiving, point-in-time recovery, multi-zone failover, and isolated restore testing.
- Backup retention, recovery point objective, recovery time objective, restore-test cadence, and cross-region copy policy are owner-approved configuration.
- Restore tests verify tenant boundaries, lifecycle histories, outbox watermarks, ledger balance, custody position, and audit continuity—not only database startup.
- PostgreSQL row-level security is enabled as defense in depth for merchant-owned tables where operationally compatible.
- Application repositories still require `TenantContext`; RLS never excuses missing tenant predicates.
- Migration, support, worker, and reporting roles have separate privileges and explicit RLS bypass policy where unavoidable.

## 9. Redis, BullMQ, and durable asynchronous work

### 9.1 Redis responsibilities

Redis may contain:

- bounded read-through or cache-aside entries;
- rate-limit counters;
- short-lived distributed leases for non-authoritative work;
- BullMQ queue structures;
- ephemeral rider/dispatcher presence;
- real-time Pub/Sub notifications;
- short-lived deduplication hints.

Redis must not contain the only copy of lifecycle state, assignment truth, idempotency results, ledger/COD/settlement state, audit records, webhook obligations, or proof metadata. Cache keys include environment, schema version, tenant/scope, resource, and relevant authorization variant. Values have TTLs and bounded sizes. Cache invalidation follows committed changes; correctness must survive stale, missing, flushed, or unavailable Redis.

### 9.2 Durable outbox bridge

1. The command transaction writes domain state and a PostgreSQL outbox/work row atomically.
2. The scheduler claims due rows with safe concurrent locking and enqueues a BullMQ job whose stable job ID derives from the durable work/event ID.
3. The worker loads authoritative state, checks idempotency/terminal status, acquires any required database protection, and performs the bounded action.
4. The worker records outcome, provider reference, next attempt, or terminal state in PostgreSQL.
5. A reconciler compares durable due/in-progress work with queue state and re-enqueues missing jobs.

Acknowledging a BullMQ job is not the business completion record. Redis loss may delay work, but rebuilding from PostgreSQL must not lose a webhook, notification obligation, assignment timeout, ledger action, or settlement workflow. Exactly-once delivery is not claimed: the system provides at-least-once execution with idempotent effects and reconciliation.

BullMQ retries are only a wake-up mechanism; durable attempt policy and terminal/dead-letter state live in PostgreSQL for operator visibility and replay. Queue payloads carry IDs and minimal routing metadata, not large or sensitive domain snapshots.

## 10. Object and media storage

- Use S3-compatible object storage with private buckets, default encryption, version/lifecycle policy, access logs, and blocked public ACLs.
- Clients upload through short-lived, single-purpose presigned requests constrained by object key, content length, declared type, checksum, and expiry.
- Use server-generated opaque keys partitioned by environment and tenant; never place names, phones, addresses, tokens, or raw filenames in keys.
- Record object ownership, expected checksum, classification, scan state, uploader, delivery/proof association, and retention class in PostgreSQL.
- New uploads enter quarantine. An isolated media worker invokes a malware scanner, verifies content by bytes rather than extension, strips unsafe metadata, and creates bounded derivatives.
- Only scanned/approved objects can be served to authorized viewers. Failed or indeterminate scans fail closed and create an operationally visible state.
- Downloads use short-lived authorized URLs or an authenticated streaming boundary according to data classification.
- A CDN serves only approved public or authorization-safe immutable assets. Proof, signature, identity, and sensitive support evidence are not broadly cached.
- Image processing runs with memory/CPU/time limits in an isolated worker. Original preservation and derivative policy are configurable by evidence and privacy requirements.
- Object disposition reconciles database metadata, object versions, legal holds, and backup policy.

Local development uses an S3-compatible emulator. Production uses the cloud provider's managed object storage and malware-scanning integration or an isolated scanner service selected through security review.

## 11. Provider adapters

Each external provider implements a project-owned interface and maps provider errors to stable internal categories: invalid request, authentication, rate limit, timeout, temporary unavailable, permanent rejection, duplicate/known result, and unknown outcome.

| Capability | Adapter boundary | Baseline behavior |
|---|---|---|
| Maps/tiles | `MapTileProvider` | MapLibre-compatible style/tile configuration; client keys restricted by origin/app |
| Geocoding | `GeocodingProvider` | Normalize candidates, preserve provider attribution/licensing metadata, cache only as permitted |
| Routing/ETA | `RoutingProvider` | Version request assumptions and preserve selected route/ETA provenance |
| Email | `EmailProvider` | Template ID/version, provider message ID, webhook status |
| SMS | `SmsProvider` | Normalized destination, message class, provider ID/status |
| Push | `PushProvider` | Device-token lifecycle, collapse/deduplication identity, receipts |
| Payment/payout | `PaymentProvider` | Tokenized destination references, idempotency, signed callbacks, unknown-outcome reconciliation |
| Malware scan | `MalwareScanner` | Content verdict, engine/signature metadata, bounded processing |

Provider selection belongs in environment configuration and an ADR, not domain code. Sandbox contract tests and controlled production probes verify assumptions. A fallback provider is introduced only with a tested routing policy, data-processing approval, reconciliation semantics, and demonstrated business need; merely adding a second SDK is not resilience.

## 12. Security platform and supply chain

### 12.1 Cloud controls

The initial production baseline is an AWS managed-container deployment:

- ECS on Fargate for API, workers, scheduler, and one-off migration tasks;
- Application Load Balancer for TLS termination and health-based routing;
- RDS for PostgreSQL/PostGIS with managed backups and failover;
- ElastiCache for Redis with encryption and the durability configuration appropriate to its non-authoritative role;
- S3 for private objects and CloudFront only for approved cache-safe assets;
- ECR for immutable container images;
- KMS and Secrets Manager for encryption keys and runtime secrets;
- AWS WAF and edge/load-balancer rate controls for coarse abuse protection;
- private networking and security groups with no public database or Redis access.

Equivalent managed services may replace AWS only through an ADR that preserves the security, recovery, observability, and operating properties. Application-level per-principal/per-tenant rate limits remain necessary behind the WAF.

### 12.2 Application and build security

- TLS is required externally and for managed-service links; service-to-service encryption follows network and threat-model requirements.
- Runtime identities use short-lived workload credentials and least privilege. Static cloud keys are prohibited.
- Secrets are schema-validated by name/presence but never printed. Rotation supports overlapping keys where the protocol requires it.
- Generate an SBOM for each image, scan dependencies, licenses, secrets, source, IaC, containers, and deployed web endpoints.
- Use SAST on every change, dependency/container scanning on every build, and authenticated DAST against a controlled deployed environment on a risk-based schedule.
- Sign images and provenance attestations with keyless CI identity where supported; deployment verifies approved registry, digest, and signature.
- Base images are minimal, non-root, read-only where practical, and pinned by digest. Runtime writes use explicit ephemeral mounts.
- Browser and mobile releases use dependency review, lockfile review, and platform permission review.
- Vulnerability remediation and exception windows are risk-based, configurable, owner-approved, and auditable.

Security tools are selected to cover these controls with the fewest maintained integrations. Product documentation must not claim certification merely because tools are installed.

## 13. Observability and operations

### 13.1 Telemetry stack

- OpenTelemetry SDKs instrument API, PostgreSQL, Redis, BullMQ, outbound HTTP, WebSocket/SSE, and supported mobile/web flows.
- OpenTelemetry Collector receives, batches, filters, redacts, samples, and exports telemetry independently of application processes.
- Prometheus stores metrics and evaluates infrastructure/service alert rules.
- Grafana provides dashboards and correlation across metrics, logs, and traces.
- Loki stores structured operational logs.
- Tempo stores distributed traces.
- Sentry captures actionable backend, web, and mobile exceptions, release health, and source-map-aware stack traces.

Telemetry is not the audit ledger. Mandatory audit events use the transactional database/outbox path described in [Audit and Observability](./modules/27-audit-observability.md).

### 13.2 Telemetry rules

- Every request and job carries request, correlation, trace, tenant, actor-class, aggregate, and causation identifiers where applicable.
- Do not put tenant IDs, user IDs, delivery IDs, URLs, phone numbers, coordinates, error text, or unbounded provider values in metric labels.
- Structured logs use a stable schema and controlled event names. Redaction occurs before serialization and again at collection boundaries.
- Never log credentials, authorization headers, API/webhook secrets, presigned URLs, raw payment payloads, proof contents, or unnecessary contact/location data.
- Trace sampling is head/tail policy controlled; errors and high-risk flows may receive different treatment. Audit and finance records are never probabilistically sampled.
- Dashboards cover API traffic, database saturation/locks, cache behavior, durable work age, BullMQ depth, worker failures, webhook endpoints, provider latency, mobile sync, real-time reconnects, and deployment changes.
- SLOs and alerts have an owner, runbook, tested route, versioned definition, and owner-approved target. Alert on user impact and exhaustion trends, not raw noise alone.
- Telemetry failure uses bounded buffers and explicit drop counters; it must not exhaust application resources or block ordinary domain commands.

## 14. Testing stack

The required scenarios and release gates are defined in the [Testing Strategy](./testing-strategy.md). Tool assignments are:

| Test type | Tooling |
|---|---|
| Unit/domain/property | Vitest plus a maintained property-testing library |
| Backend integration | Vitest and Testcontainers for PostgreSQL/PostGIS, Redis, and object storage |
| API/OpenAPI | Schema/compatibility linter, generated-client tests, and HTTP integration tests against NestJS |
| Web component | Testing Library with Vitest and a browser-compatible DOM environment |
| Web end-to-end | Playwright across the approved browser/device matrix |
| Accessibility | Automated axe-based checks plus manual keyboard and screen-reader review |
| React Native | React Native Testing Library and Jest-compatible Expo test setup |
| Mobile end-to-end | Maestro for black-box critical journeys on signed development/release-like builds |
| Load/soak | k6 with version-controlled workload models and environment-owned thresholds |
| Security | SAST, dependency/secret/IaC/container scanning and controlled DAST |
| Recovery/chaos | Infrastructure/provider fault injection and scripted restore/reconciliation verification |

Tests use real ephemeral infrastructure through Testcontainers where protocol behavior matters. Mocking is limited to deterministic module boundaries. Provider adapters have protocol-faithful fakes plus a smaller sandbox suite.

Required release-blocking coverage includes tenant isolation, lifecycle state transitions, idempotency, outbox recovery, webhook signing/replay, ledger balance and immutability, mobile offline conflicts, migration compatibility, backup restoration, authorization, and public-tracking redaction.

Chaos testing begins with controlled dependency faults—timeouts, dropped connections, duplicate jobs, Redis flush/restart, worker termination, PostgreSQL failover in a safe environment, object-store errors, and provider unknown outcomes. Production fault injection requires a separately approved scope, abort condition, owner, and incident plan.

## 15. Local development

Docker Compose supplies:

- PostgreSQL with PostGIS and the same extension/configuration assumptions used in production;
- Redis;
- S3-compatible object storage;
- local email inbox and protocol-faithful SMS/push/payment/map stubs;
- OpenTelemetry Collector and an optional lightweight local observability profile.

The application itself may run on the host for fast reload or in containers for parity. Seed commands create deterministic fixtures for multiple tenants, roles, riders, zones, deliveries in each lifecycle state, webhook failures, ledger cases, and offline conflicts. Seeds are idempotent, environment-guarded, and contain no production data.

Local setup uses checked-in non-secret defaults and an example environment file. Developers receive actionable startup validation when a required variable, migration, extension, bucket, or provider stub is missing. Integration tests create isolated databases/buckets/namespaces rather than sharing mutable developer state.

## 16. CI/CD and environments

### 16.1 Pipeline

GitHub Actions is the baseline CI/CD system. Pull requests run:

1. frozen dependency install and lockfile validation;
2. formatting, lint, architecture-boundary, and strict type checks;
3. OpenAPI lint, generation-diff, and backward-compatibility checks;
4. unit, property, component, and Testcontainers integration tests;
5. web accessibility and selected Playwright journeys;
6. migration fresh-install and supported-upgrade tests;
7. secret, dependency, license, SAST, IaC, and container-policy checks;
8. documentation build and link validation.

Protected release workflows build each image once, generate SBOM/provenance, scan and sign the digest, publish it to ECR, and promote that exact digest through environments. Environment configuration is external to images and validated before deployment.

### 16.2 Environments

- Pull-request checks use ephemeral test infrastructure and provider fakes.
- Development is shared only for integration convenience and cannot be treated as release evidence.
- Staging mirrors production topology and security boundaries at smaller owner-approved capacity, uses synthetic data, and exercises provider sandboxes.
- Production uses separate cloud account boundaries, secrets, keys, data stores, and deployment approvals.

Personal data is not copied down to lower environments. Any production-like dataset is generated or irreversibly transformed under an approved policy.

### 16.3 Deployment and rollback

- Terraform plans are reviewed and applied through protected workflows using short-lived CI identity.
- Run backward-compatible expand migrations before application rollout.
- Deploy API and workers by immutable digest with rolling replacement as the default.
- Use canary traffic for high-risk API/web changes when health signals and routing can make the decision meaningful.
- Pause or separately roll high-risk worker consumers when event/schema compatibility requires sequencing.
- Run post-deploy smoke tests for auth, tenant isolation, delivery read/write, queue processing, and telemetry.
- Roll back application images by digest when compatibility allows. Database rollback uses forward corrective migrations or restore only under the approved recovery runbook; destructive down migrations are not the default.
- Mobile releases use staged store rollout, crash/sync monitoring, and server compatibility across the owner-approved supported app-version window.
- Feature flags separate deployment from activation for risky behavior, but cannot bypass authorization, schema compatibility, or required audit.

Kubernetes is not the initial baseline. ECS managed containers provide process-role scaling and deployment isolation without imposing cluster operation. Reconsider Kubernetes only under the conditional-adoption rules in this document.

## 17. Performance and scalability rules

- Establish endpoint, worker, mobile-sync, and provider SLOs from measured user journeys and owner-approved business objectives.
- Attach tested configuration, dataset shape, software revision, and environment to every performance result. Do not publish unsupported throughput claims.
- Profile before optimizing. Preserve query plans for critical SQL under representative cardinality and detect regressions in staging/load tests.
- Avoid N+1 queries and unbounded lists. APIs use stable cursor pagination, bounded filters, projection-specific selects, and explicit maximum response policy.
- Batch location updates, notifications, outbox claims, and bulk imports within configured payload and transaction limits.
- Keep cache entries cheap to recompute. Measure hit ratio, compute cost, invalidation correctness, memory, and eviction before adding a cache.
- Apply request-body, upload, decompression, query-complexity, concurrency, and execution-time limits at edge and application boundaries.
- Autoscale API and worker roles on a combination of saturation and work-age indicators. Queue depth alone is insufficient when job cost varies.
- Protect PostgreSQL with connection budgets, query timeouts, lock monitoring, bounded worker concurrency, and load shedding.
- Partition queues by workload and, when measured need exists, by city/tenant hash while preserving per-aggregate ordering in the database.
- Route optimization, reporting exports, settlement, and bulk expansion run as asynchronous bounded jobs and never monopolize interactive pools.
- Real-time location and tracking send coalesced projections; clients do not require every raw sample.

Capacity reviews include primary database write headroom, failover connection demand, Redis memory/eviction, durable work recovery rate, object throughput, provider quotas, mobile reconnect storms, and deployment overlap.

## 18. Configuration and feature management

- Define one typed configuration schema per deployable role with startup validation and safe redacted diagnostics.
- Separate non-secret configuration, encrypted secrets, and tenant/business policy.
- Global defaults, environment overrides, tenant overrides, and emergency controls have explicit precedence.
- Every mutable business threshold has owner, scope, type, bounds, effective time, audit record, and rollback value.
- Feature flags are typed, deny-safe, expiry-aware, and evaluated server-side for security or financial behavior.
- Configuration changes affecting pricing, assignment, finance, retention, privacy, or security require the approvals defined in the relevant module.
- Do not use environment variables as an ungoverned dynamic policy store; runtime policy belongs in versioned, audited PostgreSQL records.

## 19. Dependency and version support policy

- Pin exact resolved package versions in the lockfile and exact container digests in release inputs. Do not document arbitrary package versions here.
- Node.js, PostgreSQL, Redis, React Native/Expo SDK, mobile OS, browser, and provider API support matrices are explicit, owned, and reviewed on a scheduled cadence.
- Prefer active LTS/stable releases with upstream security support. New major versions enter through an upgrade ADR or tracked change with compatibility, migration, rollback, and performance evidence.
- Renovation automation may open bounded dependency updates; it never auto-merges production runtime majors or security-sensitive changes without tests and review.
- Remove abandoned or redundant dependencies. A new dependency requires a clear capability, maintenance/security review, license approval, and comparison with platform or standard-library functionality.
- Keep provider SDKs and native modules current within the supported matrix and validate mobile binary compatibility before over-the-air JavaScript releases.
- Emergency security upgrades follow the incident process and may shorten normal soak periods only with documented risk acceptance and enhanced monitoring.

## 20. Ownership and ADR policy

Each application, package, database schema area, queue, provider adapter, dashboard/SLO, Terraform module, and operational runbook has a named owning team. CODEOWNERS and repository boundary checks enforce review where practical.

An ADR is required for:

- changing a selected baseline technology;
- introducing a new datastore, queue, framework, cloud service, native mobile module, or provider;
- enabling a conditional technology;
- changing authoritative data ownership or module boundaries;
- changing tenancy isolation, encryption, recovery, or deployment strategy;
- accepting a material compatibility, availability, security, privacy, or finance trade-off.

ADRs record context, measured evidence, decision, rejected options, consequences, owner, review date, migration, and exit plan. Temporary exceptions have an expiry and compensating controls.

## 21. Explicit anti-choices

Unless the conditional-adoption criteria are met:

- no microservice extraction;
- no Kubernetes;
- no Kafka or general-purpose event-stream platform;
- no Elasticsearch/OpenSearch;
- no second ORM or general database abstraction;
- no GraphQL alongside the REST/OpenAPI contract;
- no Redis-authoritative lifecycle, financial, idempotency, or audit state;
- no PWA as the primary rider application;
- no server-side-rendering framework for authenticated operational consoles;
- no direct provider SDK use from domain modules or UI components;
- no production database access from browser/mobile clients;
- no unbounded retries, queues, caches, exports, uploads, queries, or telemetry labels;
- no performance or compliance claims without measured evidence and approved scope.

## 22. Implementation sequence

1. Establish the pnpm/Turborepo workspace, strict TypeScript policies, dependency boundaries, generated OpenAPI client, and CI quality gates.
2. Provision local PostgreSQL/PostGIS, Redis, object storage, provider stubs, migrations, and deterministic multi-tenant fixtures.
3. Implement NestJS/Fastify foundations: configuration, identity, tenant context, authorization, problem details, idempotency, transactions, audit, and telemetry.
4. Implement domain modules behind explicit application interfaces with PostgreSQL constraints and transactional outbox.
5. Add BullMQ process roles, durable work reconciliation, workload-separated queues, replay, and operational dashboards.
6. Build React/Vite web foundations, accessible UI system, generated-client integration, authentication, route authorization, and critical operational journeys.
7. Build the React Native/Expo rider app with secure session handling, SQLite projection/outbox, conflict-aware sync, proof capture, push, and background location.
8. Add object quarantine/scanning/derivatives and authorized delivery.
9. Integrate map, geocoding, notification, payment/payout, and other providers one adapter at a time with sandbox contracts and reconciliation.
10. Complete deployment automation, restore tests, staged releases, security scanning, performance tests, and production-readiness review.

Sequence may be delivered incrementally, but tenant isolation, authorization, idempotency, audit durability, migration safety, observability, and recovery are foundation work rather than post-launch hardening.

## 23. Implementation checklist

### Repository and contracts

- [ ] Workspace and package dependency graph match this specification.
- [ ] Toolchain, package manager, lockfile, and container digests are pinned.
- [ ] OpenAPI is authoritative, linted, compatibility-checked, and generates web/mobile clients.
- [ ] Event and webhook schemas are versioned and compatibility-tested.
- [ ] Ownership, support matrices, ADR template, and dependency policy are recorded.

### Backend and data

- [ ] NestJS uses Fastify and module dependency rules are enforced.
- [ ] Every untrusted boundary has runtime validation and a stable error shape.
- [ ] Tenant context is mandatory through controller, application, repository, cache, queue, object, and telemetry paths.
- [ ] PostgreSQL/PostGIS schema, constraints, indexes, query plans, migrations, and restore paths are tested.
- [ ] TypeORM and reviewed explicit SQL are the only database access path.
- [ ] Connection budgets include deployment overlap, failover, migrations, and every worker role.
- [ ] Lifecycle, ledger, idempotency, audit, and outbox changes are transactionally correct.
- [ ] Redis flush/unavailability cannot lose or corrupt authoritative state.
- [ ] Durable work reconciliation rebuilds missing BullMQ jobs and proves idempotent effects.

### Web and mobile

- [ ] React/Vite web routes, tables, forms, maps, i18n, error boundaries, and accessibility meet approved requirements.
- [ ] Browser storage, CSP, token, source-map, and recipient-tracking controls pass security review.
- [ ] React Native production builds exercise required native modules on the approved physical-device matrix.
- [ ] SQLite migrations, bounded offline outbox, idempotent replay, version conflicts, and storage pressure are tested.
- [ ] Background location, proof capture, push, permissions, battery, privacy, and killed-process fallbacks are verified.
- [ ] Server compatibility covers the approved mobile release and upgrade window.

### Providers, files, and security

- [ ] Every provider uses an adapter, explicit timeout/retry/idempotency policy, sandbox contract, and unknown-outcome path.
- [ ] Upload authorization, checksum, quarantine, content verification, malware scan, derivatives, access, and disposition are tested.
- [ ] Runtime identity, network boundaries, encryption, KMS/secrets, WAF, and least privilege are reviewed.
- [ ] CI emits scanned and signed immutable images, SBOMs, and provenance.
- [ ] SAST, DAST, dependency, secret, IaC, license, and container findings have owned risk-based handling.

### Reliability and operations

- [ ] Logs, metrics, traces, errors, audit events, and correlation work across API, jobs, providers, web, and mobile.
- [ ] Telemetry redaction and cardinality tests prevent sensitive or unbounded fields.
- [ ] SLOs, alerts, runbooks, dashboards, and escalation routes are owner-approved and tested.
- [ ] Queue starvation, provider outage, Redis loss, database failover, reconnect storm, and worker termination are exercised.
- [ ] Backup/PITR restoration proves lifecycle, ledger, custody, audit, tenancy, and work-watermark integrity.
- [ ] Rolling/canary release, migration sequencing, rollback, mobile staged release, and incident procedures are rehearsed.
- [ ] Capacity and load evidence uses approved configuration and representative workload/data shape.

## 24. Acceptance criteria

This stack is implementation-ready when:

1. A clean checkout can install deterministically, validate configuration, start the local platform dependencies, apply migrations, seed fixtures, and run the documented test suites.
2. The repository architecture prevents web/mobile/server/provider/database concerns from bypassing approved module boundaries.
3. Generated TypeScript clients compile against the committed OpenAPI contract and critical clients pass compatibility tests against the API.
4. Two-tenant tests prove isolation through APIs, repositories, RLS where enabled, caches, jobs, object paths, real-time streams, exports, logs, and public tracking.
5. Concurrent and repeated lifecycle/finance commands preserve state-machine, idempotency, outbox, ledger, and audit invariants.
6. Redis and worker loss tests demonstrate recovery from PostgreSQL without lost obligations or duplicate business effects.
7. Rider offline tests demonstrate durable queueing, restart recovery, idempotent replay, conflict handling, proof recovery, and permission/connectivity fallbacks on supported devices.
8. Upload tests prove quarantine, scan, authorization, checksum, derivative, retention, and deletion behavior.
9. Observability reconstructs a request through API, database transaction, job, provider attempt, and client-visible result without leaking prohibited data.
10. Migration, rolling deployment, rollback, backup restore, and disaster-recovery exercises satisfy the current owner-approved objectives.
11. Load tests identify capacity and safe operating limits for the approved release configuration without unsupported performance claims.
12. Security and supply-chain gates produce reviewable findings, SBOMs, signed immutable artifacts, and auditable exceptions.
13. Every configurable operational limit or policy has an owner, approved value per environment, bounds, telemetry, and change/rollback procedure.

Related specifications:

- [Architecture](./architecture.md)
- [Delivery Contracts](./contracts.md)
- [OpenAPI](./openapi.yaml)
- [Testing Strategy](./testing-strategy.md)
- [Audit and Observability](./modules/27-audit-observability.md)
- [Security, Privacy, and Compliance](./modules/28-security-privacy-compliance.md)
- [API Keys, Idempotency, and Rate Limits](./modules/14-api-keys-idempotency-rate-limits.md)
- [Webhooks, Outbox, and Retries](./modules/15-webhooks-outbox-retries.md)
- [Live Tracking and ETA](./modules/10-live-tracking-eta.md)
- [Configuration and Feature Flags](./modules/29-configuration-feature-flags.md)
