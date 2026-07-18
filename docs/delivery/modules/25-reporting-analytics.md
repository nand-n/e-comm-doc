# Module 25 — Reporting and Analytics

**Status:** Detailed delivery specification  
**Dependencies:** All operational modules, billing ledger, audit, identity/RBAC  
**Primary phases:** Operational reporting in Phases 1–2; advanced analytics in Phases 3–4

## 1. Purpose

Deliver trustworthy, tenant-scoped operational and financial reporting with explicit definitions, data freshness, lineage, and reconciliation to authoritative source systems.

## 2. Boundaries

### In scope

- Embedded dashboards, scheduled reports, governed exports, and internal analytics.
- Delivery, dispatch, rider/partner, merchant, COD, finance, support, security, and platform-health metrics.
- Semantic definitions, data lineage, freshness, quality controls, and historical snapshots.

### Out of scope

- Treating analytical storage as an operational or financial system of record.
- Predictive automated decisions without separate validation and governance.
- Cross-tenant benchmarking or personal performance surveillance without approved policy.
- Legal, tax, or statutory reports unless separately reviewed and certified.

## 3. Actors and permissions

| Actor | Access |
|---|---|
| Merchant users | Own business/branch reports according to role |
| Business finance | Own detailed finance exports and reconciliation references |
| Rider | Own delivery and earning summaries only |
| Partner admin | Partner-scoped operations and earnings |
| Ops/dispatcher | Assigned cities/fleets, operationally necessary recipient data only |
| Platform finance | Governed financial reports across permitted scopes |
| Support lead | Case/service-quality aggregates and scoped case details |
| Analyst | Approved pseudonymized datasets and governed queries |
| Auditor/compliance | Defined evidence reports and lineage |

Row-level tenant/scope policy applies in dashboards, exports, cached results, and scheduled delivery. Export rights are separate from screen-view rights.

## 4. Data model and architecture

- **MetricDefinition:** stable name, business meaning, formula, grain, dimensions, exclusions, owner, version, effective dates.
- **ReportDefinition:** metrics, filters, layout, required permissions, freshness SLA, version.
- **ReportRun:** definition version, requester, parameters, data watermark, status, artifact reference.
- **ScheduledReport:** owner, recipients, cadence, scope, expiry, last authorization check.
- **AnalyticsEvent:** schema-versioned event id, occurred/received time, tenant, actor pseudonym, dimensions.
- **FactDelivery/FactStatusEvent/FactLedgerEntry/FactCustody/FactCase:** immutable or append-only analytical facts.
- **Dimensions:** business, branch, city, zone, time, rider, partner, delivery mode, currency, configuration version.
- **DataQualityResult:** dataset/check, expected/actual, severity, window, status.
- **LineageRecord:** source tables/events, transform version, run id, target partitions.

Money is stored in integer minor units and grouped by currency. Reports never sum unlike currencies into one amount without a clearly labeled, approved conversion methodology.

## 5. Operations and APIs

Representative APIs:

- `GET /v1/reports/deliveries`
- `GET /v1/reports/operations`
- `GET /v1/businesses/{id}/reports/finance`
- `POST /v1/reports/runs`
- `GET /v1/reports/runs/{id}`
- `POST /v1/reports/schedules`
- `POST /v1/reports/exports`
- `GET /v1/admin/analytics/data-quality`
- `GET /v1/admin/analytics/metric-catalog`

Queries require bounded date ranges, authorized dimensions, pagination, and cost/time limits. Long reports run asynchronously and produce expiring artifacts. Each result includes definition version, generated time, source watermark/freshness, timezone, currency handling, and filters.

## 6. Rules and states

- Authoritative operational state comes from delivery/status records; financial actuals come only from posted ledger entries.
- Quotes, expected COD, pending payouts, and estimated ETA are labeled estimates, not posted actuals.
- Delivery outcome metrics use the authoritative status machine and defined terminal-event rules.
- Late-arriving events update affected historical windows with a recorded refresh watermark.
- Deletion/anonymization requests propagate according to approved policy while legally retained financial/audit facts remain minimized and access-restricted.
- Metric changes create a new version and annotate comparability breaks.
- Small-cohort suppression and pseudonymization apply where configured.

Report run states:

`queued → running → succeeded` or `failed|cancelled|expired`.  
Schedule states: `active → paused → expired|deleted`.  
Quality incidents: `detected → investigating → accepted_exception|remediated → closed`.

### Core definitions

- **On-time delivery rate:** delivered jobs meeting the versioned promised-window definition / eligible delivered jobs.
- **First-attempt success:** deliveries completed without a prior failed attempt / deliveries attempted.
- **Assignment latency:** first assignment time minus `awaiting_dispatch` time.
- **Delivery cycle time:** delivered time minus configured start event; definition must name that event.
- **COD aging:** current time minus verified collection time for unreconciled cash in transit.
- **Ledger reconciliation rate:** matched expected source items / eligible source items, by count and value.

## 7. Security and privacy

- Apply tenant row-level controls before aggregation and cache lookup.
- Prevent inference through small cohorts, unrestricted pivots, or identifiers in exports.
- Mask customer contact/address data by default; detailed operational access must be purpose-limited and time-bounded.
- Encrypt analytical stores and exports; use expiring links and log access/downloads.
- Re-evaluate recipient authorization when every scheduled report runs.
- Restrict arbitrary SQL and production joins to governed environments with query auditing.
- Consent, employee monitoring, location analytics, retention, residency, cross-border transfer, and cookie/telemetry behavior are **jurisdiction-configurable and require privacy/legal review**.

## 8. Failure handling and data quality

- Failed ingestion is retryable and idempotent by source event id.
- Quarantine malformed/unknown schema events; do not silently drop them.
- Publish freshness and incompleteness banners when SLA or quality thresholds fail.
- Reconcile daily counts and amounts between source and analytics:
  - delivery/status event counts and terminal states;
  - ledger entry counts, debits/credits, and control-account totals;
  - COD custody positions and payable totals;
  - invoice/settlement/payout source references.
- A report job failure preserves parameters and trace id but not unnecessary sensitive payloads.
- Corrected pipelines backfill deterministically and record affected reports/metric versions.
- Financial report mismatch is a severity-one data-quality incident; the ledger remains authoritative.

## 9. Reports and metrics

### Merchant

- Delivery volume/status, success/failure/return reasons, on-time rate, cycle time, spend, invoice aging, COD payable/settled/held.

### Operations

- Unassigned/stuck jobs, assignment latency, pickup/delivery SLA, rider availability/utilization, zone demand, exceptions, proof completeness.

### Finance

- Trial-balance-derived control reports, revenue, delivery charges, COD payable, cash in transit, rider/partner payable, settlement/payout aging, reconciliation variance.

### Platform/support/security

- Tenant/API usage, webhook success, queue health, support volume/resolution, disputes, admin actions, security events, export volume.

Every metric has owner, exact formula, source, grain, exclusions, dimensions, freshness SLA, and version in the metric catalog.

## 10. Delivery phases

- **Phase 1:** Merchant delivery counts, operational board metrics, auditable CSV exports.
- **Phase 2:** SLA, COD custody, rider operations, webhook/queue health, data-quality checks.
- **Phase 3:** Finance reports, scheduled delivery, semantic catalog, warehouse/analytical projections.
- **Phase 4:** Partner/city comparisons, cohort and route analytics, governed forecasting experiments.

## 11. Acceptance criteria

- Users cannot access another tenant’s row-level or aggregate data through filters, cache keys, exports, or schedules.
- Every report displays definition version, filters, timezone, currency, and data freshness/watermark.
- Financial reports reconcile exactly to posted ledger entries for the same scope and cutoff.
- COD, delivery charges, platform revenue, rider/partner payable, and cash in transit are reported separately.
- Late or duplicate events do not create permanent duplicate facts; backfills are traceable.
- Metric definitions are versioned and approved before production use.
- Failed quality checks produce visible incidents rather than silently publishing trusted-looking numbers.
- Scheduled reports recheck sender and recipients at run time and use expiring protected artifacts.
- Personal/location data is minimized and masked according to purpose and approved policy.
- Jurisdiction-dependent analytics, retention, monitoring, and cross-tenant benchmarks remain disabled until legal/privacy review.
