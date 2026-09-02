import { useMemo, useState } from 'react'
import { endpointGroups, searchEndpointTerms } from '../../qmrf/vocab/endpoints.js'

/**
 * Choosing an endpoint from the OECD/QMRF vocabulary.
 *
 * Upstream copies all 347 terms into every document so the picker has something to point at. Here
 * the vocabulary stays outside the document and the chosen term is minted as one catalog entry when
 * it is picked — see `src/qmrf/vocab/endpoints.js` for why.
 *
 * The choice is never empty. A `<select>` whose placeholder is "— choose —" and whose Add button is
 * wired anyway is how a click appears to do nothing, which is the complaint this picker exists to
 * answer: the first term the search offers is selected as soon as the list exists, and Add says what
 * it is about to add.
 *
 * @param {{onPick: (termId: string) => void, picked?: string[]}} props
 */
export default function EndpointPicker({ onPick, picked = [] }) {
  const [query, setQuery] = useState('')
  const [choice, setChoice] = useState('')

  const groups = useMemo(() => {
    const text = query.trim()
    if (!text) return endpointGroups()
    return [{ group: 'Search results', terms: searchEndpointTerms(text) }]
  }, [query])

  const listed = groups.flatMap((group) => group.terms)
  const first = listed[0]?.id ?? ''
  const selected = listed.some((term) => term.id === choice) ? choice : first
  const cited = new Set(picked)

  return (
    <div className="qmrf-picker">
      <input
        className="qmrf-input qmrf-picker-search"
        type="search"
        value={query}
        placeholder="Search 347 endpoints…"
        aria-label="Search the endpoint vocabulary"
        onChange={(event) => setQuery(event.target.value)}
      />
      <label className="qmrf-edit-row">
        <span className="qmrf-edit-label">Endpoint</span>
        <select
          className="qmrf-input"
          value={selected}
          aria-label="Endpoint to add"
          onChange={(event) => setChoice(event.target.value)}
        >
          {listed.length === 0 ? <option value="">Nothing matches “{query}”</option> : null}
          {groups.map((group) => (
            <optgroup key={group.group} label={group.group}>
              {group.terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                  {cited.has(term.id) ? ' — already cited' : ''}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="qmrf-button qmrf-button--add"
        disabled={!selected}
        onClick={() => selected && onPick(selected)}
      >
        Add endpoint
      </button>
      <span className="qmrf-edit-hint">
        {listed.length} of 347 terms{selected ? '' : ' — nothing to add'}
      </span>
    </div>
  )
}
