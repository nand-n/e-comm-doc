# Merchant Quickstart

This guide takes a merchant from sandbox setup to a trackable delivery. Replace every value in angle brackets with a value from your environment.

## Before you begin

- Use a `business_owner` or `business_admin` account to configure the business, branches, API keys, and webhooks.
- Use `business_dispatcher` for day-to-day delivery work, `business_finance` for money views, and `business_viewer` for read-only access.
- Keep the API key secret server-side. It is shown once when created.
- Use `<SANDBOX_API_URL>` while validating the integration and `<PRODUCTION_API_URL>` only after completing the production checklist.

## 1. Create the business and branch

Register or sign in through the merchant dashboard. Create the business tenant, then create at least one pickup branch with a serviceable address and accurate latitude/longitude.

Record:

- business ID: `<BUSINESS_ID>`
- branch ID: `<BRANCH_ID>`
- sandbox API key: `<SANDBOX_API_KEY>`

The API uses `X-API-Key` for merchant integration calls. Dashboard user calls may use a JWT in `Authorization: Bearer <JWT>`.

## 2. Register a webhook

As a business owner or admin, register an HTTPS endpoint:

```text
<WEBHOOK_URL>
```

Store `<WEBHOOK_SECRET>` in your secret manager. Subscribe only to events you process:

`delivery.created`, `delivery.assigned`, `delivery.picked_up`, `delivery.in_transit`, `delivery.delivered`, `delivery.failed`, `delivery.cancelled`, `delivery.returned`, `cod.collected`, `settlement.completed`.

Complete the verification and retry handling in [Webhook Consumer Guide](./webhook-consumer-guide.md) before production.

## 3. Request a quote

Use the exact address field names from the API contract. Phase 1 quoting performs a zone check and may use a distance stub.

```bash
curl --request POST "<SANDBOX_API_URL>/v1/quotes" \
  --header "X-API-Key: <SANDBOX_API_KEY>" \
  --header "Content-Type: application/json" \
  --data '{
    "businessId": "<BUSINESS_ID>",
    "pickup": {
      "line1": "<PICKUP_ADDRESS>",
      "city": "<CITY>",
      "lat": 0.0,
      "lng": 0.0
    },
    "dropoff": {
      "line1": "<DROPOFF_ADDRESS>",
      "city": "<CITY>",
      "lat": 0.0,
      "lng": 0.0
    }
  }'
```

Do not treat a sandbox quote as a production price guarantee. Persist the returned quote reference if the response supplies one.

## 4. Create the delivery once

Generate a unique, stable `Idempotency-Key` for this create operation. Keep it with the merchant order and reuse it only when retrying the exact same JSON body.

The business concept is the merchant's `external_order_id`; the approved v1 JSON field is `externalOrderId`. Set it to a stable order reference that your finance and support teams can search.

```bash
curl --request POST "<SANDBOX_API_URL>/v1/deliveries" \
  --header "X-API-Key: <SANDBOX_API_KEY>" \
  --header "Idempotency-Key: <UNIQUE_CREATE_KEY>" \
  --header "Content-Type: application/json" \
  --data '{
    "businessId": "<BUSINESS_ID>",
    "branchId": "<BRANCH_ID>",
    "externalOrderId": "<MERCHANT_ORDER_ID>",
    "mode": "on_demand",
    "pickup": {
      "line1": "<PICKUP_ADDRESS>",
      "city": "<CITY>",
      "lat": 0.0,
      "lng": 0.0,
      "contactName": "<PICKUP_CONTACT>",
      "contactPhone": "<PICKUP_PHONE>"
    },
    "dropoff": {
      "line1": "<DROPOFF_ADDRESS>",
      "city": "<CITY>",
      "lat": 0.0,
      "lng": 0.0,
      "contactName": "<RECIPIENT_NAME>",
      "contactPhone": "<RECIPIENT_PHONE>"
    },
    "packages": [
      {
        "clientPackageKey": "<STABLE_PACKAGE_KEY>",
        "description": "<PACKAGE_DESCRIPTION>",
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
    "notes": "<DELIVERY_INSTRUCTIONS>"
  }'
```

Save the returned delivery ID and tracking URL. A network timeout does not prove failure: retry with the same key and unchanged body. The platform replays the stored response. Reusing the key with a different body returns `409`.

## 5. Track lifecycle updates

Fetch the authoritative record when needed:

```bash
curl "<SANDBOX_API_URL>/v1/deliveries/<DELIVERY_ID>" \
  --header "X-API-Key: <SANDBOX_API_KEY>"
```

The happy path is:

`draft → quoted → awaiting_dispatch → assigned → rider_arriving_pickup → picked_up → in_transit → delivered`

Terminal or exception statuses are `cancelled`, `delivery_failed`, and `returned`. Webhooks are notifications, not permission to invent a transition. If webhook processing is delayed or an event appears out of order, fetch the delivery and use its current status and status timeline.

Share only the returned public tracking URL with the recipient. Public tracking requires no login because its token is unguessable; do not expose API keys.

## 6. Cancel safely

Cancellation is allowed only from `awaiting_dispatch`, `assigned`, or `rider_arriving_pickup`, subject to platform rules:

```bash
curl --request POST "<SANDBOX_API_URL>/v1/deliveries/<DELIVERY_ID>/cancel" \
  --header "X-API-Key: <SANDBOX_API_KEY>"
```

A `409` means the transition is no longer valid. Do not repeatedly force cancellation; retrieve the current delivery and contact operations if intervention is required.

## 7. Validate sandbox scenarios

Before production, complete at least:

1. Normal delivery through `delivered`.
2. Duplicate create retry with the same idempotency key and body.
3. Rejected reuse of that key with a changed body (`409`).
4. Allowed cancellation and late cancellation rejection.
5. `delivery_failed` followed by the operations return process.
6. COD delivery, `cod.collected`, and a reconciled settlement.
7. Invalid webhook signature, duplicate event, delayed event, and temporary endpoint failure.

## 8. Promote to production

1. Obtain a production business ID, branch ID, API key, and webhook secret; sandbox credentials must not be reused.
2. Replace `<SANDBOX_API_URL>` with `<PRODUCTION_API_URL>` through environment configuration.
3. Confirm production cities/zones, pickup coordinates, pricing, COD terms, settlement destination, and escalation contacts.
4. Register the production HTTPS webhook and verify signatures against the production secret.
5. Send one controlled production delivery with a new `externalOrderId` and idempotency key.
6. Confirm creation, tracking, every webhook, final status, charge, and any COD ledger entries.
7. Enable normal traffic gradually while monitoring webhook failures and stuck deliveries.

For exceptions and escalation, follow [Operations Playbook](./operations-playbook.md). For money controls, follow [Finance Reconciliation Guide](./finance-reconciliation-guide.md).
