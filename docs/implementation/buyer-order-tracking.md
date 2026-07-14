# Buyer Order Tracking — How To Implement

**Requirement (from `docs/requirment.md` §2.1):**  
Order tracking — real-time status from confirmed to delivered

**Order Service lifecycle (§4.2):** placed → packed → shipped → delivered (single source of truth for buyers and sellers).

**Transaction flow:** Buyer receives SMS/app updates as the order moves through packed, shipped, and delivered stages. Logistics assigns rider and tracking link.

---

## 1. Goal

Buyer sees **real-time** order status from **confirmed** to **delivered**, driven by the Order Service (not a separate tracking database).

---

## 2. Status model

One enum (see [`conventions.md`](./conventions.md)):

`placed` → `packed` → `shipped` → `delivered`

| Status | Buyer label |
|--------|-------------|
| `placed` | Confirmed |
| `packed` | Packed |
| `shipped` | Shipped |
| `delivered` | Delivered |

Order Service is the only source of truth. SMS/app updates fire on these transitions.

---

## 3. Implementation steps

### Step 1 — Tracking read

```
GET /buyer/orders/:id/tracking
→ {
  status,              // from Order Service
  tracking_link,       // from Logistics when generated
  status_history[]     // for real-time timeline
}
```

### Step 2 — Real-time updates

- Prefer polling or push over the same Order Service status.  
- Also send SMS / app updates on packed, shipped, delivered (Notifications).  
- Push notifications: Phase 3 onward for app users.

### Step 3 — Logistics inputs

When Logistics assigns a rider and generates a tracking link, store link on the order and show it on tracking UI. Status transitions to packed/shipped/delivered update Order Service only (single source of truth).

---

## 4. Acceptance checks

1. Buyer tracking reads status only from Order Service.  
2. Buyer can follow status through to delivered.  
3. Tracking link from Logistics appears when generated.  
4. Seller dashboard sees the same status for the same order.  

---

## Source

`requirment.md` §2.1 Order tracking; §4.2 Order Service; §4.4 Logistics; §5.1 Notifications; §6 transaction flow  
