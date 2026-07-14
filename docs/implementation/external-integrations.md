# External Integrations — How To Implement

**Requirement (from `docs/requirment.md` §5.3):**  
Two key systems sit outside the core platform but connect directly into it:

- Payment gateways — Telebirr, CBE Birr, and bank transfer APIs, connected through the Payments Service  
- Delivery fleet app — a simple rider-facing mobile app or tool, connected through the Logistics Service, used to assign and confirm deliveries  

---

## 1. Goal

Integrate exactly two external system types as named — nothing else required by this section.

---

## 2. Payment gateways

| Gateway API | Connected through |
|-------------|-------------------|
| Telebirr | Payments Service |
| CBE Birr | Payments Service |
| Bank transfer | Payments Service |

### Implement

```
Payments Service
  → Telebirr API
  → CBE Birr API
  → Bank transfer API
  ← webhooks / manual confirm (Phase 1 Telebirr manual confirmation allowed)
```

Buyer checkout selects method; Payments owns gateway communication.

---

## 3. Delivery fleet app / tool

| Property | From source |
|----------|-------------|
| What | Simple rider-facing mobile app or tool |
| Connected through | Logistics Service |
| Used to | Assign and confirm deliveries |

### Implement

```
Logistics Service ↔ Fleet app/tool
  - assign delivery to rider
  - rider confirms delivery
  → feeds Order delivered + Payments payout queue
```

Early stage: founder + 1 rider, WhatsApp — fleet app can wait until 3+ riders needed.

---

## 4. Acceptance checks

1. Telebirr, CBE Birr, bank transfer APIs only connect via Payments Service.  
2. Fleet app/tool only connects via Logistics Service.  
3. Fleet app/tool can assign and confirm deliveries.  

---

## Source

`requirment.md` §5.3; §4.3 Payments; §4.4 Logistics; §7 Logistics/Payments early-stage  
