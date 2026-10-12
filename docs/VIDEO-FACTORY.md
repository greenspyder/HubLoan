# First vertical video slice — 2026-10-12

## Baseline and scope
Audited upstream master 2091230ec0e28df4b98daefffd4ccec508f93762, tree 0c6c10d6867a6bbfc96ca3aad2023ecdedaea212; no open PRs at audit. Local baseline has the same tree but synthetic history: apply the patch on upstream master, never push its synthetic ancestry.

Priority is actual MP4 production before account portfolio management. Existing mission queue, workspace isolation, runner, checkpoints, artifact storage/download, human review, cancellation and marketplace gates are reused. No new provider/runtime/economic system. No historical data migration.

## Implemented
Operation → create delivery → vertical MP4. Supply 2–6 original text lines (maximum 120 characters each). Each becomes a four-second scene. Existing backend mission endpoint accepts kind `video`. It needs no OpenAI key because it invokes no provider. Other kinds still require their existing key and cost checks. One worker at a time; server continues while the browser is closed, under existing lifecycle constraints. A server restart still needs existing workspace unlock/recovery; this slice adds no durable scheduler.

FFmpeg exports 720×1280 H.264/yuv420p/24fps/faststart, burned-in timed subtitles, no audio. Original procedural geometric visuals only. No stock material, downloaded media, arbitrary paths or arbitrary execution arguments. Fixed maximum 24 seconds, 8 MB output and 90-second subprocess deadline. Abort kills child processes, temporary files are removed. The default Docker runtime installs FFmpeg and DejaVu fonts; non-Docker environments must install them too.

Scene and MP4 checkpoints persist in the existing execution object. Hash validation prevents silently trusting a corrupt checkpoint. Technical verification checks ffprobe metadata and decodes the complete video. Technical validity is not commercial or quality approval. Artifact stays in human review; publication is never triggered. Player/download reuse authenticated artifact endpoints. SRT appears in delivery output. Infrastructure cost is UNKNOWN, not zero; provider calls are zero.

Existing autonomous factories and first-sale sample selectors deliberately do not offer autonomous video generation: their planning contracts cannot yet provide a bounded storyboard. Factory UI explains where manual rendering is available. No claims of transcription, narration, video AI, commercial readiness or sales.

## Validation
140 server tests pass, including real FFmpeg render through runner without provider credentials, checkpoint reuse, workspace isolation, UTF-8, invalid storyboard limits, missing binary and abort handling. Existing sprite retry, budgets, purchase integrity and release authorization tests pass. Frontend build and scoped lint (src/features/agents) pass. Full frontend lint reports 11 errors and 2 warnings in unchanged banking/UI files; baseline comparison confirms the same findings. Demo: 12 seconds, three scenes, original text/geometry, no external publication or paid API. Extracted frames visually inspected. Browser interaction/mobile layout and production Docker image were not end-to-end tested.

## External integrations investigated, not implemented
Higgsfield official docs: https://docs.higgsfield.ai/docs
API model reference: https://open.higgsfield.ai/models/bytedance/seedance-2.0/text-to-video/playground
Billing: https://higgsfield.ai/creator-hub/help-center/integrations/what-is-the-higgsfield-api
API billing is separate from website subscriptions. Requests are asynchronous and require independent API credentials. A production adapter must connect authenticated submission to existing reservations, explicit authorization, uncertain-charge accounting, persisted request IDs, bounded polling and validated output download. No remote adapter is enabled in this slice, no price estimate is represented as a confirmed charge and no credentials were changed.

TikTok: https://developers.tiktok.com/doc/content-sharing-guidelines/
Official guidelines restrict internal utilities for uploading to accounts managed by the developer/team. Direct Post additionally requires app approval, creator info, user consent, editable metadata, privacy selection and commercial disclosures. Do not assume this portfolio use case will qualify. TikTok publishing remains unavailable; external publishing requires a separate eligibility review. No browser workaround.

## Next priorities
1. Higgsfield optional adapter with exact-model quote, server-only credentials, cost reservation, persisted request ID and uncertain-response recovery; mock tests first, paid generation only with authorization.
2. Narration with verified commercial rights; original visual variety and component adjustment/version flow.
3. Affiliate campaign fields in existing projects/offers: eligibility evidence, product, commission terms, URL, disclosure, owner approval. Commission approval and actual payout must stay distinct.
4. Official TikTok eligibility or complete assisted delivery, then account isolation. No multicount expansion before operational validation.
5. Attributed real cost/revenue learning; no fabricated reach, sales, commissions or profitability.

## Licensing and supply chain
No code copied from StarNet, Higgsfield or TikTok. Visuals generated by original HubLoan geometry code; authored script rights remain subject to human review. FFmpeg/codec components and DejaVu fonts are Debian packages: keep upstream package licenses/notices when distributing images; FFmpeg build license depends on enabled components (including libx264). No new npm dependencies or paid services. This is not a claim that rendering itself validates a script's copyright or advertising claims.

## Rollback
Revert this isolated patch. Existing mission kinds and purchases are unchanged. Preserve any new `video` missions/artifacts before rollback; older servers cannot rerun their new kind. No production deployment performed.
