# @ideaconsult/qmrf-viewer

Embeddable React **viewer and editor** for **QMRF** documents — the
**(Q)SAR Model Reporting Format** used by JRC and eNanoMapper to document a predictive
(Q)SAR model against the five OECD principles. A React rewrite of the Java
[QMRF Editor](https://sourceforge.net/p/qmrf/git/ci/master/tree/qmrf-editor/).

> **Status: a working viewer and editor.** A real QMRF document opens, reads as a report, and
> edits in place — one write per edit, undo/redo, and XML out that keeps every byte of the
> content you did not touch. What is not implemented: report export to HTML/RTF/Excel, the
> SpectraSearch registry entry, and the repeated `algorithm_explicit` pair inside one field.
> See [docs/PLAN.md](./docs/PLAN.md) for the milestone plan.

It follows the packaging and embedding conventions of
[`@ideaconsult/jtoxkit-react`](https://github.com/ideaconsult/jtoxkit-react) and
[`@ideaconsult/qubounds-viewer`](https://github.com/ideaconsult/qubounds-viewer), so it can
later be registered as a route viewer in
[SpectraSearch](https://github.com/h2020charisma/spectrasearch).

## Install

```sh
pnpm add @ideaconsult/qmrf-viewer
```

## Use as a component

```jsx
import QMRFViewer from '@ideaconsult/qmrf-viewer'
import '@ideaconsult/qmrf-viewer/style.css'

<QMRFViewer xml={qmrfXml} readOnly onSave={(xml) => publish(xml)} />
```

React and React DOM are peer dependencies; CSS is scoped under `.qmrf-root` and does not
leak into the host. For a Vite host, add:

```js
resolve: { dedupe: ['react', 'react-dom'] },
optimizeDeps: { include: ['@ideaconsult/qmrf-viewer'] }
```

### Props

Every prop below is live. `readOnly: false` brings the in-place field editors, the View/Edit
switch, New and the undo tape; a read-only host gets the report and the outline only.

| Prop | Type | Notes |
| --- | --- | --- |
| `xml` | `string` | QMRF document text to open immediately. |
| `url` | `string` | URL to fetch the document from. |
| `readOnly` | `boolean` | Defaults to `true`. Set `false` to allow editing. |
| `token` | `string` | Bearer token for the `url` fetch. Never placed in a URL. |
| `showHeader` | `boolean` | Defaults to `true`; hosts usually pass `false`. |
| `showNav` | `boolean` | Defaults to `true`; the outline and findings list beside the report. |
| `onSave` | `(xml: string) => void` | Host save handler; enables the Save action. |

Open documents are always downloadable; `onSave` is how an embedding host routes a save to
its own backend, which keeps this package backend-agnostic. Passing `onSave` enables Save even
under `readOnly: true`, which is the shape of a host that owns validation and does the writing.

### What a reader gets

- **An outline** of the document's own ten chapters and six catalogs — each row a jump to the
  chapter or table it names, carrying the number of findings in that part.
- **A findings list** under it: one row per validator finding — what is wrong, which field it
  belongs to, and a jump to that field. It opens itself when something is actually broken (a
  pointer that names no entry, a required child that is gone) and stays shut while the document
  is merely incomplete. `showNav={false}` drops both panels.
- **A version banner** when the file declares another `schema_version`, naming the versions the
  document declares and the ones this app follows — and promising the report below is that
  document as it stands. Nothing here rewrites a drifted version or a drifted label.
- **The six catalogs as an appendix** of tables. Editing one opens a form per entry; an entry
  that is cited cannot be deleted, and the dead control names the fields holding it, each a
  jump there. While the editors are showing, all six are listed even where the document holds
  fewer — `<!ELEMENT QMRF (QMRF_chapters,Catalogs)>` requires the block, so a file missing a
  catalog is short of the schema rather than exempt from it, and its Add writes the missing
  `Catalogs`/`*_catalog` element in the position the DTD declares. A read-only viewer lists
  only what the document holds, so no row leads nowhere.
- **Print / PDF** in the header: the report as an A4 dossier — the cover block of document
  identity, chapters under grey title bands, the six catalogs as an annex on their own page,
  attachments as a named list — and nothing of the app's own chrome. See
  [Printing](#printing) for what the dialog has to be set to.
- A field's stored HTML is sanitised before it is *stored* as well as before it is shown, so
  what the editor saves is what this viewer would render.

### Registering in a host viewer map

A SpectraSearch-like host dispatches viewers by result type from `src/viewers.js`. The entry has
to be `kind: "route"` — an `external` entry opens a new tab, which gets no token and cannot
save:

```js
// Not live yet: the indexing pipeline emits no QSAR-model result type to key this on.
qsarModel: {
  kind: 'route',
  component: lazy(() => import('./pages/QmrfPage.jsx')) // renders <QMRFViewer token={…} apiBase={…} readOnly={false}/>
}
```

The host needs `resolve.dedupe: ['react', 'react-dom']` and
`optimizeDeps.include: ['@ideaconsult/qmrf-viewer']` as above. The blocker is stated in
[SpectraSearch Integration](./AGENTS.md#spectrasearch-integration).

## Use as an app

```sh
pnpm install
pnpm dev        # http://localhost:5176/qmrf/
```

Standalone URL parameters (parsed only in `src/App.jsx`):

| Parameter | Effect |
| --- | --- |
| `?url=…` | fetch and open this QMRF document on load |
| `?mode=edit` | start editable instead of read-only |
| `?token=…` | bearer token for the fetch above |

Editing is `?mode=edit` (or the **Edit** button, once the host allows writing). Without it the
viewer is read-only and offers no controls at all, which is what a reader of a shared link wants
and what surprises whoever arrived to change the file.

## Printing

A QMRF is filed as paper as often as it is filed as XML — the printed report is what a dossier
attaches — so **Print / PDF** in the header is a first-class export beside Save. It switches the
report to its read view first, and then asks the browser to print: an editing form is not a filed
document, and in the edit view the catalogs are entry forms rather than tables. "Save as PDF" in
that dialog is what produces the attachment.

What comes out is upstream's `QMRF_xml2pdf.java` in CSS — A4 with the same margins, 10 pt body
text, chapter titles in bold Times on a grey band, the model's identity as a cover block, tables
that repeat their header row across a page break, attachments as a named list with their URLs, and
the six catalogs as an annex on a page of their own. The app's own warnings are not printed: no
banner, no findings list, no validation chip, because the report is the file rather than this app's
opinion of it.

Two settings belong to the browser rather than to the app:

- **Page numbers** come from the dialog's *Headers and footers* option. CSS page margin boxes are
  unsupported in Chrome, so no stylesheet can put a number on the page; the same option adds the
  date and the source, which is what a working copy wants anyway.
- **Margins** must stay on *Default* for the geometry below to apply — *None* or *Minimum*
  overrides it — and *Background graphics* must stay on or the grey chapter bands print white.

An embedded viewer prints the same report but leaves the page geometry to its host: a `@page` rule
has no selector, so setting A4 and 80 pt of left margin from a component stylesheet would be laying
out the host's whole document. A host that wants them adds the rule itself:

```css
/* The geometry of `new Document(PageSize.A4, 80, 50, 30, 65)`, in top/right/bottom/left order. */
@page {
  size: A4;
  margin: 30pt 50pt 65pt 80pt;
}
```

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | dev server on port `5176`, base `/qmrf/` |
| `pnpm build` | standalone app build |
| `pnpm build:lib` | library build → `dist/qmrf-viewer.js` + `dist/style.css` |
| `pnpm test` | Vitest (jsdom) |
| `pnpm lint`, `pnpm format` | Biome check / check and write |
| `pnpm typecheck` | `tsc` over JSDoc types |
| `pnpm gen:spec` | regenerate the field spec from `vendor/qmrf.dtd` |

## Schema

`vendor/qmrf.dtd` is QMRF schema 3.0.0 and is the source of truth for chapter numbering,
field labels, cardinality and enumerations; `src/qmrf/spec.js` is generated from it and CI
fails if the two drift. A document is a fixed sequence of ten chapters plus six
cross-referenced catalogs. Older versions (0.9, 1.0, 1.2) are opened with a warning rather
than rejected, because real documents in the wild declare drifted versions.

## License

Apache-2.0. Parts of the vendored schema, fixtures and vocabulary originate from the
AGPL/LGPL-licensed upstream QMRF project — see the licensing caveat in
[AGENTS.md](./AGENTS.md).
