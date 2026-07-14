# Buyer Product Detail Page — How To Implement

**Requirement (from `docs/requirment.md` §2.1):**  
Product detail page — photos, price, product story, authentication info, delivery estimate

**Related trust signals (§2.2):** sellers tier badges, authentication certificates, verified reviews.

---

## 1. Goal

PDP lets the buyer evaluate a listing with:

- Photos  
- Price  
- Product story  
- Authentication info  
- Delivery estimate  

---

## 2. Field mapping

| PDP element | Source |
|-------------|--------|
| Photos | Listing |
| Price | Listing |
| Product story | Listing description |
| Authentication info | Optional text and/or certificate image on listing ([`conventions.md`](./conventions.md)) |
| Delivery estimate | Set from logistics zone / simple estimate field on listing or zone |
| Tier badge | Seller tier (trust) |
| Reviews | Link or snippet; verified = review after `delivered` order |

---

## 3. Implementation steps

### Step 1 — Load listing from Catalog

```
GET /buyer/listings/:id
→ {
  photos[],
  price,
  product_story,
  authentication_info,
  delivery_estimate,
  seller_id,
  seller_tier,
  category,
  medium,
  region
}
```

### Step 2 — Actions

- Add to cart → Order Service cart  
- Open seller → seller profile page  

### Step 3 — Display rules

- Mobile-first layout  
- Show authentication info clearly (trust)  
- Price visible before checkout  
- Delivery estimate visible before purchase decision  

---

## 4. Acceptance checks

1. All five required PDP elements render.  
2. Add to cart uses Catalog listing identity into Order cart.  
3. Authentication info is visible (supports authentication certificates trust signal).  

---

## Source

`requirment.md` §2.1 Product detail page; §2.2 trust signals; §3.1 listing photos/price/description; §4.1 Catalog  
