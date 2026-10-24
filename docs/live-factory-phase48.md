# Live Factory 4.8 — Gift Champions (draft)

Base audited: master `61435e1b6a5ea89003fa7b862522e5501cf2c075`, incorporating PR #20. No separate survival branch was found. This extends the existing simulation, director, face builder and worker; no second renderer, mixer or encoder.

## Behavior

Select 2, 4 or 6 competitors in the existing studio and enable Gift Champions. Enable performance and use explicitly simulated operator gifts. Top positions bind to stable participant IDs. Identity includes color, archetype and first-seen time, persisted inside the existing experience/session. Ranking changes update names and rank immediately without resetting bodies or scores. New/replaced competitors enter only at the next round. Removed competitors finish their current round; returning IDs retain their appearance. Missing places are filled by free autonomous bots. A new session resets this relationship; no cross-session personal profile or VIP inference is collected.

Snake, dragon, cat, crocodile and fox heads reuse the face builder and shared body physics. The first six identities have distinct palettes and persistent archetypes. The sixth uses the snake archetype with a different palette. Heads and labels are implementation candidates, **not artistically approved assets**. No reference image was available in this execution.

Gifts only trigger presentation metadata/particles and camera cues. No speed, score, survival or collision advantage is purchased. Game winners are identified by stable actor ID, independently of gift ranking. Physical score and gift quantity remain separate. Legacy manual overlay bindings are disabled when automatic Champions association is selected.

## Survival

The existing 200 ms simulation keeps BFS food pursuit and adds reachable-space checks and rotating next-cell reservations. Six safe spawn lanes, six foods for larger rosters, and a disclosed body-length cap (`max(15, floor(90 / participantCount))`) reduce arena saturation. Eating continues to score at the cap. The rotating planning order avoids permanent priority for rank 1. Collision rules and bounds remain unchanged.

`docs/evidence/phase48/survival.json` contains reproducible 15-minute deterministic trajectories for 2/4/6 bots, including complete round lengths and first eliminations. These are simulation measurements, not live rendering FPS or broad statistical evidence. Earlier eliminations can still occur; survival is not guaranteed.

## Validation and current limits

New automated coverage: ID association, rank changes without reset, return identity, JSON recovery, safe spawns, collisions, 2/4/6 survival, no score changes from ranking metadata and session isolation. Existing authentication/deduplication, RTMP failure/watchdog and workspace regression tests remain relevant.

The existing RTMP evidence test now accepts `LIVE_CHAMPIONS_EVIDENCE=1` for a 366-second capture, six simulated participants, rank reversal and gifts after their arena entry. It asserts receiver duration, decoded audio/video, six associated actors and a genuine game winner. Use the same environment and local approved music described in phase47, plus `LIVE_REPERTOIRE_EVIDENCE_DIR`, `LIVE_CHAMPIONS_EVIDENCE=1` and `LIVE_EVIDENCE_PROFILE=light`.

**Pending:** execute and inspect that six-minute capture; compare archetype images; measure actual six-character FPS, latency, memory and perceptual quality. Browser installation failed on the download proxy during preparation. No new video, artistic approval, auditory approval or 720p/30 claim is made. Do not reuse the 4.7 video as evidence for this version.

TikTok LIVE events remain `NOT_SUPPORTED`: no official event credentials/access have been validated. Only `SIMULATED_OPERATOR` events are accepted, existing authentication and input filters apply. No viewers, revenue or gifts are fabricated. No paid model/API call, merge or production deployment is part of this change.
