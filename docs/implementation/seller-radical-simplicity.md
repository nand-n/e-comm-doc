# Seller Radical Simplicity — How To Implement

**Requirement (from `docs/requirment.md` §3.2):**  
Radical simplicity — large buttons, minimal required text fields, visual cues over written instructions

**Context (§3):** Separate simplified interface; no technical skill required.

---

## 1. Goal

Every seller screen (onboarding, listing, dashboard, orders, earnings, profile) follows:

- Large buttons  
- Minimal required text fields  
- Visual cues over written instructions  

---

## 2. Implementation rules

| Rule | Apply |
|------|--------|
| Large buttons | Primary actions (save listing, confirm price, open order) are large tap targets |
| Minimal required fields | Only require what the source names for that form (e.g. listing: photos, price, description, category) |
| Visual cues | Icons/steps/progress instead of long instructional paragraphs |
| No technical skill | No API keys, no developer jargon in seller UI |

---

## 3. Checklist per seller screen

| Screen | Required fields only (from source) |
|--------|-------------------------------------|
| Onboarding | Basic profile, sample work photos, category selection |
| Listing creation | Photos, price, description, category, medium, region (+ earnings preview; optional authentication info) |
| Dashboard | Display-only widgets; few actions |
| Order notifications | Alerts with delivery details; clear next action |
| Earnings tracker | Display ending/processing/paid + 72h status |
| Profile edit | Editable public profile/portfolio fields |

---

## 4. Acceptance checks

1. Primary actions use large controls.  
2. Forms do not require fields beyond those named for that flow.  
3. Instructions rely on visual cues more than long text.  

---

## Source

`requirment.md` §3 intro; §3.2 Radical simplicity  
