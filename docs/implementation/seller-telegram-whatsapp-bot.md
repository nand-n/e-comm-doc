# Seller Telegram / WhatsApp Bot Fallback — How To Implement

**Requirement (from `docs/requirment.md` §3.2):**  
Telegram/WhatsApp bot fallback — for seller not comfortable with a full dashboard, allow listing and order updates via simple chat commands

**Also (§5.1):** Telegram bot — order alerts, simple listing management for seller. SMS/Telegram as important as push. Early stage: WhatsApp/Telegram manual updates.

**Transaction flow:** Order notification via dashboard or Telegram bot.

---

## 1. Goal

Sellers can:

1. **List** (listing management) via simple chat commands  
2. **Update orders** via simple chat commands  
3. Receive **order alerts** on Telegram  

Without using the full dashboard.

---

## 2. Capabilities (from source only)

| Capability | Channels named |
|------------|----------------|
| Listing via chat commands | Telegram / WhatsApp bot fallback |
| Order updates via chat commands | Telegram / WhatsApp bot fallback |
| Order alerts | Telegram bot |
| Simple listing management | Telegram bot (Notifications) |
| Early manual updates | WhatsApp / Telegram |

---

## 3. Implementation steps

### Step 1 — Bot commands (listing)

Collect via chat, same listing inputs:

- Photos  
- Price  
- Description  
- Category  

Before confirm price: show earnings (transparent commission). Then confirm.

### Step 2 — Bot commands (order updates)

Allow seller to report fulfillment progress that feeds Order Service lifecycle (placed → packed → shipped → delivered) via simple commands (e.g. mark packed). Exact command words are implementation detail; behavior must be “order updates”.

### Step 3 — Order alerts

On new sale, send Telegram alert with buyer delivery details (same as dashboard notifications).

### Step 4 — Phase 1

Manual WhatsApp/Telegram ops allowed until notifications automation threshold (order volume exceeds manual capacity). Bot automation replaces manual as you grow.

### Step 5 — Shared backend

Bots call the same Catalog, Orders, Seller Management, Payments logic as the dashboard — one back end.

---

## 4. Acceptance checks

1. Seller can create/manage listing via Telegram/WhatsApp commands.  
2. Seller can update orders via chat commands.  
3. Seller receives order alerts on Telegram.  
4. Commission earnings shown before listing price confirm in bot.  
5. Same data visible on dashboard for the same seller.  

---

## Source

`requirment.md` §3.2 bot fallback; §5.1 Telegram bot; §6 step 3; §7 Notifications early-stage  
