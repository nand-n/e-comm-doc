# Delivery-as-a-Service Documentation

Complete product and technical documentation for the multi-tenant delivery platform.

## Start here

1. [Product definition](./product-definition.md)
2. [Documentation conventions](./documentation-conventions.md)
3. [Architecture](./architecture.md)
4. [Application interfaces](./app-interfaces.md)
5. [Technical stack](./technical-stack.md)
6. [Contracts](./contracts.md)
7. [OpenAPI specification](./openapi.md) ([raw YAML](./openapi.yaml))
8. [End-to-end workflows](./workflows.md)

## Foundation modules

1. [Identity, authentication & RBAC](./modules/01-identity-auth-rbac.md)
2. [Multi-tenancy](./modules/02-multi-tenancy.md)
3. [Businesses & branches](./modules/03-businesses-branches.md)
4. [Cities & service zones](./modules/04-cities-service-zones.md)
5. [Delivery job lifecycle](./modules/05-delivery-job-lifecycle.md)

## Delivery operations

6. [Quoting & pricing](./modules/06-quoting-pricing.md)
7. [Dispatch & assignment](./modules/07-dispatch-assignment.md)
8. [Rider & fleet management](./modules/08-rider-fleet-management.md)
9. [Partner fleet management](./modules/09-partner-fleet-management.md)
10. [Live tracking & ETA](./modules/10-live-tracking-eta.md)
11. [Proof of pickup & delivery](./modules/11-proof-of-pickup-delivery.md)
12. [Exceptions & returns](./modules/12-exceptions-returns.md)

## Delivery modes — complete flows

- [Mode selection and shared flow](./modes/index.md)
- [On-demand delivery](./modes/01-on-demand.md)
- [Scheduled delivery](./modes/02-scheduled.md)
- [Bulk delivery](./modes/03-bulk.md)
- [Multi-stop / route delivery](./modes/04-multi-stop-routes.md)
- [Multi-city delivery](./modes/05-multi-city.md)
- [Returns](./modes/06-returns.md)
- [Cross-mode rules and testing](./modes/07-cross-mode-rules-and-testing.md)
- [Delivery mode API contracts](./modes/08-mode-api-contracts.md)

## Integration platform

13. [Public API & developer platform](./modules/13-public-api-developer-platform.md)
14. [API keys, idempotency & rate limits](./modules/14-api-keys-idempotency-rate-limits.md)
15. [Webhooks, outbox & retries](./modules/15-webhooks-outbox-retries.md)
16. [Commerce plugins](./modules/16-commerce-plugins.md)
17. [Notifications & communications](./modules/17-notifications-communications.md)
18. [Bulk import & batches](./modules/18-bulk-import-batches.md)
19. [Scheduling, multi-stop & routing](./modules/19-scheduling-multi-stop-routing.md)
20. [White-label tracking](./modules/20-white-label-tracking.md)

## Finance, administration & control

21. [Billing & ledger](./modules/21-billing-ledger.md)
22. [COD & cash custody](./modules/22-cod-cash-custody.md)
23. [Invoicing, settlements & payouts](./modules/23-invoicing-settlements-payouts.md)
24. [Platform administration](./modules/24-platform-admin.md)
25. [Reporting & analytics](./modules/25-reporting-analytics.md)
26. [Support & disputes](./modules/26-support-disputes.md)
27. [Audit & observability](./modules/27-audit-observability.md)
28. [Security, privacy & compliance](./modules/28-security-privacy-compliance.md)
29. [Configuration & feature flags](./modules/29-configuration-feature-flags.md)
30. [Fraud & risk controls](./modules/30-fraud-risk-controls.md)

## Delivery guides

- [Merchant quickstart](./guides/merchant-quickstart.md)
- [API integration guide](./guides/api-integration-guide.md)
- [Platform integration handbook](./guides/platform-integration-handbook.md)
- [Webhook consumer guide](./guides/webhook-consumer-guide.md)
- [Operations playbook](./guides/operations-playbook.md)
- [Rider operations guide](./guides/rider-operations-guide.md)
- [Finance reconciliation guide](./guides/finance-reconciliation-guide.md)

## Reference and quality

- [Data dictionary](./data-dictionary.md)
- [Glossary](./glossary.md)
- [Decision register](./decision-register.md)
- [Non-functional requirements](./non-functional-requirements.md)
- [Testing strategy](./testing-strategy.md)
- [Release & operations](./release-operations.md)
- [Roadmap](./roadmap.md)
- [Requirements traceability](./requirements-traceability.md)
- [Access control matrix](./access-control-matrix.md)
- [UX principles](./ux-principles.md)

## Documentation rule

Each module identifies:

- What it owns and does not own
- Actors and permissions
- Data and constraints
- APIs and domain events
- Workflows and state changes
- Validation and business rules
- Security, failure handling, and observability
- Phase boundaries
- Acceptance criteria

Values such as prices, SLAs, thresholds, retention periods, and legal policies remain configurable until the appropriate business, operations, finance, or legal owner approves them.
