# Order Service — How To Implement

**Requirement (from `docs/requirment.md` §4.2):**  
Handles the shopping cart, checkout process, and order lifecycle — from “placed” through “packed,” “shipped,” and “delivered.” This is the single source of truth for order status shown to both buyers and sellers.

| Responsibility | Used by |
|----------------|---------|
| Cart, checkout, order status | Buyers, Sellers |

**Early stage:** Website form + spreadsheet → automate at **20+ orders/week**.

---

## 1. Responsibilities

1. Shopping cart  
2. Checkout process  
3. Order lifecycle status (single source of truth)  

---

## 2. Lifecycle statuses

One model ([`conventions.md`](./conventions.md)):

```
placed → packed → shipped → delivered
```

Buyer tracking shows `placed` as **Confirmed**.

Who moves status:

| To | Who |
|----|-----|
| `placed` | Checkout (and payment confirm for prepaid; COD places without pre-charge) |
| `packed` | Seller (dashboard or bot) |
| `shipped` | Logistics after rider assigned / pickup |
| `delivered` | Logistics / fleet app confirm → then Payments queues payout |

---

## 3. Operations

```
# Cart
add / update / remove lines (Catalog listing ids)
get cart (order summary)

# Checkout
delivery_address + payment_method
→ create order status=placed
→ Payments charge (skip charge for COD)

# Status
GET order (buyer + seller same record)
PATCH status along placed → packed → shipped → delivered
```

---

## 4. Consistency rule

One order id for:

- Buyer order tracking  
- Seller recent orders / notifications  
- Payments payout reference  
- Admin completed transaction log  

---

## 5. Early stage

Form + spreadsheet until 20+ orders/week; still treat one order identity for buyer and seller manually if needed, then automate this service.

---

## 6. Acceptance checks

1. Cart and checkout work.  
2. Status only changes through this service’s lifecycle.  
3. Buyer and seller see the same status for the same order.  
4. Lifecycle includes placed, packed, shipped, delivered.  

---

## Source

`requirment.md` §4.2; §2.1 cart/tracking; §6 flow; §7 Orders  
