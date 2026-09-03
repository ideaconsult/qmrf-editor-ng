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
6. **A field's shape is the document's, not ours.** The four date fields are `#PCDATA`, and the
   fixture writes three shapes in four of them — `29.06.2009`, `20.06.2009`, and chapter 10's
   year-first `2009/12/03` — two of them inside the HTML envelope and two as bare text.
   `src/qmrf/dates.js` reads the shape already in the field and writes that shape back
   (`todayIn(day, like)`), and `hasEnvelope` in `html.js` decides whether the envelope survives.
   "Normalising" either is a fidelity break: it rewrites a value nobody asked to touch.

## The `src/qmrf/` Core

Framework-free (no React, no `DOMParser`) so it is testable in plain Vitest and reusable from
any UI layer. Tests live in `src/tests/qmrf/`.

| Module | Responsibility |
| --- | --- |
| `spec.js` | generated metadata: `SPEC` (chapters, fields, catalogs) and `ELEMENTS` (per-element attributes, cardinality, `#FIXED` values). Do not hand-edit. |
| `xml.js` | tolerant **parser** and the fidelity **writer** in one file: `parseXml`/`serializeXml`/`serializeNode`, entity helpers, and each node's exact `raw` source span. |
| `model.js` | immutable editing: `openModel`/`saveModel`, paths as `Step[]` (`QMRF_chapters[0]/QSAR_identifier[0]/QSAR_title[0]`), `getValue`/`setValue`, `getAttr`/`setAttr`/`removeAttr`, `insertOccurrence`/`removeElement`, `collectIds`/`collectReferences`/`referencesTo`/`renameId`. |
| `validate.js` | `validate(model) → { issues, version, counts }`; every issue carries `path`, `chapter` and DTD `label` so the UI can jump to the field. |
| `history.js` | undo/redo over those immutable models: `mergeKey` folds a typing gesture into one step, `markSaved`/`isDirty` track the saved index rather than a boolean. |
| `html.js` | the rich-text **envelope** and nothing else: `fieldHtml` (body out), `wrapHtml` (body back in the form the Java kit wrote), `hasEnvelope` (whether a field had one to begin with — see fidelity rule 6), `plainText` (one readable line, for titles and search). DOM-free; sanitisation belongs to `src/components/sanitize.js`. |
| `dates.js` | the four date fields' **own shapes**: `dateFormatOf` reads which of `dd.MM.yyyy`, `yyyy-MM-dd`, `dd/MM/yyyy`, `yyyy/MM/dd` a value is written in, `formatDate`/`todayIn` write a day back in that shape. Refuses to guess at anything else (`09-12-03` is three plausible answers, not a format). |
| `catalog.js` | what a catalog holds and how a new entry joins it: `catalogShape`/`catalogPath`/`catalogAddress` (the six shapes, and the address a catalog renders at), `catalogEntries`/`entryOptions` (a label per entry, read off its own heading attributes), `entryFields` (the attributes an entry may be *edited as* — `id` and `ontology_term` excluded, each with `required`/`refCatalog`), `mintId` (next free `<catalog>_N`), `addEntry` — one write that appends the entry with the DTD's attributes in DTD order, **creating the `Catalogs` block and the `*_catalog` element the document skipped** (both through `insertOccurrence`, so the DTD's own sequence picks the position), returning `null` only for a name that is not one of the six, `citationIndex`/`entryCitations` (which field cites which entry, **one pass over the document** for the whole question, blank pointers excluded). The reference editors and the catalog tables both go through these. |
| `io.js` | the only browser I/O: `readText` (`File`), `fetchText` (with bearer token, status kept in the message), `downloadText`, `suggestedFilename`. Everything above it works on text. |
| `newDocument.js` | the skeleton a New document starts from, **generated from `spec.js`** — required children only, `#FIXED` attributes from the DTD, required answers from the DTD's own enum. It validates with zero issues; upstream's hand-written `qmrf.xml` template does not (8 missing `catalog` attributes, `version="3.0.1"`). |
| `render.js` | the *reading* rules of the report view: which element is a field (`fieldKind`), how a heading reads (`headingOf`, from the document's own attrs), what a pointer shows (`resolveReference`), which flags and files a field lists, and what counts as a link (`linkHref` refuses a bare scheme). |
| `outline.js` | what the sidebar lists: the document's own chapters (drifted heading and all) and catalogs, each with the findings attributed to it. The chapters come from the document, not from `SPEC`, so a repeated chapter appears once per occurrence. `buildOutline(model, report, {allCatalogs})` lists the six declared catalogs instead of the held ones — the shell sets it only while the editors are showing, which is exactly when `Catalogs.jsx` renders the same six, so a row never leads to a heading that is not in the report. `totalOf(outline)` must equal `validate(model).counts`. |
| `vocab/endpoints.js` | the vendored 347-row endpoint vocabulary (`endpoints-source.xml`), parsed at first use. A **picker**: picking a term mints one `endpoints_catalog` entry carrying the vocabulary's id; documents are never seeded with the whole list. |

**Deliberate departures from the file list in [docs/PLAN.md](./docs/PLAN.md):** there is no
`parse.js`/`write.js` split — reading and writing a document are two directions over one
representation, and splitting them would put the fidelity rules on both sides of a boundary.
There is no `src/qmrf/index.js` façade either: callers import the module they need, so no export
list can rot. `spec.js` stays Biome-excluded (see above).

**The endpoint vocabulary is eagerly imported, and that is a measured decision, not an oversight.**
`src/qmrf/vocab/endpoints-source.xml` is 57,872 bytes raw / **8,132 gz**; the library bundle is
283,805 bytes / 54,040 gz. So the vocabulary is ~20% of the shipped bytes and ~15% of the gzipped
transfer, which makes it the obvious candidate for a lazy `import()`. It does not get one: Vite
forces `inlineDynamicImports` only for `umd`/`iife` output, so a dynamic `import()` in the ES build
would emit **a second chunk** beside `dist/qmrf-viewer.js` and break the two-file output
(`dist/qmrf-viewer.js` + `dist/style.css`) that the siblings ship and that a host's `exports` map
and `optimizeDeps.include` are written against. The parsed rows are already lazy — the XML is
parsed at first use, not at import. If the vocabulary ever grows enough to hurt, the fix is a
second entry (`@ideaconsult/qmrf-viewer/endpoints`) or a data URL, not an unannounced extra chunk.

## The View Layer

`src/hooks/useDocument.js` is the only place React meets the core: it owns the history, the
validation report, `dirty`, and the open/create/edit/save/undo actions. Components below it are
presentational (`Toolbar` takes callbacks and nothing else), so the same pieces serve the
standalone app, a host embed and the editor.

### The shell is two contexts, not a prop chain

- `src/context/ViewerConfig.jsx` — what the host asked for: `readOnly`, `showHeader`, `showNav`,
  `onSave`, and a per-mount `uid` that prefixes element ids so two viewers in one host page do
  not share anchors.
- `src/context/EditorContext.jsx` — the open document (`useDocument`), its outline
  (`src/qmrf/outline.js`), the last-focused address, and `showAddress(address)`, which scrolls
  **within `reportRef`** so a jump cannot escape into the host page. Addresses contain `[`/`]`,
  hence the `CSS.escape` in that selector.
- `src/QMRFViewer.jsx` renders the layout only: `Header`, the error banner, the version-drift
  banner, then `Sidebar` beside `.qmrf-report-area`. `Header` holds the validation chip (click: go
  to the worst first finding), undo/redo and the `Toolbar`; `Sidebar` is the whole sidebar column —
  a `nav` listing the document, its chapters and its catalogs with per-part finding counts, and the
  `Findings` list under it. Both read the contexts, so a field editor added later reaches the
  document without four components agreeing to forward it.
- **The sidebar column is one grid child.** `.qmrf-layout` is a `15rem minmax(0,1fr)` grid, so
  returning a fragment from `Sidebar` would make the findings list the report's neighbour instead
  of the outline's subordinate. `.qmrf-side` owns the column's border, sticky position, scroll and
  padding (and the print/`showNav={false}` rules hide it as one thing); `nav` and the findings
  section are its two stacked panels.
- **The drift banner is said once, at the top, in the document's own numbers** (`version.drifted`
  from the validator), and promises the report is the file as it stands. Fidelity rule 2 says open
  drifted documents; this is where the reader is told, rather than in 24 findings — the era a file
  was written in is not a mistake its author made. It is chrome: nothing of it may reach
  `.qmrf-report`, which is what gets saved.
- **Jumps are by address, and `''` is one**: the document's own findings belong to its properties
  block. `src/tests/shell.test.jsx` is the harness that proves an outline row reaches a report
  element; it stubs `scrollIntoView`, which jsdom lacks.
- **`src/components/Findings.jsx` is the issue list, and it is an accordion.** The outline says
  *where* the document is weak, the header chip says *how much*; only this says *what*. Each row is
  one finding — its severity, where it is, and the jump — where "where" reads from the issue itself:
  the field's DTD `label` with its chapter number, `<element>` for anything the chapters do not
  name, `This document` for the empty address, and the **path's last step** for a pointer, whose
  issue carries no `element` at all. The row is the button, so the jump is `showAddress(issue.path)`
  — the same contract the outline jumps by, and it lands on the field whether or not it is edited.
  Errors sort first. The list is mounted only while open, and opens itself only on
  `counts.error > 0`: a real document can carry hundreds of notes, and 21 of them do not belong
  above the fold before chapter 1 has been read — the outline counts and the chip announce the
  totals either way, so a closed list is not a hidden problem.
- **The edit toggle lives in `Header.jsx`** as a View/Edit fieldset, and `readOnly` removes both it
  and every editor: `EditorContext` publishes `editable` (may this host write at all) and `editing`
  (is the report showing editors now), so `FieldView` and `FieldEditor` are chosen in one place and
  a read-only embed never mounts a contentEditable.

- `src/components/sanitize.js` owns **every** rule about untrusted field markup: `sanitizeFieldHtml`
  (DOMPurify; `<style>`, head/html/body, form and media elements forbidden outright) and
  `secureLinks` (`target` links get `rel="noopener noreferrer"`, after mount and before storage, not
  as a global DOMPurify hook, which would leak into the host's own sanitising). `Html.jsx` is the
  viewer's caller; `RichTextField` is the editor's, and calls both **before** reading `innerHTML`
  back — a saved document must be one the viewer would render, not one that only gets hardened on
  the way to the screen.
- **Editing rules, all of them load-bearing:**
  - One write per edit. Controls commit on blur/Enter, not per keystroke, so the undo tape holds
    edits rather than characters; a control keeps its own draft while it has the caret, so a
    sibling field's edit cannot yank text out from under the keyboard.
  - `RichTextField` is **uncontrolled**. React writes its markup on mount, on undo and when the
    document is replaced — never while the caret is inside it. A controlled contentEditable is how a
    caret lands at position zero on every keystroke.
  - Paste is plain text; the toolbar offers only bold/italic/underline/two lists, which is what the
    legacy HTML in real documents uses.
  - **An edit must not move the reader.** `src/components/scroll.js` finds the container that is
    actually scrolling (a host panel or the page's own scrolling element) and `EditorContext`
    restores it before paint. The position is captured *during* the render that carries the new
    model, not in an effect cleanup — a cleanup runs after sibling subtrees may already be mutated,
    which is how "set a date in chapter 2, land in chapter 1" got into the Java app. Only
    `showAddress` moves the report deliberately.
  - **An add that cannot add says why**, in a `role="status"` note beside the control (no catalog to
    mint into, nothing matching the search). A disabled button with an empty selection is a bug
    report the reader cannot read.
  - A minted entry and the pointer to it are **one** `doc.edit`, so one Undo reverses both.
- `src/tests/editors.test.jsx` drives the editors through the real shell (provider, header, sidebar,
  host panel) because the failures worth defending are shell-shaped, and asserts what was *written*
  against `saveModel`'s bytes rather than against component state.
- `src/components/fields/FieldView.jsx` dispatches on `fieldKind`, never on document shape, and
  `render.js` decides *what* a field means. Keep reading rules in `render.js` (pure, unit-tested)
  and layout here.
- `src/components/fields/FieldEditor.jsx` is its counterpart and dispatches on the **same**
  `fieldKind`, so a field cannot have an editor nobody reads or a reading nobody can edit. Shared
  row primitives (text, enum, flag grid) live in `Controls.jsx`; anything narrower than those three
  has its own file. Both halves address what they render through `data-qmrf-path`.
- Every rendered chapter, field, pointer, attachment and catalog row carries its model address in
  `data-qmrf-path`, so an issue can scroll to its field and the catalog delete guard can find a row.
  A pointer additionally carries `data-qmrf-target`: the address of the entry it cites. Keep those
  addresses unique — the report's own tests assert it.
- **The report keeps the six catalogs as an appendix, in `src/components/Catalogs.jsx`.** Upstream's
  `qmrf2div.xsl` hides them, and that is right for a printed report; an editor and a reader who wants
  to know what a model drew on both need to reach them. That is a documented departure, not an
  oversight.
  - **Reading is a table, editing is one form per entry** — an accordion, with one entry open per
    catalog. A grid of text boxes would mount six to eight controls per row for a hundred-row
    descriptor catalog to hide behind the fold, and reads worse than one form at a time. The closed
    row still says what the entry *is* and who cites it, which is everything needed to choose which
    one to open; the address is the same either way, so a jump lands on an entry open or closed.
  - **`id` is a read-only handle, never a field.** It is what every pointer in the chapters names:
    changing it rewrites the document rather than spelling a word differently. `renameId` does that
    rewrite when a document really needs it; a wrong id nobody has cited is removed and added again,
    which mints a free one and cannot strand a pointer.
  - **Whether an entry may go is the pointers' answer, not the editor's guess.** `citationIndex` is
    asked once where the six tables are rendered and handed down (asked per entry it walks the whole
    document once per row, the slowest thing in the report). A cited entry gets a dead Remove named
    by its entry, a line naming the fields that hold it, and each name a `showAddress` jump to the
    citation that has to be released first — never a button that silently does nothing.
  - An entry's *reference* attributes (`publication_ref` on a descriptor or an algorithm) are a
    picker into the other catalog whose "not cited" **removes** the attribute (`removeAttr`). A text
    attribute's blank still writes `name=""`: that is how the Java editors spell an unfilled field,
    and the fixture is full of it.
  - **The six are listed while the editors are showing, the held ones while they are not.**
    `<!ELEMENT QMRF (QMRF_chapters,Catalogs)>` *requires* the block, so a document with no
    `Catalogs` — or with two of the six — is short of the schema rather than exempt from it, and a
    viewer that only ever showed what it found left such a file permanently unfixable: no appendix,
    no outline row, and no Add on any chapter field that mints an entry, which is exactly how a real
    document reached the state where nothing could be added. `addEntry` writes the missing
    `Catalogs`/`*_catalog` where the DTD's sequence puts them, and `outline.js` is given the same
    six via `{allCatalogs: editing}` so a row only exists where something opens. A read-only host
    sees only the catalogs the document holds: no dead links either way.
- **Printing is a deliverable, not an afterthought** — a QMRF is attached to an ECHA submission as
  paper. `Header`'s Print button flips the report to its read view with `flushSync` (an entry form
  is not a filed document, and in the edit view the catalogs are forms rather than tables) and then
  calls `window.print()`; the mode stays on View so screen and page agree. The stylesheet is
  upstream's `QMRF_xml2pdf.java` in CSS — A4, 10 pt body, chapter titles in bold Times on
  `#E6E6E6`, the identity block as a cover, table headers repeating across a break, the catalogs as
  an annex on their own page, and none of the app's chrome or warnings. **`@page` is the one rule
  that cannot be scoped to `.qmrf-root`,** so the page geometry lives in `app-globals.css` (which
  library code must never load) and a host sets its own if it wants the dossier margins; page
  numbers are the print dialog's own option, since Chrome ignores CSS page margin boxes.
- `src/tests/catalogs.test.jsx` asserts the guards against `saveModel`'s bytes, and queries each
  control **inside its own catalog's block**: chapter 3.2 legitimately has an "Add endpoint" of its
  own — a vocabulary picker that cites this catalog — so a whole-report query for that name finds two
  right answers.
- **`src/tests/roundtrip.test.jsx` runs the whole loop** — open the published fixture, change a
  date, undo, redo, press Save, then hand the saved text back to `openModel` *and* to a second
  `QMRFViewer`: the same findings and no new ones, `saveModel` a fixed point, and 2.6's date,
  chapter 10.2's and the declared `schema_version` still byte-identical while the edited field's old
  value is gone from the bytes. Every link is unit-tested where it lives; this is the only test of
  the join, and the join is what the user keeps (a file). It is also the only test of the Save
  button's *output*: `onSave` receives the text synchronously and the dirty dot clears a microtask
  later (`useDocument.save` resolves the host's promise first), so the test awaits that and the
  async-act warning is the thing that told us the semantics.

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

**`vitest.config.js` raises `testTimeout` to 20s, and the reason is measured, not assumed.** The
seconds belong to jsdom, not to this app: a named `getByRole` query asks testing-library to compute
the accessible name of every candidate, which calls `getComputedStyle` once per candidate at ~4ms in
jsdom (no stylesheet in the test document, so that is its own per-element cost), and an editing
session puts ~330 buttons on the screen. Measured on the real fixture: one such named query 1.2–2.2s,
one React commit that rebuilds the whole editable report 0.2–0.35s. So do not "fix" a slow test by
assuming the component is slow — and do not lower the timeout back. `pnpm exec vitest run <name>`
filters a run (`pnpm test -- <name>` passes the `--` through as a filter, which matches everything).

## CI And Release

- `.github/workflows/ci.yml` mirrors the siblings and adds lint/typecheck/spec-freshness
  steps: frozen-lockfile install → `pnpm peers check` → lint → typecheck → `gen:spec --check`
  → test → build → build:lib → env-leakage grep → `pnpm pack --dry-run`.
- `.github/workflows/publish.yml` publishes to npm under `@ideaconsult` on GitHub Release
  via OIDC trusted publishing; the tag must equal `vX.Y.Z` from `package.json` and be
  reachable from `main`.
- Do not commit `dist/`.

## Deliberately Not Implemented

- Field-level repeats: an `algorithm_explicit` field shows and edits its first
  `algorithm_ref`/`equation` pair only. The insert machinery it needs **did** ship in M5
  (`insertOccurrence`, which `addEntry` uses for catalog rows), but the control on that field did
  not: it is one more `ChapterTools`-shaped add/remove above a pair of rows, and it is the only
  field-shaped gap left in the editor.
- **One rich-text toolbar per field.** `RichTextField` renders its five formatting buttons inside
  every text field, so an editing session puts ~195 of the report's ~330 buttons on screen — the
  bulk of the tab sequence, and 39 toolbars in the accessibility tree. The fix is one toolbar for
  the report (or one shown while its field has focus) acting on the focused field; it is a layout
  decision, so it is not being made as a side effect of a milestone. It is also the reason the test
  suite is slow — see the note under Commands.
- **A catalog that repeats.** The DTD declares `software_catalog*` inside `Catalogs`, so a document
  may carry two `<software_catalog>` elements. Addresses, the appendix and the outline all name the
  first occurrence, so the second one's entries are neither shown nor edited. It is the same shape of
  gap as the field-level repeats above, one rarer than the other; the fix is the same
  `occurrences`-aware addressing, not a special case.
- SpectraSearch registry entry (no QSAR-model result type exists there yet).
- Report export to HTML/RTF/Excel (upstream uses freemarker `qmrf.ftl`, `qmrf_rtf.ftl`,
  `table.ftl`). PDF is **not** on this list any more: the browser's print-to-PDF over the print
  stylesheet is the shipped route, and it is the one the user can check before pressing the button.
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
