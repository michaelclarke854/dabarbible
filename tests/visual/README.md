# Visual regression suite

Playwright + pixelmatch screenshot tests for `Ask` and `Response` screens at
320 / 375 / 414 px. Layout-focused (~1% mismatch tolerance).

The same Playwright project also runs `gates.spec.ts`, which verifies the
paywall and soft/blur gates across guest, free, trial-expired, and
subscribed states using deterministic dev-only fixtures.

## Run locally

```bash
# First time (or after intentional UI changes) — write/refresh baselines:
bun run test:visual:update

# Subsequent runs — fail on regressions:
bun run test:visual
```

Baselines are committed to `tests/visual/baselines/`. Failure diffs and the
actual screenshot are written to `tests/visual/diffs/`.

## How it works

- Dev-only routes `/__visual/ask` and `/__visual/response` (mounted via
  `import.meta.env.DEV` in `src/App.tsx`) render the screens with
  deterministic fixture data — no auth, no network calls.
- Gate fixtures live under `/__visual/gate/*` (landing, ask-open, soft,
  blur, trial-expired, free-locked, subscribed) and back the assertions in
  `tests/visual/gates.spec.ts`. They are also dev-only and tree-shaken
  from production builds.
- Animations and caret blink are disabled in-page before each screenshot.
- Mismatches beyond 1% throw with the path to the diff PNG.

## CI / sandbox note

Chromium needs system libraries (`libglib-2.0`, `libnss3`, `libgbm`, etc.)
that aren't present in every sandbox. On Debian/Ubuntu CI:

```bash
bunx playwright install --with-deps chromium
```

Lovable's nix-based exec sandbox doesn't ship those libs by default, so
initial baselines should be captured locally or in CI, then committed.

## CI workflow

`.github/workflows/visual-regression.yml` runs the suite on every push and
PR to `main`. Two modes:

- **Default (push / PR):** runs `bun run test:visual` against the committed
  baselines in `tests/visual/baselines/`. Failures upload a Playwright
  report as a build artifact (`playwright-report`).
- **`workflow_dispatch` with `update_baselines=true`:** runs
  `bun run test:visual:update` and uploads the regenerated PNGs as a
  `visual-baselines` artifact for download + commit.

The same workflow runs the security regression suite
(`bun run test:security`) in a parallel job — both must be green before
shipping.

### First-time baseline capture

The Lovable exec sandbox lacks the system libraries Chromium needs, so
baselines cannot be generated there. To seed `tests/visual/baselines/`:

1. Trigger the workflow manually:
   `gh workflow run visual-regression.yml -f update_baselines=true`
2. Download the `visual-baselines` artifact from the run.
3. Unzip into `tests/visual/baselines/` and commit the PNGs.
4. Subsequent pushes will diff against those baselines automatically.

Alternatively, run `bun run test:visual:update` on a local Linux machine
with `libglib-2.0`, `libnss3`, `libgbm` installed, then commit the
resulting `tests/visual/baselines/*.png` files.