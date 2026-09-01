import { describe, expect, it } from 'vitest'
import { openModel } from '../../qmrf/model.js'
import { validate } from '../../qmrf/validate.js'
import fixture from '../fixtures/qmrf-0.9-real.xml?raw'

/**
 * A two-chapter document that is otherwise well formed, so each test can inject exactly one
 * defect and expect exactly one finding for it.
 */
function doc(
  /** @type {{schema?: string, version?: string, chapters?: string, catalogs?: string}} */ parts
) {
  const { schema = '1.0', version = '3.0', chapters = '', catalogs = '' } = parts
  return `<?xml version="1.0" encoding="UTF-8"?>
<QMRF schema_version="${schema}" version="${version}" name="(Q)SAR Model Reporting Format">
<QMRF_chapters>
${chapters}
</QMRF_chapters>
<Catalogs>
${catalogs}
</Catalogs>
</QMRF>
`
}

const WITH_REF = `
<QSAR_identifier chapter="1" name="QSAR identifier">
<QSAR_title chapter="1.1" name="QSAR identifier (title)">&lt;html&gt;title&lt;/html&gt;</QSAR_title>
<QSAR_software chapter="1.3" name="Software coding the model"><software_ref idref="s1" catalog="software_catalog"/></QSAR_software>
</QSAR_identifier>
<QSAR_Robustness chapter="6" name="Robustness">
<training_set_availability chapter="6.1" name="Availability of the training set" answer="Yes"/>
</QSAR_Robustness>
`

const CATALOGS = `
<software_catalog><software id="s1" name="Tool" number="1" url="" description="" contact="" /></software_catalog>
<algorithms_catalog/>
<descriptors_catalog/>
<endpoints_catalog/>
<publications_catalog/>
<authors_catalog/>
`

/** @returns {string[]} the codes of every issue at the given severity */
function codes(
  /** @type {import('../../qmrf/validate.js').Report} */ report,
  /** @type {string} */ severity
) {
  return report.issues.filter((i) => i.severity === severity).map((i) => i.code)
}

describe('the published 0.9 fixture', () => {
  const report = validate(openModel(fixture))

  it('is not treated as invalid', () => {
    expect(report.counts.error).toBe(0)
  })

  it('reports the schema drift once, and reads the declared versions', () => {
    expect(report.version).toMatchObject({
      schemaVersion: '0.9',
      editorVersion: '1.2',
      drifted: true
    })
    expect(codes(report, 'warning').filter((c) => c === 'version-drift')).toHaveLength(1)
  })

  it('surfaces the field labels the document spells differently from the schema', () => {
    const drift = report.issues.filter((i) => i.code === 'fixed-attr-drift')
    expect(drift.map((i) => i.attr)).toEqual(['name', 'name'])
    expect(drift.every((i) => i.severity === 'warning')).toBe(true)
  })

  it('demands 3.0-only fields as info, not as errors the author never made', () => {
    const nanomaterial = report.issues.filter((i) => i.attr === 'nanomaterial')
    expect(nanomaterial.length).toBeGreaterThan(0)
    expect(nanomaterial.every((i) => i.severity === 'info')).toBe(true)
  })

  it('resolves every reference in the real document', () => {
    expect(codes(report, 'error')).toEqual([])
    expect(report.issues.some((i) => i.code === 'dangling-ref')).toBe(false)
  })
})

describe('defects a 3.0 document is held to', () => {
  const base = { chapters: WITH_REF, catalogs: CATALOGS }

  it('accepts the clean baseline', () => {
    const report = validate(openModel(doc(base)))
    expect(codes(report, 'error')).not.toContain('dangling-ref')
    expect(codes(report, 'error')).not.toContain('enum-value')
    expect(codes(report, 'error')).not.toContain('duplicate-id')
  })

  it('calls a reference that names no entry an error', () => {
    const broken = { ...base, chapters: WITH_REF.replace('idref="s1"', 'idref="nowhere"') }
    const report = validate(openModel(doc(broken)))
    const issue = report.issues.find((i) => i.code === 'dangling-ref')
    expect(issue?.severity).toBe('error')
    expect(issue?.message).toContain('software catalog')
    expect(issue?.path).toContain('QSAR_software[0]/software_ref[0]')
  })

  it('calls a reference into the wrong catalog an error', () => {
    const broken = {
      ...base,
      chapters: WITH_REF.replace(
        '<software_ref idref="s1" catalog="software_catalog"/>',
        '<descriptor_ref idref="s1" catalog="descriptors_catalog"/>'
      )
    }
    const issue = validate(openModel(doc(broken))).issues.find(
      (i) => i.code === 'wrong-catalog-ref'
    )
    expect(issue?.severity).toBe('error')
    expect(issue?.message).toContain('software catalog')
  })

  it('rejects an answer outside the DTD value set', () => {
    const broken = { ...base, chapters: WITH_REF.replace('answer="Yes"', 'answer="Maybe"') }
    const issue = validate(openModel(doc(broken))).issues.find((i) => i.code === 'enum-value')
    expect(issue?.severity).toBe('error')
    expect(issue?.message).toContain('Yes | No')
  })

  it('flags an id used twice, on both entries', () => {
    const broken = {
      ...base,
      catalogs: CATALOGS.replace(
        '<algorithms_catalog/>',
        `<algorithms_catalog><algorithm id="s1" definition="d" description="e"/></algorithms_catalog>`
      )
    }
    const dupes = validate(openModel(doc(broken))).issues.filter((i) => i.code === 'duplicate-id')
    expect(dupes).toHaveLength(2)
    expect(dupes.every((i) => i.severity === 'error')).toBe(true)
  })

  it('flags a repeated element the schema allows only once', () => {
    const broken = { ...base, chapters: `${WITH_REF}${WITH_REF}` }
    expect(codes(validate(openModel(doc(broken))), 'error')).toContain('too-many-children')
  })

  it('flags a chapter out of schema order', () => {
    const cut = WITH_REF.indexOf('\n<QSAR_Robustness')
    const swapped = `${WITH_REF.slice(cut)}${WITH_REF.slice(0, cut)}`
    const report = validate(openModel(doc({ ...base, chapters: swapped })))
    const issue = report.issues.find((i) => i.code === 'out-of-order')
    expect(issue?.element).toBe('QSAR_identifier')
    expect(issue?.message).toContain('QMRF_chapters')
  })

  it('labels an issue with the chapter and field name from the schema', () => {
    const broken = { ...base, chapters: WITH_REF.replace('answer="Yes"', 'answer="Maybe"') }
    const issue = validate(openModel(doc(broken))).issues.find((i) => i.code === 'enum-value')
    expect(issue).toMatchObject({
      chapter: '6.1',
      label: 'Availability of the training set',
      element: 'training_set_availability'
    })
  })
})

describe('severity follows the declared version', () => {
  const missingAnswer = WITH_REF.replace(' answer="Yes"', '')

  it('is an error in a document claiming 3.0', () => {
    const report = validate(openModel(doc({ chapters: missingAnswer, catalogs: CATALOGS })))
    expect(codes(report, 'error')).toContain('attr-missing')
  })

  it('is info in a document that declares an older schema', () => {
    const report = validate(
      openModel(doc({ schema: '0.9', version: '1.2', chapters: missingAnswer, catalogs: CATALOGS }))
    )
    expect(codes(report, 'error')).not.toContain('attr-missing')
    expect(codes(report, 'info')).toContain('attr-missing')
    expect(codes(report, 'info')).toContain('missing-child')
  })

  it('stays an error when the answer is present but not allowed, whatever the version', () => {
    const broken = WITH_REF.replace('answer="Yes"', 'answer="Maybe"')
    const report = validate(
      openModel(doc({ schema: '0.9', version: '1.2', chapters: broken, catalogs: CATALOGS }))
    )
    expect(codes(report, 'error')).toContain('enum-value')
  })
})

describe('documents that are not QMRF', () => {
  it('reports a foreign root and stops', () => {
    const report = validate(openModel('<spectra id="1"><peak/></spectra>'))
    expect(report.issues.map((i) => i.code)).toEqual(['not-qmrf'])
    expect(report.issues[0]?.message).toContain('<spectra>')
  })

  it('reports a file with no root element', () => {
    expect(validate(openModel('not xml at all')).issues.map((i) => i.code)).toContain('no-root')
  })

  it('reports what the tolerant parser had to repair', () => {
    const report = validate(openModel('<QMRF schema_version="1.0" version="3.0"><QMRF_chapters>'))
    expect(codes(report, 'warning')).toContain('xml-unclosed-element')
  })
})
