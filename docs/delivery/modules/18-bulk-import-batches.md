# 18 — Bulk Import and Batches

**Status:** Product specification  
**Initial format:** CSV upload with asynchronous validation and creation  
**Phase:** 3

## Scope and boundaries

In scope: downloadable templates, CSV upload, schema/profile selection, asynchronous parsing, row validation, review, partial or atomic commit policy, idempotent delivery creation, progress, result export, cancellation, retention, and API batch submission.

Out of scope: spreadsheet editing, arbitrary ETL, inventory/order import, files as a permanent system of record, and route optimization itself. A batch coordinates normal `/v1` delivery contracts; it does not bypass serviceability, pricing, security, or lifecycle rules.

## Actors

- Merchant operator prepares/uploads a file and resolves errors.
- Merchant developer submits batches through REST.
- Business admin defines branch defaults and who may commit.
- Batch worker scans, parses, validates, and creates deliveries.
- Operations observes resulting jobs, not raw uncommitted rows.
- Support/platform admin diagnoses jobs with tightly controlled file access.

## Data and contracts

`ImportBatch` includes tenant/environment, source (`ui|api|plugin`), filename, object-storage key, checksum, schema version, mode (`validate_only|partial_commit|atomic_commit`), state, counts, creator, defaults, idempotency key, timestamps, and expiry.

`ImportRow` includes one-based row number, normalized input, `external_order_id`, validation state/errors, canonical request hash, delivery ID, creation outcome, and safe diagnostics. Large installations may persist row results in chunked storage while retaining searchable indexes.

Required logical fields: `external_order_id`, pickup/dropoff addresses and coordinates (or an approved geocoding workflow), recipient contact, and package description/count. Optional fields include branch reference, COD amount/currency, notes, scheduled window, weight, fragile flag, and merchant metadata.

CSV contract specifies UTF-8, comma delimiter, header row, quoting rules, maximum file/row/cell sizes, date/time timezone rules, and a versioned column dictionary. Exported errors include row, field, code, and message.

## Endpoints and events

- `POST /v1/batches` creates metadata/upload intent and requires `Idempotency-Key`.
- `POST /v1/batches/{batch_id}/upload-complete`
- `GET /v1/batches/{batch_id}`
- `GET /v1/batches/{batch_id}/rows`
- `GET /v1/batches/{batch_id}/results`
- `POST /v1/batches/{batch_id}/commit` with `Idempotency-Key`
- `POST /v1/batches/{batch_id}/cancel`
- Optional direct `POST /v1/batches:json` for bounded machine submissions.

Events: `batch.uploaded`, `batch.validation_completed`, `batch.commit_started`, `batch.progress`, `batch.completed`, `batch.completed_with_errors`, `batch.cancelled`, and `batch.failed`. Events carry counts and batch links, not full row PII.

## Security

- Upload through short-lived, tenant-scoped signed URLs or authenticated streaming; bind object key, size, type, and checksum.
- Malware scan and content sniff before parsing. Files are private, encrypted, access-logged, and deleted after documented retention.
- Protect parsers against CSV injection, decompression/row bombs, malformed quoting, formula execution, and excessive memory/CPU use.
- RBAC separates upload/validate from commit where required. Worker access remains tenant-scoped.
- Result exports neutralize formula-leading cells and avoid secrets. PII is redacted from logs and metrics.

## Validation

- Stage 1: file type/size, encoding, checksum, header/schema, row/cell limits, duplicate headers.
- Stage 2 per row: required fields, types, lengths, enum/currency, address/coordinates, contact, package, COD, schedule, and branch ownership.
- Stage 3 business rules: tenant state, service zone, quote/pricing availability, duplicate `external_order_id`, and intra-file duplicates.
- Validation is deterministic against a recorded rules/schema version. Revalidation is required if relevant configuration changes before commit.
- `atomic_commit` is accepted only below a bounded row count and creates none if any row is invalid. `partial_commit` creates valid rows and reports invalid ones.

## Error semantics

- Batch states: `created`, `uploading`, `scanning`, `validating`, `ready`, `committing`, `completed`, `completed_with_errors`, `failed`, `cancelling`, `cancelled`, and `expired`.
- Batch-level failures include invalid file, scan rejection, parser failure, quota exceeded, stale validation, or internal worker failure.
- Row errors use the public API's stable error codes and field paths. A row may have multiple safe errors.
- A failed row does not hide successful rows in partial mode. Atomic mode reports errors without creating deliveries.
- `409` covers invalid state transitions or changed idempotency input; `413` covers limits; `422` covers semantically invalid batch configuration.

## Retry and idempotency

- Batch creation and commit require distinct idempotency keys. File checksum and normalized commit options form request hashes.
- Each row's delivery creation uses a deterministic key derived from batch ID, row identity, and canonical row hash.
- Worker retries resume from durable checkpoints and query/replay row idempotency records; completed rows are never recreated.
- Ambiguous rows reconcile by tenant-scoped `external_order_id` plus stored request hash. A conflicting existing order becomes a row error, not an overwrite.
- Transient platform errors retry with exponential backoff/jitter. User-validation failures do not retry automatically.
- Cancellation is best effort: stop unclaimed work; retain already created deliveries and report them explicitly.

## UI and admin touchpoints

- `/app/batches`: template download, upload wizard, schema/default mapping, validation progress, error summary, row preview/filter, commit mode, confirmation, and history.
- Results show total/valid/invalid/created/skipped counts, delivery links, and safe CSV export. Users can download invalid rows for correction.
- Delivery list supports batch ID/source filtering; delivery detail links its source row.
- `/admin` displays queue depth, oldest job, worker capacity, storage/scanner health, tenant quotas, and controlled support diagnostics.

## Observability

- Metrics: uploads, bytes/rows, scan/parse/validation duration, invalid rate/codes, commit throughput, row retries, duplicate prevention, queue age, cancellation, and storage cleanup.
- Correlate request ID, batch ID, tenant, schema version, file checksum fingerprint, row number, idempotency record, and delivery ID.
- Alert on stuck states, queue SLO breach, scanner/storage outage, high worker failures, cleanup lag, and anomalous tenant volume.
- Audit upload, validation, commit, cancellation, export, deletion, and support access.

## Phased delivery

1. **Foundation:** fixed CSV template, asynchronous scan/validate, partial commit, result counts/export, and idempotent rows.
2. **Reliability:** checkpoints, atomic mode for small batches, cancellation, quotas, retention cleanup, detailed monitoring, and stale-validation checks.
3. **Public batch API:** OpenAPI contracts, direct bounded JSON mode, webhook progress/completion events, and sandbox examples.
4. **Scale:** configurable mappings, very large chunked files, scheduled imports, object-storage integrations, and route-building handoff.

## Acceptance criteria

- Uploading the same file/creation key does not create duplicate batches, and recommitting does not duplicate deliveries.
- Every accepted row is validated by the same rules as `POST /v1/deliveries` and retains `external_order_id`.
- Partial mode creates only valid rows; atomic mode creates none when any row is invalid.
- Worker restart resumes safely with accurate counts and no duplicate delivery.
- Users can identify and export every row error, link every created row to its delivery, and see cancellation's partial effects.
- Files/results are tenant-private, scanned, access-audited, and removed according to retention.
- OpenAPI and signed webhook contracts expose machine-usable batch state and completion.
