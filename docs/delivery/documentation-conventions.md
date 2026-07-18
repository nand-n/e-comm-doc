# Delivery Documentation Conventions

Rules used across the Delivery-as-a-Service documentation.

## 1. Normative language

| Word | Meaning |
|------|---------|
| **Must** | Required for correctness, security, tenancy, finance, or the approved product |
| **Should** | Recommended default; may change with a documented reason |
| **May** | Optional capability |
| **Configurable** | The design requires a value, but business/operations/legal must approve it |
| **Phase N** | Planned delivery phase, not a promise of timing |

## 2. IDs and timestamps

- Internal IDs are opaque and globally unique.
- Merchant-facing integration uses `external_order_id` plus the platform `delivery_id`.
- Timestamps use ISO 8601 UTC in APIs and events.
- Interfaces display the user/business timezone.
- Money is stored in minor units plus an ISO currency code; examples may use decimal notation for readability.

## 3. Tenancy

- Every tenant-owned record includes or derives a `business_id`.
- Every authenticated operation resolves its tenant context.
- Cross-tenant access is denied by default.
- Platform-wide roles are explicit and audited.

## 4. State and history

- The delivery status machine is authoritative.
- Status history is append-only.
- Finance and audit history are append-only.
- Corrections use new events/entries, not destructive edits.

## 5. API examples

- `/v1` denotes the public API version.
- Example URLs, tokens, IDs, phone numbers, and amounts are placeholders.
- `Idempotency-Key` is mandatory on delivery creation.
- API examples do not replace the OpenAPI contract.

## 6. Configurable decisions

Do not hardcode documentation examples as product policy. These require owner approval:

- Prices, surcharges, commissions, and taxes
- SLA and availability commitments
- Dispatch timeouts and retry limits
- COD ceilings and risk limits
- Rider/partner KYC requirements
- Data retention and deletion periods
- Supported cities, zones, hours, and vehicles
- Cancellation, return, refund, and dispute policies
- Settlement schedules

The [decision register](./decision-register.md) tracks these decisions.

## 7. Ownership

Each module defines:

- What data it owns
- What actions it authorizes
- What events it emits/consumes
- Which other modules it calls
- What it explicitly does not own

If two documents conflict, use this order:

1. Product definition
2. Delivery contracts / OpenAPI
3. Module documentation
4. Guides and examples

Record and resolve the conflict in the decision register.

## 8. Security and privacy

- Examples must not contain real secrets or personal data.
- Customer and rider location data is sensitive.
- API keys and webhook secrets are shown once and stored hashed/encrypted as appropriate.
- Public tracking reveals only the minimum recipient-safe data.
- Jurisdiction-specific claims require legal review.

## 9. Definition of “documented”

A module is fully documented when it has:

1. Purpose and boundaries
2. Actors and permissions
3. Data model and constraints
4. Workflows/state changes
5. APIs/events
6. Validation/business rules
7. Security/privacy
8. Failure/retry behavior
9. Observability/audit
10. Phase boundaries
11. Acceptance criteria
