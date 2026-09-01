import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import defaultExport, * as packageEntry from '../index.js'
import QMRFViewer from '../QMRFViewer'

describe('package entry', () => {
  it('default-exports the viewer component under both names', () => {
    expect(typeof defaultExport).toBe('function')
    expect(packageEntry.QMRFViewer).toBe(defaultExport)
  })

  it('renders the empty state scoped under the .qmrf-root host class', () => {
    const { container } = render(<QMRFViewer />)
    const root = container.querySelector('.qmrf-root')
    expect(root).not.toBeNull()
    expect(screen.getByText(/no QMRF document loaded/i)).toBeInTheDocument()
    // CSS isolation contract: everything we own must live under .qmrf-root.
    expect(root?.contains(screen.getByText(/no QMRF document loaded/i))).toBe(true)
  })
})
