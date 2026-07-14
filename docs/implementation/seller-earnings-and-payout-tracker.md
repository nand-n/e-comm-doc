# Seller Earnings and Payout Tracker — How To Implement

**Requirement (from `docs/requirment.md` §3.1):**  
Earnings and payout tracker — ending, processing, and paid amounts; 72-hour payout status

**Payments Service (§4.3):** Manages seller payout process — 72-hour payout guarantee and commission by tier (15% / 12% / 10%).

**Transaction flow:** Once delivery is confirmed, Payments queues seller payout, released within 72 hours, minus tier-based commission.

**Notifications:** Payout confirmations; email monthly seller earnings summaries.

---

## 1. Goal

Seller sees:

- **Pending** amounts  
- **Processing** amounts  
- **Paid** amounts  
- **72-hour payout status**  

---

## 2. State model

| Bucket | Meaning |
|--------|---------|
| `pending` | Order sold; payout not queued yet (usually waiting for `delivered`) |
| `processing` | Delivery confirmed; payout queued; within 72-hour window |
| `paid` | Released to seller |
| 72-hour status | Countdown / due time from queue moment |

Commission (same as listing preview):

```
payout_amount = gross × (1 − tier_rate)
// Emerging 15%, Established 12%, Master 10%
```

See [`conventions.md`](./conventions.md).

---

## 3. Implementation steps

### Step 1 — Create payout on delivery confirmed

Logistics/Order marks **delivered** → Payments queues payout with:

- seller_id  
- order_id  
- gross  
- commission_rate / commission_amount  
- net (seller share)  
- queued_at  
- due_by = queued_at + 72 hours  
- status: processing (until paid)

### Step 2 — Tracker API

```
GET /seller/earnings
→ {
  pending_total,
  processing_total,
  paid_total,
  items: [{
    order_id,
    amount_net,
    status,           // pending | processing | paid
    payout_due_by,    // queued_at + 72h when processing
    hours_remaining
  }]
}
```

### Step 3 — Release within 72 hours

Job or process marks processing → paid on release, within 72 hours of queue after delivery confirmation. Notify payout confirmation (Notifications).

### Step 4 — UI

Three totals (**pending**, processing, paid) + list with 72-hour status. Radical simplicity. Link from dashboard earnings stat.

---

## 4. Acceptance checks

1. Tracker shows pending, processing, and paid amounts.  
2. 72-hour payout status is visible for queued payouts.  
3. Net amounts use tier commission rates.  
4. Payout is queued only after delivery confirmation.  

---

## Source

`requirment.md` §3.1 Earnings and payout tracker; §4.3 Payments; §5.1 payout confirmations / monthly email; §6 step 6  
