import { describe, expect, it } from 'vitest'
import { openModel } from '../../qmrf/model.js'
import { elements } from '../../qmrf/render.js'
import { SPEC } from '../../qmrf/spec.js'
import {
  endpointGroups,
  endpointTerms,
  findEndpointTerm,
  searchEndpointTerms
} from '../../qmrf/vocab/endpoints.js'
import template from '../fixtures/qmrf-new-template.xml?raw'

/**
 * The endpoint vocabulary is vendored rather than transcribed, so these tests are what keeps the
 * vendored copy honest: the row count it is quoted as having, the uniqueness that makes its ids
 * usable as catalog entry ids, and the parity with upstream's new-document template — which is the
 * only other place the same rows appear, and the reason the ids can be reused at all.
 */

const terms = endpointTerms()
const columns = SPEC.catalogs.find((catalog) => catalog.name === 'endpoints_catalog')?.attrs ?? []

/** @param {import('../../qmrf/model.js').Model} doc */
function templateEndpointIds(doc) {
  if (!doc.root) return new Set()
  const catalogs = elements(doc.root).find((child) => child.name === 'Catalogs')
  const endpoints = catalogs
    ? elements(catalogs).find((c) => c.name === 'endpoints_catalog')
    : undefined
  return new Set(
    (endpoints ? elements(endpoints) : []).map(
      (row) => row.attrs.find((a) => a.name === 'id')?.value
    )
  )
}

describe('endpointTerms', () => {
  it('reads every row the vendored source declares', () => {
    // Upstream's template pre-copies the same vocabulary, so this is also the size of the wall of
    // entries a new document would inherit if the picker were not a picker.
    expect(terms.length).toBe(347)
    expect(terms[0]?.name).toBe('QMRF 1. 1. Melting point')
  })

  it('has an id per row, which is what makes them usable as entry ids', () => {
    const ids = terms.map((term) => term.id)
    expect(ids.every((id) => id !== '')).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('fills only columns the catalog actually has', () => {
    const declared = new Set(columns.map((column) => column.name))
    for (const term of terms) {
      for (const key of Object.keys(term.entry))
        expect(declared.has(key), `${term.id} ${key}`).toBe(true)
      expect(term.entry.id, term.id).toBe(term.id)
      expect(term.entry.name, term.id).toBe(term.name)
    }
  })

  it('parses once, so the picker does not re-read 58 KB per keystroke', () => {
    expect(endpointTerms()).toBe(terms)
  })

  it('matches the endpoints upstream seeds into every new document', () => {
    const seeded = templateEndpointIds(openModel(template))
    expect(seeded.size).toBe(terms.length)
    for (const term of terms) expect(seeded.has(term.id), term.id).toBe(true)
  })
})

describe('endpointGroups', () => {
  it('partitions the vocabulary without losing or inventing a row', () => {
    const groups = endpointGroups()
    expect(groups.length).toBeGreaterThan(10)
    expect(groups.reduce((sum, group) => sum + group.terms.length, 0)).toBe(terms.length)
    expect(groups.map((group) => group.group)).toEqual([...new Set(groups.map((g) => g.group))])
    expect(groups[0]?.group).toBe('QMRF 1. Physical Chemical Properties')
    expect(groups[0]?.terms.length).toBeGreaterThan(20)
    for (const group of groups) {
      expect(
        group.terms.every((term) => term.group === group.group),
        group.group
      ).toBe(true)
    }
  })
})

describe('findEndpointTerm', () => {
  it('finds a term by id and says null for one the vocabulary does not have', () => {
    const first = terms[0]
    if (!first) throw new Error('the vocabulary is empty')
    expect(findEndpointTerm(first.id)).toBe(first)
    expect(findEndpointTerm('endpoints_catalog_3')).toBeNull()
  })
})

describe('searchEndpointTerms', () => {
  it('matches a name case-insensitively', () => {
    const hits = searchEndpointTerms('MELTING')
    expect(hits.map((term) => term.name)).toContain('QMRF 1. 1. Melting point')
    expect(hits.every((term) => term.name.toLowerCase().includes('melting'))).toBe(true)
  })

  it('returns nothing for an empty query rather than the whole vocabulary', () => {
    // The picker renders its result; an empty box showing 347 rows is the failure this guards.
    expect(searchEndpointTerms('')).toEqual([])
    expect(searchEndpointTerms('   ')).toEqual([])
    expect(searchEndpointTerms('no such endpoint anywhere')).toEqual([])
  })
})
