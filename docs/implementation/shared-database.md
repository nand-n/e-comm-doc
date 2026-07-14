# Shared Database Layer — How To Implement

**Requirement (from `docs/requirment.md` §5.2):**  
One unified database holds users, seller, products, orders, and payments. This ensures the buyer and seller experiences never go out of sync — for example, the moment a buyer's payment is confirmed, the seller's dashboard immediately reflects the new order.

---

## 1. Goal

Single shared database (one system of record) for:

- Users  
- Sellers  
- Products  
- Orders  
- Payments  

Buyer and seller UIs never diverge on these records.

---

## 2. Entity groups (only those named)

| Store | Used for |
|-------|----------|
| Users | Buyer accounts (account area, addresses, wishlist, follows) |
| Sellers | Seller profiles, tiers, applications |
| Products | Listings / catalog products |
| Orders | Cart checkout results, status lifecycle |
| Payments | Charges and payouts |

Related operational data required by named features (categories, delivery zones, notifications logs, support tickets, tracking links) must still resolve against this unified consistency model — not a second divergent “seller database.” The source explicitly requires one unified database for the five groups above.

---

## 3. Consistency rule (example from source)

```
payment confirmed
  → same order row visible on seller dashboard immediately
```

Implement with shared order rows (Order Service) and shared payment confirmation writes — not async copies to a separate seller DB.

---

## 4. Implementation steps

1. Choose one primary database for production data.  
2. All six services read/write through this shared store (or bounded schemas in one DB).  
3. Buyer app and seller dashboard query the same orders/products/payments tables.  
4. Verify with test: pay as buyer → seller dashboard shows order without a second write model.  

---

## 5. Acceptance checks

1. Users, sellers, products, orders, payments live in one unified database.  
2. Payment confirmation immediately reflects as new order on seller dashboard.  
3. No separate buyer-only vs seller-only order databases.  

---

## Source

`requirment.md` §5.2 Shared Database Layer  
