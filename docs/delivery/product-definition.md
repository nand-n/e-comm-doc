# Delivery-as-a-Service — Product Definition (Confirmed)

**Status:** Approved for implementation  
**Scope:** Multi-tenant Delivery-as-a-Service (DaaS) platform that e-commerce sites, businesses, companies, and supermarkets integrate to get delivery service.

This is **not** another online store. Merchants keep their own commerce systems and send delivery jobs here.

---

## 1. Confirmed product decisions

| Decision | Choice |
|----------|--------|
| Platform type | Multi-tenant SaaS |
| Fleet model | Hybrid: owned riders + partner delivery fleets |
| Delivery modes | On-demand, scheduled, bulk, multi-stop/routes, multi-city, returns |
| Integrations | Merchant dashboard, REST API, webhooks, white-label tracking, commerce plugins |
| Money | Prepaid delivery fees, postpaid invoicing, COD collection + settlement, rider/partner earnings |
| Architecture | Modular monolith first (not microservices day one) |
| Launch approach | Phased (foundation → city ops → integrations → scale modes) |

Detailed mode flows: [Delivery modes documentation](./modes/index.md).

---

## 2. Who uses the platform

| Actor | Goal |
|-------|------|
| Business / merchant | Create and track deliveries from dashboard or API |
| Customer (recipient) | Track delivery on branded page without an account |
| Rider (owned fleet) | Accept jobs, pick up, deliver, collect COD, earn |
| Partner fleet | Receive jobs for their company, assign riders, publish status |
| Dispatcher / ops | Live map, assign/reassign, handle exceptions |
| Platform admin | Tenants, cities/zones, pricing, KYC, settlements, health |
| External store (Shopify/Woo) | Auto-create delivery from order via plugin |

---

## 3. Product surfaces

1. Business dashboard  
2. Public integration API + OpenAPI + sandbox  
3. Commerce plugins (Shopify / WooCommerce style)  
4. White-label customer tracking  
5. Rider mobile app (React Native with Expo/prebuild where required)  
6. Dispatcher / operations console  
7. Platform admin  
8. Partner fleet portal / API  

---

## 4. Delivery status model (authoritative)

Happy path:

`draft → quoted → awaiting_dispatch → assigned → rider_arriving_pickup → picked_up → in_transit → delivered`

Terminal / exception:

`cancelled` | `delivery_failed` | `returned`

Every transition stores: time, actor, location (optional), reason.

---

## 5. Phased scope

### Phase 1 — Foundation (recommended first build)

- Tenancy, auth/RBAC  
- Businesses / branches  
- Delivery lifecycle  
- Complete canonical cities and advanced service zones: polygons/multipolygons, exclusions, immutable versions, administration, explainable coverage, audit, caching, and recovery  
- Manual dispatch  
- Rider basics (availability, assigned jobs, status updates)  
- Public tracking  
- API keys, idempotency, signed webhooks  
- Audit log  

### Phase 2 — Reliable city operations

- Quotes / pricing engine  
- Automatic rider offers  
- Live location / ETA  
- Proof of pickup/delivery  
- Exceptions / returns  
- Notifications  
- COD ledger  
- Full ops dashboard  

### Phase 3 — Business integrations

- Sandbox, OpenAPI portal  
- CSV batches  
- Webhook logs / replay  
- Shopify / WooCommerce plugins  
- White-label branding  
- Postpaid invoices  

### Phase 4 — Scale modes

- Scheduled windows  
- Multi-stop optimization  
- Partner fleet API / portal  
- Mode-specific rollout using the Phase 1 city/zone foundation  
- Settlement / payout automation  
- Advanced reporting  

---

## 6. Success criteria (integrated delivery)

A merchant can:

1. Get a quote  
2. Create a job once (idempotent retries)  
3. Receive a tracking URL  
4. See a rider assigned  
5. Follow pickup → transit → delivery  
6. Receive signed webhooks  
7. Retrieve proof  
8. See correct charge / COD / settlement entries  
9. Reconcile using their `external_order_id`  

---

## 7. Relationship to existing e-comm docs

Existing VitePress docs under `docs/` describe a marketplace e-commerce product.  
This DaaS platform is a **separate product specification** under `docs/delivery/`.  
The marketplace Logistics Service can later integrate with the future DaaS platform as an external delivery provider.
