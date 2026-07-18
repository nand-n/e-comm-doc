# Webhook Consumer Guide

The platform sends signed JSON `POST` requests to a merchant endpoint. Delivery is at least once: retries can produce duplicates, and network timing can change arrival order.

## 1. Prepare separate endpoints

Use different HTTPS URLs and secrets:

```text
Sandbox URL:    <SANDBOX_WEBHOOK_URL>
Sandbox secret: <SANDBOX_WEBHOOK_SECRET>
Production URL: <PRODUCTION_WEBHOOK_URL>
Production secret: <PRODUCTION_WEBHOOK_SECRET>
```

The endpoint must accept the subscribed events:

- Delivery: `delivery.created`, `delivery.assigned`, `delivery.picked_up`, `delivery.in_transit`, `delivery.delivered`, `delivery.failed`, `delivery.cancelled`, `delivery.returned`
- Money: `cod.collected`, `settlement.completed`

The webhook envelope is not defined in the current v1 OpenAPI document. Validate only fields guaranteed by the deployed webhook contract; do not assume example envelope fields that have not been approved.

## 2. Preserve the raw request

Signature verification must occur before JSON transformation.

1. Read `X-DaaS-Timestamp`.
2. Read `X-DaaS-Signature`, whose form is `sha256=<hmac>`.
3. Preserve the body as the exact bytes received.
4. Do not reformat JSON, reorder keys, normalize whitespace, or parse and reserialize before verification.

## 3. Verify authenticity

The approved signing concept is HMAC-SHA256 over `timestamp.body` using the endpoint secret.

1. Build the signed bytes exactly as specified by the deployed platform contract: timestamp, the defined separator represented by `.`, and the raw body.
2. Compute HMAC-SHA256 with `<WEBHOOK_SECRET>`.
3. Encode the digest in the format used after `sha256=` by the deployed platform.
4. Compare the supplied and computed values with a constant-time comparison.
5. Reject a missing/malformed timestamp, missing signature, wrong algorithm prefix, or mismatch without processing the event.
6. Enforce the agreed timestamp tolerance to limit replay. The tolerance and digest encoding are not fixed in the current OpenAPI file; confirm them during sandbox certification rather than guessing.

Conceptual request:

```http
POST <WEBHOOK_URL>
Content-Type: application/json
X-DaaS-Timestamp: <SIGNED_TIMESTAMP>
X-DaaS-Signature: sha256=<HMAC_DIGEST>

<EXACT_JSON_BODY>
```

Never log the webhook secret or the complete signature material in routine logs.

## 4. Acknowledge only durable receipt

Use this order:

1. Verify signature and timestamp.
2. Validate enough of the JSON to identify the event.
3. Persist the raw event, receipt time, event type, delivery reference, and processing state in one durable operation.
4. Mark a duplicate as already received without repeating side effects.
5. Return a successful HTTP response promptly.
6. Process business updates outside the request path.

If durable storage is unavailable, return a failure so the platform retries. Do not return success and silently discard the event.

## 5. Make processing idempotent

Webhook retries are expected. Deduplicate by the platform event identifier when the deployed payload provides one. Until an event identifier is contractually defined, use a stable deduplication record based on the immutable metadata actually supplied by the platform; confirm that strategy in sandbox.

For each side effect:

- update a merchant order only if the event has not already been applied;
- post no duplicate finance transaction;
- send no duplicate customer notification;
- retain both receipt and processing outcome for audit.

Do not deduplicate solely by delivery ID: one delivery legitimately has many lifecycle events.

## 6. Apply state updates safely

Approved lifecycle:

`draft → quoted → awaiting_dispatch → assigned → rider_arriving_pickup → picked_up → in_transit → delivered`

Exception statuses are `cancelled`, `delivery_failed`, and `returned`.

Webhook event names do not cover every internal status. Map only approved events:

| Event | Delivery status/action |
|---|---|
| `delivery.created` | Record the created delivery and tracking URL |
| `delivery.assigned` | `assigned` |
| `delivery.picked_up` | `picked_up` |
| `delivery.in_transit` | `in_transit` |
| `delivery.delivered` | `delivered` |
| `delivery.failed` | `delivery_failed` |
| `delivery.cancelled` | `cancelled` |
| `delivery.returned` | `returned` |
| `cod.collected` | Record collection evidence for finance reconciliation |
| `settlement.completed` | Match the settlement reference to immutable ledger records |

If an event is older than the locally stored transition, appears to skip required transitions, or conflicts with local state:

1. keep the event for audit;
2. do not move local state backward;
3. call `GET /v1/deliveries/<DELIVERY_ID>`;
4. reconcile from the authoritative current status and status timeline;
5. raise an exception if the API and webhook cannot be reconciled.

Use `externalOrderId`—the v1 field for the merchant's `external_order_id`—to correlate with the merchant order, but retain the platform delivery ID for API reads.

## 7. Handle platform retries

The platform retries failed webhook deliveries with backoff and dead-letters them after a configured number of failures.

- Return success for a valid event already stored or processed.
- Return a retryable failure only when a later attempt can succeed.
- Reject invalid signatures consistently; do not process them to stop retries.
- Monitor repeated failures and endpoint latency.
- After recovery, use the platform's webhook logs/replay capability when available in Phase 3, or reconcile deliveries through the read API.

Because retry count and schedule are not specified in the approved public contract, do not build correctness around a particular number or interval.

## 8. Test in sandbox

Prove all of the following:

1. A valid signature is accepted.
2. Changed body bytes, wrong secret, missing headers, and stale timestamps are rejected.
3. Repeated delivery causes one business effect.
4. Delayed and out-of-order lifecycle events do not regress state.
5. Endpoint timeout and server failure trigger retries.
6. Recovery processes the stored event and clears the operational alert.
7. `cod.collected` and `settlement.completed` remain idempotent.

## 9. Promote and operate

Register the production endpoint with a new secret. Send a controlled delivery and verify event receipt end-to-end before enabling normal traffic. Rotate a secret by coordinating an overlap procedure with the platform; do not switch unilaterally if the platform supports only one active secret.

Escalate:

- invalid signatures from the expected platform source as a security incident;
- growing retries or dead-letter volume to operations;
- API/webhook state disagreement with delivery ID, `externalOrderId`, event timestamps, and sanitized request identifiers;
- COD or settlement duplication/mismatch to finance without modifying ledger history.
