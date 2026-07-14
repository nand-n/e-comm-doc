# Implementation conventions

Shared technical decisions so screens, services, payments, and auth work as one system. Keep them simple.

---

## 1. Order status (single model)

Source uses both **confirmed → delivered** (buyer tracking) and **placed → packed → shipped → delivered** (Order Service).

**Use one status enum:**

| Status | Meaning |
|--------|---------|
| `placed` | Order created after checkout. Buyer-facing label may show **Confirmed**. |
| `packed` | Seller finished packaging. |
| `shipped` | With rider / in transit. |
| `delivered` | Delivery confirmed. Triggers payout queue. |

Order Service is the only writer of status. Buyer UI, seller UI, SMS, and bots all read this enum.

---

## 2. Earnings buckets

Source says “ending, processing, and paid.” Treat **ending** as **pending** (amounts not yet in processing/paid).

| Bucket | Meaning |
|--------|---------|
| `pending` | Sold / owed but not yet queued for payout (e.g. not delivered yet) |
| `processing` | Delivery confirmed; payout queued; inside 72-hour window |
| `paid` | Money released to seller |

---

## 3. Listing fields needed for search filters

Buyer filters include **medium** and **region**. Listing creation in the source names photos, price, description, category.

**Add to listing create/edit (required for filters to work):**

- `medium`
- `region`

Keep the form minimal: two short fields/selects — no extra wizard steps.

---

## 4. Payment methods (one checkout list)

Merge what the source names in checkout and in Payments Service into one buyer-facing list:

- Telebirr  
- CBE Birr  
- Bank transfer  
- Cash on delivery (COD)  

| Method | Charge at checkout | Payout still after `delivered` |
|--------|--------------------|--------------------------------|
| Telebirr / CBE Birr / bank transfer | Yes (Payments Service) | Yes |
| COD | No pre-charge | Yes |

---

## 5. Commission and payout math

```
net = gross × (1 − rate)
Emerging 15% | Established 12% | Master 10%
```

Same formula for: listing “you will earn” preview, and payout after delivery.

Payout queue starts when status becomes `delivered`. Release within 72 hours of that queue time.

---

## 6. Tier progression thresholds

Source criteria: **sales volume**, **ratings**, **consistency**. No numbers given.

**Store thresholds in config** (Admin or env). Until business sets real numbers, use clear placeholders — replace before go-live:

```
Emerging → Established:  sales_volume, ratings, consistency
Established → Master:    sales_volume, ratings, consistency
```

Seller tier UI must show current vs required for those three. Keep threshold numbers in config — set them with the business before go-live.

---

## 7. Verified reviews

Source requires verified reviews as trust signals.

**Minimal rule that makes sense:** a buyer may leave a review only for an order in `delivered`. Those reviews count as verified.

---

## 8. Authentication info

PDP shows authentication info; trust signals mention authentication certificates.

**Minimal:** listing has optional `authentication_info` (text and/or certificate image URLs). Seller or admin can set it when curating/listing. No separate certificate microservice unless you need one later.

---

## 9. Followers and wishlist

- **Follow seller** → increments follower count on seller profile.  
- **Wishlist** → saved listing ids on the buyer user.  
- **Addresses** → reused at checkout.

---

## 10. Views, sales, earnings (dashboard stats)

| Stat | Simple definition |
|------|-------------------|
| Views | PDP view count for seller’s listings |
| Sales | Count of orders (non-cancelled) for seller |
| Earnings | Sum of net amounts (pending + processing + paid, or paid-only — pick one and use it consistently; recommend: show paid + processing as “earnings”, pending separate) |

Recommended display: mirror the payout tracker totals.

---

## 11. Featured / spotlights / new arrivals

| Homepage block | Simple rule |
|----------------|-------------|
| Featured works | Listings with `featured = true` (Admin curation) |
| New arrivals | Newest live listings |
| Seller spotlights | Sellers with `spotlight = true` (Admin) |
| Category shortcuts | Categories from Catalog |

---

## 12. Packaging checklists

Logistics maintains checklists for fragile items (**paintings**, **ceramics**).  
**Simple:** if listing medium/category is painting or ceramics, show that checklist to the seller at pack time.

---

## 13. Notifications — who gets what

| Event | SMS | Telegram | Email | Push |
|-------|-----|----------|-------|------|
| Order placed/confirmed (buyer) | Yes | | Receipt | Phase 3+ |
| packed / shipped / delivered (buyer) | Yes | | | Phase 3+ |
| New sale (seller) | | Yes (+ dashboard) | | Phase 3+ |
| Payout released (seller) | | optional | Yes ok | Phase 3+ |
| New listing alert | as configured | listing mgmt on Telegram | | |
| Monthly earnings (seller) | | | Yes | |

Phase 1 may send WhatsApp/Telegram manually.

---

## 14. Shared database

One database. Same `orders` row for buyer and seller. No duplicate order stores.

---

## 15. Registration, authentication, KYC

**Full how-to:** [`auth-registration-kyc.md`](./auth-registration-kyc.md)

Minimum:

| Role | Auth | KYC |
|------|------|-----|
| Buyer | Phone + password; login before checkout/account | No at launch |
| Seller | Phone + password → application → Admin approve → Emerging | Yes (ID + payout destination); Phase 1 = manual Admin check |
| Admin | Invited only | N/A |
| Rider | Created by ops | Light identity as needed |

Payouts within 72 hours only to sellers with approved KYC / verified payout method.

---

## 16. Keep it simple

- Prefer one modular backend (or simple services) over many microservices until scale requires it.  
- Phase 1 manual paths from bootstrapped-launch stay valid.  
- Large seller buttons, few fields, bots allowed.  
