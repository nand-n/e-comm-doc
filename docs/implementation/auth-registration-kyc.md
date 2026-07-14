# Registration, Authentication & KYC — How To Implement

Covers how users get into the system:

- Buyer **account area** (orders, wishlist, followed sellers, addresses)  
- Seller **onboarding/application**, dashboard, payouts  
- **Admin** approvals and curation  
- **Payments** to sellers within 72 hours (need a real payout identity)  
- **Telegram/WhatsApp bot** (must link chat identity to a seller account)

Keep it simple. No enterprise IAM product.

See also: [`conventions.md`](./conventions.md), [`seller-onboarding.md`](./seller-onboarding.md), [`payments-service.md`](./payments-service.md).

---

## 1. Who registers

| Role | Needs account? | How they get in |
|------|----------------|-----------------|
| **Buyer** | Yes | Register / login with phone + password |
| **Seller** | Yes | Register → submit application → Admin approves → Emerging tier |
| **Admin** | Yes (internal) | Created by existing admin / ops — not public signup |
| **Rider** | Yes (fleet tool) | Created by Admin/Logistics when riders are onboarded |

One **user** record can later become a seller after application approval (same phone). Do not force two separate login products if one user table + roles is simpler.

---

## 2. Authentication (login)

| Method | Use |
|--------|-----|
| **Phone + password** | Primary for buyers and sellers |
| Session / JWT | After successful login |

### Minimal APIs

```
POST /auth/register  { phone, password, name? }
POST /auth/login     { phone, password }  → session + user
POST /auth/logout
GET  /auth/me
```

### Roles on the user

```
roles: ["buyer"] | ["buyer","seller"] | ["admin"] | ["rider"]
```

- Buyer app: requires `buyer` (default on register).  
- Seller dashboard / bot: requires `seller` **and** application `approved`.  
- Admin panel: requires `admin`.  
- Fleet app: requires `rider`.

---

## 3. Buyer registration

**Needed for:** account area, checkout address book, wishlist, follows, order history.

### Steps

1. Enter phone + password (+ confirm password)  
2. Optional: name, language (Amharic / English)  
3. Account created with role `buyer`  
4. Can browse without login; **must log in** before checkout / wishlist / follow / account  

### Store

| Field | Required |
|-------|----------|
| phone | Yes (unique) |
| password_hash | Yes |
| name | Nice to have |
| preferred_language | en / am |
| addresses | Via account area |

No full KYC for buyers at launch (overkill). Buyer payments go through Telebirr/CBE/COD — identity sits with those rails.

---

## 4. Seller registration + application

**Needed for:** onboarding form in source (basic profile, sample photos, category) + payouts + tier.

### Flow

```
Register (phone + password)
  → role buyer (or seller_pending)
  → Submit application:
        basic profile
        sample work photos
        category selection
        + payout identity (KYC — below)
  → status: pending_review
  → Admin approves
  → role seller, tier Emerging
  → can list, receive orders, get paid
```

Early stage: same flow via form/Telegram; Admin reviews manually.

Unauthorized users must not access seller dashboard or receive payouts.

---

## 5. KYC (sellers — keep minimal)

**Why:** platform pays sellers within 72 hours (Telebirr / bank). You need to know **who** you are paying and reduce fraud.

### What to collect (simple)

| Data | Why |
|------|-----|
| Full legal name | Matches payout account |
| Government ID photo / number (Fayda / national ID as applicable) | Identity check |
| Selfie (optional Phase 1) | Harder spoofing; can wait if ops reviews manually |
| Payout method | Telebirr number and/or bank account |
| Business/region (optional) | Matches profile / delivery region |

### KYC statuses

| Status | Meaning |
|--------|---------|
| `not_started` | No docs yet |
| `pending` | Submitted, waiting Admin/ops |
| `approved` | Can receive payouts |
| `rejected` | Must resubmit |

### Rules that make sense

1. Seller can **submit application** and (optionally) draft listings after register.  
2. **Go live / get paid** only when: application **approved** AND KYC **approved** (or combine both into one Admin approve step in Phase 1).  
3. Phase 1: Admin eyes ID + payout number — no expensive automated KYC vendor required.  
4. Buyers: **no KYC** at launch.

### Phase 1 shortcut (recommended)

One Admin action: “Approve seller” checks:

- Profile + sample photos + categories OK  
- ID + payout destination OK  

→ sets application approved + KYC approved + tier Emerging together.

Automate KYC vendor later only if volume demands it.

---

## 6. Admin authentication

- No public registration.  
- Invite/create admin users with phone (or email) + strong password.  
- All approve/curate/support actions require `admin` role.

---

## 7. Rider authentication

- Admin/Logistics creates rider accounts for the fleet app/tool.  
- Phone + password (or simple PIN).  
- Used to assign and confirm deliveries.

---

## 8. Bot authentication (Telegram / WhatsApp)

Source: sellers can list and update orders via chat.

**Link chat to seller:**

```
Seller in bot: /start
Bot asks phone + password (or deep-link “connect account” while logged in on web)
Store: telegram_user_id ↔ user_id / seller_id
```

Reject commands if seller not approved. Same Catalog/Orders APIs as dashboard.

---

## 9. What each screen requires

| Action | Auth |
|--------|------|
| Browse / search / PDP | Public OK |
| Add to cart | Soft OK; force login at checkout |
| Checkout / pay | Logged-in buyer |
| Account / wishlist / follows | Logged-in buyer |
| Seller apply | Logged-in user |
| Create listing / dashboard / earnings | Approved seller (+ KYC approved for payout view/release) |
| Admin panel | Admin |
| Confirm delivery | Rider |

---

## 10. Shared database fields (minimal)

**users:** id, phone, password_hash, name, language, roles[], created_at  

**seller_profiles:** user_id, bio, tier, application_status, kyc_status, payout_telebirr, payout_bank, id_document_url, …

**sessions:** token / expiry as needed after login  

Stays inside the one unified database (users + sellers already named in source).

---

## 11. Acceptance checks

1. Buyer can register/login with phone + password and use account area + checkout.  
2. Seller registers, submits application (+ KYC/payout info), waits for Admin.  
3. Only approved sellers list and receive dashboard order alerts.  
4. Payouts only to KYC-approved / payout-verified sellers.  
5. Admin and riders are not public signups.  
6. Telegram/WhatsApp bot is linked to an approved seller account.  

---

## 12. Out of scope (don’t build yet)

- Full bank-grade continuous KYC monitoring  
- Social logins (Google/Apple) unless you need them later  
- Buyer national-ID mandatory  
- Complex multi-tenant SSO  

Add those only if law or a payment partner forces it.
