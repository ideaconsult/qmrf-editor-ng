/**
 * The outline the shell navigates by: what the document holds, and what the validator has to say
 * about each part of it.
 *
 * Both halves come from the document rather than from the schema — the chapter list is what this
 * document actually has, so a repeatable chapter shows once per occurrence and a drifted label
 * reads as written — and the counts are attributed by walking each issue's path, so a finding about
 * a nested field still lands on the chapter the user would have to open to fix it.
 *
 * @typedef {import('./model.js').Model} Model
 * @typedef {import('./model.js').Path} Path
 * @typedef {import('./validate.js').Report} Report
 * @typedef {import('./validate.js').Issue} Issue
 * @typedef {import('./xml.js').XmlElement} XmlElement
 */

/**
 * @typedef {object} Counts
 * @property {number} error
 * @property {number} warning
 * @property {number} info
 */

/**
 * @typedef {object} OutlineChapter
 * @property {string} name element name, which is what a jump address is built from
 * @property {string} heading as the document writes it
 * @property {string} address formatted path of its first occurrence
 * @property {number} occurrences how many times the document repeats this chapter
 * @property {boolean} repeated whether the schema lets it repeat at all
 * @property {Counts} counts findings anywhere below it
 */

/**
 * @typedef {object} OutlineCatalog
 * @property {string} name
 * @property {string} label the schema's own label for the group
 * @property {string} address formatted path of the catalog block itself
 * @property {number} entries
 * @property {Counts} counts
 */

/**
 * @typedef {object} Outline
 * @property {OutlineChapter[]} chapters in document order
 * @property {OutlineCatalog[]} catalogs the document holds, in document order
 * @property {Counts} document findings about the document itself, and anything outside the blocks
 */

import { formatPath, parsePath } from './model.js'
import { elements, headingOf } from './render.js'
import { ELEMENTS, SPEC } from './spec.js'

/** The two blocks under the root, named from the schema rather than hard-coded. */
const BLOCKS = (ELEMENTS[SPEC.root]?.children ?? []).map((child) => child.name)
const CHAPTERS_BLOCK = BLOCKS[0] ?? 'QMRF_chapters'
const CATALOGS_BLOCK = BLOCKS[1] ?? 'Catalogs'

/** @returns {Counts} */
export function emptyCounts() {
  return { error: 0, warning: 0, info: 0 }
}

/** @returns {Outline} what a document that has not been opened yet looks like to the shell */
export function emptyOutline() {
  return { chapters: [], catalogs: [], document: emptyCounts() }
}

/**
 * @param {Model} model
 * @param {Report|null} [report]
 * @returns {Outline}
 */
export function buildOutline(model, report = null) {
  const blocks = model.root ? elements(model.root) : []
  const chapterBlock = blocks.find((block) => block.name === CHAPTERS_BLOCK)
  const catalogBlock = blocks.find((block) => block.name === CATALOGS_BLOCK)
  const findings = attribute(report?.issues ?? [])
  const chapterNodes = chapterBlock ? elements(chapterBlock) : []

  /** @type {Record<string, number>} */
  const totals = {}
  for (const node of chapterNodes) totals[node.name] = (totals[node.name] ?? 0) + 1

  /** @type {Record<string, number>} */
  const seen = {}
  const chapters = chapterNodes.map((node) => {
    const index = seen[node.name] ?? 0
    seen[node.name] = index + 1
    return {
      name: node.name,
      heading: headingOf(node),
      address: formatPath([
        { name: CHAPTERS_BLOCK, index: 0 },
        { name: node.name, index }
      ]),
      occurrences: totals[node.name] ?? 1,
      repeated: SPEC.chapters.some((chapter) => chapter.name === node.name && chapter.repeatable),
      counts: findings.chapters[node.name] ?? emptyCounts()
    }
  })

  const catalogs = (catalogBlock ? elements(catalogBlock) : [])
    .filter((node) => SPEC.catalogs.some((entry) => entry.name === node.name))
    .map((node) => {
      const shape = SPEC.catalogs.find((entry) => entry.name === node.name)
      return {
        name: node.name,
        label: shape?.label ?? node.name.replace(/_catalog$/, ''),
        address: formatPath([
          { name: CATALOGS_BLOCK, index: 0 },
          { name: node.name, index: 0 }
        ]),
        entries: elements(node).length,
        counts: findings.catalogs[node.name] ?? emptyCounts()
      }
    })

  return { chapters, catalogs, document: findings.document }
}

/**
 * Buckets issues by the chapter or catalog their path runs through. An issue with no path, or one
 * whose path does not start in one of the two blocks, is a finding about the document itself.
 * @param {Issue[]} issues
 */
function attribute(issues) {
  /** @type {{chapters: Record<string, Counts>, catalogs: Record<string, Counts>, document: Counts}} */
  const found = { chapters: {}, catalogs: {}, document: emptyCounts() }
  /**
   * @param {Record<string, Counts>} bucket
   * @param {string} key
   * @param {import('./validate.js').Severity} severity
   */
  const bump = (bucket, key, severity) => {
    const counts = bucket[key] ?? emptyCounts()
    counts[severity] += 1
    bucket[key] = counts
  }
  for (const issue of issues) {
    const steps = parsePath(issue.path)
    const top = steps[0]?.name
    if (top === CHAPTERS_BLOCK && steps[1]) bump(found.chapters, steps[1].name, issue.severity)
    else if (top === CATALOGS_BLOCK && steps[1]) bump(found.catalogs, steps[1].name, issue.severity)
    else found.document[issue.severity] += 1
  }
  return found
}

/** The total an outline's counts must add up to, which is how its tests check nothing was lost. */
export function totalOf(/** @type {Outline} */ outline) {
  const totals = emptyCounts()
  for (const group of [
    { name: 'document', counts: outline.document },
    ...outline.chapters.map((chapter) => ({ name: chapter.name, counts: chapter.counts })),
    ...outline.catalogs.map((catalog) => ({ name: catalog.name, counts: catalog.counts }))
  ]) {
    totals.error += group.counts.error
    totals.warning += group.counts.warning
    totals.info += group.counts.info
  }
  return totals
}
