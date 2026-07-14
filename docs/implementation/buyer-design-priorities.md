# Buyer Design Priorities — How To Implement

**Requirement (from `docs/requirment.md` §2.2):**

- Mobile-first — most Ethiopian users will browse and buy from a phone, not a desktop  
- Trust signals throughout — sellers tier badges, authentication certificates, verified reviews  
- Local payment options visible early in checkout (Telebirr, CBE Birr, cash-on-delivery) to reduce drop-off  
- Simple language — avoid heavy e-commerce jargon; support Amharic alongside English  

Buyer surfaces: website and mobile app; premium, trustworthy, easy for first-time online shoppers (§2).

---

## 1. Goal

Every buyer screen implements these four priorities. They are requirements, not optional polish.

---

## 2. Mobile-first

| Implement | Detail |
|-----------|--------|
| Layout | Design phone viewport first; desktop as enhancement |
| Flows | Thumb-friendly checkout, search, tracking |
| Performance | Assume mobile network; keep critical buy path light |

Apply across homepage, search, profiles, PDP, cart/checkout, tracking, account.

---

## 3. Trust signals throughout

Show on relevant buyer UI (not only one page):

| Signal | Where it appears (from source) |
|--------|--------------------------------|
| Sellers tier badges | Seller profiles; trust throughout; filters by seller tier |
| Authentication certificates / authentication info | PDP authentication info; certificates as trust signal |
| Verified reviews | Seller profiles (reviews); trust throughout |

---

## 4. Local payments early in checkout

On checkout, **before** late steps that cause drop-off, show:

- Telebirr  
- CBE Birr  
- Cash-on-delivery  

See `buyer-cart-and-checkout.md` and `payments-service.md`.

---

## 5. Simple language + Amharic and English

| Implement | Detail |
|-----------|--------|
| Copy | Short, non-jargon labels on all buyer screens |
| i18n | Support **Amharic** and **English** for buyer UI strings |
| Toggle | Buyer can use either language |

---

## 6. Acceptance checks

1. Primary buyer journeys usable on a phone-sized viewport.  
2. Tier badges, authentication info/certificates, and verified reviews appear in the buyer experience.  
3. Telebirr, CBE Birr, COD visible early in checkout.  
4. Buyer UI available in Amharic and English with simple wording.  

---

## Source

`requirment.md` §2 intro + §2.2 Design Priorities  
