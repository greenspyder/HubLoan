# Live Factory 4.8 — Gift Champions (draft)

Base: master `61435e1b6a5ea89003fa7b862522e5501cf2c075`, incorporating PR #20. PR #21 extends the existing runtime, game, director, renderer, mixer and studio. No new parallel engine, paid API, merge or production deployment.

## Implemented

- Select 2, 4 or 6 competitors and enable Gift Champions in the existing game editor. Enable performance to submit authenticated simulated gifts.
- Top participants bind to stable IDs, not ranks. Color/model persist between rounds in the same session. New sessions reset identities; no cross-session VIP tracking is inferred.
- Rank/name updates do not reset bodies or scores. Entries/exits apply at the next round. Departing competitors finish their current round. Vacant positions remain free autonomous bots.
- Snake, dragon, cat, crocodile and fox variants share face/body infrastructure and identical collision rules. Six initial identities have distinct palettes; two use the snake archetype.
- Labels avoid overlapping each other and a focused-competitor strip displays name/rank/game points. Head colors update when a different identity takes a renderer slot.
- Gifts trigger cosmetic particles, reactions and camera cues only. No purchased speed, score, invulnerability or growth advantage. Lume recognizes entry, return, gift leadership and an associated game winner.
- Stable actor IDs distinguish score/winner records even when display names match. Legacy decorative manual bindings are disabled in automatic Champions mode.
- BFS pursuit now considers reachable space, rotating next-cell reservations, rival-head congestion and escape routes. Six safe spawns and more food support larger rosters. Growth caps at `max(15, floor(90 / participantCount))`; scoring continues at the cap. Golden growth obeys the same cap.

TikTok LIVE remains **NOT_SUPPORTED**. The authenticated adapter only accepts `SIMULATED_OPERATOR` fixtures, with existing validation/deduplication/limits. No genuine viewers, gifts, revenue or public-transmission confirmation is claimed.

## Tested

Final test logs are under `docs/evidence/phase48/`. The environment's default 15 FPS RTMP receiver test failed its 2-second lag budget during earlier executions. The watchdog stopped the encoder; it was not weakened. The existing 360×640/8 FPS `cpu` profile passed actual RTMP reception, H.264/AAC decoding, encoder interruption, renderer failure and intentional overload. `LIVE_TEST_PROFILE=cpu` selects this profile only for the successful receiver regression; the default remains `light` (15 FPS).

Backend checks cover association, rank changes without reset, return identity, JSON recovery, runtime gift deduplication, cross-session/workspace rejection, safe spawns, collisions, 2/4/6 simulation, score separation and new-session reset. Build and frontend lint passed. Optional browser/TTS tests are reported as skipped when their runtimes are absent, not as validated.

## Survival measurements

One deterministic 15-minute simulation per roster size, round limit 75 seconds:

| Competitors | Completed rounds | Mean | Minimum | Maximum |
| --- | --- | --- | --- | --- |
| 2 | 13 | 64.15 s | 20.6 s | 75 s |
| 4 | 14 | 60.21 s | 34.8 s | 75 s |
| 6 | 12 | 70.78 s | 48.8 s | 75 s |

Raw rounds and first-elimination times are in `survival.json`. Some individual eliminations still happen early (including 4.6 seconds with six competitors); long complete rounds do not mean every participant survives that long. These are deterministic trajectories, not randomized statistical evidence or real-time rendering measurements.

## Visual evidence and limits

`champions-comparison.png` contains six inspected operational-renderer frames from an intermediate validation checkpoint. Colors, name/rank labels and silhouettes differ. Faces remain visibly procedural, ears are rounded, and considerable background space remains. The operator's “Arena Neon das Serpentes Virtuais” reference was recovered and inspected; its artistic finish has **not** been achieved. The image is not evidence of a completed video or approval of final performance.

A software-WebGL microbenchmark at 360×640 rendered 30 sequential six-character frames in about 8 seconds. Readback and pixel serialization were material bottlenecks. This is not a stable broadcast FPS claim. Later experiments with Chrome 142 and reduced economy tessellation were not established as a validated final change and are not included in the delivery.

Six-minute capture attempts did **not** establish acceptance: an economy-profile attempt stopped after 19 frames with `FRAME_BUDGET_EXCEEDED`; another failed visual preparation. The last attempt's transient files were unavailable after environment recovery, so its outcome is unverified. There is **no validated 366-second recording** for this delivery. Do not reuse phase47 footage as phase48 evidence.

Kokoro code, fallback and the approved Brazilian Sunsets catalog remain intact. Standalone neural synthesis succeeded during investigation, but capture attempts also fell back after initialization/synthesis limits. No auditory review, neural-voice acceptance, AI singing, six-character 15 FPS, or 720p/30 claim is made.

## Reproduce

```sh
npm ci --prefix server
LIVE_TEST_PROFILE=cpu node --test --test-concurrency=1 server/tests/*.test.mjs
npm ci --prefix frontend
npm run build --prefix frontend
cd frontend && npx eslint src/features/agents src/shared
```

From repository root:

```sh
node server/tests/fixtures/champions48-survival.mjs > docs/evidence/phase48/survival.json
```

For the pending 366-second acceptance test, install the documented local Chromium/Kokoro/FFmpeg stack, set the phase47 runtime variables and an approved music WAV, create an absolute evidence directory, then run:

```sh
LIVE_CHAMPIONS_EVIDENCE=1 LIVE_EVIDENCE_PROFILE=economy \
LIVE_REPERTOIRE_EVIDENCE_DIR=/absolute/evidence \
node --test --test-name-pattern='RTMP performance' server/tests/live-performance.test.mjs
```

The test checks independent reception/decoding, duration, six associated actors, rank changes and an actual simulated-game winner. It preserves report/video before later quality assertions and writes a failure report when available. No streaming key is required for its local RTMP receiver.

## Acceptance status

IMPLEMENTED: association, persistence within session, six-competitor rules, cosmetic gifts, shared archetypes and controls.
TESTED: code checks and reduced-profile RTMP regression as recorded in logs.
VISUALLY INSPECTED: six still frames from the intermediate checkpoint; artistic finish insufficient.
AUDITIVELY VALIDATED: no.
PENDING: complete six-minute audiovisual evidence, final six-character rendering benchmarks, perceptual voice review, stronger animal silhouettes, fewer early individual eliminations and authorized real TikTok events.

No paid API charges were incurred. Local CPU, storage, bandwidth and electricity costs are unknown and must not be represented as zero. The PR stays draft until acceptance evidence is complete.
