# Notifications Layer — How To Implement

**Requirement (from `docs/requirment.md` §5.1):**  
Sends order updates, payout confirmations, and new-listing alerts across multiple channels. In the Ethiopian context, this layer should treat SMS and a Telegram bot as equally important as app push notifications, since not all users will have the app installed early on.

| Channel | Uses |
|---------|------|
| SMS | Order confirmations, delivery updates |
| Telegram bot | Order alerts, simple listing management for seller |
| Push notifications | For app users (Phase 3 onward) |
| Email | Receipts, monthly seller earnings summaries |

**Early stage:** WhatsApp/Telegram manual updates until order volume exceeds manual capacity.

---

## 1. Goal

One notifications layer that can send:

- Order updates  
- Payout confirmations  
- New-listing alerts  

with SMS and Telegram treated as equal priority to push (push only from Phase 3).

---

## 2. Channel matrix (exact)

| Event type | SMS | Telegram | Push (Phase 3+) | Email |
|------------|-----|----------|-----------------|-------|
| Order confirmation | Yes | | | Receipts |
| Delivery updates | Yes | | app updates also named in flow | |
| Order alerts (seller) | | Yes | | |
| Listing management (seller) | | Yes | | |
| Payout confirmations | (payout confirmations named for layer) | | | |
| New-listing alerts | (named for layer) | | | |
| Monthly seller earnings | | | | Yes |

Implement dispatch so each named event has a channel path. Early stage may send manually via WhatsApp/Telegram.

---

## 3. Implementation steps

### Step 1 — Notification API / bus

Services emit events:

- order.confirmed / order.status_changed  
- payout.confirmed  
- listing.created  

### Step 2 — Router

```
route(event):
  SMS if order confirmation or delivery update
  Telegram if seller order alert or listing management messages
  Push if Phase 3+ and app user
  Email if receipt or monthly earnings summary
```

### Step 3 — Priority

Do not ship push-only seller/buyer critical alerts before SMS/Telegram coverage.

### Step 4 — Phase 3

Enable push for app users; keep SMS/Telegram.

---

## 4. Acceptance checks

1. Order updates, payout confirmations, new-listing alerts can be sent.  
2. SMS covers order confirmations and delivery updates.  
3. Telegram covers order alerts and simple listing management.  
4. Push only required from Phase 3 onward.  
5. Email sends receipts and monthly seller earnings summaries.  

---

## Source

`requirment.md` §5.1; §6 buyer SMS/app updates; §7 Notifications  
