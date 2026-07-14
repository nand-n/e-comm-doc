# Buyer Account Area — How To Implement

**Requirement (from `docs/requirment.md` §2.1):**  
Account area — order history, saved/wishlist items, followed sellers, addresses

---

## 1. Goal

Logged-in buyer account exposes exactly four areas:

1. Order history  
2. Saved / wishlist items  
3. Followed sellers  
4. Addresses  

---

## 2. Data and behavior

| Section | Behavior | Touches |
|---------|----------|---------|
| Order history | List past/current orders; open tracking | Order Service |
| Saved / wishlist items | Save listings; open PDP | Catalog listing ids |
| Followed sellers | Follow/unfollow; open seller profiles; drives follower count | Seller profiles |
| Addresses | Store delivery addresses for checkout | Used at checkout delivery address |

---

## 3. Implementation steps

### Step 1 — APIs

```
GET    /buyer/account/orders
GET    /buyer/account/wishlist
POST   /buyer/account/wishlist { listing_id }
DELETE /buyer/account/wishlist/:listing_id
GET    /buyer/account/following
POST   /buyer/account/following { seller_id }
DELETE /buyer/account/following/:seller_id
GET    /buyer/account/addresses
POST   /buyer/account/addresses
PUT    /buyer/account/addresses/:id
DELETE /buyer/account/addresses/:id
```

### Step 2 — Consistency

- Order history uses the same orders as tracking/checkout.  
- Followed sellers update follower count on seller profile pages.  
- Addresses available at cart/checkout delivery address step.  

### Step 3 — UI

Four sections or tabs under Account. Mobile-first; Amharic + English.

---

## 4. Acceptance checks

1. All four sections exist and work.  
2. Wishlist items are real Catalog listings.  
3. Followed sellers appear on follow lists and affect follower count.  
4. Saved addresses can be selected at checkout.  

---

## Source

`requirment.md` §2.1 Account area; seller profile follower count; cart delivery address  
