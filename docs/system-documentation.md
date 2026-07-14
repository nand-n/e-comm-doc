# Platform System Documentation

**Based only on:** [`docs/requirment.md`](./requirment.md)  
**Source title:** Business Supporting Structure — Front-End and Back-End System Design for Buyers and Sellers

This is a detailed documentation of the platform structure: screens, services, flow, and launch order.

---

## Document purpose

The source outlines a clear, workable structure for how the platform should be organized as a technology and operations system. It covers:

- the front end (what buyers and sellers see and use)
- the back end (the services, data, and processes that power the platform)
- how the two sides connect

---

## 1. System Overview

### What the platform must do

The platform must serve two distinct user types — **buyers** and **sellers** — through **two different front-end experiences**, while sharing **one unified back-end system** underneath.

### Consistency

This keeps data consistent: an order placed by a buyer is the same order a seller sees in their dashboard, while letting each side have an interface designed specifically for its purpose.

### Four layers

From what the user sees down to what powers it behind the scenes:

1. **Front end — Buyer side**
2. **Front end — Seller side**
3. **Back end — Core services**
4. **Supporting layers** — notifications, database, and external integrations

---

## 2. Front End — Buyer Side

### Role

The buyer-facing **website and mobile app** are where customers discover, evaluate, and purchase seller and handmade goods.

This side should feel:

- premium
- trustworthy
- easy to navigate even for first-time online shoppers

### 2.1 Core Buyer Screens

#### Homepage feed

- Featured works
- New arrivals
- Seller spotlights
- Category shortcuts

#### Search and filters

By:

- Category
- Seller tier
- Price range
- Medium
- Region

#### Seller profile pages

- Bio
- Tier badge
- Portfolio
- Follower count
- Reviews

#### Product detail page

- Photos
- Price
- Product story
- Authentication info
- Delivery estimate

#### Cart and checkout

- Order summary
- Delivery address
- Payment method selection

#### Order tracking

- Real-time status from confirmed to delivered

#### Account area

- Order history
- Saved/wishlist items
- Followed sellers
- Addresses

### 2.2 Design Priorities

#### Mobile-first

Most Ethiopian users will browse and buy from a phone, not a desktop.

#### Trust signals throughout

- Sellers tier badges
- Authentication certificates
- Verified reviews

#### Local payment options visible early in checkout

To reduce drop-off:

- Telebirr
- CBE Birr
- Cash-on-delivery

#### Simple language

- Avoid heavy e-commerce jargon
- Support Amharic alongside English

---

## 3. Front End — Seller Side

### Role

The seller (sellers) dashboard is a **separate, simplified** interface focused entirely on helping sellers:

- list work
- track sales
- get paid

Without requiring technical skill.

### 3.1 Core Seller Screens

#### Onboarding / application form

- Basic profile
- Sample work photos
- Category selection

#### Listing creation

- Upload photos
- Set price
- Write description
- Assign category

#### Dashboard home

- Live listings
- Recent orders
- Quick stats (views, sales, earnings)

#### Order notifications

- New sale alerts with buyer delivery details

#### Earnings and payout tracker

- Ending, processing, and paid amounts
- 72-hour payout status

#### Seller profile / portfolio page

- Public-facing page buyers see
- Editable by the seller

### 3.2 Design Priorities

#### Radical simplicity

- Large buttons
- Minimal required text fields
- Visual cues over written instructions

#### Telegram / WhatsApp bot fallback

For seller not comfortable with a full dashboard, allow listing and order updates via simple chat commands.

#### Clear tier progress indicator

Show seller exactly what's needed to move from:

- Emerging
- to Established
- to Master tier

#### Transparent commission display

Show exactly what an seller will earn before they confirm a listing price.

---

## 4. Back End — Core Services

Six core services power both front ends. Each service has a single, clear responsibility, which keeps the system easier to build, maintain, and scale over time.

### 4.1 Catalog Service

Manages:

- All product listings
- The three-tier seller classification
- Category structure

Powers search and filtering on the buyer side.

| | |
|--|--|
| **Responsibility** | Listings, tiers, categories, search |
| **Used by** | Buyers, Sellers |

### 4.2 Order Service

Handles:

- The shopping cart
- The checkout process
- The order lifecycle — from “placed” through “packed,” “shipped,” and “delivered”

This is the **single source of truth** for order status shown to both buyers and sellers.

| | |
|--|--|
| **Responsibility** | Cart, checkout, order status |
| **Used by** | Buyers, Sellers |

### 4.3 Payments Service

Integrates with:

- Telebirr
- CBE Birr
- Bank transfer

for buyer payments.

Also manages the seller payout process, including:

- The 72-hour payout guarantee
- Commission calculations by tier:
  - **15%** Emerging
  - **12%** Established
  - **10%** Master

| | |
|--|--|
| **Responsibility** | Buyer charges, seller payouts |
| **Used by** | Buyers, Sellers |

### 4.4 Logistics Service

Coordinates delivery:

- Assigning riders
- Generating tracking links
- Managing delivery zones
- Maintaining packaging checklists for fragile items like paintings and ceramics

| | |
|--|--|
| **Responsibility** | Delivery, tracking, packaging |
| **Used by** | Buyers, Riders |

### 4.5 Seller Management Service

Handles:

- Seller onboarding applications
- Tier assignment and progression rules
- Tracks the criteria that move an seller between tiers:
  - Sales volume
  - Ratings
  - Consistency

| | |
|--|--|
| **Responsibility** | Onboarding, tiers, commissions |
| **Used by** | Sellers, Admin |

### 4.6 Admin Panel

The internal control center for the team — used to:

- Approve new seller
- Review and curate listings
- Resolve support tickets
- Monitor platform-wide performance

| | |
|--|--|
| **Responsibility** | Curation, approvals, support |
| **Used by** | Internal team |

### Service summary

| Service | Responsibility | Used By |
|---------|----------------|---------|
| Catalog | Listings, tiers, categories, search | Buyers, Sellers |
| Orders | Cart, checkout, order status | Buyers, Sellers |
| Payments | Buyer charges, seller payouts | Buyers, Sellers |
| Logistics | Delivery, tracking, packaging | Buyers, Riders |
| Seller management | Onboarding, tiers, commissions | Sellers, Admin |
| Admin panel | Curation, approvals, support | Internal team |

---

## 5. Supporting Layers

### 5.1 Notifications Layer

Sends across multiple channels:

- Order updates
- Payout confirmations
- New-listing alerts

In the Ethiopian context, this layer should treat **SMS** and a **Telegram bot** as equally important as app push notifications, since not all users will have the app installed early on.

| Channel | Detail |
|---------|--------|
| SMS | Order confirmations, delivery updates |
| Telegram bot | Order alerts, simple listing management for seller |
| Push notifications | For app users (Phase 3 onward) |
| Email | Receipts, monthly seller earnings summaries |

### 5.2 Shared Database Layer

One unified database holds:

- Users
- Seller
- Products
- Orders
- Payments

This ensures the buyer and seller experiences never go out of sync — for example, the moment a buyer's payment is confirmed, the seller's dashboard immediately reflects the new order.

### 5.3 External Integrations

Two key systems sit outside the core platform but connect directly into it:

#### Payment gateways

- Telebirr, CBE Birr, and bank transfer APIs
- Connected through the Payments Service

#### Delivery fleet app

- A simple rider-facing mobile app or tool
- Connected through the Logistics Service
- Used to assign and confirm deliveries

---

## 6. How a Transaction Flows Through the System

To make the structure concrete, here is what happens end-to-end when a buyer purchases an item:

1. Buyer browses the catalog and adds an item to their cart (**Catalog Service**).
2. Buyer checks out and pays via Telebirr or another method (**Order Service**, **Payments Service**).
3. The seller receives an instant order notification on their dashboard or via the Telegram bot (**Seller Management**, **Notifications Layer**).
4. The seller packages the item; the **Logistics Service** assigns a delivery rider and generates a tracking link.
5. The buyer receives SMS/app updates as the order moves through packed, shipped, and delivered stages.
6. Once delivery is confirmed, the **Payments Service** queues the seller's payout, released within 72 hours, minus the tier-based commission.
7. The **Admin Panel** logs the completed transaction for platform-wide reporting and quality monitoring.

---

## 7. Practical Build Order (Bootstrapped Launch)

Given a limited initial budget, not all of this needs to be built as full automated software on day one.

The recommended approach is to launch with lightweight, manual versions of each service and automate progressively as order volume grows.

| Service | Early-Stage Version (Phase 1-2) | Automate When |
|---------|---------------------------------|---------------|
| Catalog | Simple website with manually added listings | 50+ active listings |
| Orders | Orders via website form + spreadsheet tracking | 20+ orders/week |
| Payments | Telebirr manual confirmation (non-negotiable from day one) | Always live from launch |
| Logistics | Founder + 1 rider, manual WhatsApp updates | 3+ riders needed |
| Seller management | Manual application review via form/Telegram | 50+ active seller |
| Notifications | WhatsApp/Telegram manual updates | Order volume exceeds manual capacity |

This approach keeps Phase 1-2 costs low while ensuring the core promise to both sides — buyers get a trustworthy way to pay, and seller get reliable delivery and payout — is solid from day one, even before the full technical system is built.
