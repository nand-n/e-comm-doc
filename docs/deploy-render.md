# Deploy docs to Render.com

VitePress builds to static HTML. Use a **Static Site** on Render (not a Web Service).

## Critical: update Build Command in the dashboard

If the service already exists, **Blueprint alone may not change the Build Command**.

1. Open the service → **Settings** → **Build & Deploy**
2. Set **Build Command** to exactly:

```bash
npm install && npm run docs:build
```

3. Set **Publish Directory** to:

```text
docs/.vitepress/dist
```

4. Remove any `corepack enable` from the build command (that causes `EROFS: unlink '/usr/bin/pnpm'`).
5. **Manual Deploy** → **Clear build cache & deploy**

## Option A — Blueprint (`render.yaml`)

1. Push this repo.
2. **New** → **Blueprint** → connect repo (or sync existing Blueprint).
3. Confirm build command is `npm install && npm run docs:build`.

## Option B — New static site

| Field | Value |
|-------|--------|
| **Build command** | `npm install && npm run docs:build` |
| **Publish directory** | `docs/.vitepress/dist` |
| **NODE_VERSION** | `20` |

## Why not pnpm on Render?

Render’s filesystem under `/usr/bin` is read-only. Anything that runs `corepack enable` (including auto-detect from a `packageManager` field) tries to rewrite `/usr/bin/pnpm` and fails with:

```text
EROFS: read-only file system, unlink '/usr/bin/pnpm'
```

Locally you can still use `pnpm` if you want. **On Render, use npm.**

## Verify locally

```bash
npm install
npm run docs:build
npm run docs:preview
```

## If build still fails

| Issue | Fix |
|-------|-----|
| `EROFS ... /usr/bin/pnpm` | Dashboard Build Command still has `corepack` or `pnpm`. Change it to `npm install && npm run docs:build`, clear cache, redeploy |
| Old command after push | Edit **Settings → Build & Deploy** manually; Blueprint sync is not always applied |
| Wrong publish path | Must be `docs/.vitepress/dist` |
