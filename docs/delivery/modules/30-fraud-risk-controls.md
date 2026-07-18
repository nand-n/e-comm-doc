# Module 30 — Fraud and Risk Controls

## 1. Purpose and boundaries

This module detects, scores, and controls abuse and financial or operational risk across merchant onboarding, authentication, delivery creation, dispatch, proof, COD, refunds, settlements, API use, and webhooks. It combines deterministic rules, configurable risk signals, review queues, and auditable decisions without silently changing the authoritative delivery or ledger state machines.

It owns:

- Risk signals, rules, policies, scores, decisions, holds, cases, watchlists, and reason codes.
- Synchronous controls where a risky operation must be allowed, challenged, held, or blocked.
- Asynchronous detection, case creation, review, escalation, and policy feedback.
- Risk limits for tenants, riders, partners, recipients, devices, API clients, payment references, and locations.

It does not own:

- KYC/KYB source records, identity-provider decisions, or sanctions-list content.
- Authentication, delivery lifecycle, pricing, ledger posting, settlement execution, or notification delivery.
- Law-enforcement reporting or legal conclusions; approved compliance procedures consume case evidence.
- Fully autonomous adverse action based solely on an opaque model.

Every score boundary, amount limit, velocity window, count limit, confidence level, distance tolerance, review SLA, evidence requirement, hold duration, retention period, retry policy, and alert threshold is configurable by environment and authorized scope. Defaults are conservative and documented.

## 2. Actors and permissions

| Actor | Capabilities |
|---|---|
| Risk analyst | Review cases, inspect permitted evidence, record disposition, request information |
| Risk lead | Configure policies, approve high-impact rules, release or extend holds, manage watchlists |
| Operations dispatcher | See operational restrictions and approved reason summaries; escalate cases |
| Finance operator | See and resolve COD, invoice, refund, and settlement holds within assigned scope |
| Platform admin | Manage system-level controls without altering case evidence |
| Tenant admin | Respond to requests and view tenant-visible decisions; cannot view cross-tenant intelligence |
| Rider / partner admin | Respond to assigned evidence requests and appeal eligible decisions |
| Automated risk service | Evaluate policies and create immutable decision records |
| Auditor / compliance reviewer | Read decisions, evidence lineage, overrides, and policy history |

Case access is purpose-limited and field-level. Analysts may only access assigned regions and case types. Overrides require a reason and, for configurable high-risk classes, a second approver.

## 3. Data and configuration

### 3.1 Core records

- `RiskSubject`: typed reference to business, user, rider, partner, recipient hash, device, IP prefix, API client, delivery, payout destination, or payment reference.
- `RiskSignal`: normalized signal name, value or category, confidence, source, observed time, expiry, and evidence reference.
- `RiskPolicy`: versioned rule set, scope, priority, effective interval, thresholds, action matrix, owner, and approval state.
- `RiskAssessment`: immutable input snapshot, policy version, score, matched rules, decision, reasons, and correlation ID.
- `RiskHold`: subject, protected operation, reason, start, configurable expiry, status, releaser, and release evidence.
- `RiskCase`: queue, severity, subjects, linked assessments, evidence, assignment, SLA, disposition, and appeal state.
- `WatchlistEntry`: subject fingerprint, source, reason, confidence, scope, review date, and expiry.
- `RiskOverride`: original decision, replacement action, actor, reason, approval, expiry, and audit metadata.

Raw sensitive evidence is stored separately with stricter access and configurable retention. Derived signals carry provenance and expiry so stale data cannot influence decisions indefinitely.

### 3.2 Signal families

- Identity and account: failed verification, account age, credential changes, suspicious session or device reuse.
- API and merchant behavior: delivery-create velocity, idempotency conflicts, repeated invalid addresses, unusual city or delivery-mode changes.
- Delivery operations: pickup/dropoff clustering, impossible travel, repeated reassignment, abnormal cancellation or failure rate, proof mismatch.
- Recipient and address: repeated claims, excessive failed attempts, reused contact or address fingerprints across unrelated tenants.
- COD and finance: amount anomalies, collection-to-remittance mismatch, excessive adjustments, unusual refunds, settlement destination changes.
- Rider and partner: location spoof indicators, overlapping jobs, proof reuse, collusion patterns, route deviation, earnings anomalies.
- Webhook and integration: signature failures, replay attempts, high error rates, or unexpected client behavior.

Signals must be documented, testable, explainable, and evaluated for bias and data quality before production use.

### 3.3 Decisions and controls

Supported outcomes are:

- `allow`
- `allow_with_monitoring`
- `challenge`
- `manual_review`
- `hold`
- `rate_limit`
- `block`

Policies map matched rules and configurable score bands to outcomes. The final decision is the most restrictive applicable action unless an explicitly versioned precedence policy states otherwise. Decisions include stable reason codes and tenant-safe explanations.

Controls may:

- Require step-up authentication or additional proof.
- Restrict delivery creation, COD eligibility, assignment, cancellation, refund, payout, settlement, API access, or sensitive profile changes.
- Place funds or operations on a reversible hold.
- Route a case to operations, finance, risk, or compliance.

Financial controls post no synthetic ledger entries. They prevent or defer a command; the owning finance workflow records the eventual authorized ledger transaction.

## 4. Workflows

### 4.1 Synchronous risk assessment

1. The calling module sends the intended action, actor, tenant, subjects, amount if relevant, and correlation ID.
2. The risk service loads the active policy and non-expired signals for the authorized scope.
3. Rules execute against a versioned input snapshot within a configurable latency budget.
4. The service returns a decision, stable reason codes, required control, assessment ID, and expiry.
5. The caller enforces the decision before committing the protected operation.
6. The decision and the caller's outcome are linked for later review.

### 4.2 Asynchronous monitoring

1. Delivery, identity, API, proof, webhook, and ledger events are consumed idempotently.
2. Signals are normalized and correlated without crossing tenant boundaries unless a platform-level control has an approved legal and security basis.
3. A policy may update risk state, open or merge a case, place a future-operation hold, or alert an analyst.
4. Late or corrected source events trigger a new assessment; prior decisions remain immutable.

### 4.3 Manual review

1. A case enters the queue with configurable severity and SLA.
2. Assignment respects region, tenant, role, and conflict-of-interest rules.
3. The reviewer inspects only the evidence necessary for the case.
4. The reviewer requests more evidence, releases or extends a hold, confirms a block, or marks a false positive.
5. Configurable high-impact dispositions require dual approval.
6. The subject receives an allowed tenant-safe notice and appeal path when policy requires it.

### 4.4 COD and settlement protection

1. COD collection, remittance, adjustments, and payout-destination changes produce risk signals.
2. Before settlement, the finance module requests a risk assessment for the payout batch and destination.
3. A hold prevents payout execution but does not alter immutable ledger balances.
4. Release requires configured evidence and approval.
5. Settlement proceeds idempotently using the original financial references after release.

### 4.5 Policy change

1. The owner proposes a version with thresholds, scopes, reason codes, expected impact, and rollback rule.
2. Historical replay or shadow evaluation estimates allow, review, hold, and block rates.
3. Required approvers review quality, bias, privacy, and operational capacity.
4. The policy starts in shadow mode, then rolls out through configurable scopes or percentages.
5. Guardrail breaches pause or revert the policy.
6. Old versions remain available for decision reconstruction.

### 4.6 Appeal and correction

An eligible subject submits an appeal linked to the decision. A reviewer who did not make the original high-impact decision reassesses current and original evidence. Corrections create new signals and decisions; source evidence and prior history are not overwritten.

## 5. APIs and events

Internal APIs include:

- `POST /internal/risk/assessments`
- `GET /internal/risk/assessments/{id}`
- `POST /internal/risk/signals`
- `GET /internal/risk/cases`
- `POST /internal/risk/cases/{id}/assign`
- `POST /internal/risk/cases/{id}/disposition`
- `POST /internal/risk/holds/{id}/release`
- `POST /internal/risk/appeals`
- `POST /internal/risk/policies`
- `POST /internal/risk/policies/{id}/activate`
- `POST /internal/risk/policies/{id}/rollback`

Assessment and mutation requests require idempotency keys. Protected-operation APIs pass the tenant and actor context from authenticated server-side identity, never from an untrusted client claim alone. Responses expose only reason codes and evidence allowed for the caller.

Consumed events include delivery lifecycle and assignment events, proof events, authentication security events, webhook delivery results, API rate events, and immutable ledger or settlement events.

Published events include:

- `risk.assessment.completed`
- `risk.challenge.required`
- `risk.hold.placed`
- `risk.hold.released`
- `risk.case.opened`
- `risk.case.escalated`
- `risk.case.dispositioned`
- `risk.policy.activated`
- `risk.policy.rolled_back`

Events contain policy and decision versions but exclude raw personal evidence. Consumers must be idempotent and tolerate delayed or out-of-order events.

## 6. Security, privacy, and fairness

- All case, watchlist, signal, and evidence access uses RBAC, tenant scope, field-level authorization, and immutable audit logs.
- Sensitive identity, location, device, recipient, and financial data is encrypted and minimized.
- Recipient contact data is fingerprinted where exact values are unnecessary; salts and keys are managed outside this module.
- Cross-tenant correlation is disabled by default and requires explicit platform policy, approved purpose, restricted output, and legal review.
- Analysts cannot export bulk evidence unless an approved, audited workflow allows it.
- Rule and model decisions must provide stable reason codes and reconstructable inputs.
- Protected characteristics and unjustified proxies are prohibited. Policies undergo configurable periodic bias and false-positive review.
- Watchlist entries require provenance, confidence, owner, review date, configurable expiry, and an appeal or correction mechanism where applicable.
- Administrative and analyst actions use step-up authentication according to configurable risk.
- Risk controls must not leak another tenant's existence, activity, or identifiers.

## 7. Failure handling

- If synchronous assessment is unavailable, each protected action follows a configured fail-open, fail-with-limits, queue-for-review, or fail-closed policy based on financial and safety impact.
- Timeout behavior and latency budgets are configurable. The caller records which fallback policy was applied.
- Duplicate source events do not duplicate signals, cases, holds, or notifications.
- Late events create a new assessment rather than mutating historical decisions.
- A policy compilation or validation failure leaves the prior verified policy active.
- Conflicting case updates use optimistic concurrency and return `409`.
- Holds expire, extend, or escalate according to configurable policy; expiry never silently releases a high-risk financial hold unless explicitly configured.
- False-positive spikes, review-queue saturation, or signal-source outages can automatically disable affected rules and revert to a safe policy version.
- Risk unavailability never permits direct mutation of delivery history or financial ledger entries.

## 8. Observability

Metrics include:

- Assessment volume, latency, timeouts, fallback decisions, and errors by action and policy version.
- Allow, challenge, review, hold, rate-limit, and block rates.
- Rule match rates, signal freshness, missing-source rate, and policy-version distribution.
- Case queue age, assignment time, disposition time, SLA breaches, and analyst workload.
- Hold count, amount, duration, release rate, and expired-hold behavior.
- False-positive, appeal, overturned-decision, and confirmed-loss rates.
- COD discrepancy, proof-reuse, account-takeover, and settlement-risk indicators.
- Outcome disparity and data-quality indicators for approved fairness dimensions.

Logs and traces include assessment ID, policy version, reason codes, tenant-safe subject references, source event IDs, and correlation ID. Raw evidence, contact data, exact location history, credentials, and financial secrets are excluded. Alert thresholds, aggregation windows, routing, and suppression are configurable.

## 9. Delivery phases

### Phase 1 — Foundation

- Rule engine, immutable assessments, basic account and API velocity controls, delivery-create limits, watchlists, audit, and manual review queue.
- Configurable allow, review, rate-limit, and block actions.

### Phase 2 — City operations and COD

- Rider, proof, location, cancellation, failed-delivery, COD collection, and settlement-hold controls.
- Case assignment, dual approval for configured actions, and operations/finance workflows.

### Phase 3 — Integrations

- Plugin and API-client behavior signals, webhook abuse detection, tenant-visible reason summaries, appeals, and policy shadow evaluation.

### Phase 4 — Scale

- Partner-fleet risk, multi-city correlation under approved controls, advanced behavioral scoring, automated policy guardrails, and mature fairness governance.

## 10. Acceptance criteria

- Every protected action has a documented configurable failure policy and never bypasses controls accidentally during a dependency outage.
- Every threshold, score band, amount, count, velocity window, tolerance, hold duration, SLA, and alert level is configurable and versioned.
- Assessments are deterministic for the same policy version and input snapshot, and historical decisions can be reconstructed.
- Risk decisions use stable reason codes and provide an authorized, tenant-safe explanation.
- Duplicate, delayed, and out-of-order events do not create duplicate holds, cases, or financial effects.
- Tenant isolation tests prove that actors cannot query, infer, or influence another tenant's risk data.
- A settlement hold prevents payout without mutating or obscuring immutable ledger balances.
- Policy rollout supports shadowing, configurable staged activation, guardrails, and rollback.
- High-impact overrides and dispositions follow configurable separation-of-duties approval and are fully audited.
- Sensitive evidence is minimized, access-controlled, redacted from logs and events, and deleted according to configurable retention.
- False-positive, appeal, case-SLA, hold, and outcome-disparity metrics are available by policy version.
