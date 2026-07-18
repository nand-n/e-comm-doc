# UX Principles

Experience guidance for the merchant dashboard, operations console, rider app, public tracking, partner portal, and platform administration.

## 1. Product-wide principles

1. **Make the next action obvious.** Lead each screen with the delivery state, the most important exception, and the action the current role can take.
2. **Show operational truth.** Distinguish confirmed events from estimates, delayed data, queued changes, and stale location. Never imply a delivery or payment succeeded before the server confirms it.
3. **Preserve context.** Keep filters, search, selected delivery, map position, and partially completed forms when users navigate away or recover from an error.
4. **Prevent costly mistakes.** Use constraints, previews, and clear consequences before destructive, financial, identity, or lifecycle actions.
5. **Disclose by need.** Show personal, financial, proof, and location data only when required for the user's role and current task. Mask sensitive values in dense lists.
6. **Design for interruption.** Operational users switch tasks frequently and riders work in unstable conditions. Save progress, make state resumable, and avoid timeout-driven data loss.
7. **Use progressive disclosure.** Put routine work first; keep raw payloads, audit details, advanced filters, and configuration behind deliberate expansion.
8. **Keep one delivery understandable everywhere.** Dashboard, rider, API, webhook, tracking, and support views use the same authoritative status model while presenting role-appropriate detail.

## 2. Merchant experience

- The overview answers: what needs attention, what is active, what was completed, and whether money or integrations require action.
- Delivery creation follows the merchant's mental model: pickup, recipient and drop-off, package, timing, COD, then review. Validate serviceability and required fields before final submission.
- Preserve a draft automatically. Warn about unsaved or server-unconfirmed changes without trapping the user on the page.
- Show the quote, charge basis, COD amount, branch, and timing before creation. If a quote expires or changes, explain what changed and request confirmation.
- Make duplicate prevention visible when retries or repeated external order IDs are detected. Do not create another job silently.
- Delivery detail prioritizes current status, next expected event, assignment, timeline, tracking link, and exception. Technical identifiers and integration history remain available but secondary.
- List screens support branch, date, status, and exception filters; external order ID search; useful empty states; and export that honors active filters.
- Branch, API-key, and webhook setup use guided defaults. Secrets are shown once with a clear copy-and-store warning; users can rotate or revoke without exposing the old value.
- Finance views distinguish delivery fees, COD collected, pending balance, settled balance, invoice state, and payout state. Amounts always include currency and effective date.
- Bulk actions show eligibility before confirmation, report partial outcomes per item, and never reduce mixed results to a single ambiguous success message.

## 3. Dispatcher and operations experience

- Optimize the live board for rapid scanning: unassigned, at-risk, active, and exception work are visually distinct without relying on color alone.
- Keep list, board, map, and delivery detail synchronized. Selecting an item in one view identifies the same item in the others without losing filters.
- Assignment shows rider availability, current workload, distance or ETA quality, vehicle or capability constraints, partner ownership, and location freshness.
- Reassignment states the effect on the current rider and requires a reason. The former assignment remains visible in the timeline.
- Avoid hiding urgent work below routine work. Prioritize SLA risk, failed attempts, stale location, overdue pickup, unassigned jobs, and unresolved COD discrepancies.
- Updates should stream when possible, but always show last-updated time and an explicit stale or disconnected state. Never animate a rider position from guessed data.
- Keyboard navigation and shortcuts may accelerate high-volume work, but every action must remain discoverable and operable without shortcuts.
- Multi-select and bulk actions are limited to compatible states. Preview affected jobs and isolate failures so successful items are not repeated.
- Exception workflows ask for a structured reason, recommended next action, customer communication state, and accountable owner.
- Cross-tenant operators always see tenant, branch, city, and partner context. Changing context is explicit and cannot leak filters or records from the previous context.

## 4. Rider mobile and offline experience

- Treat the rider surface as mobile-first and usable one-handed outdoors. Primary actions are large, thumb-reachable, and separated from destructive or exceptional actions.
- The job screen centers the next stop, navigation, contact method, amount to collect, critical instructions, and one valid next status action.
- Do not require the rider to memorize information between screens. Keep address, contact, package count, COD, and special instructions available at the point of action.
- Deep-link to the rider's chosen map application and provide a copyable address when deep-linking fails.
- Show whether location sharing is active, why it is needed, and when it stops. Explain permission denial and provide a path to system settings without blocking unrelated tasks.
- Cache the assigned job list, essential job details, allowed next actions, and unsent proof metadata for unstable connectivity. Clearly label cached data and its last sync time.
- Offline actions enter an **Awaiting sync** state with local time, sequence, and visible retry status. Do not present them as confirmed platform status.
- Queue only transitions that were valid from the last known state. On reconnect, sync in order and surface conflicts instead of silently overwriting newer server state.
- Protect queued data across app restarts and prevent duplicate submissions. Tell the rider when it is safe to leave the screen.
- Proof capture gives framing, lighting, signature, and consent guidance; confirms image quality; and supports retake before upload. Compression must preserve evidentiary detail.
- COD is always shown with currency and collection state. The rider confirms the amount actually collected; discrepancies require a reason and cannot be hidden by a status transition.
- Low-bandwidth mode prioritizes text, status, navigation, and sync over maps, animation, and large media previews.
- Availability is explicit. Going offline explains whether active jobs and background location sharing are affected.

## 5. Tracking recipient experience

- No account is required. The unguessable tracking link opens a recipient-safe projection of exactly one delivery.
- Lead with plain-language status, latest confirmed update time, and what the recipient should expect next.
- Mark ETA as an estimate and communicate uncertainty. When no reliable ETA exists, say so rather than showing a fabricated or frozen countdown.
- Show a coarse or delayed rider location only during the relevant active window and according to safety policy. Never expose rider history, home location, phone number, or another delivery.
- Provide a safe contact path without exposing personal numbers where masked calling or messaging is available.
- Display the amount due for COD before arrival, including currency and accepted payment method guidance. Do not expose ledger or settlement details.
- After completion, show a minimal proof summary appropriate for the recipient. Hide internal notes, raw metadata, unrelated people, and sensitive proof details.
- Expired, revoked, invalid, cancelled, failed, and returned links each have clear, non-technical messages and a support path that does not reveal whether unrelated records exist.
- Branding may change logo and approved colors but cannot remove required safety, accessibility, privacy, or platform-trust information.

## 6. Admin, support, and finance experience

- Platform administration always displays the active tenant, city, zone, partner, and environment context. Cross-tenant search results identify their boundary before selection.
- High-impact changes show current value, proposed value, affected scope, effective time, and rollback or correction path.
- Pricing and zone configuration include a preview or simulation against representative inputs before publication.
- Tenant suspension, KYC decisions, role changes, credential revocation, and break-glass access require a reason and show downstream effects.
- Support access is case-linked and time-bound. Impersonation has a persistent banner naming the tenant, purpose, and expiry; ending it is always immediately available.
- Secret values are never displayed to support or admin users. Compromise workflows rotate or revoke credentials instead.
- Finance screens separate payable, receivable, COD liability, rider or partner earnings, adjustments, and settled funds.
- Settlement preparation, approval, and release are distinct states. Show who performed each step and prevent self-approval when policy requires separation of duties.
- Manual adjustments and reversals preserve the original entry, require a reason, and preview the resulting balance before confirmation.
- Reports state data freshness, timezone, currency, filter scope, and whether amounts are estimated, approved, or paid.
- Long-running exports, settlement runs, and webhook replays become resumable background tasks with progress, completion notification, partial-failure detail, and audit reference.
- System health summarizes impact and recommended action before raw infrastructure detail. Tenant payloads and credentials must not appear in diagnostics.

## 7. Accessibility

- Target WCAG 2.2 Level AA for all authenticated and public web experiences.
- Every function is keyboard operable with logical focus order, visible focus, skip links, and no keyboard traps.
- Use semantic headings, landmarks, lists, tables, form labels, button names, and status announcements. Dynamic updates use appropriately restrained live regions.
- Do not communicate status, urgency, assignment, or payment state through color alone. Pair color with text, icon shape, or pattern and maintain required contrast.
- Support browser zoom to 200% and text reflow at 400% without loss of content or function. Avoid fixed-height containers for essential text.
- Touch targets meet accessible sizing and spacing guidance, especially for rider status actions and proof capture.
- Error messages identify the field, describe the problem in plain language, and explain how to fix it. Focus moves to an error summary when submission fails.
- Maps have a list or text alternative containing the same actionable delivery and location information.
- Timelines, status steppers, charts, and route sequences have meaningful text alternatives and do not depend on spatial position alone.
- Respect reduced-motion preferences. Avoid flashing, unnecessary map movement, and animations that interfere with operational scanning.
- Photo and signature proof workflows provide instructions and alternatives defined by delivery policy for users unable to perform a capture gesture.
- Authentication and security checks must not rely solely on memory, transcription, puzzles, or a single sensory ability.

## 8. Localization and regional behavior

- Externalize all user-facing text, including errors, status explanations, notifications, proof instructions, and exported column labels.
- Support variable text length and plural rules without truncating critical actions. Layouts must work in right-to-left languages where enabled.
- Format dates, times, numbers, addresses, phone numbers, and currencies by locale while storing canonical values.
- Always include the currency code or unambiguous symbol in financial and COD contexts. Never combine amounts of different currencies into one unlabeled total.
- Operational timestamps use the relevant city or tenant timezone and display the timezone when ambiguity matters. Audit records retain exact instants.
- Address entry adapts to local structure rather than assuming one country's state, postal code, or street format. Preserve delivery landmarks and locally meaningful directions.
- Names are not forced into first-name/last-name assumptions, and phone validation supports approved service countries.
- Translated status language must preserve the authoritative lifecycle meaning. Avoid literal translations that imply guarantees the state does not provide.
- Notification templates use the recipient's supported language when known and fall back predictably. User-entered notes are not silently machine-translated.
- Icons, vehicle imagery, colors, maps, payment guidance, and proof consent language are reviewed for local meaning and legal requirements.

## 9. Error recovery and resilience

| Situation | Required behavior |
|---|---|
| Validation error | Keep all valid input, identify each affected field, focus the summary, and explain correction. |
| Network timeout | State that the result is unknown, keep the user's input, and offer a safe status check before retry. |
| Duplicate or idempotent retry | Return or link to the existing delivery and explain that no duplicate was created. |
| Authorization loss | Stop the action, preserve non-sensitive draft data where safe, explain the changed access, and provide a sign-in or administrator path. |
| Stale delivery state | Show the newer server state, identify the conflicting action, and let the user review before trying an allowed next action. |
| Partial bulk failure | Report success and failure per item, provide downloadable details, and retry only failed eligible items. |
| Offline rider conflict | Keep the queued event visible, show why it was rejected, and provide the valid next action or dispatcher escalation. |
| Proof upload failure | Preserve the local capture securely, show upload status, retry without recapture, and warn before any discard. |
| Webhook failure | Show attempt time, status, safe response excerpt, next retry, and manual replay eligibility without exposing secrets. |
| Background task failure | Retain parameters and completed work, provide a stable task reference, and offer a bounded retry or support path. |
| Session expiry | Warn when feasible, save draft state, return to the intended screen after authentication, and never repeat a destructive action automatically. |

Use specific, actionable error language. Include a correlation or support reference for unexpected failures, but do not expose stack traces, internal identifiers that create risk, credentials, or personal data.

## 10. Safety confirmations

Confirmation strength matches consequence:

- **No confirmation:** reversible navigation, filtering, copying, and ordinary non-destructive edits with undo.
- **Inline confirmation or undo:** low-risk archive, removing a draft item, or changing availability when no active job is affected.
- **Review step:** delivery creation, material address or COD change, bulk action, assignment, reassignment, cancellation, proof submission, and delivery-failed or returned transitions.
- **Strong confirmation with re-authentication where appropriate:** ownership transfer, privilege escalation, API-key or webhook-secret rotation, bank-detail change, ledger reversal, settlement release, tenant suspension, and break-glass support access.

Confirmations state the specific object, current state, resulting state, affected people or money, whether notifications will be sent, and whether the action is reversible. Avoid generic “Are you sure?” prompts.

Rider actions require additional safeguards:

- **Picked up:** confirm the correct delivery and package count.
- **COD collected:** confirm amount and currency independently from delivery completion.
- **Delivered:** confirm recipient or safe-drop method and required proof.
- **Delivery failed:** require reason and optional structured evidence; explain whether another attempt or return follows.
- **Returned:** confirm destination and custody transfer.

Never place opposing high-consequence actions adjacent without spacing and distinct labels. Disable an action only when the reason is visible; otherwise explain why it cannot proceed.

## 11. Status language

The stored status values remain authoritative. Interfaces may show localized labels and explanations but must not invent additional lifecycle states that conflict with automation, API responses, or webhooks.

| Authoritative status | Preferred user label | Meaning shown to users |
|---|---|---|
| `draft` | Draft | Not submitted for delivery. |
| `quoted` | Quote ready | Price or service quote is ready; delivery is not yet awaiting dispatch. |
| `awaiting_dispatch` | Awaiting assignment | Confirmed and waiting for a rider or partner assignment. |
| `assigned` | Rider assigned | A rider or fleet has accepted responsibility; pickup has not started. |
| `rider_arriving_pickup` | Rider heading to pickup | Rider is travelling to the pickup location. |
| `picked_up` | Picked up | Custody has transferred to the rider or fleet. |
| `in_transit` | On the way | Delivery is moving toward the recipient or next stop. |
| `delivered` | Delivered | Completion was confirmed, with proof when required. |
| `cancelled` | Cancelled | Delivery will not proceed. |
| `delivery_failed` | Delivery attempt failed | The attempt did not complete; show the permitted next step without implying cancellation. |
| `returned` | Returned | Goods were returned to the defined return destination and custody was transferred. |

Additional display badges such as **Awaiting sync**, **Location stale**, **Proof uploading**, **At risk**, or **Settlement pending** describe UI or operational conditions, not delivery lifecycle states. Render them separately from the status.

Use active, neutral language. Do not blame riders, merchants, or recipients. Do not say “arriving soon,” “guaranteed,” “paid,” “settled,” or “delivered” unless the corresponding evidence and state support it. Every status view includes the latest confirmed event time and, when useful, the responsible actor category without exposing unnecessary identity.

## 12. Responsive behavior

- Design from task priority, not desktop shrinkage. Preserve status, next action, exceptions, amount due, and sync state at every viewport.
- On small screens, replace wide tables with readable cards or a priority column set plus a detail view. Do not require horizontal scrolling for primary actions.
- Filters become a clearly summarized drawer or sheet; active filters remain visible and easy to clear.
- Desktop operations may use split panes for board, map, and detail. Tablet collapses secondary panes; mobile uses a single focused view with an obvious return path and preserved selection.
- Maps never displace essential text actions. On narrow screens, default to delivery details or list and make the map optional.
- Sticky headers and action bars must not cover content, focus indicators, errors, browser controls, or the on-screen keyboard.
- Forms use suitable input modes and avoid side-by-side fields when space is limited. Review summaries remain available before submission.
- Public tracking prioritizes status and ETA text before map or branding media. It remains useful on low-end devices and constrained networks.
- Rider screens account for glare, gloves, motion, intermittent connectivity, safe stopping, notches, and changing orientation. Do not require interaction while navigation is active.
- Dense finance and admin tables retain sortable headers and row identity on desktop, then move secondary columns into row detail on smaller screens.
- Printing and exported documents preserve tenant, date range, timezone, currency, page identity, and confidentiality context.
- Test supported experiences at narrow mobile widths, large desktop widths, zoomed layouts, landscape orientation, virtual-keyboard open states, and slow or offline network conditions.
