# Contributing

## Requirements

Node 24 and pnpm, pinned by `packageManager` in `package.json`.

If `corepack enable` fails on your machine with `EPERM` writing shims into the Node install
directory (typical for a non-admin Windows shell), prefix commands with `corepack` instead
of enabling a global shim: `corepack pnpm install`.

## Before Opening A Pull Request

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm build:lib
pnpm pack --dry-run
```

CI runs the same set plus `pnpm peers check` and a check that `src/qmrf/spec.js` still
matches `vendor/qmrf.dtd`. It also fails if `dist/*.js` contains `import.meta.env` or
`VITE_`, which is why only `src/App.jsx` may read Vite environment variables or URL
parameters.

## Schema Changes

`vendor/qmrf.dtd` is authoritative. Change it (or `scripts/gen-spec.mjs`) and run
`pnpm gen:spec`; never hand-edit `src/qmrf/spec.js`. Field labels and chapter numbers are
generated, so a hand-written label is drift waiting to happen.

## Code Style

Biome owns formatting and import order: single quotes in JS, double quotes in JSX, no
semicolons, no trailing commas, two-space indent, 100-column width. Run `pnpm format`.

Type annotations live in JSDoc (`@typedef`, `@param`, `@type`) and are checked by
`pnpm typecheck`. This repo keeps lint and `checkJs` deliberately, unlike the sibling viewer
packages that have neither — see the note in [AGENTS.md](./AGENTS.md) before changing it.

## Fidelity Rules

Two invariants that outrank convenience:

1. Chapter text fields hold HTML serialized as escaped character data. Never save them as
   stripped plain text.
2. An untouched document must serialize byte-identically. `src/tests/fixtures/qmrf-0.9-real.xml`
   guards this; if a change breaks that round-trip, fix the change, not the test.

## Tests

Vitest with jsdom, `@testing-library/react`, tests under `src/tests/` mirroring `src/`.
Test the real modules: export helpers from plain modules rather than duplicating their logic
inside a test file.

## Releases

Bump `version` in a pull request, merge to `main`, tag `vX.Y.Z`, then publish a GitHub
Release. `.github/workflows/publish.yml` re-runs the full gate and publishes to npm under
`@ideaconsult` using OIDC trusted publishing, after asserting the tag matches `package.json`
and is reachable from `main`.
