# Finance Reconciliation Guide

This guide is for `business_finance`, `business_owner`, and `business_admin` users reconciling delivery charges, COD, and settlements. `business_finance` is limited to its own business money views. Platform settlement administration is separate.

## 1. Understand the ledger

The ledger is immutable. Every financial change inserts a ledger row; no operator may directly mutate a balance or delete history.

Logical accounts:

- `merchant_delivery_charges`
- `merchant_cod_payable`
- `rider_earnings_payable`
- `partner_earnings_payable`
- `platform_revenue`
- `cash_in_transit_cod`

Phase behavior:

- Phase 1 posts a stub `delivery_fee_quoted` entry when a job is confirmed.
- Phase 2 adds the full COD ledger.
- Postpaid invoices are Phase 3.
- Settlement/payout automation is Phase 4.

Do not infer that a later-phase screen or automated payout exists until enabled for the business.

## 2. Establish reconciliation keys

For every merchant order retain:

- `externalOrderId`, the v1 API field representing the merchant's `external_order_id`;
- platform delivery ID;
- business and branch IDs;
- delivery status and status-event timestamps;
- idempotency key used to create the delivery;
- quoted/charged delivery fee references;
- COD amount;
- collection evidence and rider/cash custody reference;
- settlement and payout reference;
- linked return delivery reference, if any.

`externalOrderId` connects platform activity to the merchant order. The platform delivery ID distinguishes separate delivery attempts or linked return jobs.

## 3. Reconcile delivery creation and charges

For each period:

1. Export or retrieve merchant orders expected to have delivery service.
2. Match each to a platform delivery using `externalOrderId` and business ID.
3. Confirm one intended platform delivery ID per delivery attempt.
4. Review duplicate-looking records against the stored idempotency key and request history. A successful idempotent retry should replay one delivery response, not create another delivery.
5. Match the confirmed job to its `delivery_fee_quoted` ledger entry in Phase 1.
6. Compare quote, enabled pricing terms, cancellation/failure/return outcome, and any later charge adjustment policy.
7. Put unmatched orders, deliveries, or entries in an exception list; never repair them by changing ledger history.

## 4. Reconcile COD at delivery

On `delivered` with COD, the approved ledger rule is:

```text
debit  cash_in_transit_cod
credit merchant_cod_payable
```

For each COD delivery:

1. Confirm the API record reached `delivered`.
2. Match the expected COD amount to the merchant order.
3. Match `cod.collected` evidence to the same delivery ID and `externalOrderId`.
4. Match the debit to `cash_in_transit_cod`.
5. Match the credit to `merchant_cod_payable`.
6. Identify the rider or operational cash-custody record.
7. Flag any amount difference, missing side of the entry, duplicate event, collection without delivery, or delivered COD without collection evidence.

Do not recognize a webhook alone as proof of cash custody. Compare lifecycle, collection evidence, immutable ledger entries, and physical/payment handoff records.

## 5. Reconcile cash custody

At every rider handoff:

1. Count/verify the amount by delivery.
2. Record delivery ID, `externalOrderId`, rider ID, amount, time, receiving actor, and handoff reference.
3. Compare the handoff total to open `cash_in_transit_cod`.
4. Investigate overages and shortages immediately.
5. Keep disputed amounts open and attributable; do not net them invisibly against unrelated deliveries.

Escalate suspected loss, theft, fraud, or fabricated collection evidence to `<FINANCE_LEAD>`, `<OPS_LEAD>`, and `<SECURITY_CONTACT>`.

## 6. Reconcile settlement

On settlement payout, the approved rule reverses the merchant payable and records the payout reference.

1. Obtain the settlement statement or `settlement.completed` record.
2. Match its business, period, payout reference, and included delivery IDs.
3. Recalculate the included COD total from `merchant_cod_payable`.
4. Confirm the payable reversal is represented by new immutable ledger entries.
5. Match the net payout to the merchant bank/payment record.
6. Confirm every included delivery is settled once.
7. Carry unmatched or disputed deliveries forward explicitly; do not silently omit or duplicate them.

Because settlement payload and payout timing are not defined in the current OpenAPI contract, use the deployed finance statement as the detailed contract and verify it in sandbox before production.

## 7. Handle failure, cancellation, and return

Review all `cancelled`, `delivery_failed`, and `returned` deliveries separately.

- `cancelled`: confirm cancellation occurred only from `awaiting_dispatch`, `assigned`, or `rider_arriving_pickup`; review charge treatment under the merchant agreement.
- `delivery_failed`: confirm package and cash custody, collection evidence, and whether another attempt or return was authorized.
- `returned`: preserve the original delivered/failed history and match the linked return job where present.

The approved documents do not define automatic fee refunds, COD reversals, or return charges. Do not assume them. Apply the merchant agreement and approved accounting policy; represent corrections as new ledger entries with references to the original entries.

## 8. Process webhook and ledger exceptions

Webhooks may retry or arrive out of order.

1. Deduplicate `cod.collected` and `settlement.completed` before posting any merchant-side financial effect.
2. If webhook and ledger disagree, retrieve `GET /v1/deliveries/<DELIVERY_ID>` and inspect the authoritative status timeline.
3. Compare webhook delivery logs, ledger rows, audit logs, and custody evidence.
4. Keep the exception open until both amount and ownership are established.
5. Correct by replaying processing or adding an authorized correcting entry; never modify the original row.

## 9. Daily control

At the end of each business day:

1. Count deliveries created, delivered, cancelled, failed, and returned.
2. Match confirmed deliveries to delivery-fee entries.
3. Match delivered COD jobs to `cod.collected` and both approved COD ledger postings.
4. Match rider handoffs to `cash_in_transit_cod`.
5. Match completed settlements to payable reversals and payout references.
6. Age every unmatched item by event date.
7. Obtain named ownership and due time for each exception.
8. Sign off totals through the approved finance control.

## 10. Sandbox-to-production finance acceptance

Test:

1. Non-COD delivery and quoted-fee entry.
2. COD delivery with exact collection and ledger match.
3. Duplicate `cod.collected` delivery with no duplicate financial effect.
4. Temporary webhook failure and successful retry.
5. Delivery failure before and after pickup.
6. Delivered-then-returned handling under the approved accounting policy.
7. Settlement completion, payable reversal, and payout match.
8. Missing, short, over, duplicated, and unmatched cash scenarios.

Before production, confirm production business identity, bank/payment destination, COD limits/terms, settlement cadence, cut-off timezone, authorized finance users, and escalation contacts. Run one controlled live COD delivery through final payout before scaling.

## 11. Escalation record

For each finance exception include:

- business ID, delivery ID, and `externalOrderId`;
- delivery status and relevant event times;
- expected and actual amount/currency;
- original and correcting ledger references;
- COD collection and cash handoff references;
- settlement/payout reference;
- linked return reference;
- sanitized webhook/audit identifiers;
- owner, severity, next action, and due time.

Never include API keys, webhook secrets, full signatures, or unnecessary recipient data.
