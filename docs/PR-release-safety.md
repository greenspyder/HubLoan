# fix: require reviewed, versioned, individually priced shop offers

Target: master at 15db60645c89fc69d1da90993af34e2c2cb84569

The storefront currently publishes missions in review and prices every asset of a format using a global default. This can sell unreviewed products at an unsubstantiated price.

Require approved quality and separate owner authorization bound to exact content, individual price, shop and license, valid for 72 hours. The scheduler only executes eligible grants. A vertical offer form replaces global pricing controls for new publications. First-sale validation retains additional gates. Existing products, orders, checkout and purchased downloads remain unchanged.

Validation: 112 server tests; TypeScript/Vite build; scoped ESLint; diff checks. Payment/publication tests use mocks. No production deployment or paid calls. No visual test on a physical phone.

Data: additive mission.shopRelease and public releaseVersion; no SQL migration. Existing missions require fresh authorization for new publication. Older frontends fail closed. Disable automatic publication before rollback because old code reopens the original defect.

Scope excludes checkpoints, partial regeneration, project/task migration and browser workers. See RELEASE-SAFETY-2026-10-09.md for findings and prioritized next slices. No third-party code or dependencies imported.
