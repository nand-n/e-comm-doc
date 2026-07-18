# E-Comm & Delivery Platform Documentation

This repository is a **documentation site** (VitePress). It contains:

- Delivery-as-a-Service (DaaS) product, module, mode, API, and integration specs under `docs/delivery/`
- Marketplace e-commerce implementation guides under `docs/implementation/`

No application runtime (NestJS / React / React Native) is scaffolded in this repo yet. The [technical stack](docs/delivery/technical-stack.md) defines the target implementation baseline.

## Requirements

- Node.js **20.x** (see `.nvmrc` and `package.json` `engines`)
- npm (lockfile: `package-lock.json` only — do not commit `pnpm-lock.yaml`)

## Commands

```bash
npm ci
npm run docs:dev       # local preview with hot reload
npm run validate       # OpenAPI parse + sidebar/link integrity checks
npm run ci             # validate + production build (preferred)
npm run docs:preview   # serve the production build locally
```

## Production build checklist

1. `npm ci`
2. `npm run ci` (runs `validate` then production `docs:build`)
3. Confirm `docs/.vitepress/dist` contains HTML for delivery, guides, modes, and modules, plus `/delivery/openapi.yaml`
4. Deploy with Render settings in [`docs/deploy-render.md`](docs/deploy-render.md) / [`render.yaml`](render.yaml)

## Key entry points

| Path | Purpose |
|------|---------|
| [`docs/delivery/`](docs/delivery/index.md) | DaaS documentation index |
| [`docs/delivery/openapi.yaml`](docs/delivery/openapi.yaml) | Public API contract |
| [`docs/delivery/guides/platform-integration-handbook.md`](docs/delivery/guides/platform-integration-handbook.md) | Shopify, WooCommerce, Odoo, supermarket, custom apps |
| [`docs/delivery/technical-stack.md`](docs/delivery/technical-stack.md) | React, React Native, NestJS, TypeORM, PostgreSQL, Redis |

## Deploy

Static site on Render:

- Build: `rm -rf node_modules && npm ci && npm run docs:build`
- Publish: `docs/.vitepress/dist`
- `NODE_VERSION=20`
