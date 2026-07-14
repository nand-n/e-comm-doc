# Payments Service — How To Implement

**Requirement (from `docs/requirment.md` §4.3):**  
Integrates with Telebirr, CBE Birr, and bank transfer for buyer payments, and manages the seller payout process — including the 72-hour payout guarantee and commission calculations by tier (15% Emerging, 12% Established, 10% Master).

| Responsibility | Used by |
|----------------|---------|
| Buyer charges, seller payouts | Buyers, Sellers |

**External:** Payment gateways — Telebirr, CBE Birr, and bank transfer APIs, connected through the Payments Service.

**Early stage:** Telebirr manual confirmation (**non-negotiable from day one**); always live from launch.

**Checkout UI also names:** cash-on-delivery (buyer design priorities).

---

## 1. Responsibilities

1. Buyer payment collection via Telebirr, CBE Birr, bank transfer  
2. Seller payouts within 72 hours after delivery confirmation  
3. Commission by tier  

---

## 2. Commission table (fixed)

| Tier | Rate |
|------|------|
| Emerging | 15% |
| Established | 12% |
| Master | 10% |

```
seller_net = gross × (1 − rate)
platform_fee = gross × rate
```

Same formula as transparent commission display.

---

## 3. Buyer charges

| Method | In Payments Service integrations | Visible early in checkout |
|--------|----------------------------------|---------------------------|
| Telebirr | Yes | Yes |
| CBE Birr | Yes | Yes |
| Bank transfer | Yes | (gateway named on Payments) |
| Cash-on-delivery | Named on checkout UI | Yes |

Implement gateway flows for Telebirr, CBE Birr, bank transfer via external APIs. COD: no gateway charge at checkout; order still created via Orders.

### Early stage Telebirr

Manual confirmation allowed, but Telebirr path must exist from day one.

```
# Target automated shape
POST /payments/charges { order_id, method }
webhook/confirm → mark paid → Orders + seller notify
```

---

## 4. Seller payouts

1. Trigger: delivery confirmed  
2. Queue payout net of commission  
3. Release within **72 hours**  
4. Notify payout confirmation  
5. Seller tracker buckets: ending / processing / paid + 72-hour status  

```
POST /payments/payouts/queue { order_id }  // after delivered
process releases before due_at = queued_at + 72h
```

---

## 5. Acceptance checks

1. Telebirr, CBE Birr, bank transfer integrated through this service.  
2. Telebirr usable from launch (manual confirm OK in Phase 1–2).  
3. Payout queued after delivery, released within 72 hours, minus tier commission.  
4. Rates 15/12/10 by tier.  

---

## Source

`requirment.md` §4.3; §2.2 COD/Telebirr/CBE; §5.3 gateways; §6 step 6; §7 Payments  
