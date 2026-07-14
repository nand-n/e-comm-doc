# Buyer Search and Filters — How To Implement

**Requirement (from `docs/requirment.md` §2.1):**  
Search and filters — by category, seller tier, price range, medium, and region

**Backed by:** Catalog Service — powers search and filtering on the buyer side; manages listings, three-tier seller classification, category structure.

---

## 1. Goal

Buyers can find listings using search plus these filters only (as named in the source):

- Category  
- Seller tier  
- Price range  
- Medium  
- Region  

---

## 2. Filter dimensions

| Filter | Values / behavior |
|--------|-------------------|
| Category | From Catalog category structure |
| Seller tier | Emerging, Established, Master (three-tier classification) |
| Price range | Min and/or max against listing price |
| Medium | Value stored on the listing (same field used when sellers assign work to categories / listing data) |
| Region | Value stored for regional filter |

The source names these five filters. Do not omit any of them on the buyer search UI.

---

## 3. Data each listing must expose for filtering

From Catalog + listing creation + PDP fields that touch filters:

| Field | Why |
|-------|-----|
| category | Category filter |
| seller_tier | Seller tier filter (from seller’s tier) |
| price | Price range filter |
| medium | Medium filter |
| region | Region filter |
| searchable text | Title/description for text search (listing has description; PDP has product story) |

---

## 4. Implementation steps

### Step 1 — Persist filter fields on listings

When creating/updating a listing (seller listing creation: category required; Catalog manages categories and tiers), ensure category, price, medium, region, and current seller tier are queryable.

### Step 2 — Query API

```
GET /buyer/search?q=&category=&seller_tier=&price_min=&price_max=&medium=&region=
→ { results: ListingCard[], total }
```

Apply AND logic across provided filters (standard, implementable behavior for “filters by X”).

### Step 3 — UI

- Search input  
- Controls for all five filters  
- Results list → product detail  

Mobile-first; Amharic + English labels (buyer design priorities).

---

## 5. Early stage

Until Catalog is automated (trigger: 50+ active listings), search may be limited on a simple manually listed website — but the target system must implement all five filters via Catalog.

---

## 6. Acceptance checks

1. Each of the five filters can narrow results.  
2. Search is powered by Catalog (not a separate buyer-only data silo).  
3. Seller tier filter uses Emerging / Established / Master.  

---

## Source

`requirment.md` §2.1 Search and filters; §4.1 Catalog Service; tiers in §3.2 / §4.3  
