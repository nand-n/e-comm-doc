# 11 — Proof of Pickup and Delivery

## Purpose

Create trustworthy, privacy-conscious evidence that custody was accepted at pickup and completed or attempted at drop-off. Proof supports merchants, recipients, operations, disputes, partner compliance, and delivery transition guards without treating a photo alone as definitive truth.

## Boundaries

**Owns:** proof requirements, capture sessions, photo/signature/OTP/name/note metadata, secure artifact storage, validation, association to pickup/delivery attempts, proof summaries, and controlled access.

**Does not own:** assignment, general location tracking, canonical status transitions, exception decisions, notifications, or settlement. It provides validated evidence required by state-transition policy.

## Actor flows

### Pickup and delivery

1. Rider opens the assigned job and requests a capture session.
2. Server returns requirements based on event, business, package, city, fleet source, and risk policy.
3. Rider captures photo/signature/name/scan or verifies a recipient OTP. The app records source time and, when permitted, coarse contextual location.
4. Artifacts upload directly to protected object storage; rider finalizes a checksum-bound manifest.
5. Server validates completeness and binds proof to the active assignment and attempt.
6. `picked_up` or `delivered` proceeds only when required proof is valid or an authorized override is recorded.

For failed attempts, reason-specific evidence is linked to the attempt. Ops may review, request clarification, invalidate compromised evidence, or approve an override without rewriting history. Partners submit the same normalized manifest; external URLs alone are not permanent proof.

## Data model and constraints

- `ProofPolicyVersion`: scope, event (`pickup`, `delivery`, `failed_attempt`, `handoff`, `return`), conditions, requirements, retention/access policy, effective interval.
- `ProofCaptureSession`: delivery, assignment, stop/attempt, policy version, nonce, expiry, state, device/source.
- `ProofRecord`: event, delivery/assignment/attempt, source and server times, status, policy snapshot, actor, contextual location/freshness, override reference.
- `ProofArtifact`: kind, encrypted object key, MIME type, size, checksum, scan status, dimensions, retention class.
- `ProofAttestation`: OTP verification reference, recipient name/relationship, rider declaration, consent/notice version.
- `ProofOverride`: decision, reason, note, actor, timestamp, optional incident.
- Each proof belongs to one delivery and assignment/attempt; artifacts cannot move across tenants/jobs.
- Finalized manifests/checksums are immutable. Corrections create another proof version or attempt.
- OTPs are hashed, single-purpose, rate-limited, and expiring; plaintext codes are never persisted.
- Source and server timestamps are retained. Context location is evidence metadata, not authoritative tracking.

## API surface

- `POST /v1/riders/jobs/{id}/proof-sessions` — requirements and upload instructions.
- `POST /v1/riders/proof-sessions/{id}/artifacts` — register upload metadata/checksum.
- `POST /v1/riders/proof-sessions/{id}/finalize` — validate and create proof.
- `POST /v1/deliveries/{id}/delivery-code` — issue/resend through an authorized channel; never returns the code to the rider.
- `POST /v1/riders/jobs/{id}/verify-delivery-code`.
- `GET /v1/deliveries/{id}/proof` — authorized summary and short-lived artifact links.
- Existing `GET /v1/track/{token}` — approved summary only after delivery, not raw signatures by default.
- Ops review/invalidate/override endpoints with reason and expected version.
- Partner proof endpoint using the normalized manifest.

Finalize is idempotent by capture-session ID. Incomplete proof returns `422`; expired session or stale assignment returns `409`.

## Algorithms and rules

Requirement selection evaluates event, package value/category, COD, tenant policy, customer preference, city/legal policy, fleet source, and risk flags. The strictest applicable mandatory requirement wins; conflicting configurations are rejected.

Typical strategies are pickup photo plus contact name; attended delivery OTP or signature; contactless location photo plus instruction acknowledgement; high-value OTP plus signature/photo; and failed-attempt reason/note/photo where lawful.

Clearly configurable values:

- required/optional evidence by scope and condition
- accepted MIME types, dimensions, file size/count, compression
- capture-session and OTP TTL, resend interval, attempt limit
- contextual-location radius/freshness
- malware/content/quality checks
- retention and audience visibility
- offline capture age and delayed-finalization window
- override roles/reasons/dual-approval threshold
- partner ingestion/download deadline

Automated quality checks may flag evidence but must not make high-impact fraud decisions without review. Geofence mismatch is a signal, not sole proof of failure.

## State transitions

Capture session: `created -> uploading -> submitted -> validated | rejected | expired`.

Proof: `pending_validation -> valid | invalid | review_required`; `valid -> invalidated` only by authorized review with preserved history.

- `rider_arriving_pickup -> picked_up` requires valid pickup proof when configured.
- `in_transit -> delivered` requires valid delivery proof when configured.
- Failed-attempt evidence accompanies a `delivery_failed` command.
- Overrides satisfy a guard only with permission, reason, and audit.
- Return jobs keep separate pickup/completion proofs linked to the return job; they never overwrite original proof.

## UI touchpoints

- Rider job: requirement checklist, camera/signature/OTP, upload progress, offline queue, validation errors, and guarded status action.
- Merchant detail: proof summary, source/time, authorized artifact viewer, and override indicator.
- Public tracking: minimal proof summary under tenant policy.
- Ops review: job, attempt, location freshness, metadata, flags, decision, and history.
- Admin: versioned proof policies and retention.
- Partner portal/API: required manifest and ingestion status.

## Security and privacy

Use short-lived direct upload URLs, encryption, malware scanning, checksums, private object storage, and expiring downloads. Strip unnecessary EXIF after extracting permitted fields. Signatures, photos, names, and location are personal data: tenant/role/purpose restrict access, every access is auditable, logs are redacted, and retention/legal hold is enforced. Recipient notice/consent must fit local policy. Public tracking never exposes raw signatures, faces, IDs, storage keys, or reusable URLs.

## Failures and retries

Offline capture uses bounded encrypted local storage and stable IDs. Uploads resume by checksum; finalization is repeat-safe. Delayed submission after expiry requires explicit bounded policy and server validation. Storage/scan outage leaves proof pending and blocks guarded transition unless an authorized fallback applies. OTP delivery supports controlled resend/fallback without disclosure to riders. Partner evidence is copied into controlled storage asynchronously; inaccessible references require review. Orphan uploads are swept after a grace period.

## Metrics and observability

Track completion/validation latency, proof-type usage, upload retries/failures, scan rejection, blocked transitions, OTP send/verify/failure/lockout, offline submissions, overrides/invalidation, partner evidence failures, storage volume, retention completion, and proof disputes. Correlate delivery/assignment/attempt/session without logging content. Alert on storage/scan outages, unusual overrides, repeated rider failures, OTP abuse, and retention failures.

## Phase boundaries

- **Phase 1:** status events/audit and optional recipient name/note; reserve proof references.
- **Phase 2:** owned-rider photo/signature/OTP, secure storage, transition guards, proof summary, and ops review.
- **Phase 3:** merchant proof APIs/webhooks and white-label presentation controls.
- **Phase 4:** partner normalization, multi-stop/handoff/return policies, and advanced review.

Proof is additive to the authoritative status event and never replaces it.

## Acceptance criteria

- Configured pickup/delivery transitions are blocked until valid proof or an authorized audited override exists.
- Artifacts are tenant/job-bound, checksum-verified, private, and accessed only through expiring authorization.
- Retried uploads/finalization create one proof and no duplicate artifacts.
- OTPs expire, are hashed/rate-limited, and never appear to riders or logs.
- Public tracking exposes no raw sensitive proof.
- Offline and partner-delayed proof retains source time and confidence/review status.
- Invalidation preserves evidence and creates an audit event rather than rewriting delivery history.
- A linked return job has a proof chain separate from the original.
