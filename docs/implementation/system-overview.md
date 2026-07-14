# System Overview — How To Implement

**Requirement (from `docs/requirment.md` §1):**  
The platform must serve two distinct user types — buyers and sellers — through two different front-end experiences, while sharing one unified back-end system underneath. This keeps data consistent (an order placed by a buyer is the same order a seller sees in their dashboard) while letting each side have an interface designed specifically for its purpose.

Four layers:

1. Front end — Buyer side  
2. Front end — Seller side  
3. Back end — Core services  
4. Supporting layers — notifications, database, and external integrations  

---

Read **[`conventions.md`](./conventions.md)** first for status, payments, listings, and payouts rules that tie the system together.

## 1. Goal

Ship **two UIs** (buyer website/app, seller dashboard) on **one shared backend** so order/payment/listing data never diverges between sides.

---

## 2. What to build

| Layer | Deliverable | Consumed by |
|-------|-------------|-------------|
| Buyer front end | Website + mobile app | Buyers |
| Seller front end | Seller dashboard (+ bot fallback elsewhere) | Sellers |
| Core services | Catalog, Orders, Payments, Logistics, Seller Management, Admin Panel | Both front ends + ops |
| Supporting | Notifications, shared DB, external integrations | Services + users |

---

## 3. Technical rules (from the requirement)

1. **One order identity** — Buyer tracking and seller dashboard read the same order record (Order Service is source of truth for status — see order-service doc).  
2. **Separate UIs** — Do not reuse buyer checkout chrome as the seller dashboard; interfaces are purpose-specific.  
3. **Shared persistence** — One unified database for users, sellers, products, orders, payments (see shared-database doc).  
4. **Service boundaries** — Six core services, each with a single responsibility (see service docs).  

---

## 4. Implementation steps

### Step 1 — Split deployable front ends

- `buyer-web` / `buyer-app`: discovery, buy, track, account  
- `seller-web` (dashboard): onboard, list, orders, earnings, profile edit  
- Optional later: rider-facing delivery fleet app (named under external integrations / logistics)

### Step 2 — Shared API / backend

Expose one backend (or modular monolith / services) implementing the six responsibilities. Both front ends call the same Orders, Catalog, Payments, etc.

### Step 3 — Enforce consistency

When payment is confirmed, the same write that marks payment also makes the order visible on the seller side (transaction flow + shared DB). No separate “seller copy” of the order.

### Step 4 — Wire supporting layers

Notifications, shared DB, payment gateways, delivery fleet tool — as specified in their docs.

---

## 5. Acceptance checks

1. Buyer and seller front ends are separate experiences.  
2. Creating an order as buyer shows that same order to the seller.  
3. All four layers exist in the architecture map (even if Phase 1 is partly manual — see bootstrapped-launch).  

---

## Source

`requirment.md` §1 System Overview  
