# TikTok Afiliados — first-party-independent campaign flow

This slice records third-party products and campaigns inside the existing workspace. It reuses autonomous projects as a project type, the existing mission queue/checkpoints, FFmpeg renderer, artifact endpoint, Sentinel/human review, API cost ledger, PostgreSQL/SQLite workspace store and access-token isolation. It does not write to `shop.products`, activate Stripe, or publish externally.

## What is operational

- Project `businessType=affiliate`; the existing generic coordinator cannot resume it or spend model calls. API allowance is zero for this local-rendering pilot.
- A user can enter a TikTok account or external affiliate program, record eligibility, product, seller, official and affiliate URLs, observed price, commission and sources, conditions, rights, audience and a test hypothesis.
- Records are owner-attested with source URLs, not verified by a private catalog or TikTok API. Evidence older than 30 days blocks new production/publication authorization.
- One campaign per project until its existing campaign has a recorded publication. The campaign snapshots the third-party product and references an existing mission.
- Uploads accept 1–6 static PNG/JPEG/WebP images up to 2.5 MB total, decode and re-encode them server-side; no remote fetching or filesystem paths. FFmpeg creates a silent vertical H.264 slideshow with timed captions. Review is human and version-specific. Corrections archive the old MP4/checkpoints and invalidate release authorization.
- After review, the owner can authorize the exact video/product/account/caption snapshot for 72 hours, download it, publish manually, then enter the public TikTok URL. The URL and measurements are labeled owner-reported; reports are cumulative snapshots with source URLs, not additive sales. API costs, recorded unknown exposure, estimated/approved/received commissions remain separate; net profit stays `null` because campaign costs are incomplete.
- Affiliate videos are blocked from the own-shop packaging/release path.

## Platform and provider limits

TikTok Login Kit does not prove Shop Affiliate eligibility or authorize affiliate catalog/orders. The UI does not claim OAuth connection: TikTok OAuth, Shop Partner scopes, catalog access, attribution, order events, and commission reconciliation require a registered/reviewed application and relevant approved account/program permissions. Data entry is an explicitly manual, source-backed fallback.

The official [Content Sharing Guidelines](https://developers.tiktok.com/docs/en/content-sharing-guidelines) (updated 4 Aug 2026) say unaudited Direct Post clients can only post privately, cap usage, and need an audit to remove visibility restrictions. The guidelines also reject tools intended only for internal account(s) managed by the developer, require current creator information and user-selected posting details/consent, and require commercial disclosure controls. HubLoan is currently an internal owner-operated workspace without the required audited public creator workflow; automatic TikTok publishing is therefore not enabled. The assistive flow asks for `#publi`, links commercial disclosure guidance and leaves final upload, product attachment and publication to the creator.

Higgsfield is not connected in this slice. Its [official API quick start](https://open.higgsfield.ai/quick-start) uses server credentials and API billing/prepaid balance. No price, model, or cost is assumed and no external AI call is made. Enablement should wait until the API price is recorded in the HubLoan cost ledger with an explicit preflight and owner-controlled authorization.

## Data compatibility

`affiliates` and `businessType` are optional JSON fields in the current workspace. There is no database schema migration; existing workspaces project as an empty affiliate portfolio. Previous store products, campaigns, videos and orders remain untouched.

## Next integrations

1. Decide whether HubLoan will meet TikTok's broad-audience and audit requirements for an official Content Posting API client; do not treat private-only test posts as public distribution.
2. Apply for eligible TikTok Shop Affiliate Partner API product/scopes and creator authorization, if available in the account's region. Implement catalog import and attribution only after approval.
3. Add a costed optional video-provider adapter only after obtaining current API model prices and stable job/status contracts. Preserve local FFmpeg fallback.
4. Reconcile actual affiliate reports and received payouts before calculating campaign net profit or optimizing account budgets.
