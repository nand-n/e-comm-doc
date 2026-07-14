# Buyer Cart and Checkout — How To Implement

**Requirement (from `docs/requirment.md` §2.1):**  
Cart and checkout — order summary, delivery address, payment method selection

**Related (§2.2):** Local payment options visible early in checkout (Telebirr, CBE Birr, cash-on-delivery) to reduce drop-off.

**Backed by:** Order Service (cart, checkout); Payments Service (Telebirr, CBE Birr, bank transfer for buyer payments).

---

## 1. Goal

Checkout collects:

- Order summary  
- Delivery address  
- Payment method selection  

And shows local payment options **early** (Telebirr, CBE Birr, cash-on-delivery).

---

## 2. Screens / steps

### Cart

- Lines from Catalog listings added by buyer  
- Order summary (items + totals derived from listing prices)

### Checkout

| Block | Requirement |
|-------|-------------|
| Order summary | Same summary as cart / confirmed contents |
| Delivery address | Buyer address for delivery |
| Payment method selection | Choose how to pay |

**One checkout payment list** (merge source checkout + Payments Service — see [`conventions.md`](./conventions.md)):

- Telebirr  
- CBE Birr  
- Bank transfer  
- Cash on delivery  

Show Telebirr, CBE Birr, and COD early (source). Include bank transfer in the same selector so Payments integrations are reachable.

| Method | At checkout |
|--------|-------------|
| Telebirr / CBE Birr / bank transfer | Charge via Payments Service |
| COD | No pre-charge; order still `placed` |

---

## 3. Implementation steps

### Step 1 — Cart (Order Service)

```
POST /orders/cart/items { listing_id, qty }
GET  /orders/cart → order summary
DELETE /orders/cart/items/:id
```

### Step 2 — Checkout payload

```
POST /orders/checkout
{
  delivery_address,
  payment_method  // telebirr | cbe_birr | cash_on_delivery | bank_transfer
}
```

### Step 3 — Payment handoff

- Telebirr / CBE Birr / bank transfer → Payments Service + gateway APIs  
- Cash-on-delivery → order placed with COD method; no pre-charge via gateway  

### Step 4 — After success

Enter order lifecycle (placed → …) and notify seller (transaction flow). Buyer can open order tracking.

---

## 4. Early stage (Phase 1–2)

Orders: website form + spreadsheet tracking until **20+ orders/week**.  
Payments: Telebirr manual confirmation **non-negotiable from day one**.

Even in Phase 1, checkout must still collect order summary, delivery address, and payment method, with Telebirr available.

---

## 5. Acceptance checks

1. Cart/checkout shows order summary, delivery address, payment method selection.  
2. Telebirr, CBE Birr, and cash-on-delivery are visible early in checkout.  
3. Checkout creates/updates the order in Order Service and payment intent/record in Payments Service as applicable.  

---

## Source

`requirment.md` §2.1 Cart and checkout; §2.2 local payments; §4.2 Order; §4.3 Payments; §7 Orders/Payments early-stage  
