# Application Interfaces (UI / UX inventory)

Screen inventory for merchant, operations, admin, rider, partner, tracking, and plugins.

Technology mapping:

- Merchant, operations, platform-admin, partner, and public-tracking surfaces use the React/Vite web application.
- Rider execution uses the React Native application. Screen names below are native routes, not public web URLs.
- All clients consume the generated TypeScript client from the committed OpenAPI contract; none imports backend entities or repositories.

---

## 1. Merchant dashboard (`/app`)

| Screen | Purpose | Phase |
|--------|---------|-------|
| Login / Register | Email + password auth | 1 |
| Overview | Counts: awaiting, in transit, delivered today | 1 |
| Deliveries list | Filter by status, search external order id | 1 |
| Create delivery | Pickup/dropoff, packages, COD, notes | 1 |
| Delivery detail | Status timeline, tracking link, assign status | 1 |
| Branches | CRUD branches | 1 |
| API keys | Create/revoke keys; show secret once | 1 |
| Webhooks | Endpoint URL + secret + event list | 1 |
| Bulk CSV import | Upload + validation report | 3 |
| Invoices / COD balances | Finance views | 2–3 |
| Settings / branding | Logo, tracking colors | 3 |

---

## 2. Operations console (`/ops`)

| Screen | Purpose | Phase |
|--------|---------|-------|
| Live board | Unassigned + active jobs | 1 |
| Assign modal | Pick available rider | 1 |
| Live map | Rider positions | 2 |
| Exceptions | Failed / stuck jobs | 2 |
| Multi-stop builder | Route stops | 4 |

---

## 3. Platform admin (`/admin`)

| Screen | Purpose | Phase |
|--------|---------|-------|
| Businesses | List/approve tenants | 1 |
| Cities / zones | Advanced map administration for polygons/multipolygons, exclusions, radius/boxes, validation, preview, diff, approval, effective dating, rollback, audit, and explainable coverage | 1 |
| Riders | Create rider users, KYC status | 1 |
| Pricing rules | Fee configuration | 2 |
| Settlements | Payout runs | 4 |
| Audit log | Searchable events | 1 |
| System health | Queue depth, webhook failures | 2 |

---

## 4. React Native rider app

| Screen | Purpose | Phase |
|--------|---------|-------|
| Login | Rider credentials | 1 |
| Availability toggle | Online / offline | 1 |
| Job list | Assigned deliveries | 1 |
| Job detail | Addresses, COD, notes, status actions | 1 |
| Navigate | Deep-link to maps | 1 |
| Proof capture | Photo / signature | 2 |
| Earnings | Daily/weekly | 2 |

---

## 5. Partner fleet (`/partner`) — Phase 4

| Screen | Purpose |
|--------|---------|
| Incoming jobs | Accept / decline |
| Assign internal rider | Map to partner rider |
| Earnings reconcile | Settlement statements |

---

## 6. White-label tracking (`/t/:token`)

| Element | Purpose | Phase |
|---------|---------|-------|
| Status stepper | Current lifecycle step | 1 |
| ETA text | Stub Phase 1; live Phase 2 | 1 |
| Map / last location | Phase 2 | 2 |
| Business logo / colors | Phase 3 | 3 |
| Proof summary | After delivered | 2 |

No login required. Token is unguessable.

---

## 7. Commerce plugins (Phase 3)

### Shopify / WooCommerce

1. Merchant connects store + API key + webhook secret.  
2. On order paid / fulfillment requested → `POST /v1/deliveries`.  
3. Plugin stores `delivery_id` on order metafield.  
4. Webhooks update order fulfillment status + tracking URL.  

Documented now; implementation deferred to Phase 3.

---

## 8. Navigation map (Phase 1 React web)

```text
/                 marketing / docs link
/login
/register
/app              merchant home
/app/deliveries
/app/deliveries/new
/app/deliveries/[id]
/app/branches
/app/developers   API keys + webhooks
/ops              ops board
/admin            admin home
/t/[token]        public tracking
```

The React Native rider app maintains its own native route tree for authentication, availability, jobs, job detail, navigation handoff, proof, offline queue/conflicts, and settings. Deep links use an approved application scheme/universal-link configuration and must not expose bearer credentials or unrestricted delivery data.
