# Visual regression suite

Playwright + pixelmatch screenshot tests for `Ask` and `Response` screens at
320 / 375 / 414 px. Layout-focused (~1% mismatch tolerance).

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