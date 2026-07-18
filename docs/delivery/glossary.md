# Delivery-as-a-Service Glossary

Canonical vocabulary for the delivery product. Where source documents use multiple labels, this glossary states the preferred meaning and distinguishes nearby concepts.

## Core organization and actors

### Tenant

An organization whose users, configuration, operational data, API credentials, and financial records are isolated from other organizations on the multi-tenant platform. In the current product model, a tenant is normally a **business**.

**Distinguish from:** the **platform**, which operates across tenants; a **branch**, which belongs to one tenant; and a **partner fleet**, which supplies delivery capacity and may serve multiple tenants.

### Business

The persisted tenant organization that buys delivery services and owns branches, deliveries, API keys, webhook endpoints, and finance views. `Business` is the entity/API term.

**Distinguish from:** **merchant**, which describes the business in its customer role. The documents sometimes say “business tenant”; this is one business record, not a separate entity type.

### Merchant

A business acting as the customer of the DaaS platform: it requests delivery service, pays delivery charges, may be owed collected COD, and integrates through the dashboard, API, or a commerce plugin.

**Distinguish from:** **recipient**, who receives the package; **partner fleet**, which fulfills deliveries; and **external store**, which is a merchant-owned commerce system.

### Branch

A merchant’s operating location, typically a store, warehouse, or pickup point. A branch belongs to one business and may be associated with a delivery through `branchId`.

**Distinguish from:** a **tenant/business**, which owns the branch, and a **stop**, which is a visit within a particular route.

### Customer / recipient

The person receiving a delivery. The preferred unambiguous term in delivery workflows is **recipient**. The recipient can use public tracking without a platform account.

**Distinguish from:** the **merchant**, which is the platform’s paying customer.

### Platform

The DaaS software and operating organization that manages tenancy, dispatch capabilities, service areas, pricing, integrations, tracking, and financial records.

### Platform admin

A platform-level user who can administer tenants, cities, zones, pricing, rider KYC status, settlements, audit records, and system health according to phase and permissions.

### Dispatcher / operations user

A user who monitors delivery work, assigns or reassigns riders, and handles exceptions. An `ops_dispatcher` works at platform operations scope; a `business_dispatcher` is limited to its own business’s deliveries.

### Rider

An individual courier who performs pickup, transport, COD collection when applicable, and delivery status updates. A rider may belong to the platform’s owned fleet or work through a partner fleet.

**Distinguish from:** a **partner fleet**, which is an organization, and an **assignment**, which links delivery work to a rider or fulfillment provider.

### Owned rider / owned fleet

A rider employed, contracted, or directly managed by the platform, or the collection of such riders. The fleet model is hybrid, so owned riders coexist with partner capacity.

### Partner fleet

An external delivery company that receives work from the platform, accepts or declines it, assigns its own riders, publishes status, and reconciles earnings.

**Distinguish from:** an **owned fleet**, which the platform manages directly, and a **partner rider**, who is the individual courier selected inside the partner’s organization.

### External store

A merchant’s commerce system, such as a Shopify- or WooCommerce-style store, that can create deliveries and consume status webhooks through a plugin.

## Delivery work and planning

### Delivery

The platform’s authoritative service record for moving one or more packages from pickup to dropoff under one lifecycle. `Delivery` is the canonical entity and public API resource.

**Distinguish from:** **job**, an operational view of work to perform; **shipment**, a general logistics term without a separate entity in the current model; and **route**, an ordered plan that may contain multiple stops or deliveries.

### Job

An operational unit of delivery work shown to a rider or partner. In Phase 1, rider “jobs” correspond to assigned deliveries; no separate `Job` entity is currently specified.

**Distinguish from:** the persisted **delivery** resource. Do not assume that a future optimized route, assignment offer, or return job is identical to the original delivery.

### Shipment

A general term for goods being transported. The current contracts do not define a separate `Shipment` entity; use **delivery** for the platform record and **package** for the physical item description.

### Package

A described physical item or parcel carried as part of a delivery. A delivery can contain multiple packages, with attributes such as description, weight, or fragility.

**Distinguish from:** a **delivery**, which owns the lifecycle, pricing, assignment, and tracking.

### Quote

A calculated offer or estimate for delivery service based on request details such as addresses, zone eligibility, distance, mode, and later pricing rules. A quote precedes confirmed dispatch work and moves a draft delivery to `quoted`.

**Distinguish from:** a **delivery charge**, which is the financial amount recorded for confirmed service, and an **invoice**, which requests payment.

### Assignment

The record or action that allocates a delivery job to a rider or, in later phases, a partner fleet. Reassignment changes who is responsible for fulfillment and should remain auditable.

**Distinguish from:** an **automatic rider offer**, which asks a rider to accept work before or as part of assignment; and a **route**, which organizes work geographically.

### Dispatch

The operational process of moving confirmed work from `awaiting_dispatch` to an assigned fulfillment resource and managing it through exceptions. Dispatch may be manual or automatic depending on phase.

### Stop

One ordered visit in a multi-stop route, usually representing a pickup, dropoff, or other required service location.

**Distinguish from:** an **address**, which describes a location; a **branch**, which is a reusable merchant location; and a **delivery**, which is the service record being fulfilled.

### Route

An ordered travel plan containing multiple stops, potentially covering multiple deliveries. Route building and optimization are Phase 4 concerns.

**Distinguish from:** a single **delivery**, a **batch** of records imported or grouped together, and a rider’s unordered **job list**.

### Batch

A collection of delivery records handled together for import, validation, creation, or operational grouping. CSV batch import is a Phase 3 capability.

**Distinguish from:** **bulk** delivery, which is a delivery mode, and a **route**, which defines stop sequence and travel order. A batch need not share one rider or route.

### Delivery mode

The service pattern requested for a delivery. Confirmed modes include on-demand, scheduled, bulk, multi-stop/routes, multi-city, and returns; the initial API enum currently exposes `on_demand`, `scheduled`, `bulk_item`, and `multi_stop`.

### On-demand delivery

A delivery requested for dispatch as soon as practical rather than for a future service window.

### Scheduled delivery / scheduled window

A delivery requested for a future time or service window. Detailed window rules are deferred to Phase 4.

### Bulk delivery / bulk item

A delivery mode for bulk work or items. The current documents do not yet define its exact operational constraints.

**Distinguish from:** a **batch**, which groups records for processing, and **multi-stop**, which describes one route with multiple visits.

### Multi-stop delivery

A delivery or route requiring more than one ordered service stop. Optimization and the multi-stop builder are Phase 4 capabilities.

### Multi-city delivery

A delivery whose service crosses or involves multiple configured cities. City-level behavior is part of the scale phase and is not yet fully specified.

### Return / return job

Work that moves goods back after a failed or completed delivery. `returned` is a terminal status on the original lifecycle, while a linked return job is the preferred way to represent the physical reverse movement.

**Distinguish from:** `delivery_failed`, which records an unsuccessful delivery attempt and does not itself prove that goods have returned.

### Exception

An operational condition outside the happy path, such as failure, a stuck delivery, cancellation, or return, requiring special handling or review.

## Locations, tracking, and evidence

### Address

A delivery-specific pickup or dropoff location containing human-readable fields, coordinates, and optional contact details.

**Distinguish from:** a **branch**, which is a reusable business location, and a **zone**, which represents service coverage rather than one point.

### Pickup

The location and action where custody of packages passes to the fulfilling rider or fleet. `picked_up` is the lifecycle status confirming that action.

### Dropoff

The intended recipient location and delivery action. `delivered` is the lifecycle status confirming successful completion.

### City

A configured operational geography that can contain service zones and city-level settings.

### Zone / service zone

A configured service-coverage area used to determine eligibility and, in later phases, pricing or operating rules. Phase 1 may represent it as a simple radius or box; richer polygon coverage is an admin concern.

**Distinguish from:** a **city**, which is a broader operational area, and an **address**, which is a point used for a particular delivery.

### ETA

Estimated time of arrival at a relevant delivery milestone. Phase 1 tracking may show a stub; live ETA based on location and operational data is Phase 2.

**Distinguish from:** a scheduled window, which is a promised or requested service interval rather than a continuously updated estimate.

### Tracking URL

The merchant-facing link that opens a delivery’s public tracking page.

### Tracking token

An unguessable credential embedded in a public tracking URL and used to retrieve tracking information without login.

**Distinguish from:** an API key or JWT, both of which authenticate broader platform access.

### Proof

Evidence that a pickup or delivery action occurred, such as a photo or signature, associated with the relevant lifecycle event. Proof capture and retrieval are Phase 2 capabilities.

**Distinguish from:** a **status event**, which records that an actor declared a transition; proof is supporting evidence for that declaration.

### Custody

Responsibility for the physical packages at a point in time. Custody generally passes from merchant to rider or fleet at pickup, and from rider or fleet to recipient at delivery; exact legal and evidentiary rules remain to be decided.

**Distinguish from:** an **assignment**, which allocates responsibility for work but does not by itself establish physical possession.

### Rider location / live location

A rider’s reported geographic position used for operational maps, tracking, and ETA. Location attached to a status event is an optional point-in-time observation; `RiderLocation` represents location reporting over time.

### Status event

An immutable history record of a delivery lifecycle transition, including time, actor, and optional location and reason.

### Audit log

A broader record of security- and business-relevant actions across the platform. Delivery status events are domain lifecycle history; the audit log covers administrative and other accountable actions as well.

## Lifecycle statuses

### `draft`

A delivery request being prepared and not yet quoted.

### `quoted`

A quote has been produced, but the merchant has not yet confirmed the delivery for dispatch.

### `awaiting_dispatch`

The merchant has confirmed creation and the delivery is waiting to be assigned.

### `assigned`

A rider or fulfillment resource has been allocated to the delivery.

### `rider_arriving_pickup`

The assigned rider is traveling to the pickup.

### `picked_up`

The packages have been collected from pickup and custody has passed operationally to the fulfilling rider or fleet.

### `in_transit`

The picked-up packages are moving toward delivery.

### `delivered`

The delivery has been successfully completed. It is a terminal happy-path status.

### `cancelled`

The delivery was stopped before completion under applicable cancellation rules.

### `delivery_failed`

A delivery attempt did not complete successfully. This does not necessarily mean that the goods have been returned.

### `returned`

The goods are recorded as returned following a failed or completed delivery. A linked return job is preferred for representing the physical reverse movement.

## Money and reconciliation

### Delivery fee / delivery charge

The amount charged to the merchant for delivery service. The Phase 1 ledger posts a stub `delivery_fee_quoted` entry when a job is confirmed; full pricing is introduced later.

**Distinguish from:** **COD**, which is collected from the recipient for the merchant, and **rider/partner earnings**, which are amounts payable for fulfillment.

### Prepaid

A payment arrangement in which the merchant funds delivery fees before service.

### Postpaid / invoice

A payment arrangement in which delivery charges are billed after service. Postpaid invoices are Phase 3.

### COD (cash on delivery)

Money the rider or fleet collects from the recipient at delivery on behalf of the merchant. COD is not platform revenue merely because the platform temporarily controls the cash.

**Distinguish from:** the **delivery fee**, which the merchant pays for the service, and **rider earnings**, which compensate fulfillment.

### COD amount

The amount requested for collection from the recipient for a particular delivery.

### COD collection

The act and event of receiving COD from the recipient. Collection creates a need to track cash custody and the amount payable to the merchant.

### Cash in transit

Collected COD that is under rider, partner, or platform control but has not yet been settled to the merchant. `cash_in_transit_cod` is the corresponding logical ledger account.

### Ledger

The immutable financial record made of entries posted to logical accounts. Balances are derived from entries; they are not changed without inserting a ledger row.

**Distinguish from:** a **settlement**, which discharges amounts owed, and an **invoice**, which requests payment.

### Ledger entry

An immutable financial posting that records a charge, payable, earning, cash movement, payout, or related event with references needed for reconciliation.

### Ledger account

A logical classification for entries, such as merchant delivery charges, merchant COD payable, rider earnings payable, partner earnings payable, platform revenue, or COD cash in transit.

### Payable

An amount the platform owes to another party. Examples include merchant COD payable and rider or partner earnings payable.

### Earnings

Compensation owed to a rider or partner fleet for fulfillment work. Earnings are separate from COD collected and from platform revenue.

### Settlement

The reconciliation and discharge of financial obligations, such as paying collected COD to a merchant or paying earnings to a rider or partner. A completed payout should reverse the relevant payable and record a payout reference.

**Distinguish from:** **payout**, the actual transfer or disbursement; and **reconciliation**, the process of matching records and explaining differences.

### Payout

An individual transfer of money made as part of settlement, identified by a payout reference.

### Reconciliation

The process of matching deliveries, external order identifiers, charges, COD collections, ledger entries, settlements, and external payment records.

### External order ID

The merchant-supplied identifier (`external_order_id` / `externalOrderId`) that connects a delivery to an order in the merchant’s system and supports search and reconciliation. It is not the platform’s delivery ID.

**Distinguish from:** the **idempotency key**, which identifies an API operation attempt and controls retry behavior.

## Integrations, security, and reliability

### API key

A business-scoped credential used by a merchant system to call the public API. Its secret is shown once and is distinct from user login credentials.

### JWT

A bearer token issued after user login and used for authenticated user requests.

### RBAC

Role-based access control: permissions are granted according to roles and scope, such as platform-wide, business-specific, rider-specific, or partner-specific access.

### Idempotency

The property that retrying the same creation request with the same key and body produces the original response rather than a duplicate delivery.

### Idempotency key

The merchant-provided `Idempotency-Key` value required for `POST /v1/deliveries`. It is scoped per API key/business; reusing it with a different request body is a conflict.

**Distinguish from:** **external order ID**, which identifies a merchant’s order and remains useful beyond one API operation.

### Request hash

A stable representation of an idempotent request body stored to detect whether a reused idempotency key carries different content.

### Webhook

An outbound HTTP notification sent by the platform to a merchant endpoint when a subscribed event occurs.

**Distinguish from:** an API request initiated by the merchant and public tracking requested by a recipient.

### Webhook endpoint

A merchant-registered destination URL and associated configuration used to receive webhook events.

### Webhook delivery

One attempt, or the recorded sequence of attempts, to send a webhook event to an endpoint. It has retry and failure state independent of the business event itself.

### Signed webhook

A webhook carrying an HMAC signature and timestamp so the recipient can verify authenticity and integrity.

### HMAC

A keyed cryptographic message authentication code. For current webhooks, the merchant verifies the signature over `timestamp.body` using the webhook secret.

### Outbox

A durable queue pattern in which events to be delivered are recorded transactionally and later processed by a worker, reducing the risk of losing notifications.

### Retry with backoff

Repeated webhook delivery attempts separated by increasing delays after transient failures.

### Dead letter

A webhook delivery that has exhausted its configured retry attempts and is retained for inspection or replay rather than retried indefinitely.

### Webhook replay

A controlled re-send of a previously recorded webhook delivery. Webhook logs and replay are Phase 3 capabilities.

### Sandbox

A non-production integration environment in which merchants can test API and webhook behavior without affecting live operations or money.

### OpenAPI

The machine-readable contract describing the public REST API’s endpoints, authentication, parameters, and schemas.

### Commerce plugin

An integration installed in an external commerce platform that creates deliveries, stores the platform delivery ID, and consumes webhooks to update fulfillment and tracking.

### White-label tracking

A public tracking experience presented with merchant branding. Public tracking starts in Phase 1; configurable logo and colors are Phase 3.

### Tracking page

The no-login recipient interface showing the delivery lifecycle, ETA, and—by phase—location, branding, and proof summary.

### KYC

“Know Your Customer” or related identity/compliance verification applied to riders, partners, merchants, or payout recipients as required by policy and law. The admin inventory references rider KYC status but does not yet define its rules.

### Availability

A rider’s declared online/offline state indicating whether the rider may be considered for work. Availability does not itself create an assignment.

