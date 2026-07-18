# Module 28 — Security, Privacy, and Compliance

**Status:** Detailed delivery specification and control baseline  
**Dependencies:** Identity/RBAC, tenancy, platform admin, audit/observability, every data-owning module  
**Primary phases:** Baseline in Phase 1; continuous maturation

## 1. Purpose

Define platform-wide controls that protect tenants, users, recipients, riders, partners, operational data, financial records, cash-custody evidence, and integrations. Establish reviewable privacy and compliance workflows without making unsupported claims of certification or legal compliance.

## 2. Boundaries

### In scope

- Security governance, identity/access, tenant isolation, application/API/infrastructure/data security.
- Secure development, vulnerability and dependency management, incident response, business continuity.
- Data inventory/classification, minimization, retention, data-subject request support, consent/preference evidence, processor/vendor governance.
- Finance/COD/payment security controls and compliance evidence.

### Out of scope

- Legal advice, automatic determination of controller/processor roles, or claims that controls satisfy a named law, standard, tax, employment, payments, KYC/AML, sanctions, or certification regime.
- Storing raw card/payment credentials unless a separately approved architecture requires it.
- Replacing jurisdiction-specific counsel, processor contracts, risk assessments, or independent audits.

All jurisdiction, KYC/identity, sanctions, tax, employment, communications, location, biometric/signature, retention, breach-notification, data-residency, cross-border transfer, and payment-processor policies are **configurable legal/privacy/security review items**.

## 3. Actors and permissions

| Actor | Responsibility/permission |
|---|---|
| Security owner | Control baseline, risk register, incident program, exceptions |
| Privacy owner | Data inventory, purpose/retention, rights workflows, assessments |
| Compliance/legal reviewer | Jurisdiction/policy interpretation and approval |
| Platform/tenant admin | Scoped configuration and access administration |
| Service owner/engineer | Threat model, secure implementation, remediation, runbook |
| Finance/treasury | Segregated financial approvals, reconciliation, destination controls |
| Support/ops | Purpose-limited access and escalation |
| Vendor owner | Due diligence, contract/control evidence, offboarding |
| Auditor | Time-bound read-only evidence access |

No single role may develop, approve, deploy, and conceal a high-risk change. Security administrators cannot modify financial history; finance administrators cannot grant security privileges.

## 4. Data model and control records

- **DataAsset/DataElement:** owner, system, classification, subjects, purpose, source, recipients, residency, retention.
- **ProcessingPurpose:** purpose, lawful-basis placeholder, approved jurisdictions, review status/effective dates.
- **RetentionPolicy/DispositionJob:** class, duration trigger, hold rules, action, approvals, evidence.
- **ConsentOrPreferenceRecord:** subject/channel, notice/version, choice, captured/withdrawn time; used only where policy determines it applies.
- **DataSubjectRequest:** verified subject, request type/scope, deadlines, searches, exemptions placeholder, decision/evidence.
- **SecurityControl:** control id, owner, implementation, evidence, test frequency, status.
- **Risk/ThreatModel:** asset, threat, likelihood/impact methodology, treatment, owner, review.
- **SecurityException:** control, scope, justification, compensating controls, approver, expiry.
- **Vulnerability:** source, affected asset/version, severity, exploitability, owner, SLA, status.
- **Vendor/ProcessorRecord:** service, data/access, locations, due diligence, agreements, subprocessors, exit plan.
- **Incident/BreachAssessment:** facts, affected data/scope, decisions, reviewers, notification placeholders and evidence.

These records document decisions and review status; fields such as “lawful basis” or “notification required” are not auto-populated by engineering assumptions.

## 5. Operations and APIs

Restricted workflows:

- `POST /v1/admin/security/access-reviews`
- `POST /v1/admin/security/exceptions`
- `POST /v1/admin/privacy/requests`
- `POST /v1/admin/privacy/requests/{id}/verify`
- `POST /v1/admin/privacy/requests/{id}/execute`
- `POST /v1/admin/privacy/retention-runs`
- `GET /v1/admin/privacy/data-inventory`
- `POST /v1/admin/vendors/{id}/reviews`
- `POST /v1/admin/security/incidents/{id}/assessments`

Sensitive workflow APIs require strong authentication, least privilege, explicit purpose/reason, immutable audit, idempotency, and approval where material. Automated privacy actions generate a preview and exclusions report before execution.

## 6. Security rules

### Identity and tenancy

- Unique user identities; strong password storage; MFA for admins/finance and risk-based step-up.
- Short-lived sessions/tokens, rotation/revocation, secure recovery, and API keys shown once and hashed at rest.
- Authorization is server-side, deny-by-default, action/scope-based, and tested for cross-tenant object access.
- Service identities use short-lived credentials and least privilege.

### Application and API

- Validate schemas, authorize every object, rate-limit abuse, constrain uploads, and protect against common injection/request-forgery classes.
- Require idempotency for money and duplicate-sensitive operations.
- Sign webhooks with timestamp/replay protection; rotate secrets; log delivery evidence without secrets.
- Public tracking uses unguessable, revocable tokens and exposes minimum data.

### Infrastructure and development

- Separate environments/accounts and production access; encrypt transit/storage; centrally manage and rotate secrets.
- Protected branches, reviewed changes, reproducible builds, dependency/secret/static scanning, artifact provenance, and controlled deployment.
- Patch/vulnerability SLAs are risk-based and versioned; exceptions expire.
- Backups are encrypted, access-controlled, restore-tested, and subject to retention/disposition.
- Network and datastore access are minimized, monitored, and reviewed.

### Financial and COD controls

- Immutable balanced ledger; maker-checker adjustments, closes, settlements, and payouts.
- COD custody uses two-party handoff, current-custodian accountability, evidence, aging, and daily reconciliation.
- Merchant charges, merchant COD payable, rider payable, partner payable, platform revenue, and cash in transit remain separate.
- Payment destinations are tokenized/masked, verified, change-controlled, and monitored.
- Provider callbacks are authenticated/idempotent; unknown outcomes reconcile before retry.

## 7. Privacy and compliance rules

- Collect only fields necessary for a documented purpose; avoid putting personal data in free text, logs, metrics labels, or ledger descriptions.
- Classify data at least as public, internal, confidential, or restricted; identity, precise location, proof/signature, bank/payment, credentials, and security evidence are restricted as applicable.
- Enforce purpose-based role access, masking, export control, and access logging.
- Retention starts from defined events and supports legal holds; disposition is verifiable across primary, analytical, cache, search, and backup systems according to approved feasibility/policy.
- Privacy requests require identity verification proportionate to risk and protect other individuals/tenants.
- Deletion/anonymization must preserve immutable financial/audit records only where approved policy requires; minimize and restrict retained links.
- Notices, consent/preferences, communications opt-out, cookies/telemetry, rider location, and proof capture use versioned jurisdiction policy.
- Vendor access is inventoried, time-bound where possible, contractually reviewed, monitored, and revoked on exit.

## 8. States and governance

Control state: `planned → implemented → testing → effective`, with `deficient` or `retired`.  
Security exception: `draft → risk_review → approved → active → expired|remediated|revoked`.  
Privacy request: `received → identity_pending → verified → scoped → in_progress → review → fulfilled|partially_fulfilled|denied`, with reason and legal-review placeholders.  
Vulnerability: `detected → triaged → remediation → verification → closed`, or time-bound `risk_accepted`.  
Vendor review: `proposed → due_diligence → approved → active → review_due → offboarding → terminated`.

- Policies and controls have owners, versions, evidence, review cadence, and expiry.
- Exceptions must state scope, risk, compensating control, approver, and expiration; no permanent implicit exceptions.
- Legal/privacy/security approval statuses are visible to platform configuration; required features fail closed when approval is absent/expired.
- Claims about compliance/certification may be published only with documented authorized evidence.

## 9. Failure handling and incident response

- Security events route to severity-based triage with preservation of evidence and restricted communication.
- Suspected account compromise supports session/API-key revocation, credential reset, scope containment, and affected-action review.
- Suspected tenant-isolation failure is treated as high severity and blocks unsafe access paths.
- Payment/COD anomalies can hold settlement/payout without rewriting ledger or custody history.
- Privacy workflow failures stop automated disclosure/deletion, preserve partial-results evidence, and require review before retry.
- Incident records separate observed facts, hypotheses, decisions, actions, and jurisdiction-specific notification assessment.
- Recovery follows tested backups/runbooks and verifies tenant boundaries, ledger balances/checksums, custody positions, audit continuity, and queue watermarks.
- Notification duties and timing are never hard-coded as universal; they are configured after legal review.

## 10. Reports and metrics

- MFA and privileged-access coverage; stale accounts/roles; access-review completion.
- Cross-tenant authorization test coverage and denied-access anomalies.
- Vulnerabilities by risk/age/SLA, dependency freshness, secret exposures, and exception expiry.
- Security incidents by severity, detect/contain/recover times, recurrence, and action closure.
- Encryption/backup/restore/control-test coverage and failures.
- Data inventory/purpose/retention coverage, disposition success, legal holds, privacy-request age/outcome.
- Sensitive exports/access, vendor review status, subprocessors, offboarding completeness.
- Finance reconciliation exceptions, custody aging, destination changes, unknown payments, and approval-control violations.

Metrics must avoid misleading “compliance percentages” unless denominator, evidence quality, scope, and review status are explicit.

## 11. Delivery phases

- **Phase 1:** Tenant isolation, RBAC, secure auth/API keys, encryption, secret management, audit, backups, baseline inventory and incident runbook.
- **Phase 2:** MFA/step-up, secure upload/proof/location controls, vulnerability program, COD/finance controls, retention jobs.
- **Phase 3:** Privacy-request workflow, vendor governance, access reviews, formal threat models/control tests, evidence packages.
- **Phase 4:** Multi-region/residency controls, advanced detection, continuous control monitoring, jurisdiction profiles and reviewed processor policy automation.

## 12. Acceptance criteria

- Automated authorization tests prove tenant isolation for APIs, background jobs, exports, caches, analytics, and admin/support surfaces.
- Privileged and finance actions require appropriate MFA/step-up, segregation, reason, and immutable audit.
- Secrets, raw credentials, and prohibited payment data are not stored in logs, source, configuration diffs, or ledger metadata.
- Required financial accounts remain separate, journals immutable/balanced, custody traceable, and reconciliation evidenced.
- Every restricted data class has owner, purpose, access policy, retention status, and system locations recorded.
- Privacy requests cannot disclose another person’s or tenant’s data and cannot silently delete required source evidence.
- Security exceptions and vendor approvals expire and produce alerts/review tasks.
- Incident recovery tests verify operational state plus ledger, custody, audit, and tenant-boundary integrity.
- No product or documentation surface claims legal compliance or certification solely because these controls exist.
- Jurisdiction and payment-processor dependent behavior is disabled or marked pending until the required legal/privacy/security/finance review is approved.
