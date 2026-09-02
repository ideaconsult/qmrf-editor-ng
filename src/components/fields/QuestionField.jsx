import { FLAG_LABELS } from '../../qmrf/render.js'
import { EnumRow, FlagGrid } from './Controls.jsx'

/**
 * A question field: 6.1–6.4 and 7.1–7.4, whose answers are attributes rather than content.
 *
 * Two shapes wear this one kind. Most of them are a single `answer`, either `Yes|No` or the
 * `All|Some|No|Unknown` the descriptor-availability questions use. Two (6.2, 7.2) answer with seven
 * flags instead, one per kind of structural information the set carries. The values offered are the
 * ones the DTD declares, read off `ELEMENTS`, so a schema change narrows or widens the choices here
 * without a component noticing.
 *
 * @param {{
 *   attrs: {name: string, values?: string[]}[],
 *   readAttr: (name: string) => string,
 *   onSet: (name: string, value: string) => void
 * }} props
 */
export default function QuestionField({ attrs, readAttr, onSet }) {
  const flagSpecs = FLAG_LABELS.filter((flag) => attrs.some((attr) => attr.name === flag.attr))
  // Everything that is not one of the inventory flags answers on its own: the `answer` attribute in
  // six of the eight fields, and anything a future schema adds that this one does not know.
  const singles = attrs.filter((attr) => !flagSpecs.some((flag) => flag.attr === attr.name))

  if (flagSpecs.length > 0)
    return (
      <div className="qmrf-question" data-qmrf-edit="question">
        <FlagGrid
          flags={flagSpecs.map((flag) => ({
            attr: flag.attr,
            label: flag.label,
            value: readAttr(flag.attr)
          }))}
          onSet={onSet}
        />
      </div>
    )

  return (
    <div className="qmrf-question" data-qmrf-edit="question">
      {singles.map((attr) => (
        <EnumRow
          key={attr.name}
          label={attr.name === 'answer' ? 'Answer' : attr.name}
          value={readAttr(attr.name)}
          options={attr.values ?? []}
          onPick={(value) => onSet(attr.name, value)}
        />
      ))}
    </div>
  )
}
