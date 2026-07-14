# Buyer Homepage Feed — How To Implement

**Requirement (from `docs/requirment.md` §2.1):**  
Homepage feed — featured works, new arrivals, seller spotlights, category shortcuts

**Backed by:** Catalog Service (listings, categories, search); Admin curation of listings (Admin Panel).

---

## 1. Goal

Buyer homepage shows four feed sections so customers can discover handmade / seller goods quickly on mobile-first layouts.

---

## 2. Sections to render

| Section | Content (from source) | Data needed |
|---------|----------------------|-------------|
| Featured works | Curated / featured listings | Listings flagged or selected as featured |
| New arrivals | Newest listings | Listings ordered by created time |
| Seller spotlights | Highlighted sellers | Sellers selected for spotlight + tie to profile |
| Category shortcuts | Fast links into categories | Category structure from Catalog |

---

## 3. Implementation steps

### Step 1 — Catalog reads

- List products/listings for **featured** and **new arrivals**.  
- List categories for **category shortcuts**.  
- List spotlight sellers for **seller spotlights** (seller identity + link to seller profile page).

### Step 2 — Admin curation hook

Admin Panel is used to review and curate listings. Featured works / spotlights should be set via that curation path (or Phase 1 manual listing on a simple website — see bootstrapped-launch).

### Step 3 — UI composition

One scrollable homepage:

1. Category shortcuts (horizontal or grid)  
2. Featured works  
3. New arrivals  
4. Seller spotlights  

Respect buyer design priorities: mobile-first, simple language, Amharic + English, trust signals where seller tier appears.

### Step 4 — Navigation

- Category shortcut → search/filter by that category  
- Listing card → product detail page  
- Seller spotlight → seller profile page  

---

## 4. API shape (minimal)

```
GET /buyer/home
→ {
  featured_works: ListingCard[],
  new_arrivals: ListingCard[],
  seller_spotlights: SellerSpotlight[],
  category_shortcuts: Category[]
}
```

`ListingCard` must support navigation to product detail (photos, price at minimum for a card — full fields on PDP).

---

## 5. Early stage (Phase 1–2)

Catalog early version: simple website with manually added listings. Homepage can be static/manual sections until **50+ active listings** triggers fuller Catalog automation.

---

## 6. Acceptance checks

1. Homepage shows all four: featured works, new arrivals, seller spotlights, category shortcuts.  
2. Each section links into the correct next screen (PDP, seller profile, or filtered catalog).  

---

## Source

`requirment.md` §2.1 Homepage feed; §4.1 Catalog; §4.6 Admin curation; §7 Catalog early-stage  
