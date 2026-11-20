# HubLoan 2.5.3.1 — Narrative Progression hotfix

## Audit and confirmed cause

Base: master `e5e9df31feacfc3f50b9b545d3277fe7b2a531ec` (PR #29). Work branch: `hotfix/narrative-progression-2531`.

The exact exception was reproduced against the unmodified 2.5.3 validator before implementation (`reproduction-before.txt`). The new regression expecting all intermediate candidates failed before implementation (`regression-red.txt`). No private production campaign or provider response was retrieved, so the exact semantic contents of the user's failed request remain unverified.

Confirmed code defects:

- Legacy campaign generation supplied a `beat: hook` example, capabilities and events, but no genre-specific beat contract. Its outer retry loop produced the reported `CREATIVE_ATTEMPTS_EXHAUSTED` prefix.
- One-line supplied role arrays, but repair was still a scalar replacement at a fixed `scenes.1.beat`, irrespective of which scene actually developed the premise.
- Missing progression, invalid vocabulary and incomplete structure were conflated. Full regeneration after an unsuccessful local repair could discard otherwise valid plans.
- The previous regression tested a manually supplied successful scalar patch, not the full failing legacy orchestration.

## Implemented

`narrativeContract(kind)` is shared by generation, validation and repair. It defines opening, interior progression, ending, allowed labels and minimum scene count. Legacy campaign, one-line and advanced commentary prompts receive the contract as structured data. Existing genre vocabularies and legacy valid plans remain supported.

Missing progression now reports `field: scenes` and every intermediate `candidateIndices`, allowed progression roles and minimum count. Invalid role, missing structure, incompatible 3D format and invalid repair output have separate rule identifiers.

`narrative-repair.mjs` centralizes bounded repair for legacy and one-line planning:

1. Normalize only lexical equivalents (case, whitespace and explicit Portuguese equivalents). Never infer a role from scene position.
2. Validate the full adapter before any repair call.
3. Request one assessment across all intermediate scenes using the existing budgeted provider and persisted checkpoint.
4. Reclassification requires a literal content citation and a model rationale. The citation is verified against the scene or its referenced script line. Semantic judgment remains model-based, not deterministic artistic proof.
5. If progress is absent, permit textual revision of one intermediate 2D scene. Other scenes, timing, resources, visual provider, camera, actions and budget cannot change; narration cannot grow or be added to silent scenes.
6. Legacy 3D external scripts cannot be rewritten by this patch. If relabeling is insufficient, fail explicitly rather than invent gameplay or replace the script.
7. Run full adapter validation again. A failed bounded structural repair does not trigger another whole-campaign generation. `attemptLimit` is unchanged.

Safe diagnostic records contain rule, field, indices, status and timestamp, not scripts, evidence quotes or credentials. Campaign grids omit those details until selected. Existing paid outputs remain in checkpoints. A changed repair key cannot bypass an unrelated UNKNOWN/SENDING external operation. Reconciliation/explicit consent is still necessary; no unknown operation is silently reissued.

## Changed runtime files

- `server/narrative-validation.mjs`: contract, diagnostics, lexical normalization and format compatibility.
- `server/narrative-repair.mjs`: shared bounded, content-grounded repair.
- `server/creative-campaign.mjs`: legacy contract, scoped repair, no whole-campaign retry after structural repair failure.
- `server/astra-one-line.mjs`: shared contract and repair, safe diagnostics.
- `server/creative-plan.mjs`: adapter/narrative compatibility.
- `server/commentary-campaign.mjs`, `server/visual-commentary.mjs`: explicit advanced commentary generation contract.
- `server/execution-checkpoints.mjs`: uncertainty guard across changed operation keys.
- `server/studio-workspace-view.mjs`: lazy diagnostics.
- `server/app.mjs`: release marker.

Tests: `server/tests/narrative2531.test.mjs` plus updated existing `astra253.test.mjs` expectations. The recovery regression also now asserts unknown-outcome blocking before testing budget denial after explicit test consent. No tests removed, no dependencies or infrastructure changed.

## Validation

Final local suite: 344 tests, 335 passed, 9 optional skips, zero failures. Focused regressions: 31 passed. Backend changed-module unused-variable lint and frontend CI-scoped lint passed.

See `focused-tests.txt`, `server-tests.txt`, `frontend-build.txt`, `scoped-lint.txt`, `frontend-lint.txt`.

Controlled tests cover all five narrative kinds, exact original error, before/after regression, multiple intermediate scenes, lexical normalization without calls, content-grounded relabel, absent progression rewrite, unrepairable plans, forbidden changes, full-plan revalidation, budget/unknown-outcome propagation and old checkpoint reuse.

Real runner with controlled model: old three-format campaign repairs the second intermediate scene, uses exactly two model stub calls (one plan + one repair), stays at attempt 1 and enqueues three productions. One-line runner advances to AwaitingBudget. The existing real local MP4 test also runs; it is not proof of real-provider creativity or semantic repair quality.

Frontend build and scoped CI lint pass. Global frontend lint retains the pre-existing 11 errors and 2 warnings in unrelated modules; bundle size warning remains. No UI layout changed.

No paid model, audio or image generation was performed. No campaign was automatically retried in production. A valid contract does not guarantee humor or artistic quality.

## Recovery and limits

Existing campaign checkpoints are not deleted or migrated. The exact original legacy failure remains eligible for normal recovery subject to existing limits, budget and uncertain-operation authorization. A user-triggered resume can reuse the original confirmed planning checkpoint and apply the new repair. Invalid one-line plans already marked `requiresNewPlan` retain their existing block; this hotfix does not silently override consent or history. Explicitly unrepairable plans require review/new planning instead of endless retries. No claim is made that a particular private campaign has been recovered.

PR, CI and deployment verification are recorded in the PR description after checks complete.
