# Operations Playbook

This playbook covers dispatch, lifecycle exceptions, returns, and escalation. `ops_dispatcher` performs platform operations; `business_dispatcher` manages deliveries for its own business. `platform_admin` is reserved for tenant, city/zone, rider, audit, and system-level administration.

## 1. Start-of-shift checks

1. Open the operations live board and review unassigned and active jobs.
2. Confirm the expected riders are available; rider availability is online/offline, not proof of assignment.
3. Check service city/zone configuration and known incidents.
4. Review webhook failure/queue health when the system health view is available.
5. Review deliveries already in `delivery_failed`, long-running active states, and unresolved returns.
6. Confirm the shift escalation contacts: `<OPS_LEAD>`, `<PLATFORM_ON_CALL>`, `<MERCHANT_CONTACT>`, `<FINANCE_CONTACT>`, and `<SECURITY_CONTACT>`.

## 2. Validate a new delivery

For each `awaiting_dispatch` delivery:

1. Confirm the business, branch, pickup/dropoff coordinates, recipient contact, package details, notes, and COD amount.
2. Search by `externalOrderId`—the API field for the merchant's `external_order_id`—to detect merchant-side confusion. Do not treat two different platform delivery IDs as duplicates without checking idempotency and order history.
3. Confirm the pickup and dropoff are in service coverage.
4. Check that the requested mode is operationally enabled. Schema values are `on_demand`, `scheduled`, `bulk_item`, and `multi_stop`, but phased availability applies.
5. Leave invalid or unsafe jobs unassigned and contact the merchant. Do not fabricate coordinates or package details.

## 3. Assign a rider

Select an available, suitable rider and assign through the operations console or:

```bash
curl --request POST "<API_URL>/v1/ops/deliveries/<DELIVERY_ID>/assign" \
  --header "Authorization: Bearer <OPS_JWT>" \
  --header "Content-Type: application/json" \
  --data '{
    "riderId": "<RIDER_ID>"
  }'
```

The valid transition is `awaiting_dispatch → assigned`. A `409` means the delivery state changed or the transition is invalid. Retrieve the delivery before taking further action.

Record reassignment decisions in the audit trail. Do not share one rider identity between people.

## 4. Monitor the active lifecycle

Expected rider progression:

`assigned → rider_arriving_pickup → picked_up → in_transit → delivered`

Every transition must store time, actor, optional location, and reason. Watch for:

- no rider movement after assignment;
- prolonged `rider_arriving_pickup`;
- pickup completed physically but no `picked_up` event;
- prolonged `picked_up` or `in_transit`;
- recipient or address contact failure;
- COD amount disagreement;
- webhook failures that hide an otherwise valid state from the merchant.

Contact the rider first for operational facts. Correct state only through an allowed actor and transition; never edit timeline history.

## 5. Process cancellation

Cancellation is allowed from:

- `awaiting_dispatch`;
- `assigned`;
- `rider_arriving_pickup`.

Merchant or operations may cancel subject to rules:

```bash
curl --request POST "<API_URL>/v1/deliveries/<DELIVERY_ID>/cancel" \
  --header "Authorization: Bearer <OPS_JWT>"
```

Before cancelling an assigned job, notify the rider. Once the job is `picked_up` or later, cancellation is invalid; use failure and return handling. Treat `409` as a state conflict, retrieve current state, and stop blind retries.

## 6. Handle delivery failure

From any state `assigned` through `in_transit`, a rider or operations actor may transition the delivery to `delivery_failed`.

1. Confirm the failure facts with the rider and recipient/merchant as appropriate.
2. Record a precise reason, time, actor, and available location.
3. Protect the package and any COD cash already collected.
4. Decide whether another delivery attempt is authorized or the item must return.
5. Notify the merchant using the platform event and agreed escalation channel.
6. Do not mark `delivered` to clear an exception queue.

Examples requiring immediate escalation include safety threats, lost/damaged package, suspected fraud, incorrect COD collection, uncontactable rider, or custody uncertainty.

## 7. Process returns

Only operations moves `delivery_failed` or `delivered` to `returned`. A linked return job is preferred.

1. Confirm return authorization, return destination, package condition, and custody.
2. Create or identify the linked return job according to enabled platform capability.
3. Preserve the original delivery ID and `externalOrderId`; assign a distinct reference to the return movement.
4. Dispatch the return and record each custody handoff.
5. On physical receipt, capture confirmation and set the approved return outcome.
6. Transition the original delivery to `returned` only through the allowed operation.
7. Notify merchant finance if delivery fees, COD, rider earnings, or settlement require review. Never rewrite ledger entries.

A delivered item later returned is still historically delivered; the `returned` transition records the later outcome rather than erasing delivery.

## 8. Handle COD exceptions

1. Compare the rider-visible COD amount with the delivery record before handoff.
2. If the recipient disputes the amount, pause handoff and contact operations; the rider must not alter it.
3. On successful COD delivery, confirm `delivered` and the expected `cod.collected` evidence.
4. Track cash custody as `cash_in_transit_cod` until settlement.
5. Escalate missing cash, wrong amount, duplicate collection event, or collection without delivery immediately to operations and finance.
6. Preserve evidence and references; corrections use new immutable ledger entries, never changed balances.

## 9. Reconcile system disagreements

If dashboard, webhook, merchant, and rider views disagree:

1. Retrieve `GET /v1/deliveries/<DELIVERY_ID>`.
2. Treat its current status and event timeline as authoritative.
3. Compare actor, timestamps, reason, and optional location.
4. Check webhook delivery logs and audit logs where available.
5. Correct derived views by replay/reprocessing; do not manufacture a lifecycle event.
6. Escalate unresolved conflicts with sanitized evidence.

## 10. Escalate with complete context

Include:

- severity and customer/financial/safety impact;
- environment and business ID;
- delivery ID and `externalOrderId`;
- current and expected status;
- last valid event time and actor;
- rider ID and branch ID when relevant;
- COD amount and settlement reference when relevant;
- sanitized request, webhook, and audit references;
- actions already taken and the decision required.

Use `<OPS_ESCALATION_CHANNEL>` for ordinary exceptions and `<INCIDENT_CHANNEL>` for active safety, security, widespread outage, or cash-loss incidents. Do not place API keys, webhook secrets, full signatures, or unnecessary recipient data in escalation messages.

## 11. End-of-shift handoff

1. List all unassigned, stuck, failed, and returning deliveries.
2. Identify every package or COD amount still in rider custody.
3. Record pending merchant, finance, security, and platform escalations.
4. Confirm the next owner and due time for each item.
5. Preserve unresolved work on the live board; do not close it merely to complete handoff.
