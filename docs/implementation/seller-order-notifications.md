# Seller Order Notifications — How To Implement

**Requirement (from `docs/requirment.md` §3.1):**  
Order notifications — new sale alerts with buyer delivery details

**Related:** Instant order notification on dashboard or Telegram bot (transaction flow §6; Notifications §5.1; Seller Management named in flow).

---

## 1. Goal

When a sale happens, the seller gets a **new sale alert** that includes **buyer delivery details**, on dashboard and/or Telegram bot.

---

## 2. Trigger

From transaction flow:

1. Buyer checks out and pays (Order Service, Payments Service)  
2. Seller receives instant order notification (Seller Management, Notifications Layer)  

---

## 3. Payload (from source)

| Content | Required |
|---------|----------|
| New sale alert | Yes |
| Buyer delivery details | Yes |

Also usable for fulfillment: seller packages item next in the flow.

---

## 4. Implementation steps

### Step 1 — On order paid / placed

Order Service (or payment confirmation) emits event → Notifications + seller dashboard inbox.

### Step 2 — Dashboard alert

```
GET /seller/notifications/orders
→ [{ order_id, sold_at, buyer_delivery_details, status }]
```

Show prominently on dashboard (and order notifications screen).

### Step 3 — Telegram bot

Send order alert via Telegram bot channel (Notifications: order alerts). Early stage may be manual WhatsApp/Telegram until volume exceeds capacity.

### Step 4 — Next actions for seller

From alert, seller can pack and proceed; Logistics assigns rider after packaging (transaction flow). Bot may allow order updates via chat commands.

---

## 5. Acceptance checks

1. New sale creates an alert with buyer delivery details.  
2. Alert available on dashboard.  
3. Alert available via Telegram bot path.  
4. Same order id as buyer’s order.  

---

## Source

`requirment.md` §3.1 Order notifications; §5.1 Notifications; §6 steps 2–4; §7 Notifications early-stage  
