# Seller Onboarding / Application — How To Implement

**Requirement (from `docs/requirment.md` §3.1):**  
Onboarding/application form — basic profile, sample work photos, category selection.

**Backed by:** Seller Management; Admin approves new sellers.  
**Early stage:** Form/Telegram review until 50+ active sellers.

**Needed for coherence:** On approve, assign tier **Emerging** (15%) by default so commission display, search filters, and badges work immediately.

---

## 1. Goal

New sellers apply with:

- Basic profile  
- Sample work photos  
- Category selection  

Admin (or early-stage manual/Telegram review) approves before they operate as full sellers.

---

## 2. Form fields (from source only)

| Field | Required for application |
|-------|---------------------------|
| Basic profile | Yes |
| Sample work photos | Yes |
| Category selection | Yes |

---

## 3. Implementation steps

### Step 1 — Application submit

```
POST /seller/applications
{
  basic_profile,
  sample_work_photos[],
  category_ids[]
}
→ application_id, status: pending
```

### Step 2 — Seller Management stores application

Status flow implementable from source actions:

- submitted (pending review)  
- approved (Admin: approve new seller)  
- rejected (Admin declines the application)

Keep the form to profile, sample photos, and categories.

### Step 3 — Admin review

Admin Panel: approve new seller. On approve:

- Activate seller account  
- Assign tier **Emerging** by default  
- Progression later via sales volume, ratings, consistency  

### Step 4 — Early stage

Form and/or Telegram intake; human reviews until 50+ active sellers.

---

## 4. Acceptance checks

1. Application requires basic profile, sample photos, category selection.  
2. Applications land in Seller Management for review.  
3. Admin can approve new sellers; approved sellers start as Emerging.  
4. Phase 1 path via form/Telegram works.  

---

## Source

`requirment.md` §3.1 Onboarding; §4.5 Seller Management; §4.6 Admin; §7 seller management early-stage  
