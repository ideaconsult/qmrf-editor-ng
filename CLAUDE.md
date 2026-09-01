@AGENTS.md

## Claude Code-specific notes

- Use plan mode before larger changes.
- Prefer small, reviewable diffs.
- Ask before broad refactors or public API changes.
- Never hand-edit `src/qmrf/spec.js`; change `vendor/qmrf.dtd` or `scripts/gen-spec.mjs`
  and run `pnpm gen:spec`.
- Before declaring work done, run `pnpm lint`, `pnpm typecheck`, `pnpm test` and
  `pnpm build:lib`, and say explicitly which of them you did not run.
