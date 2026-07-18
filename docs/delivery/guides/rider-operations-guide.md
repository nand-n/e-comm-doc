# Rider Operations Guide

This guide is for users with the `rider` role. A rider may view assigned jobs, set personal availability, and update assigned delivery statuses. Riders cannot assign jobs, cancel merchant deliveries, authorize returns, or edit financial records.

## 1. Start the shift

1. Sign in with your own rider credentials.
2. Confirm your name, vehicle/readiness, phone connectivity, and safe operating condition.
3. Set availability online in the rider app or through `POST /v1/riders/me/availability`.
4. Review assigned jobs through the job list or `GET /v1/riders/me/jobs`.
5. Confirm the app shows the correct environment and rider account.

Availability only indicates readiness. Do not travel to a pickup until a job is `assigned` to you.

## 2. Review an assigned job

Before accepting operational custody:

1. Verify the delivery ID.
2. Review pickup and dropoff address, map coordinates, contacts, package description, weight, fragility, notes, and COD amount.
3. Check for unsafe, impossible, or conflicting instructions.
4. Contact operations if the package or route is unsuitable. Do not change addresses, COD, or package facts yourself.
5. Keep recipient and merchant information private and use it only to complete the delivery.

## 3. Travel to pickup

When you start toward pickup, advance:

`assigned → rider_arriving_pickup`

Status updates use `POST /v1/riders/jobs/<DELIVERY_ID>/status`. The approved status-event data includes:

```json
{
  "status": "rider_arriving_pickup",
  "at": "2026-07-18T12:00:00.000Z",
  "actorType": "rider",
  "actorId": "<RIDER_ID>",
  "lat": 0.0,
  "lng": 0.0,
  "reason": null
}
```

The current OpenAPI file does not define the endpoint's request-body schema. Use the exact deployed rider API contract; do not add or rename fields based solely on this event example.

If the API returns `409`, stop and refresh the job. It means the requested transition is invalid for the current state.

## 4. Take custody at pickup

Before marking pickup:

1. Confirm delivery ID with the pickup contact.
2. Compare package count, description, visible condition, weight expectations, and fragile handling.
3. Confirm COD amount, if any; COD is collected from the recipient, not normally at pickup.
4. Refuse unsafe or materially mismatched packages and contact operations.
5. Complete enabled proof-of-pickup controls when available.
6. Only after physical custody, advance:

`rider_arriving_pickup → picked_up`

Never mark `picked_up` before receiving the package.

## 5. Begin delivery travel

When leaving pickup with the package, advance:

`picked_up → in_transit`

1. Navigate using the approved map link.
2. Keep the package secure and maintain required handling.
3. Do not expose the public tracking token or recipient details.
4. Report route, safety, package, or contact problems promptly.
5. Do not skip directly from `assigned` or `rider_arriving_pickup` to `in_transit`.

## 6. Complete a non-COD delivery

1. Verify the recipient and destination.
2. Hand over the package only according to delivery instructions.
3. Capture proof of delivery when the enabled phase supports it.
4. After physical handoff, advance:

`in_transit → delivered`

5. Confirm the update succeeded before leaving when safe to do so.

Never mark `delivered` for an unattended, refused, failed, or still-in-custody package.

## 7. Complete a COD delivery

1. Read the COD amount from the authoritative job record.
2. Tell the recipient the exact amount before handoff.
3. Collect exactly that amount through the approved payment/cash process.
4. Count or verify the amount before handing over the package.
5. Complete handoff and proof controls.
6. Advance `in_transit → delivered` and ensure COD collection evidence is recorded.
7. Keep collected cash segregated and in your custody until the approved handoff.
8. Obtain a handoff reference when transferring cash to operations/finance.

Do not change the COD amount, provide an informal credit, combine unrelated collections without records, or mark cash handed over before it is physically transferred.

## 8. Report a failure

A rider may transition a job from `assigned`, `rider_arriving_pickup`, `picked_up`, or `in_transit` to `delivery_failed`.

1. Make reasonable contact attempts under operations policy.
2. Protect the package and any collected COD.
3. Notify operations before leaving the location when practical.
4. Select/record a precise reason, event time, and available location.
5. Advance to `delivery_failed` only when completion is not possible.
6. Follow operations instructions for another attempt or return custody.

Safety threat, accident, damaged/lost package, cash discrepancy, suspected fraud, or uncontactable operations requires immediate escalation to `<RIDER_EMERGENCY_CONTACT>`.

## 9. Handle cancellation and return instructions

- If a job becomes `cancelled` before pickup, stop and confirm with operations.
- If cancellation is requested after `picked_up`, do not self-cancel; contact operations.
- Only operations may transition `delivery_failed` or `delivered` to `returned`.
- A linked return job is preferred. Do not begin an unrecorded return movement.
- Maintain package and cash custody until an authorized handoff is recorded.

## 10. Recover from connectivity problems

1. Note the actual event time and preserve any required proof.
2. Do not repeatedly tap a status action.
3. When connectivity returns, refresh the assigned job before submitting.
4. Submit only the next allowed transition.
5. If physical events and API state cannot be reconciled, contact operations; do not invent intermediate timestamps or actors.

## 11. End the shift

1. Complete or formally hand off every assigned job.
2. Reconcile every COD collection and obtain custody-transfer references.
3. Report unresolved failed/returning packages.
4. Set availability offline through the rider app or availability endpoint.
5. Do not end the shift while package or cash custody is undocumented.
