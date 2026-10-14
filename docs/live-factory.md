# Live Factory — first vertical slice

Audit base: master afe0b9bd9f8350d5ebe7666234b1e90f8566e849, merged PR #8, including PR #7. Local source tree was verified identical (736b6fe5614893ae7778de3d743eb54816818fbb). The referenced Boneco video was not available for direct inspection; no claim of having watched it. No external code, artwork or branding copied.

## Audit / reuse

| Area | Actual existing implementation | Decision |
|---|---|---|
| Projects / Astra | autonomy.mjs projects and strategy decisions, bounded paid calls | Same projects; live businessType stays outside generic paid production |
| Workers | runner.mjs asynchronous paid mission queue/checkpoints | Preserve; live ticks are deterministic and must not enqueue paid missions per frame |
| Storage | store.mjs SQLite/PostgreSQL JSON workspace, revision compare-and-swap | Same store and atomic mutation; additive liveFactory field |
| Security | app.mjs bearer workspace isolation, origin and rate controls | Same auth/rate boundary for every live read/control/event |
| Production / warehouse | video-production FFmpeg, runner checkpoints, human review, artifacts | Unchanged; live is not a fake MP4 artifact |
| Affiliate / shop / channels | PR #8 assisted affiliates, shop release, Etsy/Fiverr/itch controls | Preserved; none required for this modality |
| Economics | paid cost ledger and source-specific commercial records | No paid calls in live; infrastructure/revenue/profit unknown, never inferred from events |
| Visual interface | React mobile web and existing navigation | SVG renderer consumes persisted state; no game logic/timer in React |
| LIVE integration | No official adapter/credentials/eligibility verified | Not connected; simulation only |

## Delivered

Create a Live Factory project → start a 30-minute test → server timer (2s) claims executor ownership atomically → original Lume character changes pose → submit a simulated greeting/challenge/celebration → queue, rules, reaction and structured log → pause/resume → stop/emergency. UI polls authenticated state every 2s; no request must remain open. Closing UI does not stop runtime while Node is running.

Runtime and broadcast states are separate. This release executes TESTING, never claims TikTok RUNNING or verified broadcast. State names include STOPPED, INITIALIZING, READY, TESTING, RUNNING, DEGRADED, PAUSED, STOPPING, STOPPED_FINAL and ERROR; unsupported broadcast transitions have no API. Initialization records readiness then enters test. Stop is synchronous and transactional because there is no external process to drain. No decorative start-broadcast control.

Events accept only three enumerated commands; free text, code, URLs and claimed TikTok sources cannot become actions. Server constructs source SIMULATED_OPERATOR. IDs scoped to a session, retained up to 5,000 accepted events (then reject), 20 queued maximum, 500ms admission interval, ±bounded event timestamp, 30s queue expiry. Challenge priority is server assigned. Logs show receipt, rule, action/result, latency and no AI. Atomic state/action recording prevents duplicate application across competing workers. Logs retain last 200 records; session summaries last 30. This is bounded operational history, not an unlimited audit archive.

Heartbeat loss >10s produces DEGRADED, cancels queue and requires manual resume; a different process cannot claim a live owner. Graceful shutdown records degradation. Crash recovery reads the persisted session and degrades after stale heartbeat. Reopening UI restores state. No automatic external replay. Session deadline does not reset on resume. Emergency is transactional immediate stop; cannot stop an unrelated OBS session.

## Infrastructure / local execution

Node >=24; existing npm dependencies only. No GPU, OBS, TTS, FFmpeg or provider key needed for the first runtime/renderer. FFmpeg remains required for existing video tests. Use `npm ci --prefix server`, `npm ci --prefix frontend`, `npm run build --prefix frontend`, then `AGENT_DATA_FILE=data/live-demo.sqlite PORT=5000 npm start --prefix server`. Open http://localhost:5000/agentes/live. Use an isolated file for demos. Existing DATABASE_URL selects PostgreSQL instead.

Server hosting must actually keep the Node process alive. A free/sleeping host or closed Codespace cannot provide continuous live operations; frontend/Vercel alone is insufficient. Mobile admin remains web-accessible when its backend is available. Browser renders the preview only; closing it stops visual rendering, not the server brain. No server-side video encoding/output/streaming claimed. DB polling and writes every 2s per active workspace incur hosting/database usage, even with zero AI charges. No background production or paid API calls are added. A dedicated distributed fleet is intentionally not built. Active workspace scan is paginated; closed sessions are excluded.

## TikTok capability audit (2026-10-13)

Sources consulted: https://developers.tiktok.com/ (official product catalog / Content Posting vs Login), https://www.tiktok.com/safety/en/live-safety-guide (official age/moderation safety guidance), https://support.tiktok.com/en/live-gifts-wallet/tiktok-live/what-is-tiktok-live (indexed official help; direct fetch denied by robots), https://support.tiktok.com/en/log-in-troubleshoot/troubleshooting/issues-with-tiktok-live (indexed help). Eligibility is account/region specific; not verified for the owner. No universal follower threshold hardcoded.

| Capability | Evidence / permissions | This release |
|---|---|---|
| Account authorization | Login Kit exists; does not establish LIVE entitlement | No new OAuth claims |
| LIVE eligibility | Official account/age/region requirements; account must be checked in TikTok | UNVERIFIED; owner checks app |
| Start/stop LIVE | No general official endpoint verified in reviewed public developer catalog; partner access not established | No automation; operator must use approved platform tools |
| Comments / gifts | No authorized public LIVE event adapter verified | Simulated inputs only, labeled |
| Audience / retention | No authorized live analytics source connected | Unknown, not zero viewers |
| Rewards / payments | No platform financial source connected | Unknown; no gifts-to-BRL conversion |
| Broadcast confirmation | Starting an encoder is not platform confirmation | NOT_CONNECTED; cannot claim real LIVE |

Absence from reviewed public docs is not proof no partner program exists. Investigate official partner access before implementing an adapter. Community reverse-engineered LIVE libraries are not official APIs and were not installed. Account credentials/fiscal settings unchanged.

## Validation and next stages

Regression tests cover authenticated full lifecycle, workspace isolation, zero paid calls, atomic dedup, invalid commands/time/rate, pause, emergency, stale owner, persistent SQLite restart, competing owner, deadline and session replay. Full backend suite: 147 passing locally; frontend build and module-wide CI lint pass. Browser QA and CI evidence belong in the PR once completed.

Next: audiovisual renderer/output and visual usability tests → richer character/audio → snake using same event contracts → authorized broadcast controller → observed economics → bounded Astra configuration proposals. None of these later phases is claimed delivered. No mini-game, TTS, Higgsfield, real chat/gifts, OBS control, automatic broadcast, commissions or live profit in this PR.

Rollback: revert this commit; added workspace fields are inert and preserved. No destructive schema migration or credentials changes. Existing projects/payments remain untouched.
