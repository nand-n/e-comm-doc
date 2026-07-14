# Transparent Commission Display — How To

**Requirement (from `docs/requirment.md`):**  
Transparent commission display — show exactly what a seller will earn before they confirm a listing price.

**Related rules from the same source:**

| Seller tier | Platform commission |
|-------------|---------------------|
| Emerging | 15% |
| Established | 12% |
| Master | 10% |

Listing creation includes: upload photos, set price, write description, assign category.  
Commission by tier is calculated in the **Payments** responsibility area; tier assignment lives under **Seller management**.

This document explains **how to implement that display**. Commission rates come from the requirements. Shared rules (rounding, same math as payouts) are in [`implementation/conventions.md`](./implementation/conventions.md).

---

## 1. Goal

Before the seller confirms a listing price, the UI must show **exactly** how much the seller will earn after the platform takes the commission for **their current tier**.

The seller should not have to guess or calculate the cut themselves.

---

## 2. What to calculate

### Inputs

| Input | Source |
|-------|--------|
| Listing price (P) | Value the seller enters on listing creation |
| Seller tier | Current tier on the seller account (Emerging / Established / Master) |
| Commission rate (C) | 15% / 12% / 10% for that tier |

### Formula

```
Seller earnings = P × (1 − C)
Platform commission amount = P × C
```

### Examples

| Listing price | Tier | Rate | Seller earns | Platform takes |
|---------------|------|------|--------------|----------------|
| 1,000 | Emerging | 15% | 850 | 150 |
| 1,000 | Established | 12% | 880 | 120 |
| 1,000 | Master | 10% | 900 | 100 |

Show **money amounts**, not only the percentage, so “exactly what an seller will earn” is visible.

---

## 3. Where it appears

On **listing creation**, after the seller enters (or changes) the price, and **before** they confirm that price / submit the listing.

Suggested placement (same screen as price):

1. Price input  
2. Commission line (tier + rate)  
3. **You will earn: …** (primary number)  
4. Confirm / submit listing action  

Do not hide earnings only on a later “success” screen. The requirement is **before they confirm**.

---

## 4. UX rules (aligned with seller design priorities)

From the seller side priorities in the source: radical simplicity, and transparent commission display.

1. **One clear earnings number** — largest text under the price (“You will earn”).
2. **Show the cut in plain language** — e.g. “Platform fee (Emerging, 15%): …”
3. **Update live** — recalculate as the seller types or changes the price.
4. **No surprise after confirm** — the number they see before confirm is the number tied to that listing price and their current tier.
5. **Minimal copy** — short labels; avoid long explanation blocks.

Bot fallback (Telegram/WhatsApp) is in the source for listing. If a seller sets price via bot, show the same earnings in the bot reply **before** asking them to confirm the listing price.

---

## 5. Step-by-step implementation

### Step 1 — Resolve the seller’s tier

When opening listing creation (or when handling a bot “set price” flow):

- Load the seller’s current tier from seller management data.
- Map tier → rate:

```
Emerging     → 0.15
Established  → 0.12
Master       → 0.10
```

### Step 2 — Bind the price field

- Price is required for this calculation.
- If price is empty or invalid, do not show a fake earnings amount; show a short empty state (e.g. “Enter a price to see your earnings”) or hide the earnings row until price is valid.

### Step 3 — Compute on every price change

```
rate = rateFor(tier)
commissionAmount = price * rate
sellerEarns = price - commissionAmount
```

Use the same rounding rule everywhere (front end display and back end). Example: round money to **2 decimal places** (or whole currency units if that matches how prices are shown on the platform). Pick one rule and apply it in both places so the UI number matches what will be used for payouts.

### Step 4 — Render before confirm

Display at least:

- Listing price  
- Tier name + commission %  
- Commission amount  
- **Seller earnings** (emphasized)

Only then enable or accept **confirm listing price** / submit.

### Step 5 — Persist what they confirmed (recommended consistency)

When the listing is saved, store with the listing (or price event):

- Confirmed listing price  
- Tier used at confirmation  
- Commission rate used  
- Seller earnings shown  

So later payouts and seller history can match what was shown at confirm time. Tier commission rates themselves remain as defined in the requirements (15% / 12% / 10%).

### Step 6 — Same logic in Payments / payout path

Payments manages seller payouts and commission calculations by tier. Use the **same** rate table and formula when computing what the seller is owed after a sale, so the transparent display is not a different number from the payout math.

---

## 6. Front-end sketch (web / app)

```
Listing price:  [  1000   ]

Your tier: Emerging (15% platform fee)
Platform fee:     150
You will earn:    850     ← show before confirm

[ Confirm listing ]
```

Recalculate whenever `Listing price` changes.

---

## 7. Bot sketch (Telegram / WhatsApp)

```
Seller: price 1000
Bot:    Price: 1000
        Tier: Emerging — platform fee 15% (150)
        You will earn: 850
        Reply YES to confirm this listing price
Seller: YES
```

No confirm until they see earnings.

---

## 8. Back-end checklist

| Check | Detail |
|-------|--------|
| Rate source | Only the three tier rates from the requirements |
| Tier source | Seller’s current tier from seller management |
| When | Before listing price confirmation |
| Output | Exact seller earnings amount for the entered price |
| Consistency | Same formula for display and for commission on payouts |

---

## 9. Acceptance checks

These only verify the stated requirement:

1. Seller with Emerging tier enters price `P` → sees earnings `P × 0.85` before confirm.  
2. Established → `P × 0.88`; Master → `P × 0.90`.  
3. Changing the price updates earnings before confirm.  
4. Confirm is not done without that earnings information being shown for a valid price.  
5. Bot listing price flow shows the same earnings before confirmation.

---

## Source lines

- Seller design priority: *Transparent commission display — show exactly what an seller will earn before they confirm a listing price* (`requirment.md` §3.2)  
- Rates: *15% Emerging, 12% Established, 10% Master* (`requirment.md` §4.3)  
- Listing creation includes set price (`requirment.md` §3.1)  
- Seller management: onboarding, tiers, commissions (`requirment.md` service table)  
- Payments: buyer charges, seller payouts; commission calculations by tier (`requirment.md` §4.3)
