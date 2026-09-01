/**
 * The QMRF / EC / OECD endpoint vocabulary.
 *
 * Upstream pre-copies all 347 rows of it into the `endpoints_catalog` of every new document so that
 * a `model_endpoint` reference can point at one. That works but it puts 347 rows nobody chose into
 * every file, and it makes the catalog a wall of entries to scroll. Here the vocabulary is a picker:
 * the user searches it, and the chosen term is minted as an entry in the document's own
 * `endpoints_catalog` — with the vocabulary's own id, so two documents that picked the same endpoint
 * say the same thing. The published document under `src/tests/fixtures` shows what that means in
 * practice: its single endpoint is `endpoints_catalog_3`, an id the author minted, not a vocabulary
 * id — so this is a deliberate departure from how older documents were written, not a convention.
 *
 * The source file is the upstream one, `endpoints-source.xml`, kept verbatim (see the licensing
 * note in AGENTS.md) and parsed with our own parser at first use rather than transcribed into JS,
 * so there is one copy of the data and it cannot drift from the file it came from. Ids are unique
 * in it, which is what makes them usable as document entry ids; `endpoints.test.js` asserts that,
 * along with the row count and the parity with the vendored new-document template.
 */

/** @typedef {import('../xml.js').XmlElement} XmlElement */

import { SPEC } from '../spec.js'
import { parseXml } from '../xml.js'

/**
 * @typedef {object} EndpointTerm
 * @property {string} id the vocabulary's own id, reused as the catalog entry id
 * @property {string} name
 * @property {string} group the QMRF endpoint group the term belongs to
 * @property {string} subgroup
 * @property {EndpointEntry} entry the attribute set to write into `endpoints_catalog`
 */

/** @typedef {Record<string, string>} EndpointEntry */

import source from './endpoints-source.xml?raw'

/** @type {EndpointTerm[]|null} */
let terms = null

/** The catalogue columns the vocabulary can fill, in the order the DTD declares them. */
const ENTRY_ATTRS = SPEC.catalogs.find((c) => c.name === 'endpoints_catalog')?.attrs ?? []

/** @returns {EndpointTerm[]} in the order the vocabulary lists them (group, then number) */
export function endpointTerms() {
  if (terms) return terms
  const root = parseXml(source).doc.root
  /** @type {EndpointTerm[]} */
  const found = []
  for (const node of root?.children ?? []) {
    if (node.type !== 'element' || node.name !== 'endpoint') continue
    const value = (/** @type {string} */ name) =>
      node.attrs.find((a) => a.name === name)?.value ?? ''
    /** @type {EndpointEntry} */
    const entry = {}
    for (const attr of ENTRY_ATTRS) {
      const text = value(attr.name)
      if (text) entry[attr.name] = text
    }
    found.push({
      id: value('id'),
      name: value('name'),
      group: value('group'),
      subgroup: value('subgroup'),
      entry
    })
  }
  terms = found
  return terms
}

/** @returns {{group: string, terms: EndpointTerm[]}[]} grouped, first-appearance order kept */
export function endpointGroups() {
  /** @type {{group: string, terms: EndpointTerm[]}[]} */
  const groups = []
  /** @type {Map<string, EndpointTerm[]>} */
  const index = new Map()
  for (const term of endpointTerms()) {
    const bucket = index.get(term.group)
    if (bucket) bucket.push(term)
    else {
      const started = [term]
      index.set(term.group, started)
      groups.push({ group: term.group, terms: started })
    }
  }
  return groups
}

/** @returns {EndpointTerm|null} */
export function findEndpointTerm(/** @type {string} */ id) {
  return endpointTerms().find((t) => t.id === id) ?? null
}

/**
 * Terms whose name contains the query, case-insensitively, for the picker. An empty query returns
 * nothing rather than the whole vocabulary, so a caller cannot accidentally render 347 rows.
 * @returns {EndpointTerm[]}
 */
export function searchEndpointTerms(/** @type {string} */ query) {
  const needle = query.trim().toLowerCase()
  if (!needle) return []
  return endpointTerms().filter((term) => term.name.toLowerCase().includes(needle))
}
