# Non-Functional Requirements

Proposed operational quality targets for the Delivery-as-a-Service platform. Numeric targets are **service-tier defaults**, not contractual SLAs unless separately sold and approved.

## 1. Availability

| Environment | Target |
|---|---|
| Production API | 99.9% monthly (configurable commercial tier) |
| Tracking page | Same as API or CDN-backed static shell + API |
| Maintenance windows | Announced; prefer zero-downtime migrations |

## 2. Performance

| Operation | Target (p95, configurable) |
|---|---|
| Auth/login | < 500 ms |
| Create delivery | < 800 ms excluding external map calls |
| Get delivery / track | < 400 ms |
| Webhook dispatch attempt | starts within seconds of commit |
| Ops board refresh | interactive under expected city load |

External map/SMS providers are measured separately and must timeout with clear degradation.

## 3. Consistency and correctness

- Delivery status and ledger writes are transactional with their events.
- Idempotent creates never duplicate jobs.
- Tenant isolation is mandatory and continuously tested.
- Webhook delivery is at-least-once; consumers must be idempotent.

## 4. Scalability

- Vertical scale first (modular monolith).
- Horizontal scale API and workers independently.
- Partition hot paths by city/business where needed later.
- Location ingest must support rate controls per rider.

## 5. Security and privacy

See [security module](./modules/28-security-privacy-compliance.md). TLS everywhere externally, secrets management, least privilege, auditability.

## 6. Localization

- Default currency and timezone are city/business configurable.
- UI copy supports Amharic and English where product requires it.
- APIs remain language-neutral with stable enums.

## 7. Rider offline behavior

- Queue status/proof actions locally when offline.
- Sync with conflict rules favoring server authoritative status machine.
- Show clear pending-sync indicators.

## 8. Backup and DR

- Automated DB backups with tested restore procedure.
- Object storage versioning/replication as configured.
- RPO/RTO values are commercial decisions recorded in the decision register.

## 9. Observability and supportability

- Metrics, structured logs, traces, audit search.
- Alert on webhook dead letters, stuck assignments, error budget burn.

## 10. Compatibility

- Modern evergreen browsers for dashboards.
- Mobile browsers for tracking and Phase 1 rider web.
- API JSON over HTTPS only.

## 11. Testability

Every critical invariant must have automated tests: tenancy, state machine, idempotency, webhook signatures, ledger immutability.
