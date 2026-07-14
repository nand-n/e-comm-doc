# Logistics Service — How To Implement

**Requirement (from `docs/requirment.md` §4.4):**  
Coordinates delivery — assigning riders, generating tracking links, managing delivery zones, and maintaining packaging checklists for fragile items like paintings and ceramics.

| Responsibility | Used by |
|----------------|---------|
| Delivery, tracking, packaging | Buyers, Riders |

**External:** Delivery fleet app — simple rider-facing mobile app or tool, connected through Logistics, used to assign and confirm deliveries.

**Early stage:** Founder + 1 rider, manual WhatsApp updates → automate when **3+ riders needed**.

**Flow:** Seller packages; Logistics assigns delivery rider and generates tracking link; delivery confirmation leads to payout queue.

---

## 1. Responsibilities

1. Assigning riders  
2. Generating tracking links  
3. Managing delivery zones  
4. Packaging checklists for fragile items (paintings, ceramics named)  

---

## 2. Operations to implement

```
# Zones
manage delivery zones (where delivery is offered)

# Assignment
assign rider to order
generate tracking_link → expose on buyer order tracking

# Packaging
checklist for fragile (paintings, ceramics) for seller/ops

# Confirmation
confirm delivery (via fleet app/tool) → Order status delivered → Payments payout queue
```

---

## 3. Fleet app / tool

Rider-facing app or tool:

- Receive assignment  
- Confirm deliveries  

Connected only through Logistics Service (not a separate source of truth for order status — Order Service remains status source of truth; Logistics reports events into it).

---

## 4. Early stage

Founder + 1 rider; WhatsApp status updates until 3+ riders needed, then automate assignment/fleet tooling.

---

## 5. Acceptance checks

1. Riders can be assigned to orders.  
2. Tracking links generated and shown to buyers.  
3. Delivery zones managed.  
4. Fragile packaging checklists exist for paintings and ceramics.  
5. Delivery confirmation path exists for riders via fleet app/tool.  

---

## Source

`requirment.md` §4.4; §5.3 delivery fleet app; §6 steps 4–6; §7 Logistics; service table Used by Buyers, Riders  
