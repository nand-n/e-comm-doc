# Seller Management Service — How To Implement

**Requirement (from `docs/requirment.md` §4.5):**  
Handles seller onboarding applications, tier assignment and progression rules, and tracks the criteria (sales volume, ratings, consistency) that move an seller between tiers.

| Responsibility | Used by |
|----------------|---------|
| Onboarding, tiers, commissions | Sellers, Admin |

**Early stage:** Manual application review via form/Telegram until **50+ active seller**.

**Flow:** Seller notification path names Seller Management with Notifications.

---

## 1. Responsibilities

1. Seller onboarding applications  
2. Tier assignment and progression rules  
3. Track criteria: sales volume, ratings, consistency  
4. Commissions (tier → rate used with Payments)  

---

## 2. Tiers

Emerging → Established → Master  
Rates: 15% / 12% / 10% (Payments; mirrored here for assignment).

---

## 3. Operations to implement

```
# Onboarding
submit application (profile, sample photos, categories)
admin approve/reject → activate seller

# Tier
get/set tier
track sales_volume, ratings, consistency
evaluate progression rules against configured thresholds
```

Threshold **values** are configured (see seller-tier-progress-indicator). Always track the three named criteria.

---

## 4. Integration

| Consumer | Needs |
|----------|--------|
| Seller onboarding UI / Telegram | Applications |
| Admin Panel | Approve sellers |
| Catalog | Tier classification for search/badges |
| Payments / commission display | Current tier → rate |
| Tier progress UI | Criteria + what’s needed |
| Notifications / flow | Instant order notification path |

---

## 5. Early stage

Manual form/Telegram review until 50+ active sellers.

---

## 6. Acceptance checks

1. Applications accepted and approvable.  
2. Tier assigned and progressive via sales volume, ratings, consistency.  
3. Commission tier available to Payments and listing earnings UI.  
4. Used by sellers and admin.  

---

## Source

`requirment.md` §4.5; service table; §3.1 onboarding; §3.2 tiers; §7 seller management  
