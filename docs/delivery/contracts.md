# Delivery Contracts

Database schema, status machine, REST/OpenAPI surface, webhooks, and ledger rules.

---

## 1. Status state machine

### Allowed transitions

| From | To | Who |
|------|----|-----|
| `draft` | `quoted` | System / merchant |
| `quoted` | `awaiting_dispatch` | Merchant (confirm create) |
| `awaiting_dispatch` | `assigned` | Dispatcher / system |
| `assigned` | `rider_arriving_pickup` | Rider |
| `rider_arriving_pickup` | `picked_up` | Rider |
| `picked_up` | `in_transit` | Rider |
| `in_transit` | `delivered` | Rider |
| `awaiting_dispatch` \| `assigned` \| `rider_arriving_pickup` | `cancelled` | Merchant / ops (rules apply) |
| `assigned` … `in_transit` | `delivery_failed` | Rider / ops |
| `delivery_failed` \| `delivered` | `returned` | Ops (linked return job preferred) |

Invalid transitions must be rejected with `409`.

### Status event payload

```json
{
  "status": "picked_up",
  "at": "2026-07-18T12:00:00.000Z",
  "actorType": "rider",
  "actorId": "uuid",
  "lat": 9.03,
  "lng": 38.74,
  "reason": null
}
```

---

## 2. Roles (RBAC)

| Role | Scope |
|------|-------|
| `platform_admin` | All tenants |
| `business_owner` | Own business |
| `business_admin` | Own business |
| `business_dispatcher` | Own business deliveries |
| `business_finance` | Own business money views |
| `business_viewer` | Read-only own business |
| `rider` | Assigned jobs + own profile |
| `partner_admin` | Partner fleet (Phase 4) |
| `ops_dispatcher` | Platform operations |

---

## 3. Ledger rules (financial)

Immutable entries only. Never mutate a “balance” without inserting a ledger row.

### Accounts (logical)

- `merchant_delivery_charges`  
- `merchant_cod_payable`  
- `rider_earnings_payable`  
- `partner_earnings_payable`  
- `platform_revenue`  
- `cash_in_transit_cod`  

### Phase 1

Create ledger table + helper; post stub `delivery_fee_quoted` when a job is confirmed. Full COD settlement in Phase 2.

### Phase 2+

On `delivered` with COD: debit `cash_in_transit_cod`, credit `merchant_cod_payable`.  
On settlement payout: reverse payable and record payout reference.

---

## 4. Idempotency

- Header: `Idempotency-Key` (required for `POST /v1/deliveries`, quotes optional).  
- Scoped per API key / business.  
- Store request hash + response; replay same response on retry.  
- Conflict if same key with different body → `409`.

---

## 5. Webhooks

### Events

`delivery.created`, `delivery.assigned`, `delivery.picked_up`, `delivery.in_transit`, `delivery.delivered`, `delivery.failed`, `delivery.cancelled`, `delivery.returned`, `cod.collected`, `settlement.completed`

### Delivery

- POST JSON to merchant URL  
- Header `X-DaaS-Signature: sha256=<hmac>`  
- Header `X-DaaS-Timestamp`  
- Retry with backoff; dead-letter after N failures  
- Merchant verifies HMAC of `timestamp.body`

### Phase 1

Outbox table + worker that POSTs (or logs in `WEBHOOK_DRY_RUN=true`).

---

## 6. Proposed core database entities

The following entities should be represented in the future database schema:

- `User`, `Business`, `BusinessMembership`, `Branch`  
- `City`, `ServiceZone`  
- `Rider`, `RiderLocation`  
- `ApiKey`, `IdempotencyRecord`, `WebhookEndpoint`, `WebhookDelivery`  
- `Delivery`, `DeliveryPackage`, `DeliveryStatusEvent`, `DeliveryAssignment`  
- `TrackingToken`  
- `LedgerEntry`, `AuditLog`  

---

## 7. Public REST API (v1)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/v1/auth/register` | Register platform/business user (bootstrap) |
| POST | `/v1/auth/login` | Login → JWT |
| GET | `/v1/me` | Current user |
| POST | `/v1/businesses` | Create business (tenant) |
| GET | `/v1/businesses/:id` | Get business |
| POST | `/v1/businesses/:id/branches` | Add branch |
| POST | `/v1/businesses/:id/api-keys` | Create API key (secret shown once) |
| POST | `/v1/businesses/:id/webhooks` | Register webhook URL |
| POST | `/v1/quotes` | Quote (Phase 1: distance stub + zone check) |
| POST | `/v1/deliveries` | Create delivery (idempotent) |
| GET | `/v1/deliveries/:id` | Get delivery + tracking URL |
| POST | `/v1/deliveries/:id/cancel` | Cancel if allowed |
| POST | `/v1/ops/deliveries/:id/assign` | Manual assign rider |
| GET | `/v1/riders/me/jobs` | Rider job list |
| POST | `/v1/riders/me/availability` | Online/offline |
| POST | `/v1/riders/jobs/:id/status` | Advance status |
| GET | `/v1/track/:token` | Public tracking (no auth) |

Full OpenAPI: [`openapi.yaml`](./openapi.yaml).
