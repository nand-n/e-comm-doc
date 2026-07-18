# 16 — Commerce Plugins

**Status:** Product specification  
**Initial ecosystems:** Shopify and WooCommerce stores  
**Phase:** 3

## Scope and boundaries

In scope: install/connect flows, store-to-business/branch mapping, order eligibility, quote display where supported, delivery creation, order metadata, fulfillment/tracking synchronization, webhooks, retries, uninstall, diagnostics, and version compatibility. The complete cross-platform implementation model—including supermarkets, WooCommerce, custom commerce systems, Odoo, and provider-neutral adapters—is defined in the [Platform Integration Handbook](../guides/platform-integration-handbook.md).

Out of scope: replacing checkout, catalog/inventory management, payment capture, tax calculation, broad OMS functionality, or silently changing merchant orders. Plugins are clients of public REST `/v1` and signed webhooks; no private database coupling is allowed.

## Actors

- Store owner installs and configures the plugin.
- Store staff requests fulfillment and views delivery status.
- Recipient receives the platform tracking link through store communications.
- Plugin runtime maps commerce events to DaaS API calls.
- Merchant developer/support diagnoses mapping and synchronization.
- DaaS platform admin manages app versions and ecosystem incidents.

## Data and contracts

`PluginInstallation` includes tenant, environment, provider, external store ID/domain, encrypted provider credentials, DaaS credential reference, mapped branch, settings, scopes, status, version, and timestamps.

`OrderDeliveryLink` maps provider order ID and stable `external_order_id` to DaaS `delivery_id`, fulfillment ID, idempotency key seed, tracking URL, last synchronized state, and timestamps.

Canonical `external_order_id` is stable and collision-safe, for example `shopify:{store_id}:{order_id}` or `woocommerce:{site_id}:{order_id}`. Human order numbers are retained as labels but are not trusted as unique IDs.

Address, packages, COD, customer contact, notes, requested window, and order value map through a documented provider adapter into `POST /v1/deliveries`. Provider-specific metadata stores `delivery_id`, tracking URL, and integration version.

## Endpoints and events

Plugin-facing DaaS use:

- `POST /v1/quotes`
- `POST /v1/deliveries` with `Idempotency-Key`
- `GET /v1/deliveries/{delivery_id}`
- `GET /v1/deliveries?external_order_id=...`
- `POST /v1/deliveries/{delivery_id}/cancel`
- signed delivery webhooks

Integration management may expose:

- `POST /v1/integrations/commerce/installations`
- `GET/PATCH/DELETE /v1/integrations/commerce/installations/{installation_id}`
- `POST /v1/integrations/commerce/installations/{installation_id}/test`
- `POST /v1/integrations/commerce/installations/{installation_id}/resync`

Inbound provider events include order paid, fulfillment requested, order updated/cancelled, and app uninstalled. Outbound DaaS events update fulfillment/tracking state. Provider event support is capability-driven because Shopify- and Woo-style systems differ.

## Security

- Prefer provider OAuth/app installation where available; otherwise require least-privilege API credentials stored encrypted and never shown after entry.
- Verify provider webhook signatures and timestamps before processing. Deduplicate provider event IDs.
- Use a dedicated scoped DaaS key per installation or credential reference; never embed a production secret in storefront JavaScript.
- Validate store domain/ID and bind callback state with short-lived signed nonces. Protect install flows against CSRF and account-confusion attacks.
- Request only required order/fulfillment scopes. Redact customer PII in logs and enforce provider retention/deletion requirements.
- Uninstall revokes access, stops synchronization, and schedules credential/data cleanup while preserving required audit records.

## Validation

- Test credentials, required provider scopes, branch ownership, pickup address, service city, currency, COD policy, and webhook registration before activation.
- An order must have a deliverable physical item, valid recipient contact/address, supported location, positive package count, and a configured trigger.
- Configuration controls paid-status requirement, automatic versus manual creation, COD mapping, package defaults, and cancellation policy.
- Order edits after pickup do not mutate delivery addresses/packages automatically; they create a visible conflict requiring staff action.
- Prevent duplicate active links for the same installation/provider order.

## Error semantics

- Configuration errors are actionable: missing scope, invalid branch, unsupported currency, unreachable callback, or incompatible plugin version.
- Order sync states are `pending`, `created`, `synced`, `retrying`, `needs_attention`, `cancelled`, or `disconnected`.
- DaaS validation failures attach safe field-level guidance to the order/admin view. Authentication failures pause the installation and request reconnection.
- Provider update failure does not roll back a created delivery; reconciliation retries from the stored link.
- Conflicting edits or impossible cancellation return `409` and require operator resolution; never create a replacement silently.

## Retry and idempotency

- Delivery creation uses a deterministic idempotency key derived from installation ID, provider order ID, and fulfillment attempt/version.
- Before retrying an ambiguous timeout, query by `external_order_id`; never generate a fresh key merely because the first response was lost.
- Inbound provider webhooks are stored/deduplicated and acknowledged quickly before asynchronous processing.
- Provider and DaaS calls retry transient failures with exponential backoff and jitter, honoring rate-limit headers. Permanent `4xx` enters `needs_attention`.
- Webhook consumers deduplicate DaaS event IDs and tolerate out-of-order delivery by comparing lifecycle rank and fetching current delivery state.

## UI and admin touchpoints

- Plugin setup wizard: connect account, choose environment/business/branch, configure trigger/package/COD settings, test, and activate.
- Order detail shows DaaS status, fee, tracking URL, delivery ID, last sync, create/cancel/retry actions, and diagnostics.
- Bulk order action creates deliveries only after a review of eligible, duplicate, and invalid orders.
- `/app/integrations` shows installations, versions, health, volume, failures, reconnect/uninstall, and link to logs.
- `/admin` shows ecosystem-wide version adoption, provider incidents, callback health, and feature kill switches.

## Observability

- Correlate provider store/order/event IDs, installation ID, `external_order_id`, DaaS request ID, idempotency key fingerprint, and delivery ID.
- Metrics: installations, activation success, orders evaluated/created/skipped, duplicate prevention, sync latency, provider/DaaS errors, webhook lag, and version distribution.
- Alert on auth revocations, webhook registration loss, provider API degradation, duplicate attempts, elevated `needs_attention`, and unsupported plugin versions.
- Include an exportable redacted diagnostic bundle for merchant support.

## Phased delivery

1. **Contract prototype:** provider-neutral adapter, sandbox store, manual delivery action, stable order linkage, and tracking metadata.
2. **Shopify:** version-pinned install/auth and scope flow, location-to-branch mapping, fulfillment-scoped idempotent creation, verified provider webhooks, tracking/fulfillment projection, reconciliation, uninstall/privacy handling, and diagnostics as specified in the integration handbook.
3. **WooCommerce-style:** packaged extension, site identity, configurable triggers, background jobs, order notes/metafields, and compatibility matrix.
4. **Scale:** app marketplaces, automated upgrades, bulk actions, richer checkout quote options, and additional providers through the same adapter contract.

## Acceptance criteria

- A supported store can connect to the correct DaaS tenant/branch without exposing credentials to storefront clients.
- One eligible order/fulfillment produces one delivery despite duplicate events and timeout retries.
- `external_order_id`, provider metadata, `delivery_id`, and tracking URL allow bidirectional reconciliation.
- Signed DaaS webhooks advance fulfillment/tracking state without regressing on duplicate or out-of-order events.
- Invalid orders are not submitted and show actionable staff guidance.
- Uninstall/revocation stops processing and removes active credentials/webhooks according to policy.
- Shopify and WooCommerce implementations use the same public `/v1` contracts and provider-adapter test suite while retaining provider-specific capability manifests and security controls.
