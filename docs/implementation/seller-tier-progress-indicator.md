# Seller Tier Progress Indicator — How To Implement

**Requirement (from `docs/requirment.md` §3.2):**  
Clear tier progress indicator — show seller exactly what's needed to move from Emerging to Established to Master tier

**Seller Management (§4.5):** Tier assignment and progression rules; tracks criteria (**sales volume**, **ratings**, **consistency**) that move a seller between tiers.

**Catalog:** Three-tier seller classification.  
**Payments:** 15% Emerging, 12% Established, 10% Master.

---

## 1. Goal

Seller UI shows:

- Current tier  
- Next tier (Emerging → Established → Master)  
- **Exactly what is needed** to move up, based on tracked criteria: sales volume, ratings, consistency  

---

## 2. Tiers and commission (fixed in source)

| Tier | Commission |
|------|------------|
| Emerging | 15% |
| Established | 12% |
| Master | 10% |

---

## 3. Criteria to track (named in source)

| Criterion | Tracked by |
|-----------|------------|
| Sales volume | Seller Management |
| Ratings | Seller Management |
| Consistency | Seller Management |

**Important:** Track all three criteria. Threshold values are configured with the business (config/admin), then shown to the seller as “exactly what’s needed.”

---

## 4. Implementation steps

### Step 1 — Persist metrics

For each seller, maintain current:

- sales_volume  
- ratings  
- consistency  
- tier  

### Step 2 — Config thresholds

Business sets the numbers; store them in config/admin.

```
thresholds = {
  Emerging_to_Established: { sales_volume, ratings, consistency },
  Established_to_Master: { sales_volume, ratings, consistency }
}
```

### Step 3 — Progress API

```
GET /seller/tier/progress
→ {
  current_tier,
  next_tier,
  criteria: [
    { name: "sales_volume", current, required_for_next },
    { name: "ratings", current, required_for_next },
    { name: "consistency", current, required_for_next }
  ]
}
```

### Step 4 — UI indicator

Visual progress (bars/checklist) — radical simplicity — listing each criterion and what remains to reach next tier. Show commission implication of current vs next tier (rates from source).

### Step 5 — Progression job

When all criteria for next tier met, Seller Management updates tier; Catalog classification and commission rate follow.

---

## 5. Acceptance checks

1. Indicator shows Emerging / Established / Master path.  
2. Shows what’s needed using sales volume, ratings, consistency.  
3. Tier thresholds come from config (not hardcoded mysteries).  
4. Tier change updates commission rate used in payouts and listing earnings display.  

---

## Source

`requirment.md` §3.2 tier progress; §4.1 three-tier; §4.3 commissions; §4.5 progression criteria  
