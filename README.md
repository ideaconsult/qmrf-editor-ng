# @ideaconsult/qmrf-viewer

Embeddable React **viewer and editor** for **QMRF** documents — the
**(Q)SAR Model Reporting Format** used by JRC and eNanoMapper to document a predictive
(Q)SAR model against the five OECD principles. A React rewrite of the Java
[QMRF Editor](https://sourceforge.net/p/qmrf/git/ci/master/tree/qmrf-editor/).

> **Status: scaffolding.** The package builds, tests and publishes shape is in place and the
> QMRF 3.0.0 schema is vendored, but the document model, viewer and editor are not
> implemented yet. See [docs/PLAN.md](./docs/PLAN.md) for the milestone plan. Until then the
> component renders an empty state.

It follows the packaging and embedding conventions of
[`@ideaconsult/jtoxkit-react`](https://github.com/ideaconsult/jtoxkit-react) and
[`@ideaconsult/qubounds-viewer`](https://github.com/ideaconsult/qubounds-viewer), so it can
later be registered as a route viewer in
[SpectraSearch](https://github.com/h2020charisma/spectrasearch). QMRF documents carry no
spectra, peaks or JCAMP-DX data — this is a model-documentation format, not a spectral one.

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

Planned API (only `showHeader` is live during scaffolding):

| Prop | Type | Notes |
| --- | --- | --- |
| `xml` | `string` | QMRF document text to open immediately. |
| `url` | `string` | URL to fetch the document from. |
| `readOnly` | `boolean` | Defaults to `true`. Set `false` to allow editing. |
| `token` | `string` | Bearer token for the `url` fetch. Never placed in a URL. |
| `showHeader` | `boolean` | Defaults to `true`; hosts usually pass `false`. |
| `onSave` | `(xml: string) => void` | Host save handler; enables the Save action. |

Open documents are always downloadable; `onSave` is how an embedding host routes a save to
its own backend, which keeps this package backend-agnostic.

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
