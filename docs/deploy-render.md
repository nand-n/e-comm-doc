# Deploy docs to Render.com

VitePress builds to static HTML. Use a **Static Site** on Render (not a Web Service).

## Option A — Blueprint (`render.yaml` in repo root)

1. Push this repo to GitHub / GitLab / Bitbucket.
2. In [Render Dashboard](https://dashboard.render.com/) → **New** → **Blueprint**.
3. Connect the repo. Render reads `render.yaml` and creates the static site.
4. Wait for the first deploy. URL: `https://e-comm-docs.onrender.com` (or your custom name).

## Option B — Manual static site

1. **New** → **Static Site** → connect repo.
2. Settings:

| Field | Value |
|-------|--------|
| **Name** | `e-comm-docs` (any name) |
| **Branch** | `main` (or your default) |
| **Root directory** | *(leave empty — repo root)* |
| **Build command** | `CI=true pnpm install --frozen-lockfile && pnpm docs:build` |
| **Publish directory** | `docs/.vitepress/dist` |

3. **Environment** → add:

| Key | Value |
|-----|--------|
| `NODE_VERSION` | `20` |

4. **Create Static Site**.

## Verify locally first

```bash
pnpm install
pnpm docs:build
pnpm docs:preview
```

Open the URL VitePress prints (usually `http://localhost:4173`).

## Custom domain (optional)

Render static site → **Settings** → **Custom Domains** → add your domain and set DNS as Render instructs.

## Notes

- **pnpm**: Render detects `pnpm-lock.yaml` and provides pnpm. Do not run `corepack enable`; Render's `/usr/bin` is read-only.
- **Free tier**: static sites on Render free tier spin down only applies to web services; static sites stay served from CDN.
- **Auto deploy**: each push to the connected branch triggers a new build.

## If build fails

| Issue | Fix |
|-------|-----|
| `EROFS ... unlink '/usr/bin/pnpm'` | Remove `corepack enable`; use the build command above |
| `pnpm: command not found` | Use `corepack pnpm install --frozen-lockfile && corepack pnpm docs:build` without running `corepack enable` |
| `esbuild` errors | `pnpm.onlyBuiltDependencies` already includes `esbuild` in `package.json` |
| Wrong site / 404 on routes | Publish path must be `docs/.vitepress/dist`, not `dist` |
