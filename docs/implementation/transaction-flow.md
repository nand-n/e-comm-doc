# End-to-End Transaction Flow — How To Implement

**Requirement (from `docs/requirment.md` §6):**  
Concrete flow when a buyer purchases an item — seven steps as written below.

---

## 1. Goal

Implement the purchase path so each step calls the named services in order. Do not skip services named in a step.

---

## 2. Steps (exact sequence)

| Step | Action | Systems |
|------|--------|---------|
| 1 | Buyer browses catalog and adds item to cart | Catalog Service |
| 2 | Buyer checks out and pays via Telebirr or another method | Order Service, Payments Service |
| 3 | Seller gets instant order notification on dashboard or Telegram bot | Seller Management, Notifications Layer |
| 4 | Seller packages item; delivery rider assigned; tracking link generated | Logistics Service |
| 5 | Buyer gets SMS/app updates through packed, shipped, delivered | Notifications + Order status |
| 6 | On delivery confirmed, payout queued, released within 72 hours, minus tier commission | Payments Service |
| 7 | Completed transaction logged for reporting and quality monitoring | Admin Panel |

---

## 3. Orchestration checklist

```
[ ] Catalog browse + add to cart
[ ] Orders checkout + Payments charge (Telebirr or other)
[ ] Notify seller (dashboard +/or Telegram) with sale + delivery details
[ ] Seller packs
[ ] Logistics assign rider + tracking link
[ ] Status packed → shipped → delivered; SMS/app to buyer
[ ] Payments queue payout ≤72h − commission
[ ] Admin log completed transaction
```

---

## 4. Single order id

Same order id through steps 1–7 for buyer, seller, logistics, payments, admin.

---

## 5. Acceptance checks

1. A test purchase walks all seven steps.  
2. Each named service is invoked at its step.  
3. Payout only after delivery confirmation, within 72 hours, net of tier commission.  

---

## Source

`requirment.md` §6 How a Transaction Flows Through the System  
