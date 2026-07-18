# Mode API Contracts

**Status:** Proposed contract; not yet represented in `openapi.yaml`  
**API:** REST `/v1`; public JSON uses `snake_case`  
**Audience:** Merchant, operations, rider, and integration implementers

This document proposes precise HTTP and webhook contracts for on-demand,
scheduled, batch, multi-stop route, multi-city, and return workflows. It
extends, but does not replace, the authoritative delivery lifecycle. Batches,
routes, legs, and return authorizations coordinate deliveries; each delivery
remains independently identifiable, trackable, billable, and evented.

Normative terms follow [documentation conventions](../documentation-conventions.md).
Until these proposals are incorporated, the checked-in OpenAPI is the
machine-readable contract.

## 1. Current OpenAPI skeleton gaps

The current `openapi.yaml` is a Phase 1 skeleton:

- It has no batch, service-window, route, stop, lane, leg, hub, custody,
  return, paginated-list, or sandbox simulator paths.
- `CreateDeliveryRequest` uses `camelCase`; the documented public convention
  is `snake_case`. This proposal uses `snake_case`.
- Its mode enum is `on_demand`, `scheduled`, `bulk_item`, `multi_stop`;
  `multi_city` is absent. `bulk_item` is ambiguous and must not mean batch
  import, which is an ingestion channel rather than an execution mode.
- It requires caller-supplied `businessId`, although the credential should
  determine tenant identity.
- It models money as a JSON number, permits property-less package objects, and
  omits contact, size, coordinate, collection, and mode-specific validation.
- It has no scheduled timezone/window, delivery version, `job_type`, return
  lineage, route membership, multi-city leg, or custody schema.
- Success bodies, common error responses, pagination, idempotency replay
  headers, `ETag`/`If-Match`, and webhook payload schemas are absent.
- The webhook signature notation differs between `contracts.md` and module 15
  and must be reconciled.

No proposed endpoint is implemented merely because it appears here.

## 2. Protocol conventions

- Production and sandbox use separate hosts, credentials, tenants, data, rate
  limits, and webhook endpoints.
- Merchant calls use `X-API-Key`; tenant/environment come from the key.
- JSON is `application/json`. Unknown request fields return
  `400 validation_failed`; clients ignore unknown response fields.
- IDs are opaque UUIDs. Timestamps are RFC 3339 UTC. Local schedules also
  carry an IANA timezone.
- Money is `{ "amount": "125.00", "currency": "ETB" }`; binary floating
  point is forbidden.
- Every response has `X-Request-Id`. Creates have `Location`. Versioned
  resources have `ETag: "<version>"`.
- `Idempotency-Key` is 16–128 printable ASCII characters and contains no PII.

## 3. Endpoint table

| Method | Path | Scope | Guard | Purpose |
|---|---|---|---|---|
| `POST` | `/v1/deliveries` | `deliveries:write` | Idempotency | Create any delivery mode |
| `GET` | `/v1/deliveries/{delivery_id}` | `deliveries:read` | Safe | Retrieve delivery |
| `GET` | `/v1/deliveries` | `deliveries:read` | Cursor | Search deliveries |
| `GET` | `/v1/service-windows` | `quotes:read` | Cursor | Available schedule windows |
| `POST` | `/v1/batches` | `batches:write` | Idempotency | Create CSV upload intent |
| `POST` | `/v1/batches:json` | `batches:write` | Idempotency | Submit bounded JSON batch |
| `POST` | `/v1/batches/{batch_id}/upload-complete` | `batches:write` | Idempotency | Confirm upload |
| `GET` | `/v1/batches/{batch_id}` | `batches:read` | Safe | Batch progress |
| `GET` | `/v1/batches/{batch_id}/rows` | `batches:read` | Cursor | Validation rows |
| `GET` | `/v1/batches/{batch_id}/results` | `batches:read` | Cursor | Commit results |
| `POST` | `/v1/batches/{batch_id}/commit` | `batches:write` | Idempotency, `If-Match` | Commit valid rows |
| `POST` | `/v1/batches/{batch_id}/cancel` | `batches:write` | Idempotency, `If-Match` | Best-effort cancel |
| `POST` | `/v1/routes` | `routes:write` | Idempotency | Create route draft |
| `GET/PATCH` | `/v1/routes/{route_id}` | `routes:read/write` | `If-Match` on patch | Read/edit route |
| `POST` | `/v1/routes/{route_id}/stops` | `routes:write` | Idempotency, `If-Match` | Add stops |
| `POST` | `/v1/routes/{route_id}/optimize` | `routes:write` | Idempotency, `If-Match` | Request proposal |
| `POST` | `/v1/routes/{route_id}/apply-plan` | `routes:write` | Idempotency, `If-Match` | Apply proposal |
| `POST` | `/v1/routes/{route_id}/lock` | `routes:write` | Idempotency, `If-Match` | Lock valid plan |
| `POST` | `/v1/routes/{route_id}/assign` | `routes:assign` | Idempotency, `If-Match` | Assign rider/fleet |
| `POST` | `/v1/routes/{route_id}/start` | `routes:execute` | Idempotency, `If-Match` | Start route |
| `POST` | `/v1/routes/{route_id}/stops/{stop_id}/status` | `routes:execute` | Idempotency, `If-Match` | Advance stop |
| `POST` | `/v1/routes/{route_id}/complete` | `routes:execute` | Idempotency, `If-Match` | Complete route |
| `GET` | `/v1/lanes` | `deliveries:read` | Cursor | Discover enabled lanes |
| `GET` | `/v1/deliveries/{delivery_id}/legs` | `deliveries:read` | Safe | Ordered multi-city legs |
| `POST` | `/v1/ops/deliveries/{delivery_id}/legs/{leg_id}/assign` | `ops:multi_city` | Idempotency, `If-Match` | Assign leg |
| `POST` | `/v1/ops/deliveries/{delivery_id}/legs/{leg_id}/status` | `ops:multi_city` | Idempotency, `If-Match` | Advance leg |
| `POST` | `/v1/ops/deliveries/{delivery_id}/legs/{leg_id}/custody-events` | `ops:custody` | Idempotency | Append custody event |
| `POST` | `/v1/deliveries/{delivery_id}/returns` | `returns:write` | Idempotency | Request return |
| `GET` | `/v1/deliveries/{delivery_id}/returns` | `returns:read` | Cursor | List linked returns |
| `GET` | `/v1/returns/{return_authorization_id}` | `returns:read` | Safe | Read authorization |
| `POST` | `/v1/ops/returns/{return_authorization_id}/approve` | `ops:returns` | Idempotency, `If-Match` | Approve/reject |
| `POST` | `/v1/ops/returns/{return_authorization_id}/create-job` | `ops:returns` | Idempotency, `If-Match` | Create return job |
| `POST` | `/v1/sandbox/deliveries/{delivery_id}/transitions` | `sandbox:simulate` | Idempotency | Simulate next state |

The route, return, and ops scopes are proposals.

## 4. Common delivery create schema

### `DeliveryCreate`

| Field | Type | Required | Rules |
|---|---|---:|---|
| `external_order_id` | string | Yes | Trim edges; 1–128 chars |
| `branch_id` | UUID | No | Active and credential-tenant owned |
| `mode` | enum | Yes | `on_demand`, `scheduled`, `multi_stop`, `multi_city` |
| `job_type` | enum | No | `outbound` default; `return` only through authorized flow |
| `quote_id` | UUID | Conditional | Active, unexpired, same tenant and input hash |
| `pickup` | `AddressInput` | Yes | Immutable snapshot on confirmation |
| `dropoff` | `AddressInput` | Yes | Immutable snapshot on confirmation |
| `packages` | `PackageInput[]` | Yes | 1–100; tenant limits may be lower |
| `service_window` | `ServiceWindowInput` | Scheduled only | Must match mode |
| `multi_stop` | `MultiStopCreate` | Multi-stop only | Must match mode |
| `multi_city` | `MultiCityCreate` | Multi-city only | Must match mode |
| `cod` | `Money` | No | Non-negative; enabled currency |
| `notes` | string | No | Maximum 1,000 chars |
| `metadata` | object | No | Maximum 20 string values, 500 chars each |

Exactly one matching mode object is accepted. `AddressInput` requires `line1`
(1–200), `city` (1–100), uppercase ISO country, `lat` in `[-90,90]`, `lng`
in `[-180,180]`, and operationally adequate `contact_name`/E.164
`contact_phone`. Optional `city_id` is required when city resolution is
ambiguous and for multi-city.

`PackageInput` requires `description` (1–200) and optional
`external_package_id`, `quantity` (`1..1000`, default `1`),
positive `weight_grams`, all-or-none positive `dimensions_mm`, `fragile`
(default `false`), and non-negative `declared_value`.

Common `201 Created` response:

```json
{
  "id": "de7b0f64-42f0-4e1c-bd9f-05c5277c6627",
  "business_id": "f51d9c84-3c3f-43df-b03f-a8e9a4963e19",
  "external_order_id": "ORD-1048",
  "mode": "on_demand",
  "job_type": "outbound",
  "status": "awaiting_dispatch",
  "version": 1,
  "pickup": {
    "line1": "Bole Road",
    "city": "Addis Ababa",
    "country": "ET",
    "lat": 9.0054,
    "lng": 38.7636,
    "contact_name": "Warehouse",
    "contact_phone": "+251911000001"
  },
  "dropoff": {
    "line1": "Kazanchis",
    "city": "Addis Ababa",
    "country": "ET",
    "lat": 9.018,
    "lng": 38.765,
    "contact_name": "Example Recipient",
    "contact_phone": "+251911000002"
  },
  "packages": [{
    "id": "05a5e3da-4267-4e5b-91c5-74be8b4a4bd5",
    "description": "Box",
    "quantity": 1,
    "weight_grams": 1200,
    "fragile": false
  }],
  "cod": null,
  "service_window": null,
  "route": null,
  "multi_city": null,
  "return_of": null,
  "tracking_url": "https://track.example.test/t/trk_example",
  "created_at": "2026-07-18T12:00:00Z",
  "updated_at": "2026-07-18T12:00:00Z"
}
```

## 5. On-demand

```json
{
  "external_order_id": "ORD-1048",
  "mode": "on_demand",
  "pickup": {
    "line1": "Bole Road", "city": "Addis Ababa", "country": "ET",
    "lat": 9.0054, "lng": 38.7636,
    "contact_name": "Warehouse", "contact_phone": "+251911000001"
  },
  "dropoff": {
    "line1": "Kazanchis", "city": "Addis Ababa", "country": "ET",
    "lat": 9.018, "lng": 38.765,
    "contact_name": "Example Recipient", "contact_phone": "+251911000002"
  },
  "packages": [{"description": "Box", "quantity": 1, "weight_grams": 1200}]
}
```

Creation may retain atomic `draft -> quoted -> awaiting_dispatch` events and
normally returns `awaiting_dispatch`. Unsupported serviceability, package, or
capacity policy returns `422` and creates nothing.

## 6. Scheduled windows and timezones

`GET /v1/service-windows?branch_id={uuid}&date=2026-07-21&timezone=Africa%2FAddis_Ababa`

```json
{
  "data": [{
    "id": "sw_20260721_0900_1100",
    "type": "pickup",
    "start_at": "2026-07-21T06:00:00Z",
    "end_at": "2026-07-21T08:00:00Z",
    "timezone": "Africa/Addis_Ababa",
    "local_date": "2026-07-21",
    "capacity_status": "available"
  }],
  "next_cursor": null
}
```

Scheduled create uses the common object plus:

```json
{
  "mode": "scheduled",
  "service_window": {
    "type": "pickup",
    "start_at": "2026-07-21T06:00:00Z",
    "end_at": "2026-07-21T08:00:00Z",
    "timezone": "Africa/Addis_Ababa",
    "service_window_id": "sw_20260721_0900_1100"
  }
}
```

The response echoes the window and adds
`"capacity_reservation_status": "reserved"`. UTC instants are authoritative;
the IANA zone preserves display and rule context. Validation requires
`start_at < end_at`, valid timezone, cutoff/future policy, configured width,
calendar, serviceability, and capacity. Bare local datetimes are rejected.
Ambiguous/nonexistent DST times require explicit UTC resolution.

## 7. Batch create, upload, commit, and results

Batch import is not a delivery mode. Each row contains a normal
`DeliveryCreate`.

`POST /v1/batches`:

```json
{
  "source": "api",
  "input_format": "csv",
  "filename": "deliveries.csv",
  "content_type": "text/csv",
  "size_bytes": 48219,
  "sha256": "9ddf2a7c4f6fbe8b96539d784ea9682bf75bb01fbb82f1cf2c7c6af7f84e966d",
  "schema_version": "2026-07-18",
  "commit_mode": "partial_commit",
  "defaults": {"mode": "on_demand"}
}
```

```json
{
  "id": "bcd4f554-dcdb-45bb-8353-fb6d8073f52a",
  "state": "uploading",
  "version": 1,
  "upload": {
    "method": "PUT",
    "url": "https://uploads.example.test/signed-placeholder",
    "headers": {"Content-Type": "text/csv"},
    "expires_at": "2026-07-18T12:15:00Z"
  },
  "counts": {"total": 0, "valid": 0, "invalid": 0, "created": 0, "skipped": 0, "failed": 0}
}
```

After exact-byte upload, call `/upload-complete` with:

```json
{
  "size_bytes": 48219,
  "sha256": "9ddf2a7c4f6fbe8b96539d784ea9682bf75bb01fbb82f1cf2c7c6af7f84e966d"
}
```

`202` returns `scanning`. Scan, parse, and deterministic validation are
asynchronous. The bounded `/v1/batches:json` shape is:

```json
{
  "schema_version": "2026-07-18",
  "commit_mode": "validate_only",
  "rows": [{
    "row_key": "line-1",
    "delivery": {
      "external_order_id": "ORD-B-1",
      "mode": "on_demand",
      "pickup": {"line1": "A", "city": "Addis Ababa", "country": "ET", "lat": 9.0, "lng": 38.7, "contact_name": "A", "contact_phone": "+251911000001"},
      "dropoff": {"line1": "B", "city": "Addis Ababa", "country": "ET", "lat": 9.1, "lng": 38.8, "contact_name": "B", "contact_phone": "+251911000002"},
      "packages": [{"description": "Box"}]
    }
  }]
}
```

`row_key` is unique in the batch. Commit, with `If-Match: "4"`:

```json
{"validation_version": 2, "commit_mode": "partial_commit"}
```

Batch must be `ready` with current validation. `atomic_commit` creates none if
any row is invalid and is size-limited. `partial_commit` creates valid rows.

Result:

```json
{
  "id": "bcd4f554-dcdb-45bb-8353-fb6d8073f52a",
  "state": "completed_with_errors",
  "version": 7,
  "counts": {"total": 250, "valid": 247, "invalid": 3, "created": 246, "skipped": 1, "failed": 0},
  "results_url": "/v1/batches/bcd4f554-dcdb-45bb-8353-fb6d8073f52a/results"
}
```

Row result:

```json
{
  "row_number": 18,
  "row_key": "line-18",
  "external_order_id": "ORD-B-18",
  "outcome": "invalid",
  "delivery_id": null,
  "errors": [{"code": "coordinate_out_of_range", "field": "delivery.dropoff.lat", "reason": "must_be_between_-90_and_90"}]
}
```

Rows use a server-derived key from batch ID, row key, and canonical row hash.
Worker retries checkpoint; completed rows are never recreated.

## 8. Multi-stop creation and route execution

`MultiStopCreate`:

```json
{
  "multi_stop": {
    "stops": [
      {
        "client_stop_id": "pickup-1",
        "type": "pickup",
        "address": {"line1": "A", "city": "Addis Ababa", "country": "ET", "lat": 9.0, "lng": 38.7, "contact_name": "A", "contact_phone": "+251911000001"},
        "package_ids": ["PKG-1"],
        "service_duration_minutes": 10
      },
      {
        "client_stop_id": "dropoff-1",
        "type": "dropoff",
        "address": {"line1": "B", "city": "Addis Ababa", "country": "ET", "lat": 9.1, "lng": 38.8, "contact_name": "B", "contact_phone": "+251911000002"},
        "package_ids": ["PKG-1"],
        "service_duration_minutes": 10
      }
    ]
  }
}
```

Stop IDs are unique; stop count is configured; package pickup precedes its
drop-off; load never becomes negative; windows and addresses are valid.
Delivery create may create an unplanned route draft or return
`route_id: null`; the product must choose one behavior before OpenAPI.

Create route:

```json
{
  "city_id": "89137f67-cc31-4510-9f0f-070de678707d",
  "depot_branch_id": "d84b9e3f-28e8-4abd-86b0-ddf3fe65fe17",
  "service_date": "2026-07-21",
  "timezone": "Africa/Addis_Ababa",
  "constraints": {"max_duration_minutes": 480, "max_weight_grams": 80000, "return_to_depot": true},
  "delivery_ids": ["de7b0f64-42f0-4e1c-bd9f-05c5277c6627"]
}
```

Response has `status: draft`, `version: 1`, ordered stops, constraints, null
assignment, and null active optimization run. Delivery stops use
`delivery_id`; server derives immutable addresses/load. Ad hoc stops provide a
full address snapshot.

Optimize, with `If-Match: "3"`:

```json
{"objective": "balanced", "constraints": {"respect_hard_windows": true, "preserve_locked_stops": true}}
```

`202` returns an `OptimizationRun` with `id`, `input_route_version`, input
hash, engine/version, state, proposed sequence, metrics, warnings, and
timestamps. It never mutates the route. Apply explicitly:

```json
{"optimization_run_id": "2d9aa3d4-e926-4572-8092-13b90400e42b"}
```

The completed run version must equal the current route version. Success
returns `planned` and increments version; stale output returns `409`.

Lock validates hard constraints. Assign:

```json
{
  "assignee_type": "rider",
  "rider_id": "5be024a9-0d37-411c-bf17-d40a7fc860bc",
  "vehicle_id": "89092c9b-f127-46bf-8769-c258252b2bd5"
}
```

`assignee_type` is `rider` or `partner_fleet`, with exactly the corresponding
ID. Validate city, shift, capability, capacity, status, and conflicts.

Stop status, with `If-Match: "8"`:

```json
{
  "action_id": "mobile-action-01J2XYZ",
  "status": "completed",
  "occurred_at": "2026-07-21T07:14:22Z",
  "location": {"lat": 9.018, "lng": 38.765, "accuracy_meters": 12},
  "proof_id": "aca57555-2dcc-40be-8983-8cb25b84f572",
  "cod_collected": null,
  "reason_code": null
}
```

`action_id` deduplicates offline actions. Server stores occurrence and receipt
times. Stop completion invokes linked delivery transition/proof/COD guards
atomically. Failure requires reason and affects only its linked delivery.

## 9. Multi-city lane, leg, hub, and custody

Lane discovery:

```json
{
  "data": [{
    "id": "9e4c4b74-d05c-46dc-a1b9-9171b9ac9e2f",
    "code": "ADD-ADA-DAILY",
    "origin_city_id": "89137f67-cc31-4510-9f0f-070de678707d",
    "destination_city_id": "4cc4ef38-aa01-47db-9064-569954b7cf62",
    "status": "enabled",
    "service_levels": ["standard"],
    "next_departure_at": "2026-07-22T04:00:00Z",
    "booking_cutoff_at": "2026-07-21T18:00:00Z",
    "capacity_status": "available"
  }],
  "next_cursor": null
}
```

`MultiCityCreate`:

```json
{
  "mode": "multi_city",
  "multi_city": {
    "lane_id": "9e4c4b74-d05c-46dc-a1b9-9171b9ac9e2f",
    "service_level": "standard",
    "departure_after": "2026-07-22T04:00:00Z"
  }
}
```

Pickup/drop-off require different valid `city_id` values connected by the
lane. Response adds lane, service level, `status: planned`,
`current_leg_id`, and `leg_count`.

Leg response:

```json
{
  "id": "ce6e34dd-250b-4258-bcc7-adce348a2496",
  "sequence": 1,
  "type": "first_mile",
  "status": "awaiting_assignment",
  "origin": {"type": "address", "address": {"line1": "Bole Road", "city": "Addis Ababa", "country": "ET", "lat": 9.0054, "lng": 38.7636}},
  "destination": {"type": "hub", "hub_id": "3203532a-5a08-4dcb-a467-ff827479632b", "name": "Addis Consolidation Hub"},
  "planned_departure_at": "2026-07-22T02:00:00Z",
  "planned_arrival_at": "2026-07-22T03:30:00Z",
  "assignee": null,
  "version": 1
}
```

Leg types: `first_mile`, `linehaul`, `hub_transfer`, `last_mile`. Leg status:
`awaiting_assignment`, `assigned`, `ready_for_handoff`, `in_transit`,
`arrived`, `handoff_pending`, `completed`, `failed`, `cancelled`. Legs form a
connected ordered path and cannot be deleted after execution starts.

Custody event:

```json
{
  "event_type": "handoff_accepted",
  "package_ids": ["05a5e3da-4267-4e5b-91c5-74be8b4a4bd5"],
  "from_party": {"type": "hub", "id": "3203532a-5a08-4dcb-a467-ff827479632b"},
  "to_party": {"type": "partner_fleet", "id": "922055da-f9bf-48a2-a086-495d90bc170f"},
  "occurred_at": "2026-07-22T04:03:12Z",
  "location": {"lat": 9.016, "lng": 38.75},
  "proof_id": "11ae1680-804e-440d-8bc1-5e2a4d9935e6",
  "seal_id": "SEAL-88291",
  "condition": "intact"
}
```

Event types: `custody_received`, `handoff_offered`, `handoff_accepted`,
`handoff_rejected`, `loaded`, `unloaded`, `seal_applied`, `seal_broken`,
`custody_exception`, `custody_released`. Party types: `merchant`, `rider`,
`partner_fleet`, `hub`, `recipient`. Events are append-only; corrections
supersede. Exactly one current custodian exists per package after pickup.

## 10. Return authorization and linked return job

A return never reverses the original state history. It creates a new job with
`job_type: return`, `parent_delivery_id`, and a lineage root.

Request:

```json
{
  "reason_code": "recipient_refused",
  "reason_note": "Recipient declined unopened parcel",
  "package_ids": ["05a5e3da-4267-4e5b-91c5-74be8b4a4bd5"],
  "destination": {"type": "origin", "address": null},
  "payer": "merchant",
  "service_level": "standard",
  "package_condition": "intact",
  "custody": {"party_type": "rider", "party_id": "5be024a9-0d37-411c-bf17-d40a7fc860bc"}
}
```

```json
{
  "id": "87073a43-e2ee-4173-982a-835124f15c42",
  "original_delivery_id": "de7b0f64-42f0-4e1c-bd9f-05c5277c6627",
  "state": "requested",
  "version": 1,
  "reason_code": "recipient_refused",
  "package_ids": ["05a5e3da-4267-4e5b-91c5-74be8b4a4bd5"],
  "destination": {"type": "origin", "address": null},
  "payer": "merchant",
  "expires_at": "2026-07-19T12:00:00Z",
  "return_delivery_id": null
}
```

Destination types are `origin`, `merchant_branch`, `alternate_address`;
the latter requires an address. Payers are `merchant`, `recipient`,
`platform`, subject to policy.

Approval:

```json
{"decision": "approve", "reason_code": "policy_eligible", "expires_at": "2026-07-20T12:00:00Z"}
```

Decision is `approve` or `reject`, always with reason. Create linked job:

```json
{"external_order_id": "ORD-1048-RETURN-1", "mode": "on_demand", "quote_id": "30031cc5-095a-435b-ac78-94345d0ff991"}
```

```json
{
  "return_authorization": {"id": "87073a43-e2ee-4173-982a-835124f15c42", "state": "return_created", "version": 3},
  "delivery": {
    "id": "4875cf2b-37c1-48e6-856b-315ef54189e7",
    "external_order_id": "ORD-1048-RETURN-1",
    "mode": "on_demand",
    "job_type": "return",
    "parent_delivery_id": "de7b0f64-42f0-4e1c-bd9f-05c5277c6627",
    "lineage_root_delivery_id": "de7b0f64-42f0-4e1c-bd9f-05c5277c6627",
    "status": "awaiting_dispatch",
    "version": 1
  }
}
```

Only one active return per original/package scope. Same tenant; no cycles.
Cross-city return requires a lane. Original becomes `returned` only through
authorized ops, normally after child completion.

## 11. Enums

| Enum | Values |
|---|---|
| `delivery_mode` | `on_demand`, `scheduled`, `multi_stop`, `multi_city` |
| `job_type` | `outbound`, `return` |
| `delivery_status` | `draft`, `quoted`, `awaiting_dispatch`, `assigned`, `rider_arriving_pickup`, `picked_up`, `in_transit`, `delivered`, `cancelled`, `delivery_failed`, `returned` |
| `window_type` | `pickup`, `delivery` |
| `batch_commit_mode` | `validate_only`, `partial_commit`, `atomic_commit` |
| `batch_state` | `created`, `uploading`, `scanning`, `validating`, `ready`, `committing`, `completed`, `completed_with_errors`, `failed`, `cancelling`, `cancelled`, `expired` |
| `route_status` | `draft`, `optimizing`, `planned`, `locked`, `assigned`, `active`, `completed`, `cancelled` |
| `stop_type` | `pickup`, `dropoff`, `depot`, `break`, `hub` |
| `stop_status` | `pending`, `arriving`, `arrived`, `in_service`, `completed`, `failed`, `skipped` |
| `optimization_state` | `queued`, `running`, `completed`, `failed`, `superseded` |
| `package_condition` | `intact`, `damaged`, `opened`, `missing`, `unknown` |
| `return_state` | `requested`, `approved`, `rejected`, `expired`, `return_created`, `completed`, `cancelled` |

`bulk_item` is legacy until an explicit migration decision. Oversized/bulk
service should be a service level, package, or vehicle constraint.

## 12. Validation invariants

- All referenced resources belong to the credential tenant; cross-tenant
  access returns `404`.
- Mode-specific objects are mutually exclusive.
- Delivery snapshots are immutable after confirmation.
- One delivery belongs to at most one active route.
- Route hard constraints include precedence, load, windows, area, shift,
  skills, COD/cash, and locked stops.
- Multi-city legs form a connected pickup-to-drop-off path; adjacent legs
  share a hub/handoff.
- Unknown custody blocks ordinary handoff/completion and opens an exception.
- Return packages are a non-empty subset of original packages and cannot be in
  another active return.
- Route/leg/return orchestration never skips the authoritative delivery state
  machine.
- Clients cannot set tenant, actor, trusted server time, status history,
  aggregate version, or event ID.

## 13. Error envelope, statuses, and codes

```json
{
  "error": {
    "code": "route_version_conflict",
    "message": "The route changed before this operation was applied.",
    "request_id": "req_01J2XYZ",
    "details": [{"field": "If-Match", "reason": "stale_version", "expected": "8", "actual": "9"}],
    "current_resource": {"id": "1dff5ea8-2812-4b0d-ac2a-1744032e3c93", "version": 9, "status": "planned"}
  }
}
```

Optional details/current resource must not leak tenant or private data.

| HTTP | Codes |
|---:|---|
| `400` | `malformed_json`, `validation_failed`, `invalid_idempotency_key`, `unsupported_field`, `invalid_cursor` |
| `401` | `invalid_api_key`, `api_key_expired`, `api_key_revoked` |
| `403` | `insufficient_scope`, `operation_not_permitted`, `sandbox_only` |
| `404` | `resource_not_found`, `delivery_not_found`, `batch_not_found`, `route_not_found`, `return_not_found` |
| `409` | `idempotency_key_reused`, `idempotency_in_progress`, `delivery_version_conflict`, `route_version_conflict`, `batch_version_conflict`, `invalid_state_transition`, `route_locked`, `delivery_already_routed`, `capacity_unavailable`, `rider_schedule_conflict`, `stale_validation`, `stale_optimization_run`, `duplicate_active_return`, `custody_conflict` |
| `413` | `payload_too_large`, `batch_row_limit_exceeded`, `file_too_large` |
| `415` | `unsupported_media_type`, `unsupported_file_type` |
| `422` | `unserviceable_address`, `window_unserviceable`, `constraint_unsatisfied`, `optimization_infeasible`, `address_unroutable`, `lane_unavailable`, `return_destination_unserviceable`, `custody_unknown`, `invalid_reason`, `missing_required_proof`, `scan_rejected` |
| `428` | `precondition_required` |
| `429` | `rate_limit_exceeded` |
| `500` | `internal_error` |
| `502` | `routing_provider_error`, `storage_provider_error` |
| `503` | `service_unavailable`, `optimization_unavailable` |

Shape errors are `400`; operational impossibility is `422`; races/stale state
are `409`. `429` and retryable `5xx` include `Retry-After`.

## 14. Idempotency

Scope:

```text
environment + business_id + credential_id + method + normalized_route + key
```

Hash includes path parameters, relevant query, content type, canonical body,
and precondition version; excludes auth/transport headers. Same key/hash
replays original status/body/`Location`/`ETag` with
`Idempotency-Replayed: true`; changed input returns
`409 idempotency_key_reused`; processing returns
`409 idempotency_in_progress` with `Retry-After`. Transient `5xx` is not
permanently cached. Batch create/commit, route actions, stop actions, leg
actions, custody, and return actions each use distinct keys. Retention is at
least 24 hours and exceeds the client retry window.

## 15. Pagination

Lists accept `limit` (default 50, max 100) and opaque `after`, returning:

```json
{"data": [], "next_cursor": "opaque_or_null"}
```

Cursors are tenant/environment/filter-bound and unparseable. Default ordering
is `created_at DESC, id DESC`; batch rows use `row_number ASC`; route
stops/legs use `sequence ASC`. Delivery filters include
`external_order_id`, repeated `status`, `mode`, `job_type`, `branch_id`,
`batch_id`, `route_id`, and creation range. Invalid/expired/filter-mismatched
cursors return `400 invalid_cursor`.

## 16. Optimistic versioning

Batch, route, leg, and return authorization carry integer `version` and ETag.
Mutations require matching `If-Match`. Missing is
`428 precondition_required`; stale is `409 *_version_conflict` with safe
current version/resource. Success increments once. Idempotent replay returns
the original successful version, not latest state. Custody history is append
only and deduplicated by key; related leg status remains version-guarded.

## 17. Webhook additions

These proposed names are not yet approved by `contracts.md` or OpenAPI.
Existing lifecycle names remain unchanged.

```json
{
  "id": "evt_01J2XYZ",
  "type": "route.stop.completed",
  "api_version": "2026-07-18",
  "created_at": "2026-07-21T07:14:23Z",
  "business_id": "f51d9c84-3c3f-43df-b03f-a8e9a4963e19",
  "data": {
    "object": {
      "route_id": "1dff5ea8-2812-4b0d-ac2a-1744032e3c93",
      "route_version": 9,
      "stop_id": "94546942-011d-4b59-bd42-651997ae612c",
      "delivery_id": "de7b0f64-42f0-4e1c-bd9f-05c5277c6627",
      "status": "completed",
      "occurred_at": "2026-07-21T07:14:22Z"
    }
  }
}
```

- Batch: `batch.uploaded`, `batch.validation_completed`,
  `batch.commit_started`, `batch.progress`, `batch.completed`,
  `batch.completed_with_errors`, `batch.cancelled`, `batch.failed`.
- Routes: `delivery.scheduled`, `route.created`,
  `route.optimization_completed`, `route.optimization_failed`,
  `route.planned`, `route.assigned`, `route.started`,
  `route.stop.arriving`, `route.stop.completed`, `route.stop.failed`,
  `route.replanned`, `route.completed`.
- Multi-city: `delivery.leg.assigned`, `delivery.leg.in_transit`,
  `delivery.leg.completed`, `delivery.leg.failed`,
  `delivery.custody.changed`, `delivery.custody.exception`.
- Returns: `delivery.exception.opened`, `delivery.exception.resolved`,
  `return.requested`, `return.approved`, `return.rejected`, `return.created`,
  `return.completed`.

Batch payloads omit row PII. Routes never expose other recipients. Custody and
return payloads omit restricted notes/evidence. Existing delivery events may
add nullable `mode`, `job_type`, `service_window`, `route_id`, `current_leg`,
`parent_delivery_id`, and lineage fields. Delivery is at least once; consumers
deduplicate by event ID and reconcile through REST.

Use module 15 headers and signing input:
`X-DaaS-Event-Id`, `X-DaaS-Timestamp`,
`X-DaaS-Signature: v1=<hex-hmac>` over exact
`timestamp + "." + body`, pending reconciliation with `contracts.md`.

## 18. Backward compatibility

- Additive optional response fields/endpoints are allowed in `/v1`; removing,
  renaming, changing types/required inputs, or changing enum semantics is
  breaking.
- New enum values can break exhaustive clients and require capability
  discovery, release notes, and migration notice.
- Do not silently rename camelCase. Either keep it throughout `/v1`, or accept
  both spellings during a documented window, reject bodies containing both,
  emit canonical snake_case, deprecate, and remove only in `/v2`.
- During migration, supplied `businessId` must match credential tenant.
- `codAmount` cannot change type in place. Accept it only in a legacy schema
  and emit canonical `cod`; remove in `/v2`.
- Deprecate `bulk_item`; never reinterpret it as batch.
- Breaking webhooks require a new schema version and endpoint-selectable
  migration. Use `Deprecation`, `Sunset`, and `Link` headers.
- OpenAPI diff and contract tests must block accidental breaks.

## 19. Sandbox examples

```bash
curl --request POST "https://sandbox-api.example.test/v1/deliveries" \
  --header "X-API-Key: sk_sandbox_example" \
  --header "Idempotency-Key: 01J2SCHEDULEDDEMO01" \
  --header "Content-Type: application/json" \
  --data '{
    "external_order_id": "SANDBOX-SCHEDULED-1",
    "mode": "scheduled",
    "pickup": {"line1":"Sandbox A","city":"Addis Ababa","country":"ET","lat":9.0,"lng":38.7,"contact_name":"A","contact_phone":"+251911000001"},
    "dropoff": {"line1":"Sandbox B","city":"Addis Ababa","country":"ET","lat":9.1,"lng":38.8,"contact_name":"B","contact_phone":"+251911000002"},
    "packages": [{"description":"Test box"}],
    "service_window": {"type":"pickup","start_at":"2026-07-21T06:00:00Z","end_at":"2026-07-21T08:00:00Z","timezone":"Africa/Addis_Ababa"}
  }'
```

```bash
curl --request POST \
  "https://sandbox-api.example.test/v1/sandbox/deliveries/de7b0f64-42f0-4e1c-bd9f-05c5277c6627/transitions" \
  --header "X-API-Key: sk_sandbox_example" \
  --header "Idempotency-Key: 01J2TRANSITIONDEMO1" \
  --header "Content-Type: application/json" \
  --data '{"to_status":"assigned","occurred_at":"2026-07-21T06:10:00Z"}'
```

Simulator accepts only a valid next state and never dispatches/bills. Sandbox
should publish stable lanes, hubs, windows, route results, batch files, return
policies, and explicit failure triggers. Triggers are rejected in production.

## 20. Unresolved decisions

1. Choose camelCase retention or dual-read/snake_case migration.
2. Define/deprecate `bulk_item`.
3. Approve `multi_city` and ownership of lane/hub/leg/custody models.
4. Decide temporary `business_id` create-body behavior.
5. Set package, body, file, row, stop, metadata, and atomic limits.
6. Define quote/capacity reservation and expiry by mode.
7. Approve scheduling cutoff, width, DST, calendar, and alternatives.
8. Decide merchant versus ops route permissions.
9. Choose optimization objectives, timeouts, overrides, and retention.
10. Finalize stop-to-delivery transition mapping and partial-route behavior.
11. Define leg failure/recovery, missed departures, rebooking, seals, and
    custody dual confirmation.
12. Decide lane capacity reservation timing.
13. Approve return TTL, automatic approval, payer, destination, fees, package
    scope, and original `returned` timing.
14. Define `external_order_id` uniqueness and child-return convention.
15. Approve scopes, RBAC, webhook allowlists/versions, and redaction.
16. Reconcile webhook signature notation.
17. Set endpoint idempotency retention, cursor lifetime, and platform-wide
    optimistic preconditions.
18. Define sandbox fixtures, triggers, limits, reset, and retention.
19. Add reusable schemas, examples, errors, headers, and contract tests to
    OpenAPI before implementation or SDK generation.
