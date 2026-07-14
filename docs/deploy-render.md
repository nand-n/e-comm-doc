# Deploy docs to Render.com

VitePress → static site on Render.

## Build settings (must match dashboard)

| Field | Value |
|-------|--------|
| **Build command** | `rm -rf node_modules && npm ci && npm run docs:build` |
| **Publish directory** | `docs/.vitepress/dist` |
| **NODE_VERSION** | `20` |

## Fix the current failure

Your log showed two problems:

1. **`Installing dependencies with pnpm...`** — `pnpm-lock.yaml` was in the repo. **Delete it** (done in repo). Only keep `package-lock.json`.
2. **Node 26.5.0** from `engines: ">=20"` — pin to **`20.x`** (done). Add env `NODE_VERSION=20`.
3. **`npm ... reading 'matches'`** — happens when npm hits a leftover pnpm-style `node_modules`. Clean install with `rm -rf node_modules && npm ci`.

### In Render dashboard

1. **Settings → Build & Deploy**
2. Build Command:

```bash
rm -rf node_modules && npm ci && npm run docs:build
```

3. Publish Directory: `docs/.vitepress/dist`
4. Environment: `NODE_VERSION` = `20`
5. Push the latest commit (no `pnpm-lock.yaml`, Node `20.x`)
6. **Manual Deploy → Clear build cache & deploy**

## Local verify

```bash
rm -rf node_modules
npm ci
npm run docs:build
```

## Do not use on Render

- `corepack enable`
- `pnpm` / `pnpm-lock.yaml`
- `engines.node: ">=20"` (lets Render pick Node 26)
