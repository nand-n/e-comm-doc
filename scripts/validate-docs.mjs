#!/usr/bin/env node
/**
 * Lightweight documentation integrity checks for CI and local pre-build.
 * No extra npm dependencies — uses Node built-ins + YAML via regex-safe parse fallback.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, dirname, resolve, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const docsRoot = join(root, 'docs')
let failed = 0

function fail(msg) {
  console.error(`FAIL: ${msg}`)
  failed += 1
}

function ok(msg) {
  console.log(`OK: ${msg}`)
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === '.vitepress' || name === 'node_modules') continue
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

// --- OpenAPI ---
const openapiPath = join(docsRoot, 'delivery', 'openapi.yaml')
if (!existsSync(openapiPath)) {
  fail(`missing ${openapiPath}`)
} else {
  const py = spawnSync(
    'python',
    [
      '-c',
      `
import yaml,sys
d=yaml.safe_load(open(sys.argv[1]))
assert d.get('openapi','').startswith('3.'), d.get('openapi')
assert 'paths' in d and len(d['paths'])>0
assert 'components' in d and 'schemas' in d['components']
schemas=d['components']['schemas']
for required in ['CreateDeliveryRequest','AddressInput','PackageInput']:
    assert required in schemas, required
print('paths',len(d['paths']),'schemas',len(schemas))
`,
      openapiPath,
    ],
    { encoding: 'utf8' },
  )
  if (py.status !== 0) {
    fail(`OpenAPI validation failed\n${py.stdout}\n${py.stderr}`)
  } else {
    ok(`OpenAPI parses (${py.stdout.trim()})`)
  }
}

// --- Sidebar pages ---
const configPath = join(docsRoot, '.vitepress', 'config.mts')
const config = readFileSync(configPath, 'utf8')
const links = [...config.matchAll(/link:\s*'([^']+)'/g)].map((m) => m[1])
let sidebarMissing = 0
for (const link of links) {
  if (!link.startsWith('/')) continue
  const rel = link.replace(/^\//, '').replace(/\/$/, '')
  const candidates = [
    join(docsRoot, `${rel}.md`),
    join(docsRoot, rel, 'index.md'),
    join(docsRoot, `${rel}.yaml`),
    join(docsRoot, `${rel}.yml`),
  ]
  if (!candidates.some((c) => existsSync(c))) {
    fail(`sidebar link has no page: ${link}`)
    sidebarMissing += 1
  }
}
if (sidebarMissing === 0) ok(`all ${links.length} sidebar/nav links resolve`)

// --- Relative markdown links ---
const mdFiles = walk(docsRoot).filter((f) => f.endsWith('.md'))
const linkRe = /\[[^\]]*\]\(([^)]+)\)/g
let missingLinks = 0
for (const file of mdFiles) {
  const text = readFileSync(file, 'utf8')
  let m
  while ((m = linkRe.exec(text))) {
    const url = m[1].trim()
    if (/^(https?:|mailto:|#)/i.test(url)) continue
    const pathPart = url.split('#')[0].split('?')[0]
    if (!pathPart || pathPart.startsWith('/')) continue
    const target = resolve(dirname(file), pathPart)
    if (!existsSync(target)) {
      fail(`broken link in ${file.replace(root + '/', '')}: ${url}`)
      missingLinks += 1
    }
  }
}
if (missingLinks === 0) ok(`relative links intact across ${mdFiles.length} markdown files`)

// --- Required delivery corpus ---
const required = [
  'delivery/index.md',
  'delivery/product-definition.md',
  'delivery/architecture.md',
  'delivery/technical-stack.md',
  'delivery/contracts.md',
  'delivery/openapi.yaml',
  'delivery/openapi.md',
  'delivery/guides/platform-integration-handbook.md',
  'delivery/modes/index.md',
  'delivery/modules/04-cities-service-zones.md',
  'delivery/modules/05-delivery-job-lifecycle.md',
]
for (const rel of required) {
  if (!existsSync(join(docsRoot, rel))) fail(`missing required doc ${rel}`)
}
ok('required delivery corpus present')

// --- Handbook coverage ---
const handbook = readFileSync(
  join(docsRoot, 'delivery', 'guides', 'platform-integration-handbook.md'),
  'utf8',
)
for (const section of [
  '## 9. Supermarket applications',
  '## 10. WooCommerce',
  '## 11. Shopify',
  '## 12. Custom e-commerce applications',
  '## 13. Odoo',
]) {
  if (!handbook.includes(section)) fail(`handbook missing section ${section}`)
}
ok('platform integration handbook covers supermarket, WooCommerce, Shopify, custom, Odoo')

if (failed > 0) {
  console.error(`\n${failed} validation error(s)`)
  process.exit(1)
}
console.log('\nDocumentation validation passed.')
