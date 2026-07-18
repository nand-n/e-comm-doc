# OpenAPI — Delivery Platform API

The machine-readable public contract for Delivery-as-a-Service REST `/v1` lives here:

**Download / raw source:** [openapi.yaml](/delivery/openapi.yaml) (copied into the static site on every build from the canonical file next to this page).

## How to use it

1. Treat [`openapi.yaml`](./openapi.yaml) as the callable public interface for released paths and schemas.
2. Generate TypeScript clients from the committed file; do not hand-edit generated clients.
3. Keep module and guide examples aligned with this contract. If a module proposes a future path, capability-gate it until the OpenAPI file is updated.
4. Validate locally with:

```bash
npm run validate
npm run docs:build
```

## Complete OpenAPI contract

The specification below is rendered directly from the canonical
`docs/delivery/openapi.yaml` file. It is not a manually copied version.

<<< ./openapi.yaml

## Related docs

- [Contracts](./contracts.md) — lifecycle, idempotency, webhooks, ledger rules
- [API integration guide](./guides/api-integration-guide.md)
- [Platform integration handbook](./guides/platform-integration-handbook.md) — Shopify, WooCommerce, Odoo, supermarket, custom apps
- [Public API & developer platform](./modules/13-public-api-developer-platform.md)
- [Mode API contracts](./modes/08-mode-api-contracts.md)
