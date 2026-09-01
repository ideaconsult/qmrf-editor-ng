# Implementation Plan

Status: **approved 2026-09-01; M0 (scaffold), M1 (schema + model) and M2 (IO + viewer) complete.** M3–M6 outstanding.

What M1 changed about this plan, in one line each: the field kinds are **eight**, not five (see
the correction in the Domain section); parsing and writing share one `src/qmrf/xml.js` instead of
`parse.js`/`write.js`; `*_ref/@idref` is `CDATA`, not `IDREF`, so pointer routing is by element
name; and the real 0.9 fixture uses exactly the 3.0 element vocabulary, so best-effort editing of
older documents is a labelling problem, not a parsing one. Details in `AGENTS.md`.

What M2 changed about this plan, in one line each: the new document is **generated from the schema**
rather than seeded from upstream's `qmrf.xml` (that template is kept as a fixture and costs eight
`fixed-attr-missing` warnings plus a `version="3.0.1"` drift, so it is a comparison, not a source);
the endpoint vocabulary is a **picker that mints one catalog entry per pick** rather than 347 rows in
every file; text fields store a whole escaped HTML document, so the envelope has one owner,
`src/qmrf/html.js`; and a document with no XML element in it is an error banner rather than a blank
viewer. Details in `AGENTS.md`.

Naming settled during M0 in favour of the viewer role and this repo's folder: package
`@ideaconsult/qmrf-viewer`, library global `QMRFViewer`, bundle `dist/qmrf-viewer.js`,
component `QMRFViewer`, root class `.qmrf-root`. The plan text below still says
`qmrf-editor` / `QMRFEditor` in two places; those are superseded.

Two additions beyond the approved plan, both from M0 verification: `@testing-library/jest-dom`
is pinned to exactly `6.9.1` because `^6.9.1` resolves to `6.10.0`, a deprecated release that
requires a `@testing-library/dom` peer; and `.qwen/` is gitignored so Biome's VCS-aware
`check` does not touch local agent settings.

## QMRF viewer + editor (React) — implementation plan

### Domain, verified

QMRF = **(Q)SAR Model Reporting Format** (JRC/eNanoMapper): one document describing one predictive model against the 5 OECD principles. No spectra, no peaks, no JCAMP-DX. It is simultaneously a **viewer** (render an existing document readably) and an **editor** (local edits, valid XML out).

Authoritative schema: `C:\nina\src\git_idea\qmrf\schema\3.0.0\qmrf.dtd` — read in full (383 lines). `schema/1.0` and `schema/1.1` also exist; we target **3.0.0** only. The `qmrf.xsd` under `qmrf-editor\qmrf-swing\...\resources` is a **0-byte placeholder**.

The shape is small, fixed and regular, which is what makes this tractable:

- Root `QMRF` + 8 `#FIXED` attributes → constants, not inputs.
- `QMRF_chapters` = **10 chapters in a strict sequence** (1 identifier, 2 general info, 3 endpoint/P1, 4 algorithm/P2, 5 applicability domain/P3, 6 internal validation/P4, 7 external validation/P4, 8 mechanistic interpretation/P5, 9 miscellaneous, 10 JRC summary).
- `Catalogs` = **6 ID-bearing catalogs** (`software`, `algorithms`, `descriptors`, `endpoints`, `authors`, `publications`), referenced from chapters via `<x_ref idref="…" catalog="…">`.
- Every field element carries `chapter` + human-readable `name` as `#FIXED` attributes → **the DTD is also the form/report metadata**, so labels and numbering are generated, never hand-written.
- Chapters 5 and 7 are repeatable (`+`) → add/remove blocks.
- Enums live in attribute value sets: `answer (Yes|No)`, `answer (All|Some|No|Unknown)`, and the 7-flag sets (`chemname/cas/smiles/inchi/mol/formula/nanomaterial`) in 6.2 / 7.2.

Field kinds reduce to **five**, matching the Java subchapter classes in `qmrf-swing\src\main\java\net\idea\ambit\qmrf\chapters\` (`QMRFSubChapterText`, `…Date`, `…Question`, `…Reference`, `QMRFSubchapterAlgorithm`, `…Dataset`), each with a matching Swing editor → five React field components cover all ~60 fields in both view and edit mode.

> **Corrected in M1: the kinds are eight.** Of the 61 chapter-level fields, `gen-spec.mjs` counts `text` 38 / `reference` 9 / `question` 8 / `date` 4 / `algorithm` 1 / `group` 1. The remaining eight fields nest below: `attachment` (3) only inside the 9.3 group, and `entry` (4 — `algorithm_ref`, `molecules` ×2, `document`) for elements whose content model is attributes with no PCDATA at all. So seven React field components plus a repeat-group container, not five. Note that the spec's `text` flag means "`#PCDATA`", which 50 chapter fields are (all `question` and `date` fields too, whose answers ride on attributes) — dispatch on `kind`. `src/tests/qmrf/spec.test.js` pins these counts, and `pnpm gen:spec -- --check` keeps the whole spec byte-tied to the DTD.

Two fidelity constraints, both observed in the one real fixture `qmrf-swing\src\test\resources\net\idea\ambit\qmrf\QMRF-NEW.xml` (578 lines, a genuine fish acute-toxicity model):

1. Text fields store **HTML serialized as escaped PCDATA** (`&lt;html&gt;&lt;head&gt;…&lt;p style="margin-top: 0"&gt;…`). Viewing must render that sanitized; editing must write the same envelope back.
2. That document declares `schema_version="0.9"` and `<!DOCTYPE QMRF SYSTEM "/WEB-INF/xslt/qmrf.dtd">`, while the DTD fixes `1.0`/`3.0` and `QMRFObject.java` says `1.2`. Upstream parses with `setValidating(false)` and writes `DOCTYPE_PUBLIC`/`DOCTYPE_SYSTEM`, so parsing must be **tolerant** and validation must be ours (browsers cannot DTD-validate anyway).

### Decisions

Viewer **and** editor, view-first with an edit mode · open older versions with a warning, edit best-effort · contentEditable + DOMPurify (no new runtime dependency) · **undo/redo in scope** · local download + optional `onSave` callback · XML only (upstream's freemarker HTML/RTF/Excel export deferred) · functional app now, SpectraSearch registry later · pnpm via corepack · **JSDoc + `checkJs`** and **Biome from commit 1** (deliberate deviations below).

### Reusing the siblings

Verbatim-copiable (confirmed identical across both repos): `.github/workflows/ci.yml`, `.github/workflows/publish.yml`, `.github/dependabot.yml` (Node 24; `actions/checkout@v7.0.0`, `pnpm/action-setup@v6.0.9`, `actions/setup-node@v6.4.0`), `pnpm-workspace.yaml`, `CLAUDE.md`, `LICENSE` (Apache-2.0), `src/main.jsx`, `index.html`, `vitest.config.js` (`jsdom`/`globals`/`setupFiles`), and the `package.json` skeleton (`type: module`, `packageManager: pnpm@11.10.0`, `files: ["dist"]`, `exports` → `dist/*.js` + `./style.css`, the 7 scripts, `publishConfig.access: public`, React peer `^18 || ^19`).

Patterns to port: `index.js` (lib entry) / `main.jsx` (app shell) / `App.jsx` (owns **all** URL + `import.meta.env` reading) / `ViewerConfig.jsx` (props → defaults merge, trailing-slash trim) four-file split; CSS scoped under one root class; `loading → error → empty` render order; pure `utils/*.js` shapers consumed via `useMemo`; `exportCSV.js`'s Blob+anchor download; `Html.jsx` + `legacyGlobals.js` + DOMPurify for legacy HTML fragments (jtoxkit only); `data/source.js` + `ambitSource.js` swappable-adapter shape; docs/`AGENTS.md` as contract of record.

CI to satisfy: `pnpm install --frozen-lockfile` → `pnpm peers check` → `pnpm test` → `pnpm build` → `pnpm build:lib` → grep gate that `dist/*.js` contains no `import.meta.env`/`VITE_` → `pnpm pack --dry-run`.

### Files to create

**M0 — scaffold.** `git init`, `corepack enable pnpm`, `package.json` (propose `@ideaconsult/qmrf-viewer` to match the folder and the viewer role — cheap to rename now, expensive later), `vite.config.js` (`base: '/qmrf/'`, port `5176`), `vite.lib.config.js` (entry `src/index.js`, `name: 'QMRFEditor'`, formats `['es']`, externals `react`/`react-dom`/`react/jsx-runtime`, `assetFileNames: 'style.css'`, `cssCodeSplit: false`), `vitest.config.js`, `biome.json`, `tsconfig.json` (`checkJs`, `noEmit`, types for JSDoc), `index.html`, `.gitignore`, `.env.example`, `src/main.jsx`, `src/index.js` (`export { default, default as QMRFViewer }`), `src/tests/setup.js`, `.github/{workflows,dependabot.yml}`, `README.md`, `CONTRIBUTING.md`, `AGENTS.md`, `CLAUDE.md`, `LICENSE`.

**M1 — schema + model.** `vendor/qmrf.dtd`; `scripts/gen-spec.mjs` → `src/qmrf/spec.js` (per field: `path`, `chapter`, `label`, `kind`, `enumAttrs`, `requiredAttrs`, `refCatalog`, `repeatable`) so labels/numbering can't drift from the schema; `src/qmrf/parse.js` (DOMParser → model, `parsererror` non-fatal); `src/qmrf/model.js` — **normalized immutable model** that keeps attributes in document order and text raw, so untouched nodes serialize back identically (chosen over a live mutable DOM because undo/redo needs cheap snapshots); `src/qmrf/write.js` (serializer + `PUBLIC …/3.0.0/qmrf.dtd SYSTEM "qmrf.dtd"` doctype); `src/qmrf/validate.js` (required children, enum values, unknown elements/attrs, **ID/IDREF integrity**, repeat-group counts; issues keyed by field path); `src/qmrf/history.js` (snapshot stack).

**M2 — IO + viewer.** `src/qmrf/newDocument.js` (skeleton generated from `spec.js`, so a fresh document validates with zero issues) + `src/qmrf/html.js` (the escaped-HTML envelope: `fieldHtml`/`plainText`/`wrapHtml`) + `src/qmrf/vocab/endpoints.js` (vendored `endpoints-source.xml`, 347 rows, parsed at first use; a picker, not a seed) + `src/qmrf/io.js` (the only browser I/O: `File.text`, `fetch` with a bearer token, download anchor, title-derived filename); open (picker + drag-drop), **fetch from `?url=`**, dirty tracking, download, `onSave` — all behind `src/hooks/useDocument.js`; `src/components/{ReportView,Toolbar}.jsx` and `src/components/fields/FieldView.jsx` — the read-only report, dispatched on `kind` and addressed by `data-qmrf-path`; `src/components/Html.jsx` for sanitized field HTML (`data-qmrf-target` on a pointer names the entry it cites, for M6's jump); fixtures `src/tests/fixtures/{qmrf-0.9-real.xml,qmrf-new-template.xml}` (the published JRC document, and upstream's template as the comparison the generator is measured against).

**M3 — shell + edit.** `src/context/{EditorContext,ViewerConfig}.jsx`; `Sidebar`/`ChapterNav`/`CatalogNav` (10 chapters + 6 catalogs, per-chapter issue counts); `QMRFViewer.jsx` body with `readOnly` default and an edit toggle; `Header` with open/save/validate/dirty/undo/redo.

**M4 — field editors** (`src/components/fields/`): `RichTextField` (contentEditable, DOMPurify on paste, toolbar limited to tags legacy HTML actually uses, writes the escaped-HTML envelope), `DateField`, `QuestionField` (Yes/No + All/Some/No/Unknown radios, and the 7-flag grid), `ReferenceField` (catalog multi-select → `*_ref idref catalog`), `AttachmentField` (`molecules`/`document`: url/embedded/filetype/description), `RepeatGroup` for chapters 5 and 7. Dispatch is metadata-driven off `spec.js` `kind`; each component renders the view variant too.

**M5 — catalogs.** Six editable tables with ID minting; delete blocked with a reference list when an entry is `idref`-ed.

**M6 — finish.** Issue list with click-to-field navigation, version-drift banner, `build:lib` verified, README documenting the props API and the future one-entry `viewers.js` registration.

### Deliberate deviations from the siblings

Plain JS with no lint is what produced the failure modes the qubounds audit turned up — an orphaned `CompoundInput.jsx` calling a hook that does not exist, a control wired to `onConfidenceChange={() => {}}`, styles unreachable from a field the tree builder never produces, helpers "tested" by copy-pasting their logic into the test file, and `catch { }` swallowing errors. Since our core is a hand-written DTD spec, ID/IDREF integrity and a serializer, `checkJs` + Biome are added from commit 1, plus a `pnpm lint`/`pnpm typecheck` CI step. Everything else stays convention-shaped.

Also absent upstream and therefore new design (nothing to imitate): editing, dirty-state, save, XML writing, validation, undo/redo, and any item-type declaration.

### Risks

- **Licensing.** The Java project is AGPL-3.0 (`pom.xml`) with LGPL-2.1 file headers; the sibling viewers are Apache-2.0. Vendoring `qmrf.dtd` and copying fixtures into an Apache-2.0 repo needs your call — the DTD is a published JRC standard, but the fixture contains JRC/ECB-authored prose.
- **Version policy is ours, not the schema's**: real files say `0.9`, DTD fixes `1.0`, code says `1.2`.
- **SpectraSearch has no QSAR-model type** and **zero `qmrf`/`qsar` references** in `src`; types come from Solr `type_s`. The hook is a pipeline-side change plus a `kind:"route"` entry + page + route (per `docs/VIEWERS.md`), and it needs `resolve.dedupe` + `optimizeDeps.include` host-side. Hence "app first".
- contentEditable caret/IME quirks are the main runtime risk; the mitigation is a per-field source-mode fallback that does not change storage format.

### Verification

- `pnpm test`: spec generation matches the DTD (chapter/field counts, enum sets); validator catches each injected defect; **byte-identity round-trip on the real 0.9 fixture** (parse → write ≡ input) and write-after-write idempotence; each field kind reads/writes the right shape; ID/IDREF integrity; undo/redo restores exact prior state.
- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm build:lib` all clean; `dist/qmrf-editor.js` + `dist/style.css` present; assert the bundle contains no React runtime and no `import.meta.env`/`VITE_` (the siblings' own grep gate).
- `pnpm dev` manual pass: open `qmrf-0.9-real.xml` → drift banner appears → chapter HTML fields render formatted rather than as raw tags → edit text, add a descriptor, add a second applicability-domain block → undo/redo → download → reopen the download with no `parsererror` and all edits present.
- Where available: `xmllint --noout --valid <download>` against the vendored DTD; skipped with an explicit note if xmllint is absent, since upstream itself does not validate.
