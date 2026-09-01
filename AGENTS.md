# AGENTS.md

Guidance for AI agents working in **@ideaconsult/qmrf-viewer** — an embeddable React
viewer **and** editor for QMRF documents. QMRF is the **(Q)SAR Model Reporting Format**
(JRC / eNanoMapper): one XML document describing one predictive (Q)SAR model against the
five OECD principles. This repo is a React rewrite of the Java
[QMRF Editor](https://sourceforge.net/p/qmrf/git/ci/master/tree/qmrf-editor/). See
[README.md](./README.md) for usage and [docs/PLAN.md](./docs/PLAN.md) for the approved plan.

## What This Project Is Not

- **Not a spectra tool.** QMRF carries no spectra, no peak lists and no JCAMP-DX. Any
  peak/spectrum/JCAMP code is out of scope; the upstream Java app has none of it either.
- **Not only a viewer.** It must render an existing QMRF document readably *and* edit it
  locally with valid XML output. Viewing is a first-class requirement, not a fallback mode.
- **Not bound to SpectraSearch yet.** See [SpectraSearch Integration](#spectrasearch-integration).

## Sources Of Truth

- `vendor/qmrf.dtd` — the authoritative schema (QMRF 3.0.0, from
  `C:\nina\src\git_idea\qmrf\schema\3.0.0\qmrf.dtd`). Field labels, chapter numbering,
  cardinality and enums all derive from it. **Never hand-write a field label or chapter
  number**: regenerate with `pnpm gen:spec`.
- `src/qmrf/spec.js` — generated field metadata. Committed; CI fails if it drifts from the
  vendored DTD (`pnpm gen:spec -- --check`). It is excluded from Biome in `biome.json`:
  formatting a `JSON.stringify` payload would rewrite it and break that byte comparison.
- The Java reference implementation, for parity questions only:
  - model + DOM handling: `qmrf-swing\src\main\java\net\idea\ambit\qmrf\QMRFObject.java`
  - field kinds: `qmrf-swing\...\chapters\QMRFSubChapter*.java`
  - catalogs: `qmrf-swing\...\catalogs\Catalog*.java`
  - new-document template: `qmrf-core\src\main\resources\ambit2\qmrfeditor\qmrf.xml`
  - endpoint vocabulary: `qmrf-core\src\main\resources\ambit2\qmrfeditor\endpoints\`
- Convention references (structure/CI/packaging, not domain): `jtoxkit-react` and
  `qubounds-viewer`.

## Domain Model

Root `QMRF` (8 `#FIXED` attributes = constants, not inputs) contains:

- `QMRF_chapters` — **exactly 10 chapters in a strict sequence**: 1 QSAR identifier,
  2 general information, 3 endpoint (P1), 4 algorithm (P2), 5 applicability domain (P3),
  6 internal validation (P4), 7 external validation (P4), 8 mechanistic interpretation
  (P5), 9 miscellaneous, 10 JRC summary. Chapters 5 and 7 are **repeatable**.
- `Catalogs` — **6 ID-bearing catalogs** (`software`, `algorithms`, `descriptors`,
  `endpoints`, `authors`, `publications`), referenced from chapters through
  `<x_ref idref="…" catalog="…">`. ID/IDREF integrity is a hard invariant.

Field kinds reduce to **eight** — `text`, `reference`, `question`, `date`, `algorithm`, `group`,
`attachment`, `entry`. At chapter level (61 fields) the counts are text 38, reference 9,
question 8, date 4, algorithm 1, group 1; the other eight fields nest below those — `attachment`
(3) only inside the 9.3 group, and `entry` (4: `algorithm_ref`, `molecules` ×2, `document`) for
elements whose whole content model is attributes with no PCDATA at all. An earlier note here
counted five; `src/tests/qmrf/spec.test.js` pins these numbers now. Enums live in attribute value
sets: `answer (Yes|No)`, `answer (All|Some|No|Unknown)`, and the flag sets
(`chemname/cas/smiles/inchi/mol/formula/nanomaterial`) in 6.2 and 7.2.

Dispatch a field editor on `kind`, never on `text`: `text` in the spec means "the DTD says
`#PCDATA`", which is true of 50 chapter fields — the 38 `text` ones plus all `question` and
`date` fields, whose answers and flags ride on attributes.

**References are not typed as IDREF.** The DTD declares `*_ref/@idref` as `CDATA` and puts
the target catalog in a `#FIXED` `catalog` attribute, so pointer resolution is driven by the
*element name*, not the attribute type. Only a few attributes (e.g. `publication_ref`) are
real IDREFs. Any code that resolves or rewrites references must handle both conventions —
`collectReferences` in `src/qmrf/model.js` is the single place that does.

### Fidelity Rules (non-negotiable)

1. **Text fields store HTML as escaped PCDATA** — `&lt;html&gt;&lt;head&gt;…&lt;p style=
   "margin-top: 0"&gt;…`. View mode renders it sanitized; edit mode must write the same
   envelope back. Never strip it to plain text on save.
2. **Parsing is tolerant, validation is ours.** Upstream parses with `setValidating(false)`;
   browsers cannot DTD-validate. Real documents carry drifted versions (the fixture declares
   `schema_version="0.9"` while the DTD fixes `1.0`/`3.0` and the Java code says `1.2`) and
   arbitrary doctypes (`/WEB-INF/xslt/qmrf.dtd`). Open such documents **with a warning and
   edit best-effort**; never refuse them.
3. **Round-trip must be byte-identical** for untouched content. `src/tests/fixtures/
   qmrf-0.9-real.xml` is the regression fixture for exactly this.
4. **Fidelity is a property of the writer, not of luck.** The parser records each node's exact
   source span; `model.js` edits copy-on-write along the path from the root to the edited node
   and drop only those spans, so untouched siblings are emitted verbatim. Never re-render a
   whole document to make one change, and never hand out mutable nodes — edits return a new
   model. Undo relies on this: a snapshot is another immutable model reference, so undo hands
   back the original bytes rather than an equivalent re-serialization.
5. **Severity follows the declared version.** A document claiming 3.0 is held to 3.0. An older
   one gets 3.0-only expectations (a missing `nanomaterial` flag, a newer 9.3 attachment) as
   `info`, because the author never violated them. Unresolvable references stay errors in every
   version: those silently lose data whatever the era. Measured against the real fixture the
   report must stay at **0 errors** — if a change adds errors there, the validator is wrong,
   not the document.

## The `src/qmrf/` Core

Framework-free (no React, no `DOMParser`) so it is testable in plain Vitest and reusable from
any UI layer. Tests live in `src/tests/qmrf/`.

| Module | Responsibility |
| --- | --- |
| `spec.js` | generated metadata: `SPEC` (chapters, fields, catalogs) and `ELEMENTS` (per-element attributes, cardinality, `#FIXED` values). Do not hand-edit. |
| `xml.js` | tolerant **parser** and the fidelity **writer** in one file: `parseXml`/`serializeXml`/`serializeNode`, entity helpers, and each node's exact `raw` source span. |
| `model.js` | immutable editing: `openModel`/`saveModel`, paths as `Step[]` (`QMRF_chapters[0]/QSAR_identifier[0]/QSAR_title[0]`), `getValue`/`setValue`, `getAttr`/`setAttr`, `insertOccurrence`/`removeElement`, `collectIds`/`collectReferences`/`referencesTo`/`renameId`. |
| `validate.js` | `validate(model) → { issues, version, counts }`; every issue carries `path`, `chapter` and DTD `label` so the UI can jump to the field. |
| `history.js` | undo/redo over those immutable models: `mergeKey` folds a typing gesture into one step, `markSaved`/`isDirty` track the saved index rather than a boolean. |

**Deliberate departures from the file list in [docs/PLAN.md](./docs/PLAN.md):** there is no
`parse.js`/`write.js` split — reading and writing a document are two directions over one
representation, and splitting them would put the fidelity rules on both sides of a boundary.
There is no `src/qmrf/index.js` façade either: callers import the module they need, so no export
list can rot. `spec.js` stays Biome-excluded (see above).

## Project Shape

- Single-package React/Vite project: both a standalone `/qmrf/` app and an embeddable
  library (`@ideaconsult/qmrf-viewer`).
- Standalone entry: `src/main.jsx` → `src/App.jsx` → `QMRFViewer`.
- Library entry: `src/index.js`.
- `src/App.jsx` is the **only** file allowed to read `import.meta.env` or URL params.
  Library code takes props/context only — CI greps `dist/*.js` for `import.meta.env`/`VITE_`.
- `src/App.jsx` URL contract: `?url=`, `?mode=edit`, `?token=`.
- All component CSS stays scoped under `.qmrf-root` (`src/styles/viewer.css`).
  `src/styles/app-globals.css` is standalone chrome only and must never be imported by
  library code.

## Commands

Package manager is pnpm, pinned by `packageManager` in `package.json`. On a machine where
`corepack enable` cannot write to the Node install dir (Windows, non-admin), prefix with
`corepack` instead: `corepack pnpm install`.

| Command | Purpose |
| --- | --- |
| `pnpm install --frozen-lockfile` | install |
| `pnpm dev` | dev server, port `5176`, `base: '/qmrf/'` |
| `pnpm build` / `pnpm preview` | standalone app build / preview |
| `pnpm build:lib` | library build → `dist/qmrf-viewer.js`, `dist/style.css` |
| `pnpm test` / `pnpm test:watch` | Vitest (jsdom) |
| `pnpm lint` / `pnpm format` | Biome check / check+write |
| `pnpm typecheck` | `tsc` over JSDoc types (`checkJs`) |
| `pnpm gen:spec` | regenerate `src/qmrf/spec.js` from the vendored DTD |

**Deviation from the sibling viewers, deliberate:** `jtoxkit-react` and `qubounds-viewer`
ship no lint, formatter or typecheck scripts. That absence is what let an orphaned component
call a hook that did not exist, a control bind to `() => {}`, and helpers get "tested" by
copy-pasting their logic into the test file. Because this repo's core is a hand-written
schema spec, ID/IDREF integrity and an XML serializer, we keep **Biome + `checkJs` +
`pnpm lint` + `pnpm typecheck` from commit 1**. Do not remove them for "consistency".

Verify changes with `pnpm lint && pnpm typecheck && pnpm test && pnpm build:lib`. For
packaging also run `pnpm build`, `pnpm peers check` and `pnpm pack --dry-run`.

## CI And Release

- `.github/workflows/ci.yml` mirrors the siblings and adds lint/typecheck/spec-freshness
  steps: frozen-lockfile install → `pnpm peers check` → lint → typecheck → `gen:spec --check`
  → test → build → build:lib → env-leakage grep → `pnpm pack --dry-run`.
- `.github/workflows/publish.yml` publishes to npm under `@ideaconsult` on GitHub Release
  via OIDC trusted publishing; the tag must equal `vX.Y.Z` from `package.json` and be
  reachable from `main`.
- Do not commit `dist/`.

## Deliberately Not Implemented

- SpectraSearch registry entry (no QSAR-model result type exists there yet).
- Report export to HTML/RTF/PDF/Excel (upstream uses freemarker `qmrf.ftl`, `qmrf_rtf.ftl`,
  `table.ftl`).
- Ontology-term lookup (upstream `qmrf-annotation`); `ontology_term` stays free text.
- PMML — `qmrf-pmml` is commented out of the upstream root `pom.xml`, i.e. dead.
- Schema versions 1.0 / 1.1 (`schema/1.0/qmrf.dtd`, `schema/1.1/qmrf.dtd` exist on disk).

## Licensing Caveat (open question)

The upstream Java project is AGPL-3.0 (`pom.xml`) with LGPL-2.1 file headers, while this
repo and its sibling viewers are Apache-2.0. `vendor/qmrf.dtd`,
`src/tests/fixtures/*` and `src/qmrf/vocab/endpoints-source.xml` were taken from that
project. The DTD is a published JRC schema standard, but the fixture contains JRC/ECB
authored prose. Confirm the licensing position before publishing.

## SpectraSearch Integration

Deferred, by decision. `spectrasearch` dispatches viewers from `src/viewers.js`, keyed by
the Solr result `type`; `kind: "route"` embeds a React component (receives the OIDC token
and `apiBase` as props) and `kind: "external"` is a URL template opened in a new tab.
An editor must be `kind: "route"` — external links get no token and cannot save.

Blocker: `spectrasearch\src` contains **zero** `qmrf`/`qsar` references and no QSAR-model
result type, so the type must first be emitted by the indexing pipeline. Adding the viewer
itself is then: a `kind: "route"` entry in `src/viewers.js`, a page under `src/pages/`, a
route in `main.jsx`, and host-side `resolve.dedupe: ['react','react-dom']` plus
`optimizeDeps.include: ['@ideaconsult/qmrf-viewer']`.

## Original Brief

Verbatim from the repository's first `AGENTS.md`, kept for provenance:

> This repo should create React version of QMRF Editor, originally Java app
> https://sourceforge.net/p/qmrf/git/ci/master/tree/qmrf-editor/
>
> local copy C:\\nina\\src\\git\_idea\\qmrf\\qmrf-editor
>
> It works with well defined XML schema and provides user interface to such.
>
> It should follow the viewers convention of https://github.com/ideaconsult/jtoxkit-react
> (local C:\\nina\\src\\git\_idea\\jtoxkit-react) and
> https://github.com/ideaconsult/qubounds-viewer (local C:\\nina\\src\\git\_idea\\qubounds-viewer)
> so that it could be integrated as external viewer in
> https://github.com/h2020charisma/spectrasearch (local C:\\nina\\src\\charisma\\spectrasearch)

Corrections established during planning, which override the brief above: QMRF is a (Q)SAR
**model** format, so spectra/peaks/JCAMP-DX are irrelevant; the app is hooked per **entry
type** (a QSAR model entry), not for arbitrary items; and the upstream editor contains no
viewer, while **this** app must serve as a viewer as well as an editor.
