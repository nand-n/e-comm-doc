# Seller Listing Creation — How To Implement

**Requirement (from `docs/requirment.md` §3.1):**  
Listing creation — upload photos, set price, write description, assign category

**Also required on this flow (§3.2):**  
Transparent commission display — show exactly what an seller will earn before they confirm a listing price.  
→ Full how-to: [`../transparent-commission-display.md`](../transparent-commission-display.md)

**Backed by:** Catalog Service (product listings, categories).

**Bot:** Telegram/WhatsApp bot fallback allows listing via simple chat commands (§3.2, §5.1).

---

## 1. Goal

Seller creates a listing with:

- Photos  
- Price  
- Description  
- Category  

and sees exact earnings **before** confirming the listing price.

---

## 2. Inputs

| Input | Why |
|-------|-----|
| Photos | Required (source) |
| Price | Required (source) |
| Description | Required (source) |
| Category | Required (source) |
| Medium | Needed so buyer can filter by medium ([`conventions.md`](./conventions.md)) |
| Region | Needed so buyer can filter by region |
| Seller tier (read-only) | Commission preview |
| Authentication info (optional) | PDP / trust signals |

---

## 3. Implementation steps

### Step 1 — Create / draft listing UI

Large controls, minimal required fields (radical simplicity): photos, price, description, category.

### Step 2 — Commission display before confirm

On price entry, show seller earnings using tier rates (15% / 12% / 10%). See transparent-commission-display doc.

### Step 3 — Persist via Catalog

```
POST /seller/listings
{
  photos[],
  price,
  description,
  category_id
}
```

Catalog stores listing and exposes it to buyer search/PDP/homepage once live (and after any admin curation rules Admin uses when reviewing listings).

### Step 4 — Bot path

Same four inputs + earnings preview + confirm via chat commands (seller-telegram-whatsapp-bot doc).

### Step 5 — After create

- Listing appears in seller dashboard “live listings” when live  
- New-listing alerts via Notifications when applicable  

---

## 4. Early stage

Catalog: manually added listings on simple website until 50+ active listings.

---

## 5. Acceptance checks

1. Seller can upload photos, set price, write description, assign category.  
2. Earnings shown before price/listing confirm.  
3. Listing is managed in Catalog and usable on buyer side when published.  
4. Bot can perform listing with same confirm rules.  

---

## Source

`requirment.md` §3.1 Listing creation; §3.2 commission + bot + simplicity; §4.1 Catalog; §5.1 new-listing alerts  
