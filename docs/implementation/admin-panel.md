# Admin Panel — How To Implement

**Requirement (from `docs/requirment.md` §4.6):**  
The internal control center for the team — used to approve new seller, review and curate listings, resolve support tickets, and monitor platform-wide performance.

| Responsibility | Used by |
|----------------|---------|
| Curation, approvals, support | Internal team |

**Transaction flow:** Admin Panel logs the completed transaction for platform-wide reporting and quality monitoring.

---

## 1. Responsibilities

1. Approve new sellers  
2. Review and curate listings  
3. Resolve support tickets  
4. Monitor platform-wide performance  
5. Log completed transactions for reporting and quality monitoring  

---

## 2. Modules to implement

| Module | Actions | Touches |
|--------|---------|---------|
| Seller approvals | Approve new seller applications | Seller Management |
| Listing curation | Review / curate (feature, etc.) | Catalog |
| Support | Resolve support tickets | Tickets store |
| Performance | Platform-wide monitoring | Aggregates from orders/payments/listings |
| Transaction log | Log completed transactions | Orders after completion |

---

## 3. Operations (minimal)

```
GET/POST admin/sellers/applications → approve
GET/POST admin/listings → curate
GET/POST admin/support/tickets → resolve
GET admin/performance
POST admin/transactions/log (or auto-log on order complete)
```

Internal-only auth. Not a buyer or seller front end.

---

## 4. Acceptance checks

1. Admin can approve new sellers.  
2. Admin can review and curate listings.  
3. Admin can resolve support tickets.  
4. Admin can monitor platform-wide performance.  
5. Completed transactions are logged for reporting/quality monitoring.  

---

## Source

`requirment.md` §4.6; service table; §6 step 7  
