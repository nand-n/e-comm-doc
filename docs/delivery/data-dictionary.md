# Delivery-as-a-Service — Data Dictionary

**Status:** Proposed baseline for design and implementation  
**Scope:** Major logical entities across tenant, delivery, fleet, finance, integration, and audit domains.

This dictionary refines the entities named in the product definition and delivery contracts. It is not a final physical schema. Fields marked **proposed** are design assumptions that require product, legal/privacy, finance, and local-operations review.

---

## 1. Conventions and assumptions

- **Proposed identifiers:** internal primary keys are UUIDs; IDs from merchant systems remain strings because their formats vary.
- **Proposed timestamps:** `timestamptz`, stored in UTC and rendered in the user's configured time zone.
- **Proposed money representation:** integer minor units plus ISO 4217 currency code. Never use binary floating point for accounting.
- **Tenant boundary:** `business_id` is the primary tenant key. Every tenant-owned row must be scoped and authorized by it, including indirect relationships.
- **Required notation:** “Conditional” means required only when the stated business condition applies.
- **PII labels:** `Yes` is directly identifying; `Sensitive` includes credentials, precise location, proof media, financial/KYC data; `Indirect` can identify a person when combined with other records; `No` is not expected to identify a person.
- **Source labels:** “User” includes merchant, rider, dispatcher, partner, and platform-admin input; “System” means platform-generated; “Integration” means merchant API, plugin, or partner API.
- **Proposed retention baseline:** durations below are product targets, not legal conclusions. Applicable law, contracts, tax/accounting rules, disputes, fraud holds, and deletion requests may require different periods. Legal hold overrides routine deletion.
- **Deletion model (proposed):** deactivate operational records first; later delete or irreversibly anonymize eligible PII while preserving required financial and security evidence.

---

## 2. Tenant and access domain

### `User`

Platform identity used for dashboard, operations, admin, rider, and partner access.

| Field | Type | Required | Constraints / notes | PII | Source | Retention notes (proposed) |
|---|---|---:|---|---|---|---|
| `id` | UUID | Yes | Primary key | Indirect | System | Account lifetime + 7 years in audit references; pseudonymize if eligible |
| `email` | string | Yes | Normalized; unique among active identities; verified separately | Yes | User | Account lifetime; erase/anonymize when no longer required |
| `password_hash` | string | Conditional | Required for password auth; never store plaintext | Sensitive | System | Until replaced or account deletion; purge promptly afterward |
| `name` | string | Yes | Display/legal name rules to be defined | Yes | User | Account lifetime; then deletion/anonymization policy |
| `phone` | E.164 string | No | Proposed for rider/ops contact; verification state stored separately | Yes | User | Account lifetime; minimize copies |
| `status` | enum | Yes | Proposed: `invited`, `active`, `suspended`, `disabled` | Indirect | System / admin | Account lifetime + audit period |
| `email_verified_at` | timestamptz | No | Null until verified | Indirect | System | Account lifetime |
| `last_login_at` | timestamptz | No | Security and support signal | Indirect | System | 1 year |
| `created_at`, `updated_at` | timestamptz | Yes | UTC audit timestamps | Indirect | System | Same as parent |

### `Business`

Merchant tenant that purchases and manages delivery services.

| Field | Type | Required | Constraints / notes | PII | Source | Retention notes (proposed) |
|---|---|---:|---|---|---|---|
| `id` | UUID | Yes | Primary tenant key | No | System | Tenant lifetime + 7 years where referenced by finance/audit |
| `name` | string | Yes | Merchant display name | No | User | Tenant lifetime |
| `legal_name` | string | No | Required before invoicing/settlement if applicable | Indirect | User | Financial retention period |
| `registration_number` | string | No | Country-specific validation | Sensitive | User | Financial/KYC retention period |
| `tax_id` | string | No | Encrypt or tokenize where appropriate | Sensitive | User | Financial retention period |
| `billing_email` | string | No | Valid email | Yes | User | Tenant lifetime + unresolved billing period |
| `default_currency` | ISO 4217 string | Yes | Proposed immutable once financial entries exist, or explicitly migrated | No | User / admin | Tenant lifetime |
| `default_timezone` | IANA time-zone string | Yes | Example: `Africa/Addis_Ababa` | No | User | Tenant lifetime |
| `status` | enum | Yes | Proposed: `pending`, `active`, `suspended`, `closed` | No | Admin / system | Tenant lifetime + audit period |
| `created_at`, `updated_at` | timestamptz | Yes | UTC audit timestamps | No | System | Same as parent |

### `BusinessMembership`

Many-to-many relationship between users and businesses, carrying tenant-scoped RBAC.

| Field | Type | Required | Constraints / notes | PII | Source | Retention notes (proposed) |
|---|---|---:|---|---|---|---|
| `id` | UUID | Yes | Primary key | No | System | Membership lifetime + 7 years in audit references |
| `business_id` | UUID | Yes | FK `Business`; tenant boundary | No | System | Same as parent |
| `user_id` | UUID | Yes | FK `User`; unique with business and role policy | Indirect | System | Same as parent |
| `role` | enum | Yes | `business_owner`, `business_admin`, `business_dispatcher`, `business_finance`, `business_viewer` | No | Owner / admin | Preserve history in audit log |
| `status` | enum | Yes | Proposed: `invited`, `active`, `revoked` | No | Admin / system | Same as parent |
| `created_at`, `revoked_at` | timestamptz | Yes / No | `revoked_at` required when revoked | Indirect | System | Same as parent |

### `Branch`

Tenant location from which deliveries commonly originate.

| Field | Type | Required | Constraints / notes | PII | Source | Retention notes (proposed) |
|---|---|---:|---|---|---|---|
| `id` | UUID | Yes | Primary key | No | System | Tenant lifetime; retain historical snapshot/reference on deliveries |
| `business_id` | UUID | Yes | FK `Business`; tenant boundary | No | System | Same as parent |
| `name` | string | Yes | Unique within active branches of a business (proposed) | No | User | Same as parent |
| `address` | address object | Yes | See common address fields below | Yes | User | Active lifetime; historical delivery copy follows delivery retention |
| `contact_name` | string | No | Operational contact | Yes | User | Active lifetime; remove when obsolete |
| `contact_phone` | E.164 string | No | Operational contact | Yes | User | Active lifetime; remove when obsolete |
| `city_id`, `service_zone_id` | UUID | Yes / No | Zone may be derived from coordinates | No | System / admin | Same as parent |
| `status` | enum | Yes | Proposed: `active`, `inactive` | No | User | Same as parent |

### `City` and `ServiceZone`

Platform-managed service coverage configuration.

| Entity / field | Type | Required | Constraints / notes | PII | Source | Retention notes (proposed) |
|---|---|---:|---|---|---|---|
| `City.id` | UUID | Yes | Primary key | No | System | Configuration lifetime + 2 years of versions |
| `City.name` | string | Yes | Localized names may be added later | No | Admin | Same as parent |
| `City.country_code` | ISO 3166-1 alpha-2 | Yes | Uppercase | No | Admin | Same as parent |
| `City.timezone` | IANA time-zone string | Yes | Used for local windows and reporting | No | Admin | Same as parent |
| `City.default_currency` | ISO 4217 string | Yes | Pricing default, not a substitute for entry currency | No | Admin | Same as parent |
| `City.status` | enum | Yes | Proposed: `active`, `inactive` | No | Admin | Same as parent |
| `ServiceZone.id`, `city_id` | UUID | Yes | Primary key and FK `City` | No | System | Configuration lifetime + 2 years of versions |
| `ServiceZone.name` | string | Yes | Unique within city version (proposed) | No | Admin | Same as parent |
| `ServiceZone.geometry` | geospatial polygon / JSON | Yes | Phase 1 may use radius/box; validate geometry | No | Admin | Preserve version used for quote/delivery |
| `ServiceZone.status` | enum | Yes | Proposed: `active`, `inactive` | No | Admin | Same as parent |
| `ServiceZone.effective_from`, `effective_to` | timestamptz | Yes / No | Non-overlapping version periods (proposed) | No | Admin / system | Same as parent |

---

## 3. Delivery domain

### Common `Address` value object

Addresses are proposed as immutable snapshots embedded in or linked from a delivery so later branch/contact changes do not alter history.

| Field | Type | Required | Constraints / notes | PII | Source | Retention notes (proposed) |
|---|---|---:|---|---|---|---|
| `line1` | string | Yes | Length and prohibited-content limits required | Yes | User / Integration | Delivery lifetime; redact/anonymize after operational and dispute needs |
| `line2` | string | No | Same controls as `line1` | Yes | User / Integration | Same as above |
| `city` | string | Yes | Retain source text even when mapped to `city_id` | Indirect | User / Integration | Same as above |
| `region`, `postal_code` | string | No | Country-dependent | Indirect | User / Integration | Same as above |
| `country` | ISO 3166-1 alpha-2 | Proposed | OpenAPI currently permits omission; proposed required for multi-country operation | Indirect | User / Integration | Same as above |
| `lat`, `lng` | decimal coordinates | Yes | Valid ranges; precision capped to operational need | Sensitive | User / Integration / geocoder | Precise values retained only for operational/dispute period |
| `contact_name` | string | No | Pickup/drop-off contact | Yes | User / Integration | Minimize; anonymize after retention period |
| `contact_phone` | E.164 string | No | May be conditionally required by local operations | Yes | User / Integration | Minimize; anonymize after retention period |
| `delivery_instructions` | string | No | Must warn against unnecessary sensitive data | Sensitive | User / Integration | Delivery lifetime; redact earlier where feasible |

### `Delivery`

Authoritative delivery job and current lifecycle projection.

| Field | Type | Required | Constraints / notes | PII | Source | Retention notes (proposed) |
|---|---|---:|---|---|---|---|
| `id` | UUID | Yes | Primary key | No | System | 7 years after completion/cancellation, subject to jurisdiction review |
| `business_id` | UUID | Yes | FK `Business`; tenant boundary | No | User / API key context | Same as parent |
| `branch_id` | UUID | No | FK `Branch`; must belong to same business | No | User / Integration | Same as parent |
| `external_order_id` | string | Yes | Merchant reconciliation key; proposed unique per business where merchant expects one delivery per order | Indirect | Integration / User | Same as parent |
| `mode` | enum | Yes | `on_demand`, `scheduled`, `bulk_item`, `multi_stop`; returns modeled by link/type decision | No | User / Integration | Same as parent |
| `status` | enum | Yes | Authoritative values from contracts; changes only through valid transitions | No | System | Same as parent |
| `pickup_address`, `dropoff_address` | address object | Yes | Immutable snapshots; multi-stop model extends this in Phase 4 | Yes / Sensitive | User / Integration | Operational access limited; anonymize when eligible |
| `scheduled_window_start`, `scheduled_window_end` | timestamptz | Conditional | Required for scheduled mode; end after start | Indirect | User / Integration | Same as parent |
| `cod_amount_minor` | integer | No | Non-negative; zero or null means no COD | Sensitive | User / Integration | Financial retention period |
| `currency` | ISO 4217 string | Conditional | Required when any money amount exists | No | User / system | Same as parent |
| `notes` | string | No | Length limit; discourage sensitive content | Sensitive | User / Integration | Redact/anonymize after operational need |
| `quote_id` | UUID | No | Proposed FK to accepted quote | No | System | Same as parent |
| `return_of_delivery_id` | UUID | No | Proposed self-reference for linked return job | Indirect | Ops / system | Same as parent |
| `created_at`, `confirmed_at`, `completed_at`, `cancelled_at` | timestamptz | Varies | UTC; state-dependent invariants | Indirect | System | Same as parent |

### `DeliveryPackage`

One physical handling unit attached to a delivery. One box, bag, envelope, crate, pallet, tube, or independently handled parcel is one package row. `item_count` counts contents inside that unit; it never groups multiple separately handled parcels.

| Field | Type | Required | Constraints / notes | PII | Source | Retention notes (proposed) |
|---|---|---:|---|---|---|---|
| `id`, `business_id`, `delivery_id` | UUID | Yes | Primary key and tenant-safe composite FK to `Delivery` | No | System | Same as delivery |
| `package_sequence` | integer | Yes | Positive; unique and stable within delivery | No | System | Same as delivery |
| `merchant_package_reference` | string | No | Bounded merchant correlation value; scoped uniqueness policy is configurable | Indirect | User / Integration | Same as delivery |
| `platform_package_code` | opaque string | Yes | System-generated unique operational identity; not public | Indirect | System | Same as delivery |
| `current_revision_id`, `confirmed_revision_id` | UUID | Yes / conditional | Current projection and immutable accepted snapshot | No | System | Same as delivery |
| `state` | enum | Yes | `draft`, `confirmed`, `corrected`, `voided_draft`; confirmed units are not deleted | No | System | Same as delivery |
| `row_version` | integer | Yes | Positive optimistic-concurrency version | No | System | Same as delivery |
| `created_at`, `updated_at` | timestamptz | Yes | UTC | Indirect | System | Same as delivery |

### `DeliveryPackageRevision`

Immutable package facts. Exact allowed values, limits, required declarations, size thresholds, and correction approvals are configurable and versioned; absent measurements remain unknown, never zero.

| Field group | Type | Required | Constraints / notes | PII | Source | Retention notes (proposed) |
|---|---|---:|---|---|---|---|
| Identity and lineage | UUIDs + integer | Yes | `id`, tenant/package/delivery IDs, unique `revision_number`, reason, optional superseded revision | No | System | Same as delivery |
| Description and contents | bounded strings / integer | Conditional | Description, controlled contents category, positive `item_count`, package form/container; minimize sensitive detail | Sensitive | User / Integration | Same as delivery; redact where eligible |
| Size classes | controlled strings | Conditional / derived | Separate declared, system, and effective class plus classification status; class profile/version and reason retained | No | User / System | Same as delivery |
| `weight_grams` | integer | No | Positive canonical integer when known; source retained | No | User / Operator / Integration | Same as delivery |
| `length_mm`, `width_mm`, `height_mm` | integers | No | All present or all absent, positive, normalized descending | No | User / Operator / Integration | Same as delivery |
| Derived geometry | checked integers | Derived | Longest/middle/shortest side, volume, profile-defined girth; null when inputs unknown | No | System | Same as delivery |
| Pricing weight references | integer + references | Derived | Volumetric and billable weight are pricing-owned outputs bound to policy/result versions | No | Pricing | Same as quote/delivery |
| Measurement/profile provenance | enums + references + hashes | Yes / conditional | Measurement status/sources, classifier/profile versions, normalized input hash, reason codes | Indirect | User / System | Same as delivery |
| Declared value | integer minor units + ISO 4217 | No | Non-negative; currency present iff value present; does not imply insurance | Sensitive | User / Integration | Financial/dispute retention period |
| Handling facts | booleans / controlled codes | Yes / conditional | Fragile, liquid, perishable, keep-upright, stackability, temperature, tamper/seal, special handling | Sensitive | User / Integration / Ops | Same as delivery |
| Goods declaration | enum + controlled codes + provenance | Conditional | Declaration and policy eligibility outcome; records policy result without making an independent legal determination | Sensitive | Declarant / Risk policy | Legal/risk-reviewed retention |
| Privacy facts | boolean + controlled enum | Yes | Sensitive-contents flag and privacy classification drive projection/redaction | Sensitive | User / Policy | Privacy-reviewed retention |
| Labels and identifiers | opaque references / protected hashes | Conditional | Label artifact references and redacted barcode data; raw values excluded from logs | Sensitive | System / Integration | Same as delivery |
| Custom references and metadata | bounded structured data | No | Approved key/value schema, depth/count/byte limits; no secrets or executable content | Potentially sensitive | User / Integration | Same as delivery |
| Provenance and hash | controlled strings + hash + actor/time | Yes | Source channel/schema, normalized content hash, creator and UTC time | Indirect | System | Same as delivery |

Canonical physical units are integer grams and millimetres. A compatibility adapter may convert decimal kilograms/centimetres only through exact decimal rules. The complete constraints, classification behavior, correction model, and ownership boundaries are authoritative in [Module 05](./modules/05-delivery-job-lifecycle.md).

### `DeliveryStatusEvent`

Append-only record of every accepted lifecycle transition.

| Field | Type | Required | Constraints / notes | PII | Source | Retention notes (proposed) |
|---|---|---:|---|---|---|---|
| `id`, `delivery_id` | UUID | Yes | Primary key and FK `Delivery` | No | System | Same as delivery; append-only |
| `from_status`, `to_status` | enum | Yes | Must match allowed state machine; first event may use null `from_status` | No | System | Same as delivery |
| `occurred_at` | timestamptz | Yes | Client occurrence time subject to skew checks | Indirect | Rider / ops / system | Same as delivery |
| `recorded_at` | timestamptz | Yes | Server receipt time | Indirect | System | Same as delivery |
| `actor_type` | enum | Yes | Proposed: `system`, `merchant_user`, `rider`, `partner`, `ops`, `admin` | Indirect | System | Same as delivery |
| `actor_id` | UUID | Conditional | Null only for system actor | Indirect | System | Pseudonymize where allowed while preserving accountability |
| `lat`, `lng` | decimal coordinates | No | Both or neither; valid ranges | Sensitive | Rider device / partner | Restrict access; reduce precision or delete after 90 days unless dispute requires |
| `reason_code` | enum/string | No | Prefer controlled codes | No | User / system | Same as delivery |
| `reason_text` | string | No | Free text; sensitive-data warning and length cap | Sensitive | User | Redact/anonymize after dispute window |
| `client_event_id` | string / UUID | No | Proposed unique per rider/partner source for offline deduplication | Indirect | Client | Same as delivery |

### `DeliveryAssignment`

Assignment history between a delivery and an owned or partner rider/fleet.

| Field | Type | Required | Constraints / notes | PII | Source | Retention notes (proposed) |
|---|---|---:|---|---|---|---|
| `id`, `delivery_id` | UUID | Yes | Primary key and FK `Delivery` | No | System | Same as delivery |
| `rider_id` | UUID | Conditional | Required for owned/direct rider assignment | Indirect | Dispatcher / system | Same as delivery |
| `partner_fleet_id`, `partner_job_id` | UUID / string | Conditional | Required for partner assignment as applicable | Indirect | Dispatcher / partner | Same as delivery |
| `assigned_at` | timestamptz | Yes | Server time | Indirect | System | Same as delivery |
| `unassigned_at` | timestamptz | No | Must follow assigned time | Indirect | System | Same as delivery |
| `assigned_by_user_id` | UUID | No | Null for automatic dispatch | Indirect | System | Same as delivery |
| `reason_code` | enum/string | No | Required for reassignment/unassignment (proposed) | No | User / system | Same as delivery |

### `Quote`

Proposed persisted pricing offer used to explain and reproduce the accepted charge.

| Field | Type | Required | Constraints / notes | PII | Source | Retention notes (proposed) |
|---|---|---:|---|---|---|---|
| `id`, `business_id` | UUID | Yes | Primary key and tenant boundary | No | System | Unaccepted: 1 year; accepted: same as delivery/finance |
| `request_snapshot` | JSON/object | Yes | Validated pickup/drop-off/package inputs; minimize PII | Sensitive | User / Integration | Unaccepted: 30–90 days for PII, subject to fraud needs |
| `fee_minor`, `currency` | integer + ISO 4217 | Yes | Non-negative; immutable | No | Pricing engine | Same as parent |
| `pricing_breakdown` | JSON/object | Yes | Versioned component codes and amounts | No | Pricing engine | Same as parent |
| `pricing_rule_version` | string / UUID | Yes | Supports reproducibility | No | System | Same as parent |
| `expires_at`, `created_at` | timestamptz | Yes | Expiry after creation | No | System | Same as parent |

### `TrackingToken`

Opaque capability token for public tracking without login.

| Field | Type | Required | Constraints / notes | PII | Source | Retention notes (proposed) |
|---|---|---:|---|---|---|---|
| `id`, `delivery_id` | UUID | Yes | Primary key and unique active token per delivery (proposed) | Indirect | System | Same as delivery metadata |
| `token_hash` | string | Yes | Store keyed hash, not plaintext; high-entropy token | Sensitive | System | Until expiry/revocation, then purge within 30 days |
| `expires_at` | timestamptz | Yes | Proposed bounded lifetime with renewal/rotation | No | System | Purge hash after expiry grace period |
| `revoked_at`, `last_accessed_at` | timestamptz | No | Access time is security metadata | Indirect | System | 90 days after token expiry |

### `DeliveryProof`

Proposed Phase 2 proof-of-pickup or proof-of-delivery metadata; binary content belongs in protected object storage.

| Field | Type | Required | Constraints / notes | PII | Source | Retention notes (proposed) |
|---|---|---:|---|---|---|---|
| `id`, `delivery_id` | UUID | Yes | Primary key and FK `Delivery` | No | System | Proposed 1 year, or longer for disputes/contracts |
| `proof_type` | enum | Yes | Proposed: `photo`, `signature`, `otp`, `name` | Sensitive | Rider / recipient | Same as parent |
| `object_key` | string | Conditional | Required for photo/signature; private bucket only | Sensitive | System | Delete object when retention expires |
| `recipient_name` | string | No | Collect only if required | Yes | Rider / recipient | Same as parent |
| `captured_at`, `captured_by_rider_id` | timestamptz + UUID | Yes | Server/client skew handling required | Indirect | Rider / system | Same as parent |
| `content_hash` | string | No | Integrity evidence | No | System | Same as parent |

---

## 4. Fleet domain

### `Rider`

Operational profile for an owned or partner-associated rider; authentication remains in `User`.

| Field | Type | Required | Constraints / notes | PII | Source | Retention notes (proposed) |
|---|---|---:|---|---|---|---|
| `id`, `user_id` | UUID | Yes | Primary key; unique FK `User` | Indirect | System | Engagement + 7 years for earnings/audit references |
| `partner_fleet_id` | UUID | No | Null for platform-owned fleet | Indirect | Admin / partner | Same as parent |
| `city_id` | UUID | Yes | Operational home city | Indirect | Admin | Same as parent |
| `status` | enum | Yes | Proposed: `pending`, `active`, `suspended`, `inactive` | Indirect | Admin / system | Same as parent |
| `availability` | enum | Yes | Proposed: `offline`, `online`, `busy` | Indirect | Rider / system | Current value; history only as needed |
| `vehicle_type` | enum/string | No | Controlled city-specific list | Indirect | Rider / admin | Engagement lifetime |
| `vehicle_registration` | string | No | Encrypt; access restricted | Sensitive | Rider / admin | Engagement + legally required period |
| `kyc_status` | enum | No | Store status and provider reference; avoid duplicating documents | Sensitive | Admin / KYC provider | As required by applicable KYC/contract rules |
| `created_at`, `updated_at` | timestamptz | Yes | UTC audit timestamps | Indirect | System | Same as parent |

### `RiderLocation`

High-volume location sample used for dispatch, live tracking, safety, and ETA.

| Field | Type | Required | Constraints / notes | PII | Source | Retention notes (proposed) |
|---|---|---:|---|---|---|---|
| `id`, `rider_id` | UUID | Yes | Primary key and FK `Rider` | Sensitive | System | Raw samples: 30 days; derived aggregates: up to 1 year |
| `delivery_id` | UUID | No | Present when associated with active job | Sensitive | System | Same as raw location |
| `lat`, `lng` | decimal coordinates | Yes | Valid ranges; precision limited to need | Sensitive | Rider device | Same as raw location |
| `accuracy_meters` | decimal | No | Non-negative | Sensitive | Rider device | Same as raw location |
| `heading_degrees`, `speed_mps` | decimal | No | Valid physical ranges | Sensitive | Rider device | Same as raw location |
| `recorded_at`, `received_at` | timestamptz | Yes | Supports offline uploads and stale-point detection | Sensitive | Device / system | Same as raw location |
| `client_event_id` | string / UUID | Yes | Unique per rider/device to deduplicate offline uploads (proposed) | Indirect | Rider device | Same as raw location |

### `PartnerFleet`

External delivery company participating in Phase 4.

| Field | Type | Required | Constraints / notes | PII | Source | Retention notes (proposed) |
|---|---|---:|---|---|---|---|
| `id` | UUID | Yes | Primary key | No | System | Partnership + 7 years for finance/audit |
| `name`, `legal_name` | string | Yes | Display and contracting identity | No | Partner / admin | Same as parent |
| `status` | enum | Yes | Proposed: `pending`, `active`, `suspended`, `terminated` | No | Admin | Same as parent |
| `contact_name`, `contact_email`, `contact_phone` | strings | Yes | Business contact details | Yes | Partner | Partnership lifetime; update/remove obsolete contacts |
| `settlement_currency` | ISO 4217 string | Yes | Changing requires controlled finance process | No | Partner / admin | Same as parent |
| `external_reference` | string | No | Unique within integration source | Indirect | Partner / admin | Same as parent |

---

## 5. Finance domain

### `LedgerEntry`

Immutable financial posting. A balanced transaction may contain multiple entries grouped by `transaction_id`.

| Field | Type | Required | Constraints / notes | PII | Source | Retention notes (proposed) |
|---|---|---:|---|---|---|---|
| `id`, `transaction_id` | UUID | Yes | Primary key and immutable posting group | No | System | Minimum 7 years; jurisdiction/accounting review required |
| `business_id` | UUID | Conditional | Required for merchant-related entries | No | System | Same as parent |
| `delivery_id` | UUID | No | Link where posting arose from delivery | Indirect | System | Same as parent |
| `rider_id`, `partner_fleet_id` | UUID | No | Payee links where applicable | Indirect | System | Same as parent |
| `account` | enum | Yes | Accounts listed in delivery contracts; version additions controlled | No | System | Same as parent |
| `direction` | enum | Yes | `debit` or `credit` | No | System | Same as parent |
| `amount_minor`, `currency` | integer + ISO 4217 | Yes | Amount positive; transaction debits equal credits per currency | Sensitive | System | Same as parent |
| `entry_type` | enum/string | Yes | Includes `delivery_fee_quoted`, COD, earnings, settlement types | No | System | Same as parent |
| `external_reference` | string | No | Payment/payout/provider reconciliation reference | Sensitive | Integration / finance | Same as parent |
| `effective_at`, `created_at` | timestamptz | Yes | Backdating policy required; creation immutable | Indirect | System | Same as parent |
| `reversal_of_entry_id` | UUID | No | Corrections use reversing entries, never mutation | No | System | Same as parent |
| `metadata` | JSON object | No | Schema/version by entry type; no secrets or unnecessary PII | Sensitive | System | Same as parent |

### `Invoice`

Proposed Phase 3 postpaid billing document.

| Field | Type | Required | Constraints / notes | PII | Source | Retention notes (proposed) |
|---|---|---:|---|---|---|---|
| `id`, `business_id` | UUID | Yes | Primary key and tenant boundary | No | System | Minimum 7 years; jurisdiction review required |
| `invoice_number` | string | Yes | Unique, immutable, jurisdiction-compliant sequence | No | System | Same as parent |
| `status` | enum | Yes | Proposed: `draft`, `issued`, `partially_paid`, `paid`, `void`, `overdue` | No | System / finance | Same as parent |
| `period_start`, `period_end` | date/timestamptz | Yes | End after start; local billing zone defined | No | System | Same as parent |
| `subtotal_minor`, `tax_minor`, `total_minor`, `currency` | integers + ISO 4217 | Yes | Totals reproducible from immutable line snapshots | Sensitive | System | Same as parent |
| `billing_identity_snapshot` | JSON/object | Yes | Legal name/address/tax ID at issue time | Sensitive | System | Same as parent |
| `issued_at`, `due_at`, `paid_at` | timestamptz | Varies | State-dependent | Indirect | System | Same as parent |

### `Settlement`

Proposed grouping of COD payable and rider/partner earnings into a reconciliation period.

| Field | Type | Required | Constraints / notes | PII | Source | Retention notes (proposed) |
|---|---|---:|---|---|---|---|
| `id` | UUID | Yes | Primary key | No | System | Minimum 7 years; jurisdiction review required |
| `beneficiary_type`, `beneficiary_id` | enum + UUID | Yes | Merchant, rider, or partner; valid polymorphic reference | Indirect | System | Same as parent |
| `period_start`, `period_end` | timestamptz | Yes | End after start; no unintended overlap | No | Finance / system | Same as parent |
| `gross_minor`, `deductions_minor`, `net_minor`, `currency` | integers + ISO 4217 | Yes | `net = gross - deductions`; signed-amount convention documented | Sensitive | System | Same as parent |
| `status` | enum | Yes | Proposed: `draft`, `approved`, `processing`, `completed`, `failed`, `cancelled` | No | Finance / system | Same as parent |
| `approved_by_user_id` | UUID | No | Required at approval; separation-of-duties policy proposed | Indirect | System | Same as parent |
| `completed_at` | timestamptz | No | Required when completed | Indirect | System | Same as parent |

### `Payout`

Proposed payment attempt for a settlement.

| Field | Type | Required | Constraints / notes | PII | Source | Retention notes (proposed) |
|---|---|---:|---|---|---|---|
| `id`, `settlement_id` | UUID | Yes | Primary key and FK `Settlement` | No | System | Minimum 7 years |
| `provider` | string | Yes | Controlled provider code | No | Finance / system | Same as parent |
| `provider_reference` | string | No | Unique when supplied | Sensitive | Payment provider | Same as parent |
| `destination_token` | string | Yes | Token/reference only; do not store raw bank/mobile-money credentials | Sensitive | Payment provider / user | Same as parent |
| `amount_minor`, `currency` | integer + ISO 4217 | Yes | Must match eligible settlement amount | Sensitive | System | Same as parent |
| `status` | enum | Yes | Proposed: `pending`, `submitted`, `succeeded`, `failed`, `reversed` | No | Provider / system | Same as parent |
| `failure_code` | string | No | Sanitized; no secrets | Sensitive | Provider | Same as parent |
| `created_at`, `completed_at` | timestamptz | Yes / No | UTC | Indirect | System | Same as parent |

---

## 6. Integration domain

### `ApiKey`

Merchant or partner machine credential.

| Field | Type | Required | Constraints / notes | PII | Source | Retention notes (proposed) |
|---|---|---:|---|---|---|---|
| `id`, `business_id` | UUID | Yes | Primary key and tenant scope; partner variant may use partner ID | No | System | Metadata: tenant lifetime + 1 year; secret hash until purge |
| `name` | string | Yes | Human-readable unique active name per tenant (proposed) | Indirect | User | Same as metadata |
| `key_prefix` | string | Yes | Non-secret lookup/display prefix | Sensitive | System | Same as metadata |
| `secret_hash` | string | Yes | Secret shown once; keyed hash preferred | Sensitive | System | Until revocation + 30-day security window |
| `scopes` | string array | Yes | Least privilege; explicit allowed operations | No | User / system | Same as metadata |
| `environment` | enum | Yes | Proposed: `sandbox`, `production` | No | User | Same as metadata |
| `expires_at`, `last_used_at`, `revoked_at` | timestamptz | No | Expiry encouraged; revocation immediate | Indirect | System / user | Usage time 1 year; revocation evidence in audit |

### `IdempotencyRecord`

Durable response cache preventing duplicate effects for mutating integration requests.

| Field | Type | Required | Constraints / notes | PII | Source | Retention notes (proposed) |
|---|---|---:|---|---|---|---|
| `id` | UUID | Yes | Primary key | No | System | Proposed 24–72 hours; endpoint-specific extension allowed |
| `business_id`, `api_key_id` | UUID | Yes | Scope key per API key/business as contracts require | Indirect | System | Same as parent |
| `endpoint`, `idempotency_key` | string | Yes | Unique within scope and endpoint; key length/charset bounded | Sensitive | Integration | Same as parent |
| `request_hash` | string | Yes | Cryptographic hash of canonical request | Sensitive | System | Same as parent |
| `response_status` | integer | Yes | HTTP status | No | System | Same as parent |
| `response_body` | encrypted JSON/blob | Yes | May contain PII; size limit required | Sensitive | System | Same as parent, then securely purge |
| `resource_type`, `resource_id` | string + UUID | No | Links created object | Indirect | System | Same as parent |
| `created_at`, `expires_at` | timestamptz | Yes | Expiry after creation | Indirect | System | Purge shortly after expiry |

### `WebhookEndpoint`

Merchant callback configuration and signing identity.

| Field | Type | Required | Constraints / notes | PII | Source | Retention notes (proposed) |
|---|---|---:|---|---|---|---|
| `id`, `business_id` | UUID | Yes | Primary key and tenant boundary | No | System | Active lifetime + 1 year metadata |
| `url` | HTTPS URL | Yes | Public HTTPS in production; SSRF validation and allow/deny rules | Sensitive | User | Active lifetime + operational history |
| `secret_ciphertext` | encrypted string | Yes | Never return after creation/rotation; managed encryption key | Sensitive | System | Until replaced/revoked; old key only through rotation grace |
| `event_types` | enum array | Yes | Subset of supported events | No | User | Same as parent |
| `status` | enum | Yes | Proposed: `active`, `paused`, `disabled` | No | User / system | Same as parent |
| `created_at`, `rotated_at`, `disabled_at` | timestamptz | Varies | UTC | Indirect | System | Same as parent |

### `WebhookDelivery`

Per-endpoint event delivery and retry history.

| Field | Type | Required | Constraints / notes | PII | Source | Retention notes (proposed) |
|---|---|---:|---|---|---|---|
| `id`, `webhook_endpoint_id` | UUID | Yes | Primary key and FK endpoint | No | System | 90 days hot; up to 1 year archived metadata |
| `event_id`, `event_type` | UUID + enum | Yes | Stable event ID; unique endpoint/event attempt grouping | Indirect | System | Same as parent |
| `payload` | encrypted JSON/object | Yes | Versioned schema; contains delivery/recipient data | Sensitive | System | Payload 30–90 days; retain hashes/metadata longer |
| `payload_hash` | string | Yes | Integrity/debug evidence | No | System | Up to 1 year |
| `attempt_count`, `next_attempt_at` | integer + timestamptz | Yes / No | Bounded retries with backoff | No | System | Same as parent |
| `status` | enum | Yes | Proposed: `pending`, `delivered`, `retrying`, `dead_letter` | No | System | Same as parent |
| `last_http_status` | integer | No | Valid HTTP status | No | Recipient server | Same as parent |
| `last_error_code` | string | No | Sanitized; never store credentials/full unsafe response | Sensitive | System | Same as parent |
| `delivered_at`, `created_at` | timestamptz | No / Yes | UTC | Indirect | System | Same as parent |

---

## 7. Audit domain

### `AuditLog`

Append-only security and business-administration event trail. Delivery lifecycle and financial ledger remain separate authoritative logs.

| Field | Type | Required | Constraints / notes | PII | Source | Retention notes (proposed) |
|---|---|---:|---|---|---|---|
| `id` | UUID | Yes | Primary key; append-only | No | System | Proposed 7 years for privileged/financial events; 1–2 years for routine events |
| `occurred_at` | timestamptz | Yes | Server-controlled where possible | Indirect | System | Same as parent |
| `business_id` | UUID | No | Null for platform-wide action | No | System | Same as parent |
| `actor_type`, `actor_id` | enum + UUID/string | Yes | Includes user, API key, system, support process | Indirect | System | Pseudonymize only when accountability requirements permit |
| `action` | string/enum | Yes | Stable names such as `api_key.created`, `delivery.assigned` | No | System | Same as parent |
| `resource_type`, `resource_id` | string + UUID/string | Yes | Identifies affected object | Indirect | System | Same as parent |
| `result` | enum | Yes | Proposed: `success`, `denied`, `failure` | No | System | Same as parent |
| `ip_address` | IP address | No | Truncate/anonymize after security window where feasible | Sensitive | Request context | Raw up to 90 days; anonymized up to audit retention |
| `user_agent` | string | No | Length cap and sanitization | Indirect | Request context | 90 days |
| `request_id`, `correlation_id` | string / UUID | Yes | Links logs/traces without embedding secrets | Indirect | System | Same as parent |
| `change_summary` | structured JSON | No | Allowlisted changed field names; redact values for secrets/PII | Sensitive | System | Same as parent |
| `reason` | string | No | Required for selected privileged actions (proposed) | Sensitive | User | Same as parent; redaction process required |
| `integrity_hash` | string | No | Proposed tamper-evidence chaining or signed archive | No | System | Same as parent |

---

## 8. Cross-domain integrity rules

These are **proposed invariants** unless already stated in the delivery contracts:

1. Tenant-owned foreign keys must resolve within the same `business_id`; authorization must not rely only on caller-supplied tenant IDs.
2. Delivery status is changed only by appending a valid `DeliveryStatusEvent` and atomically updating the delivery projection.
3. Reassignment closes the current `DeliveryAssignment` before or atomically with opening the next; at most one active direct assignment exists per delivery.
4. Ledger and audit records are append-only. Corrections create reversals or superseding events.
5. Every financial amount carries a currency; arithmetic never combines different currencies without an explicit conversion record and rate source.
6. API keys, tracking tokens, passwords, and webhook secrets are never stored or logged in recoverable plaintext unless encrypted recovery is explicitly required for webhook signing.
7. Public tracking responses expose only the minimum recipient-safe subset and never expose internal IDs, rider personal contacts, precise historical routes, secrets, or merchant-only notes.
8. Raw webhook payloads, idempotent responses, free-text notes, and audit changes are treated as potentially sensitive even when their schema does not require PII.
9. Offline rider writes include a stable client event ID, client occurrence time, and server receipt time; duplicates are safe and conflicting state transitions are rejected rather than reordered silently.
10. Retention jobs are tenant-aware, legal-hold-aware, observable, and able to delete protected object-storage content as well as database rows.
