# Astra recovery hotfix 2.5.1

## Audit and confirmed causes

Base master: d50462e76df22ae9665244b1b0c6b813f1b2a52f. New branch: hotfix/astra-safe-recovery. Working tree was clean and had no unmerged code relative to master.

Confirmed in code: a single lifetime resume (`resumes >= 1`) blocked further recovery; network failures lost structured cause information; dispatches were accounted for conservatively but were not linked to durable stage IDs; planning missions could remain `running` after successfully enqueuing production, blocking the queue until lease expiry. The latter was reproduced/fixed through controlled end-to-end tests.

NOT confirmed: the reason for the user's original Private Property interruption. Private Render logs and the owner's authenticated workspace were unavailable. We did not inspect, reset counters, replay or charge that campaign. A 180-second timeout existed, but its existence is not proof that the request timed out. No private prompt, credential or account identifier was logged.

## Implemented recovery

- Structured provider failures distinguish authentication, quota, rate limit, timeout, transport, provider unavailability, model availability, refusal, invalid response and unknown outcome. Cancellation is separately identified.
- New campaign Responses calls use background execution with `store:false`, persisting `resp_*` before polling. On restart, a known outstanding ID is retrieved with GET rather than submitted again. Reasoning/model policy remains shared.
- Default ceilings remain bounded: 180s generation/poll deadline; GET requests outside that operation use 30s; image requests use 180s. No indiscriminate timeout increase. The response's temporary availability is provider-controlled.
- Automatic retries are limited to three transport attempts for explicit rate-limit rejection or read-only 5xx requests, with exponential backoff, jitter, Retry-After and cancellation. POST 5xx/network/disconnect/invalid JSON is not automatically retried.
- Stage records persist operation ID, campaign, label, provider, kind, dispatch state, timestamps, external ID, budget ledger link, outcome/checkpoint hash, usage, reconciliation and bounded partial text when returned. Result and COMPLETE state are saved atomically with the checkpoint. Raw output lives in the existing authenticated checkpoint store, not server logs.
- Unknown results without a recoverable response ID require explicit authorization of another potentially paid request. Known IDs are queried first; the UI also offers explicit replacement only after the provider returns a missing/expired response ID; a merely disconnected or still-running response cannot be replaced. Old charges remain conservatively reserved until reconciled. No undocumented POST idempotency guarantee is claimed.
- Campaign recovery defaults to three resumptions and three calls per stage, configurable up to ten/five. Legacy `resumes` is preserved for history; the new bounded attempt history governs recovery. Revision checks, serialized store mutations, mission leases and atomic stage claims prevent duplicate local execution.
- Preflight failures do not consume a recovery attempt. Results/checkpoints/artifacts remain intact. Completed planning is marked review, and older persisted budget-gate plans release their obsolete planning lease without regenerating.
- Historical unlinked paid ledger entries are treated conservatively: explicit consent is required, without deleting their history or changing their financial evidence. Unknown operations from expired/cancelled leases become reconcilable, not automatically repeatable.
- UI explains failed stage, cause, saved checkpoints, blocker, limits, corrective action and possible new cost. Resume is disabled until valid and any required consent is checked.

## Verification

All provider calls in tests use controlled transports. No real OpenAI, ElevenLabs or Higgsfield call was made; zero paid generation credits consumed.

`provider-recovery.test.mjs`: auth/quota/model/refusal, before/after-send cancellation/timeout, network loss, 429/Retry-After, 500/503, invalid JSON/incomplete output, background GET-only reconciliation, exhausted legacy counter, budget refusal, lease expiry, simultaneous stage claims and resumes, cross-workspace isolation and cancelled in-flight checkpoint preservation.

`astra-recovery-check.mjs`: real authenticated HTTP, SQLite, queue, checkpoints and FFmpeg with a controlled OpenAI transport. Two campaigns are interrupted, database/server closed and reopened, resumed and completed to human review. Scenario 1 submits once and recovers via GET. Scenario 2 fails after the checkpoint commit and resumes without any additional provider call. Both produce real local silent 15s MP4s. They are technical fixtures, not real-model or artistic demonstrations. `e2e.json` records operations, events, calls and renderer hashes. Temporary database is deleted, not committed.

`astra-recovery-ui-check.mjs`: real local frontend at 390/1440px using explicitly synthetic failure states. Authentication blocks resume; unknown-charge consent is required before the button enables; no overflow or runtime error. No resume/cost operation is triggered by this UI check. Screenshots in ui/.

See backend-tests.txt, recovery-tests.txt, build.txt and lint.txt for exact results. Optional live/neural environment tests retain explicit skips. No rendering, Live Factory, voice identity or premium provider adapters were replaced.

## Recovering an existing campaign

1. Reload Creative Studio and find the existing campaign under Campanhas.
2. Read Recuperação da campanha. If authentication/model/budget is blocked, correct that configuration first.
3. If an external response ID exists, use Consultar e continuar. This retrieves the existing response.
4. If the previous outcome cannot be confirmed, only opt into a new potentially paid request after accepting the displayed warning; existing budget caps still apply.
5. Use Retomar etapas pendentes. Completed checkpoints are reused. Legacy resume count alone no longer prevents this.
6. If the bounded new policy is exhausted, inspect the failure before changing Limites de recuperação. Rejected content or an invalid artistic result can require a new proposal.

The user's specific Private Property campaign was not accessed or replayed. The recovery path is delivered for their authenticated workspace; successful completion still depends on valid credentials, available models, budget and valid model output.

## Provider guarantee limits

OpenAI background documentation: https://developers.openai.com/api/docs/guides/background . Consulted during implementation. Background responses may be temporarily retained for retrieval even with store:false; retrieval is not an indefinite archive. A lost initial POST response can still leave no ID. The application cannot prove no charge occurred in that case, guarantee refunds or guarantee globally exactly-once paid execution. It blocks silent resubmission instead. Cancellation stops local waiting; a background provider operation may continue and is therefore retained as unknown/reconcilable, not labelled free or cancelled remotely.
