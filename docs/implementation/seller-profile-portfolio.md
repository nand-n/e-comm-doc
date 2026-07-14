# Seller Profile / Portfolio (Editable) — How To Implement

**Requirement (from `docs/requirment.md` §3.1):**  
Seller profile/portfolio page — public-facing page buyers see, editable by the seller

**Buyer sees (§2.1):** bio, tier badge, portfolio, follower count, reviews.

---

## 1. Goal

One public seller page:

- **Buyers** view it (read-only)  
- **Sellers** edit the editable parts  

Tier badge remains from Seller Management (not free-text fake tier).

---

## 2. Editable vs system-owned

| Element | Editable by seller? | Source |
|---------|---------------------|--------|
| Bio | Yes | Profile |
| Portfolio content / which works shown | Yes (tied to listings) | Catalog + profile |
| Tier badge | No (system tier) | Seller Management |
| Follower count | No (derived) | Follow relationships |
| Reviews | No (buyers/reviews system; verified) | Reviews |

---

## 3. Implementation steps

### Step 1 — Seller edit UI

```
GET /seller/profile
PUT /seller/profile { bio, portfolio_settings }
```

### Step 2 — Public buyer read

Same page as `buyer-seller-profile-pages.md`.

### Step 3 — Portfolio

Portfolio shows seller’s works/listings from Catalog. Editing portfolio = managing what is public from their listings / profile settings — without inventing extra portfolio entity fields beyond bio + portfolio as named.

---

## 4. Acceptance checks

1. Buyers see the public page with required buyer fields.  
2. Seller can edit the public-facing profile/portfolio.  
3. Tier badge still reflects real tier.  

---

## Source

`requirment.md` §3.1 seller profile/portfolio page; §2.1 seller profile pages  
