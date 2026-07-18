# Module 27 — Audit and Observability

**Status:** Detailed delivery specification  
**Dependencies:** Identity, all domain modules, platform infrastructure  
**Primary phases:** Audit foundation in Phase 1; expanded observability in Phase 2 onward

## 1. Purpose

Make security-sensitive, financial, administrative, and operational behavior reconstructable while providing metrics, logs, traces, alerts, and health signals needed to run the platform reliably.

## 2. Boundaries

### In scope

- Immutable domain audit events, access audit, configuration/admin history, and evidence search/export.
- Application/infrastructure logs, metrics, traces, SLOs, dashboards, alerts, runbooks, and incident linkage.
- Correlation across API requests, jobs, webhooks, delivery events, ledger postings, custody, and payments.

### Out of scope

- Replacing domain source records or the financial ledger with logs.
- Storing secrets, raw payment credentials, or unnecessary personal payloads in telemetry.
- Treating append-only application storage as proof of any legal/regulatory certification.
- Employee surveillance or indefinite retention without approved policy.

## 3. Actors and permissions

| Actor | Permissions |
|---|---|
| Domain service | Emit schema-valid audit/telemetry for its own actions |
| Operations/SRE | View operational telemetry and incidents; limited personal data |
| Security analyst | View security/access events and investigate anomalies |
| Finance auditor | View finance/custody/payment audit chains and controlled exports |
| Privacy/compliance reviewer | Review access, retention, legal hold, and rights workflows |
| Tenant admin | View defined audit events for own tenant |
| External auditor | Time-bound, read-only approved evidence package |
| Platform admin | Search permitted events; cannot edit/delete them |

Access to audit data is itself audited. Export, legal hold, retention configuration, and break-glass permissions are separately controlled.

## 4. Data model

### Audit records

- **AuditEvent:** immutable id, schema version, occurred/recorded times, actor and effective/delegated actor, tenant/scope, action, target, outcome, reason, request/correlation/trace ids, source service, metadata classification.
- **AuditEvidenceReference:** event, artifact hash/location, retention class, legal-hold flags.
- **AuditExport:** query hash, scope, requester, approvers, watermark, artifact hash, expiry.
- **AccessEvent:** viewer, resource/category, stated purpose, field classification, outcome.

### Observability records

- **Service/Component:** owner, tier, dependencies, runbook.
- **SLODefinition:** indicator, target, window, exclusions, owner, version.
- **AlertRule:** signal, threshold, severity, routing, suppression, runbook, version.
- **Incident:** severity, state, commander, timeline, affected tenants/services, alert/deployment/audit links.
- **TelemetrySchema:** log/event/metric name, fields, classification, cardinality and retention policy.

Audit events use controlled action names and versioned schemas. Free-form metadata is bounded, classified, and scrubbed.

## 5. Operations and APIs

Domain services write mandatory audit through the same database transaction or durable outbox boundary as the state change where feasible. Structured telemetry propagates trace context across requests, queues, workers, webhooks, and processor calls.

Representative APIs:

- `GET /v1/admin/audit-events`
- `POST /v1/admin/audit-exports`
- `GET /v1/businesses/{id}/audit-events`
- `GET /v1/admin/observability/services`
- `GET /v1/admin/observability/slo`
- `GET /v1/admin/incidents`
- `POST /v1/admin/incidents/{id}/timeline`

Search is time-bounded, paginated, scope-checked, rate-limited, and uses stable cursors. Audit exports require reason and may require independent approval.

## 6. Rules and states

- Audit events are append-only. Corrections append superseding events; interfaces preserve chronology.
- Event ingestion is idempotent by producer/event id and ordered per aggregate where required.
- Protected streams use hash chains, immutable-storage controls, signed checkpoints, or equivalent tamper-evidence; verification results are recorded.
- Both occurred and recorded times are retained; clock synchronization drift is monitored.
- Domain success is not acknowledged if its mandatory audit event cannot be durably captured through the state transaction/outbox.
- Operational logs may be sampled; security and financial audit events may not be probabilistically sampled.
- Correlation identifiers must not embed secrets or personal data.
- The audit record references source evidence rather than duplicating sensitive documents.

Incident states:

`detected → triaged → investigating → mitigated → monitoring → resolved → reviewed`

Audit export states:

`requested → approval_pending → generating → available → expired`, with `rejected`, `failed`, or `revoked` alternatives.

### Required audit coverage

- Authentication, MFA, sessions, API keys, webhook secrets, roles, and permissions.
- Tenant, rider, partner, city/zone, pricing, policy, feature flags, and impersonation.
- Delivery creation, assignment, status/exception, proof, and tracking access decisions.
- Every ledger posting/rejection/reversal, period close/reopen, reconciliation decision, and manual adjustment approval.
- COD collection, custody transfer/count/deposit/variance.
- Invoice/credit, settlement/payout hold, approval, submission, callback, reconciliation, and destination changes.
- Restricted support access, evidence, dispute decisions, and remedies.
- Data export, anonymization/deletion, retention change, legal hold, and break-glass action.

## 7. Security and privacy

- Encrypt telemetry and audit stores and use distinct, least-privilege write/read credentials.
- Producers may append but cannot update historical events.
- Redact tokens, passwords, API keys, webhook secrets, raw payment data, document contents, and unnecessary address/phone data.
- Use pseudonymous references where full identity is unnecessary.
- Separate hot searchable retention from archived evidence and apply verified deletion where legally permitted.
- Log sensitive audit views/exports and alert on bulk or unusual access.
- Legal holds, retention, employee monitoring, location/IP collection, tenant visibility, and external-auditor access are **jurisdiction-configurable and require privacy/legal/security review**.
- Payment-processor payload retention and masking follow **configurable, contract-reviewed processor policy**.

## 8. Failure handling

- Audit lag/failure is high severity and uses durable local/outbox buffering.
- Invalid events are quarantined with producer/schema details; mandatory high-risk operations fail closed when audit durability cannot be guaranteed.
- Telemetry exporter failure uses bounded buffers and drop counters so it cannot exhaust application resources. Mandatory audit has a stricter no-silent-drop policy.
- Alert routing includes fallback contacts, deduplication, escalation, maintenance suppression, and test events.
- Restore tests verify audit counts, checkpoints, hashes, time ranges, and queryability.
- Observability-backend outages have independent health signals and runbooks.
- Incident reviews create owned follow-up actions without rewriting incident chronology.

### Minimum service signals

- API availability, latency, and error rate by surface.
- Delivery-event and assignment lag.
- Queue/outbox age, dead letters, and webhook retry age.
- Ledger unposted/rejected events and debit-credit invariant violations.
- COD cash-in-transit age and custody exceptions.
- Payment unknown/failure/return and reconciliation lag.
- Authentication anomalies, privilege changes, audit lag, and tamper-check failures.

## 9. Reports and metrics

- Audit coverage by required event type and service.
- Ingestion lag, quarantined events, duplicates, gaps, and tamper-verification outcome.
- Sensitive access/export volume by actor, tenant, category, and purpose.
- SLO compliance/error budget by service and tenant impact.
- Alert volume/precision, acknowledgement/mitigation time, and repeat incidents.
- Queue, webhook, payment, ledger, COD, support, and API health.
- Deployment/configuration correlation with incidents.
- Retention disposition, legal holds, and expired-export cleanup.

## 10. Delivery phases

- **Phase 1:** Auth/admin/delivery audit, correlation ids, baseline structured logs/metrics, searchable audit.
- **Phase 2:** Distributed tracing, SLOs/alerts, finance/COD audit, queue/webhook dashboards.
- **Phase 3:** Tamper-evident checkpoints, tenant audit views, governed exports, incident workflow.
- **Phase 4:** Cross-region health, reviewed anomaly detection, evidence packages, continuous control checks.

## 11. Acceptance criteria

- Required high-risk actions produce immutable events with actor, scope, target, outcome, time, reason, and correlation.
- Posted finance and acknowledged custody actions can be reconstructed end to end through approval and reconciliation.
- Audit producers cannot update/delete historical events, and verification detects altered/missing protected records.
- Tenant queries and exports cannot expose another tenant’s events.
- Secrets and prohibited sensitive fields are absent from logs, traces, metric labels, and audit metadata.
- Audit ingestion failure is visible and cannot silently lose mandatory financial/security events.
- Requests, jobs, webhooks, ledger postings, and payment attempts share usable correlation references.
- Every production service has an owner, health indicators, alert routing, and runbook.
- SLO and incident reports identify data window, exclusions, and affected scope.
- Retention, legal-hold, processor, employee-monitoring, and jurisdiction rules remain configurable review items, not implied legal claims.
