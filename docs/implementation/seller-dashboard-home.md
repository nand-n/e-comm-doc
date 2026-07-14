# Seller Dashboard Home — How To Implement

**Requirement (from `docs/requirment.md` §3.1):**  
Dashboard home — live listings, recent orders, quick stats (views, sales, earnings)

**Interface role (§3):** Help sellers list work, track sales, and get paid — without requiring technical skill. Radical simplicity (§3.2).

---

## 1. Goal

Seller home screen shows:

- Live listings  
- Recent orders  
- Quick stats: **views**, **sales**, **earnings**  

---

## 2. Widgets

| Widget | Data source |
|--------|-------------|
| Live listings | Catalog listings for this seller that are live |
| Recent orders | Order Service orders for this seller |
| Views | View counts for seller’s listings |
| Sales | Sales count / volume for seller |
| Earnings | Earnings figures (align with payout tracker / Payments) |

---

## 3. Implementation steps

### Step 1 — Aggregate API

```
GET /seller/dashboard
→ {
  live_listings: Listing[],
  recent_orders: Order[],
  stats: { views, sales, earnings }
}
```

### Step 2 — Navigation

- Listing → edit / view listing  
- Order → order detail + buyer delivery details (see order notifications)  
- Earnings stat → earnings and payout tracker  

### Step 3 — UX

Large buttons, minimal clutter, visual cues (radical simplicity). Mobile-friendly for sellers on phones.

### Step 4 — Consistency

Recent orders are the same Order Service records buyers see. Earnings consistent with Payments / payout tracker.

---

## 4. Acceptance checks

1. Dashboard shows live listings, recent orders, and stats for views, sales, earnings.  
2. Orders match buyer-side orders for the same ids.  

---

## Source

`requirment.md` §3 intro; §3.1 Dashboard home; §3.2 radical simplicity; §4.1–4.3  
