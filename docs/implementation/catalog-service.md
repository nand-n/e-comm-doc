# Catalog Service — How To Implement

**Requirement (from `docs/requirment.md` §4.1):**  
Manages all product listings, the three-tier seller classification, and category structure. Powers search and filtering on the buyer side.

| Responsibility | Used by |
|----------------|---------|
| Listings, tiers, categories, search | Buyers, Sellers |

**Early stage:** Simple website with manually added listings → automate at **50+ active listings**.

---

## 1. Responsibilities (only these)

1. Product listings  
2. Three-tier seller classification (Emerging / Established / Master) for catalog/search  
3. Category structure  
4. Buyer search and filtering  

---

## 2. Data the service must hold

| Entity | Fields implied by source screens |
|--------|----------------------------------|
| Category | Category tree/list used in shortcuts, filters, listing assign, onboarding |
| Listing | Photos, price, description, category; medium & region for filters; link to seller; live/not |
| Seller tier (classification) | Tier used in search filter and badges (authoritative assignment in Seller Management; Catalog exposes for search) |

---

## 3. Operations to implement

```
# Listings
POST/PUT/GET seller listings
GET buyer listing/:id
GET buyer home feeds (featured, new arrivals)  // featured via Admin curation flags

# Categories
CRUD/list categories

# Search
GET search?q&category&seller_tier&price_min&price_max&medium&region
```

---

## 4. Integration points

| Direction | Purpose |
|-----------|---------|
| ← Sellers | Listing creation (and bot listing) |
| → Buyers | Homepage, search, PDP, portfolio |
| ← Seller Management | Tier changes reflected in classification/filter |
| ← Admin | Review and curate listings |

---

## 5. Early stage path

Manual add on simple website until 50+ active listings, then automate this service’s APIs/UI fully.

---

## 6. Acceptance checks

1. All listings live in Catalog.  
2. Categories managed here.  
3. Buyer search/filter works for category, seller tier, price range, medium, region.  
4. Buyers and sellers both use this service for listings.  

---

## Source

`requirment.md` §4.1; service table; §2.1 search/homepage/PDP; §3.1 listing; §7 Catalog  
