# API Integration Guide

This guide describes a reliable server-to-server integration with the approved REST API v1. It uses HTTP and JSON examples only; it does not prescribe application code.

## 1. Select the environment

| Environment | Base URL | Credentials | Purpose |
|---|---|---|---|
| Sandbox | `<SANDBOX_API_URL>` | `<SANDBOX_API_KEY>` | Contract, lifecycle, failure, and webhook tests |
| Production | `<PRODUCTION_API_URL>` | `<PRODUCTION_API_KEY>` | Live delivery traffic |

Never send production customer data or production secrets to sandbox. Never reuse keys, webhook secrets, business IDs, branch IDs, or idempotency keys across environments.

## 2. Authenticate with the correct identity

- Merchant system integrations send `X-API-Key: <API_KEY>`.
- Interactive authenticated user calls send `Authorization: Bearer <JWT>`.
- Public `GET /v1/track/{token}` requires no authentication.
- Keep API keys in a secret manager, redact them from logs, rotate exposed keys, and grant dashboard access by role.

Approved roles are `platform_admin`, `business_owner`, `business_admin`, `business_dispatcher`, `business_finance`, `business_viewer`, `rider`, `partner_admin`, and `ops_dispatcher`. A merchant integration must stay within its own business tenant.

## 3. Preserve merchant references

Assign each merchant order one durable reference. The business term is `external_order_id`; the v1 request field is exactly `externalOrderId`.

Rules:

1. Create the reference before calling the delivery API.
2. Do not change it when a request times out or is retried.
3. Store it beside the returned delivery ID.
4. Use it for support, webhook correlation, COD, and settlement reconciliation.
5. For a true replacement or linked return job, use a new delivery create operation and preserve the relationship in merchant records.

## 4. Quote before creation

Call `POST /v1/quotes` with pickup and dropoff addresses. Every address requires `line1`, `city`, `lat`, and `lng`; optional fields include `line2`, `region`, `postalCode`, `country`, `contactName`, and `contactPhone`.

```bash
curl --request POST "<API_URL>/v1/quotes" \
  --header "X-API-Key: <API_KEY>" \
  --header "Content-Type: application/json" \
  --data '{
    "businessId": "<BUSINESS_ID>",
    "pickup": {
      "line1": "<PICKUP_LINE_1>",
      "city": "<PICKUP_CITY>",
      "lat": 0.0,
      "lng": 0.0
    },
    "dropoff": {
      "line1": "<DROPOFF_LINE_1>",
      "city": "<DROPOFF_CITY>",
      "lat": 0.0,
      "lng": 0.0
    }
  }'
```

Treat a non-success response as no quote. Do not create a delivery from guessed zone eligibility or price.

## 5. Create idempotently

`POST /v1/deliveries` requires `Idempotency-Key`. The platform scopes the key to the API key/business and stores the request hash plus response.

```bash
curl --request POST "<API_URL>/v1/deliveries" \
  --header "X-API-Key: <API_KEY>" \
  --header "Idempotency-Key: <STABLE_UNIQUE_KEY>" \
  --header "Content-Type: application/json" \
  --data '{
    "businessId": "<BUSINESS_ID>",
    "branchId": "<BRANCH_ID>",
    "externalOrderId": "<MERCHANT_ORDER_ID>",
    "mode": "on_demand",
    "pickup": {
      "line1": "<PICKUP_LINE_1>",
      "city": "<PICKUP_CITY>",
      "lat": 0.0,
      "lng": 0.0
    },
    "dropoff": {
      "line1": "<DROPOFF_LINE_1>",
      "city": "<DROPOFF_CITY>",
      "lat": 0.0,
      "lng": 0.0
    },
    "packages": [
      {
        "clientPackageKey": "<STABLE_PACKAGE_KEY>",
        "description": "<DESCRIPTION>",
        "contentsCategoryCode": "<APPROVED_CATEGORY_CODE>",
        "itemCount": 1,
        "form": "box",
        "declaredSizeClass": "<ACTIVE_SIZE_CLASS_CODE>",
        "weightGrams": 1000,
        "dimensionsMm": {
          "length": 300,
          "width": 200,
          "height": 100
        },
        "handling": {
          "fragile": false,
          "liquid": false,
          "perishable": false,
          "keepUpright": false,
          "stackability": "stackable",
          "sealRequired": false,
          "tamperRequirement": "none",
          "specialHandlingCodes": []
        },
        "goodsDeclaration": {
          "status": "declared_clear",
          "codes": []
        },
        "sensitiveContents": false
      }
    ],
    "codAmount": 0,
    "notes": "<NOTES>"
  }'
```

The allowed `mode` values are `on_demand`, `scheduled`, `bulk_item`, and `multi_stop`; phased product availability still applies. Do not assume a later-phase mode is enabled merely because it appears in the schema.

### Retry decision

1. On a timeout, connection interruption, or retryable server failure, retain the exact serialized request meaning and retry with the same key.
2. On `201`, persist the delivery ID, current status, tracking URL, `externalOrderId`, and idempotency key.
3. On `409`, stop automated retries. Either the key was reused with a different body or a requested state transition was invalid. Retrieve the delivery and investigate.
4. On validation or authentication failure, correct the request or credential before trying again. Do not rotate the idempotency key to bypass an uncertain create result.
5. Use bounded retries with increasing delay and jitter. After the retry limit, place the request in an operator-visible exception queue.

## 6. Read and correlate state

```bash
curl "<API_URL>/v1/deliveries/<DELIVERY_ID>" \
  --header "X-API-Key: <API_KEY>"
```

Store the platform delivery ID as the primary API lookup key and `externalOrderId` as the merchant correlation key. The status timeline records time, actor, optional location, and reason for each transition.

Approved status flow:

```text
draft → quoted → awaiting_dispatch → assigned → rider_arriving_pickup
      → picked_up → in_transit → delivered
```

Exceptions:

- `awaiting_dispatch`, `assigned`, or `rider_arriving_pickup` may become `cancelled`.
- Any state from `assigned` through `in_transit` may become `delivery_failed`.
- `delivery_failed` or `delivered` may become `returned` by operations; a linked return job is preferred.

The API rejects invalid transitions with `409`. Consumers must not infer that receiving one webhook makes every preceding transition valid locally; reconcile with the fetched delivery timeline.

## 7. Cancel only within the allowed window

```bash
curl --request POST "<API_URL>/v1/deliveries/<DELIVERY_ID>/cancel" \
  --header "X-API-Key: <API_KEY>"
```

Only merchant or operations actors may cancel, and only from an allowed state. If pickup has occurred, use the failure/return escalation process instead of cancellation.

## 8. Consume webhooks defensively

Webhooks reduce polling but do not replace the read API.

1. Verify `X-DaaS-Signature` against the exact raw body and `X-DaaS-Timestamp`.
2. Reject invalid or stale requests according to the agreed timestamp tolerance.
3. Deduplicate deliveries of the same event.
4. Return success only after the event is durably recorded.
5. Process asynchronously, tolerate retries and out-of-order arrival, and fetch the delivery when state is ambiguous.

See [Webhook Consumer Guide](./webhook-consumer-guide.md).

## 9. Sandbox-to-production acceptance

Do not promote based only on a successful create call. Verify:

- tenant isolation and least-privilege dashboard roles;
- quote and zone rejection behavior;
- same-key/same-body replay and same-key/different-body `409`;
- every enabled status and exception path;
- webhook signature rejection, duplication, delayed arrival, retry, and recovery;
- COD and non-COD delivery reconciliation;
- redaction of API keys, webhook secrets, recipient data, and tracking tokens from inappropriate logs.

Then provision separate production credentials, register the production webhook, confirm production zones/pricing/COD terms, run one controlled live delivery, and compare API, webhook, operations, and finance records before increasing traffic.
