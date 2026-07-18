# 17 — Notifications and Communications

**Status:** Product specification  
**Architecture:** Domain-event-driven notification service with channel adapters

## Scope and boundaries

In scope: transactional recipient and merchant communications, template management, channel routing, consent/preferences, provider adapters, localization, delivery attempts, opt-out handling, and operational diagnostics. Initial channels are email and SMS; push and messaging apps are adapter extensions.

Out of scope: marketing campaigns, customer support chat, rider dispatch offers, arbitrary merchant-uploaded HTML/logic, and using provider delivery receipts as proof of delivery. Signed integration webhooks remain a separate machine-to-machine product.

## Actors

- Recipient receives delivery status and action messages.
- Merchant user receives operational summaries or exception alerts.
- Business admin configures branding, locale defaults, event/channel policy, and sender details.
- Platform admin approves templates/providers and handles abuse/compliance.
- Notification orchestrator and channel adapters render and send.

## Data and contracts

`NotificationPolicy` maps tenant, audience, domain event, channel priority/fallback, quiet-hours behavior, and enabled state.

`NotificationTemplate` includes stable key, channel, locale, subject/body, required variables, version, approval state, tenant override, and branding references.

`NotificationMessage` is an immutable intent with tenant, event ID, audience, recipient reference, channel, template/version, locale, rendered-content hash, state, schedule, and deduplication key. `NotificationAttempt` stores adapter/provider, external message ID, timings, classified outcome, and redacted diagnostics.

Channel adapter contract:

- `validateConfiguration()`
- `send(message) -> accepted | retryable_failure | permanent_failure`
- `normalizeReceipt(provider_payload)`
- capability metadata for length, Unicode, templates, media, and sender identity

Template variables are allowlisted and typed, including business name, delivery status, tracking URL, masked order reference, ETA text, and support contact. Raw domain objects are not exposed to templates.

## Endpoints and events

- `GET/PATCH /v1/businesses/{business_id}/notification-settings`
- `GET /v1/businesses/{business_id}/notification-templates`
- `PATCH /v1/businesses/{business_id}/notification-templates/{template_key}`
- `POST /v1/businesses/{business_id}/notification-templates/{template_key}/preview`
- `POST /v1/businesses/{business_id}/notification-templates/{template_key}/test`
- `GET /v1/businesses/{business_id}/notification-messages`
- Recipient preference/opt-out endpoints use signed, scoped, expiring tokens.

Trigger events include delivery confirmed, rider assigned, picked up, arriving soon, delivered, failed, cancelled, and return updates. Communications consume committed outbox events; they do not intercept lifecycle transactions.

## Security

- Encrypt recipient destinations at rest where supported; mask phone/email in UI and logs.
- Tracking links use unguessable tokens and contain no recipient PII in the URL.
- Provider credentials are encrypted, environment-scoped, least privilege, and unavailable to templates.
- Escape template values for the destination channel; disallow executable content, external tracking pixels by default, and unsafe URLs.
- Verify provider status callbacks. Apply tenant isolation, RBAC, consent, suppression lists, and jurisdictional retention rules.
- Test-send permissions are restricted and rate-limited to prevent spam/credential abuse.

## Validation

- Normalize phone numbers to E.164 and validate email syntax without treating syntax as proof of ownership.
- Require approved sender identities, supported destination country, locale fallback, template variables, and provider capability.
- Enforce SMS segment/Unicode limits and disclose estimated segment count; enforce email subject/body and link policies.
- Validate recipient consent and event eligibility immediately before send. Transactional/legal exceptions must be explicitly classified.
- Template publication fails for missing variables, unsafe markup, unknown helpers, or lack of default-locale coverage.

## Error semantics

- Message states: `queued`, `scheduled`, `sending`, `accepted`, `delivered`, `failed_retryable`, `failed_permanent`, `suppressed`, and `unknown`.
- API failures use stable codes such as `invalid_destination`, `template_invalid`, `sender_unverified`, `recipient_suppressed`, and `channel_unavailable`.
- Provider acceptance means accepted for delivery, not delivered. UI and APIs must preserve this distinction.
- Permanent failures include invalid destination, hard bounce, opt-out, and rejected content. Timeouts, provider `429`, and most `5xx` are retryable.
- A communication failure never changes delivery status and does not block domain transitions.

## Retry and idempotency

- Intent deduplication key combines tenant, domain event ID, audience, recipient, template key/version, and channel decision.
- Workers claim messages with leases. Retrying an accepted-but-ambiguous request uses provider idempotency when available or reconciles by external reference.
- Retry transient failures with channel-specific exponential backoff/jitter and provider `Retry-After`; cap by event usefulness (an “assigned” SMS should not arrive after delivery).
- Channel fallback is policy-driven, only after a classified failure/timeout, and must avoid duplicate recipient messages.
- Provider receipts are deduplicated by provider event ID and cannot regress terminal status.

## UI and admin touchpoints

- `/app/settings/notifications`: enable events/channels, configure sender/support identity, locale, quiet hours, and fallback.
- Template editor provides typed variable insertion, locale tabs, preview with synthetic data, test send, version history, and reset to platform default.
- Delivery detail shows a masked communication timeline and safe resend action where policy permits.
- `/admin` provides provider health, template approval, suppression investigation, tenant quotas, and emergency channel disablement.
- Public tracking offers scoped preference/opt-out controls without requiring an account.

## Observability

- Metrics by channel/provider/event/template version: queue age, render errors, acceptance, delivery receipts, bounce/failure, suppression, retry count, fallback, and cost units.
- Correlate domain event, message, attempt, delivery, tenant, adapter, and provider message ID while excluding raw destinations/content.
- Alert on queue SLO breach, provider error spikes, sender suspension, hard-bounce/complaint anomalies, receipt lag, and fallback storms.
- Audit template/settings changes, test sends, manual resends, suppression changes, and credential rotation.

## Phased delivery

1. **Foundation:** event consumer, immutable intents, one email and one SMS adapter, platform templates, deduplication, and basic logs.
2. **Reliable operations:** provider receipts, suppression, consent, retry expiry, fallback, monitoring, and delivery communication timeline.
3. **Merchant configuration:** branding, event/channel settings, locale overrides, preview/test, and versioned templates.
4. **Scale:** additional adapters, provider routing, quiet hours, cost controls, advanced localization, and regional compliance policies.

## Acceptance criteria

- One committed eligible domain event creates at most one message per policy decision despite duplicate event delivery.
- Email and SMS implementations satisfy the same adapter contract and can be replaced without changing domain logic.
- Destinations/content are masked from logs and unauthorized UI; tracking links are unguessable.
- Invalid/opted-out recipients are suppressed and never repeatedly retried.
- Transient provider failures retry within message usefulness, while permanent failures stop promptly.
- UI distinguishes queued, provider-accepted, delivered, failed, and suppressed states.
- Template validation, locale fallback, provider health, and all configuration/resend actions are testable and auditable.
