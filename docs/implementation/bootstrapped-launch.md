# Bootstrapped Launch (Build Order) — How To Implement

**Requirement (from `docs/requirment.md` §7):**  
Given a limited initial budget, not all of this needs to be built as full automated software on day one. Launch with lightweight, manual versions of each service and automate progressively as order volume grows.

Core promise from day one: buyers get a trustworthy way to pay; sellers get reliable delivery and payout — even before the full technical system is built.

---

## 1. Goal

Ship Phase 1–2 with manual/lightweight versions, automate when the triggers below are hit. Keep Telebirr live from day one.

---

## 2. Phase 1–2 vs automate triggers (exact table)

| Service | Early-stage version (Phase 1–2) | Automate when |
|---------|----------------------------------|---------------|
| Catalog | Simple website with manually added listings | 50+ active listings |
| Orders | Orders via website form + spreadsheet tracking | 20+ orders/week |
| Payments | Telebirr manual confirmation (non-negotiable from day one) | Always live from launch |
| Logistics | Founder + 1 rider, manual WhatsApp updates | 3+ riders needed |
| Seller management | Manual application review via form/Telegram | 50+ active seller |
| Notifications | WhatsApp/Telegram manual updates | Order volume exceeds manual capacity |

---

## 3. Implementation plan

### Still required while manual

- Telebirr payment path with confirmation (manual OK)  
- Delivery happens (founder + 1 rider)  
- Seller payout within the 72-hour promise once delivery confirmed  
- Order identity shared between buyer and seller (even if spreadsheet-backed at first)  

### Automation order (when triggers fire)

1. Payments already live → deepen automation of Telebirr/CBE/bank transfer  
2. Orders when 20+/week → Order Service replaces spreadsheet  
3. Catalog when 50+ listings → full Catalog Service  
4. Seller management when 50+ active sellers → automate onboarding/tiers  
5. Logistics when 3+ riders → fleet app + assignment  
6. Notifications when manual capacity exceeded → automated SMS/Telegram/email/push (push Phase 3+)  

---

## 4. Metrics to watch

| Metric | Threshold |
|--------|-----------|
| Active listings | 50 |
| Orders per week | 20 |
| Active sellers | 50 |
| Riders needed | 3 |
| Notification volume | Exceeds manual capacity |

---

## 5. Acceptance checks

1. Phase 1 launch includes Telebirr confirmation.  
2. Each service has a documented manual mode matching the table.  
3. Automation starts when the stated trigger is reached — not invented alternate triggers.  
4. Day-one promise holds: trustworthy pay + reliable delivery and payout.  

---

## Source

`requirment.md` §7 Practical Build Order (Bootstrapped Launch)  
