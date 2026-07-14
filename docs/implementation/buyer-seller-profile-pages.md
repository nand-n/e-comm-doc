# Buyer Seller Profile Pages — How To Implement

**Requirement (from `docs/requirment.md` §2.1):**  
Seller profile pages — bio, tier badge, portfolio, follower count, reviews

**Related:** Seller profile/portfolio page — public-facing page buyers see, editable by the seller (§3.1). Trust signals: sellers tier badges, verified reviews (§2.2).

---

## 1. Goal

Public seller page for buyers showing exactly:

- Bio  
- Tier badge  
- Portfolio  
- Follower count  
- Reviews  

---

## 2. Fields and sources

| UI element | Backing data | Written/updated by |
|------------|--------------|--------------------|
| Bio | Seller profile bio | Seller (editable profile) |
| Tier badge | Emerging / Established / Master | Seller Management |
| Portfolio | Seller’s listings / works | Catalog + seller profile |
| Follower count | Count of buyers following this seller | Buyer “followed sellers” |
| Reviews | Verified reviews (only after order `delivered`) | Buyer; see [`conventions.md`](./conventions.md) |

---

## 3. Implementation steps

### Step 1 — Profile read API

```
GET /buyer/sellers/:id
→ {
  bio,
  tier,          // for badge
  portfolio,     // listings / works
  follower_count,
  reviews[]      // verified reviews as required for trust
}
```

### Step 2 — Tier badge

Render badge from current seller tier (same three tiers used for commission and filters).

### Step 3 — Portfolio

Show listings attributed to this seller (from Catalog). Click → product detail.

### Step 4 — Follow

Buyer account area includes followed sellers. Following increments `follower_count` on this page.

### Step 5 — Edit path (seller)

Seller edits the public page via seller profile/portfolio screen (separate seller doc). Buyer page is read-only.

---

## 4. Acceptance checks

1. Page shows bio, tier badge, portfolio, follower count, reviews.  
2. Tier badge matches Seller Management tier.  
3. Content sellers can edit is editable from the seller side and visible here.  

---

## Source

`requirment.md` §2.1 seller profile pages; §2.2 trust signals; §3.1 seller profile/portfolio page  
