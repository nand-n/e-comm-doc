# Release and Operations

How environments, releases, configuration, and incidents are handled for the Delivery platform.

## Environments

| Env | Purpose |
|---|---|
| Local | Developer machines with compose dependencies |
| Staging / sandbox | Merchant integration testing |
| Production | Live tenants |

Sandbox and production data must not mix. API keys are environment-scoped.

## Releases

1. Migrate database forward-only with expand/contract patterns.
2. Deploy API/workers.
3. Deploy web.
4. Verify health checks and smoke flows (create → assign → track).
5. Monitor error rate, webhook failures, assignment latency.

Feature flags gate risky capabilities (auto-dispatch, COD, plugins).

## Configuration and secrets

- Secrets in a secret manager / platform secret store, not git.
- Runtime config for cities, fees, thresholds via admin/config module.
- Document required env vars per service.

## Rollback

- Prefer forward fix for data migrations.
- App rollback allowed when schema remains compatible.
- Flag kill-switches for auto-dispatch, partner routing, and new fee rules.

## Runbooks (minimum)

- API down / dependency down
- Webhook storm or endpoint failures
- Stuck jobs in `awaiting_dispatch`
- COD mismatch
- Suspected key leak (revoke/rotate)
- Tracking token abuse

## Incident response

1. Detect via alert
2. Triage severity and tenant blast radius
3. Mitigate (disable flag, revoke key, pause worker)
4. Communicate to affected merchants as policy requires
5. Post-incident review with audit evidence

## Backup verification

Restore drills on a schedule. Record last successful restore test date in ops records.

## Acceptance criteria

1. Staging sandbox exists for integrators.
2. Production deploys have a checklist and smoke test.
3. Secrets are not committed.
4. Critical runbooks exist before broad merchant onboarding.
