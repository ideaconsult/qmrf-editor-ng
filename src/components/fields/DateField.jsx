import { dateFormatOf, todayIn } from '../../qmrf/dates.js'
import { plainText } from '../../qmrf/html.js'
import { TextRow } from './Controls.jsx'

/**
 * A date field, as a text box rather than a date picker.
 *
 * The schema types these four fields as free text, and the documents prove the field is free: the
 * published fixture writes `29.06.2009` in 2.1 and `2009-12-03` in 10.2. An `<input type="date">`
 * could only hold the second, so opening a real document would show an empty box where the report
 * says a date, and saving would replace the author's format with ours.
 *
 * What the picker is worth is kept instead: **Today** fills the value in whatever shape the field
 * already uses, so a document written in `dd.MM.yyyy` stays that way.
 *
 * @param {{text: string, onCommit: (text: string) => void}} props
 */
export default function DateField({ text, onCommit }) {
  const current = plainText(text)
  const format = dateFormatOf(current)
  return (
    <div className="qmrf-date" data-qmrf-edit="date">
      <TextRow
        label="Date"
        value={current}
        placeholder="YYYY-MM-DD"
        hint={format ? `this document writes ${format}` : 'no date here yet'}
        onCommit={onCommit}
      />
      <button
        type="button"
        className="qmrf-button qmrf-button--today"
        onClick={() => onCommit(todayIn(new Date(), current))}
      >
        Today
      </button>
    </div>
  )
}
