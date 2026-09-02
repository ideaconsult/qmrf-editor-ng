import { describe, expect, it } from 'vitest'
import {
  addEntry,
  catalogAddress,
  catalogEntries,
  catalogPath,
  catalogShape,
  citationIndex,
  entryCitations,
  entryFields,
  entryOptions,
  mintId
} from '../../qmrf/catalog.js'
import { formatPath, openModel, saveModel } from '../../qmrf/model.js'
import { SPEC } from '../../qmrf/spec.js'
import { validate } from '../../qmrf/validate.js'
import fixture from '../fixtures/qmrf-0.9-real.xml?raw'

/**
 * The catalogs as the editing side sees them. Everything a chapter cites lives in a catalog, so
 * these functions decide what an added entry is called, where it lands, and whether the document
 * still validates afterwards — the last being the point of minting ids rather than hand-typing
 * them.
 */

const model = openModel(fixture)

describe('catalog shapes', () => {
  it('are read from the schema, not repeated here', () => {
    const shape = catalogShape('endpoints_catalog')
    expect(shape).toMatchObject({
      label: 'Endpoints',
      entryElement: 'endpoint',
      refElement: 'endpoint_ref',
      idAttr: 'id'
    })
    expect(catalogPath('endpoints_catalog')).toEqual([
      { name: 'Catalogs', index: 0 },
      { name: 'endpoints_catalog', index: 0 }
    ])
    expect(catalogShape('made_up_catalog')).toBeNull()
    expect(catalogPath('made_up_catalog')).toBeNull()
  })
})

describe('the published document', () => {
  it('lists each catalog its own way, with a label a picker can offer', () => {
    expect(catalogEntries(model, 'software_catalog')).toHaveLength(3)
    expect(entryOptions(model, 'endpoints_catalog')).toEqual([
      { id: 'endpoints_catalog_3', label: '3.3.Acute toxicity to fish (lethality)' }
    ])
    // A descriptor is known by its name and its units, which is the pair a reader chooses between.
    const [first] = entryOptions(model, 'descriptors_catalog')
    expect(first?.label).toContain('Onsager-Kirkwood')
    expect(first?.label).toContain('[D2 mol/g]')
  })

  it('names an unnamed entry by its handle rather than by nothing', () => {
    // The published document has one named endpoint; upstream's own template carries 347 with blank
    // names. "(unnamed)" three hundred times over would make the picker useless, while the id at
    // least distinguishes them — and an entry with neither is still listed, not dropped.
    const blank = openModel(
      fixture.replace('name="3.3.Acute toxicity to fish (lethality)"', 'name=""')
    )
    expect(catalogEntries(blank, 'endpoints_catalog')[0]?.label).toBe('endpoints_catalog_3')

    const nameless = openModel(
      '<QMRF><Catalogs><endpoints_catalog><endpoint group="x"/></endpoints_catalog></Catalogs></QMRF>'
    )
    expect(catalogEntries(nameless, 'endpoints_catalog')[0]?.label).toBe('(unnamed)')
    // An entry with no id cannot be pointed at, so a picker has nothing to offer for it.
    expect(entryOptions(nameless, 'endpoints_catalog')).toEqual([])
  })

  it('continues the numbering the document already uses', () => {
    // Ids run `endpoints_catalog_3`, `descriptors_catalog_15`, and one hand-named `firstsoftware`,
    // so the next id clears the highest suffix it can read and ignores the rest.
    expect(mintId(model, 'endpoints_catalog')).toBe('endpoints_catalog_4')
    expect(mintId(model, 'descriptors_catalog')).toBe('descriptors_catalog_16')
    expect(mintId(model, 'software_catalog')).toBe('software_catalog_4')
    expect(mintId(model, 'authors_catalog')).toBe('authors_catalog_7')
  })
})

describe('adding an entry', () => {
  it('appends it to its own catalog, in the order the schema declares', () => {
    const added = addEntry(model, 'endpoints_catalog', {
      group: 'QMRF 3',
      name: 'New endpoint',
      subgroup: ''
    })
    if (!added?.path) throw new Error('the endpoint was not added')
    expect(formatPath(added.path)).toBe('Catalogs[0]/endpoints_catalog[0]/endpoint[1]')
    expect(added.id).toBe('endpoints_catalog_4')
    const line = saveModel(added.model)
      .split('\n')
      .find((row) => row.includes('New endpoint'))
    // `id` first, then the schema's order — and the empty `subgroup` left out, not written blank.
    expect(line?.trim()).toBe(
      '<endpoint id="endpoints_catalog_4" name="New endpoint" group="QMRF 3"/>'
    )
  })

  it('leaves the rest of the file alone, which is what fidelity is', () => {
    const added = addEntry(model, 'endpoints_catalog', { name: 'New endpoint' })
    if (!added) throw new Error('the endpoint was not added')
    const before = saveModel(model)
    const after = saveModel(added.model)
    expect(after).toContain('Danio rerio')
    expect(after.split('\n').length).toBe(before.split('\n').length + 1)
    expect(validate(added.model).counts.error).toBe(validate(model).counts.error)
  })

  it('refuses when the document has nowhere to put it', () => {
    // A `Catalogs` block with no matching catalog is repaired by the catalog table itself, not by
    // inventing a child here: the schema's sequence decides what may sit where, and that is not this
    // module's call. The caller says "this document has nowhere to put that" instead.
    const bare = openModel('<?xml version="1.0"?><QMRF><QMRF_chapters/><Catalogs/></QMRF>')
    expect(addEntry(bare, 'endpoints_catalog', { name: 'nowhere' })).toBeNull()
    expect(catalogEntries(bare, 'endpoints_catalog')).toEqual([])
    expect(mintId(bare, 'endpoints_catalog')).toBe('endpoints_catalog_1')
  })

  it('keeps a vocabulary id when the caller brings one', () => {
    // The endpoint picker hands over the vocabulary's own id so that two documents citing the same
    // effect say the same thing; a document that already uses it must be able to say so, and the
    // validator is what makes that visible rather than the writer silently branching.
    const added = addEntry(model, 'endpoints_catalog', {
      id: 'endpoints_catalog_3',
      name: 'Duplicate'
    })
    if (!added) throw new Error('the endpoint was not added')
    expect(added.id).toBe('endpoints_catalog_3')
    const report = validate(added.model)
    expect(report.issues.some((issue) => issue.code === 'duplicate-id')).toBe(true)
  })

  it('is what a picker needs to be reliable, whatever the catalog', () => {
    // Six catalogs, six entry elements, six attribute orders — and none of them hand-named here.
    for (const shape of SPEC.catalogs) {
      const added = addEntry(model, shape.name, {})
      if (!added) throw new Error(`${shape.name} refused to take an entry`)
      expect(added.id).toMatch(new RegExp(`^${shape.name}_\\d+$`))
      expect(formatPath(added.path)).toMatch(new RegExp(`^Catalogs\\[0\\]/${shape.name}\\[0\\]/`))
      expect(validate(added.model).counts.error).toBe(validate(model).counts.error)
    }
  })
})

describe('what an entry may be edited as', () => {
  it('is the attribute list the DTD declares, minus the handles', () => {
    expect(entryFields('descriptors_catalog').map((field) => field.name)).toEqual([
      'name',
      'units',
      'description',
      'publication_ref'
    ])
    // `id` is the handle the chapters point at, `ontology_term` a mapping this app does not read —
    // the same two the read view leaves out of its columns.
    expect(entryFields('software_catalog').map((field) => field.name)).toEqual([
      'name',
      'url',
      'number',
      'description',
      'version',
      'contact'
    ])
    expect(catalogAddress('descriptors_catalog')).toBe('Catalogs[0]/descriptors_catalog[0]')
    expect(entryFields('made_up_catalog')).toEqual([])
  })

  it('says which attributes are required and which point elsewhere', () => {
    const fields = entryFields('descriptors_catalog')
    // The DTD writes a descriptor as `name! units! description!`, so only the citation may stay
    // unwritten — which is the difference between a field the form has to nag about and one it
    // must not.
    expect(fields.filter((field) => field.required).map((field) => field.name)).toEqual([
      'name',
      'units',
      'description'
    ])
    // A descriptor may cite the paper it comes from — an IDREF attribute rather than a `*_ref`
    // child, and the editor needs to know which catalog to offer.
    const ref = fields.find((field) => field.name === 'publication_ref')
    expect(ref?.required).toBe(false)
    expect(ref?.refCatalog).toBe('publications_catalog')
  })
})

describe('who cites an entry', () => {
  it('names the citing field, the way the report names it', () => {
    expect(entryCitations(model, 'firstsoftware')).toEqual([
      {
        address: 'QMRF_chapters[0]/QSAR_identifier[0]/QSAR_software[0]',
        label: '1.3. Software coding the model'
      }
    ])
    expect(entryCitations(model, 'publications_catalog_5').map((c) => c.label)).toEqual([
      '9.2. Bibliography'
    ])
    expect(entryCitations(model, 'nothing_here')).toEqual([])
    expect(entryCitations(model, '')).toEqual([])
  })

  it('leaves an entry it added free to remove', () => {
    const added = addEntry(model, 'descriptors_catalog', { name: 'Solvation energy' })
    if (!added) throw new Error('the descriptor was not added')
    expect(entryCitations(added.model, added.id)).toEqual([])
  })

  it('holds the whole document in one pass, which is why the tables ask once', () => {
    const index = citationIndex(model)
    // Every entry in the published document is cited by something — which is exactly why the delete
    // guard has to explain itself rather than offer a button and do nothing.
    const entries = SPEC.catalogs.flatMap((shape) => catalogEntries(model, shape.name))
    expect(entries).toHaveLength(22)
    expect(index.size).toBe(entries.length)
    for (const entry of entries) expect(index.has(entry.id)).toBe(true)
    // The blank pointers the fixture is full of (`publication_ref=""`) cite nothing.
    expect(index.has('')).toBe(false)
  })
})
