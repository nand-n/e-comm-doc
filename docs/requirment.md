BUSINESS SUPPORTING STRUCTURE
Front-End and Back-End System Design for Buyers and Sellers
This document outlines a clear, workable structure for how should be organized as a technology and operations system. It covers both the front end (what buyers and sellers see and use) and the back end (the services, data, and processes that power the platform), and explains how the two sides connect.
1. System Overview
The platform must serve two distinct user types — buyers and sellers through two different front-end experiences, while sharing one unified back-end system underneath. This keeps data consistent (an order placed by a buyer is the same order an seller sees in their dashboard) while letting each side have an interface designed specifically for its purpose.
The structure below is organized in four layers, from what the user sees down to what powers it behind the scenes:
Front end — Buyer side
Front end — Seller side
Back end — Core services
Supporting layers — notifications, database, and external integrations
2. Front End — Buyer Side
The buyer-facing website and mobile app are where customers discover, evaluate, and purchase seller and handmade goods. This side should feel premium, trustworthy, and easy to navigate even for first-time online shoppers.
2.1 Core Buyer Screens
Homepage feed — featured works, new arrivals, seller spotlights, category shortcuts
Search and filters — by category, seller tier, price range, medium, and region
seller profile pages — bio, tier badge, portfolio, follower count, reviews
Product detail page — photos, price, product story, authentication info, delivery estimate
Cart and checkout — order summary, delivery address, payment method selection
Order tracking — real-time status from confirmed to delivered
Account area — order history, saved/wishlist items, followed sellers, addresses
2.2 Design Priorities
Mobile-first — most Ethiopian users will browse and buy from a phone, not a desktop
Trust signals throughout — sellers tier badges, authentication certificates, verified reviews
Local payment options visible early in checkout (Telebirr, CBE Birr, cash-on-delivery) to reduce drop-off
Simple language — avoid heavy e-commerce jargon; support Amharic alongside English
3. Front End — Seller Side
The seller (sellers) dashboard is a separate, simplified interface focused entirely on helping sellers list work, track sales, and get paid — without requiring technical skill.
3.1 Core Seller Screens
Onboarding/application form — basic profile, sample work photos, category selection
Listing creation — upload photos, set price, write description, assign category
Dashboard home — live listings, recent orders, quick stats (views, sales, earnings)
Order notifications — new sale alerts with buyer delivery details
Earnings and payout tracker - ending, processing, and paid amounts; 72-hour payout status
seller profile/portfolio page - public-facing page buyers see, editable by the seller
3.2 Design Priorities
Radical simplicity — large buttons, minimal required text fields, visual cues over written instructions
Telegram/WhatsApp bot fallback — for seller not comfortable with a full dashboard, allow listing and order updates via simple chat commands
Clear tier progress indicator — show seller exactly what's needed to move from Emerging to Established to Master tier
Transparent commission display — show exactly what an seller will earn before they confirm a listing price
4. Back End — Core Services
Six core services power both front ends. Each service has a single, clear responsibility, which keeps the system easier to build, maintain, and scale over time.
4.1 Catalog Service
Manages all product listings, the three-tier seller classification, and category structure. Powers search and filtering on the buyer side.
4.2 Order Service
Handles the shopping cart, checkout process, and order lifecycle - from “placed” through “packed,” “shipped,” and “delivered.” This is the single source of truth for order status shown to both buyers and sellers.
4.3 Payments Service
Integrates with Telebirr, CBE Birr, and bank transfer for buyer payments, and manages the seller payout process — including the 72-hour payout guarantee and commission calculations by tier (15% Emerging, 12% Established, 10% Master).
4.4 Logistics Service
Coordinates delivery — assigning riders, generating tracking links, managing delivery zones, and maintaining packaging checklists for fragile items like paintings and ceramics.
4.5 seller Management Service
Handles seller onboarding applications, tier assignment and progression rules, and tracks the criteria (sales volume, ratings, consistency) that move an seller between tiers.
4.6 Admin Panel
The internal control center for the team — used to approve new seller, review and curate listings, resolve support tickets, and monitor platform-wide performance.
Service
Responsibility
Used By
Catalog
Listings, tiers, categories, search
Buyers, Sellers
Orders
Cart, checkout, order status
Buyers, Sellers
Payments
Buyer charges, seller payouts
Buyers, Sellers
Logistics
Delivery, tracking, packaging
Buyers, Riders
seller management
Onboarding, tiers, commissions
Sellers, Admin
Admin panel
Curation, approvals, support
Internal team

5. Supporting Layers
5.1 Notifications Layer
Sends order updates, payout confirmations, and new-listing alerts across multiple channels. In the Ethiopian context, this layer should treat SMS and a Telegram bot as equally important as app push notifications, since not all users will have the app installed early on.
SMS — order confirmations, delivery updates
Telegram bot — order alerts, simple listing management for seller
Push notifications — for app users (Phase 3 onward)
Email — receipts, monthly seller earnings summaries
5.2 Shared Database Layer
One unified database holds users, seller, products, orders, and payments. This ensures the buyer and seller experiences never go out of sync — for example, the moment a buyer's payment is confirmed, the seller 's dashboard immediately reflects the new order.
5.3 External Integrations
Two key systems sit outside the core platform but connect directly into it:
Payment gateways — Telebirr, CBE Birr, and bank transfer APIs, connected through the Payments Service
Delivery fleet app — a simple rider-facing mobile app or tool, connected through the Logistics Service, used to assign and confirm deliveries
6. How a Transaction Flows Through the System
To make the structure concrete, here is what happens end-to-end when a buyer purchases an item:
Buyer browses the catalog and adds an item to their cart (Catalog Service).
Buyer checks out and pays via Telebirr or another method (Order Service, Payments Service).
The seller receives an instant order notification on their dashboard or via the Telegram bot (seller Management, Notifications Layer).
The seller packages the item; the Logistics Service assigns a delivery rider and generates a tracking link.
The buyer receives SMS/app updates as the order moves through packed, shipped, and delivered stages.
Once delivery is confirmed, the Payments Service queues the seller 's payout, released within 72 hours, minus the tier-based commission.
The Admin Panel logs the completed transaction for platform-wide reporting and quality monitoring.
7. Practical Build Order (Bootstrapped Launch)
Given a limited initial budget, not all of this needs to be built as full automated software on day one. The recommended approach is to launch with lightweight, manual versions of each service and automate progressively as order volume grows.
Service
Early-Stage Version (Phase 1-2)
Automate When
Catalog
Simple website with manually added listings
50+ active listings
Orders
Orders via website form + spreadsheet tracking
20+ orders/week
Payments
Telebirr manual confirmation (non-negotiable from day one)
Always live from launch
Logistics
Founder + 1 rider, manual WhatsApp updates
3+ riders needed
seller management
Manual application review via form/Telegram
50+ active seller
Notifications
WhatsApp/Telegram manual updates
Order volume exceeds manual capacity


This approach keeps Phase 1-2 costs low while ensuring the core promise to both sides — buyers get a trustworthy way to pay, and seller get reliable delivery and payout — is solid from day one, even before the full technical system is built.

