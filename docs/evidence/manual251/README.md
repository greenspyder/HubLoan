# Universal manual production 2.5.1

## Audit

Work branch began at a65f9b845d33c4b768ce63b87bb323183681482c. Production master 6fc5c7feb52370358fa5f3ea565f2f7571cb3f88 had the same tree. Render /health confirmed this deployed SHA and production-readiness-2.5; Vercel served the existing Creative Studio. No production secrets were changed. No private Render/Vercel dashboard credentials were available; deployment verification uses health, GitHub deployment status and published assets.

Existing reusable components: commentary renderer (sharp/FFmpeg), campaign AwaitingBudget, media reservations, shared Universal Voice Engine, mission queue/checkpoints, artifact storage, gallery and human review. Manual UI exposed only the three Snake formats. Microstory motion-story also exists but has a restricted light/shadow vocabulary; the new manual microstory uses the existing commentary adapter and explicitly advertises its 2D constraints.

## Implementation

- `creative-formats.mjs` owns the existing creative registry and manual adapter capability list. The frontend receives this list from the authenticated workspace; backend rejects unknown narrative formats.
- Five narrative intentions use the existing visual-commentary adapter, not five independent engines: absurd documentary, visual commentary, 2D microstory, free 2D narrative, 2D montage. Three 3D formats are preserved.
- Manual scripts are saved to persistent campaigns before production. User-editable scene controls map to validated enums. No Snake configuration is created for these campaigns.
- Assisted mode uses the existing Astra planning job and model policy. The result remains editable at AwaitingBudget. This session did not invoke a paid reasoning model.
- Revision checks and plan versions invalidate stale authorization; bounded prior plans are retained. Production snapshots the global approved voice. Paid operations still require both campaign media authorization and the existing voice budget.
- A manual production has no artificial model-planning task. Reconciliation explicitly handles this case. It reuses the shared runner, MP4 storage, download authentication and gallery.
- No silent voice fallback. The current commentary adapter supports approved ElevenLabs narration; local narration is not yet supported by this adapter. Existing 3D/local voice paths remain unchanged.

## Real local validation

`manual251-check.mjs` submits manual plans over authenticated HTTP, authorizes zero external operations, executes the existing queue, downloads the stored MP4, rejects another workspace's download, and reopens SQLite to verify campaigns and both artifacts persist. No renderer was invoked outside the production queue. See `manual-runs.json` and `e2e.txt` for identifiers, plans, events, resource reports and hashes.

- absurd-documentary.mp4: 15s, 360×640, H.264/AAC, deliberately abstract diagrams; no narration.
- visual-commentary.mp4: 15s, 360×640, animated explanation with circles/arrows; no narration.

These are manual technical productions, not autonomous Astra or ElevenLabs/Higgsfield demonstrations. Their AAC stream is silent and reports audio=false. They are not artistically approved. Diagrams are predefined local geometry, not generated illustrations of arbitrary briefs. Source code and manually authored scripts are project-owned; no third-party visual assets were used.

Backend suite, dedicated WebGL regressions, frontend build and affected-module lint are recorded alongside this document. Real WebGL battle/neck/framing tests passed; a fresh fully narrated Snake Battles export was not possible without installed TTS or authorized remote synthesis. Existing Snake contract, simulation, camera and UI regressions were exercised.

Real browser checks at 390 and 1440px verify eight options, narrative controls without Snake fields, preserved battle controls, no horizontal overflow and no runtime errors. Screenshots in ui/ were captured from the real local frontend, not mockups. Production browser verification is separate.

## Limits and safe defaults

- 3–5 scenes at 15–30s, fixed 360×640 vertical composition. Editor initially supplies three blank scenes; existing assisted plans can contain five.
- Cuts, push-in, lateral movement, reveal, circles/arrows; no clip import, soundtrack selection, 3D acting or Higgsfield video in the narrative adapter. Those unsupported features are not offered as operational.
- Local diagrams have no paid API operation, but infrastructure cost is unknown. ElevenLabs/Higgsfield costs remain unknown until account/estimate checks; no paid credits were consumed during this task.
- Remote narration uses the approved global ElevenLabs snapshot. Missing approved voice blocks narrated plans. Explicit no-narration consent permits local composition.
- Real provider synthesis, premium images, narration synchronization and assisted model quality remain unverified here. They require backend credentials and specific consumption authorization; ChatGPT connections are not runtime credentials.
- No public live, social publication, credential changes or destructive migration.
