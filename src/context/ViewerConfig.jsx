/**
 * What the host asked for, as one small object.
 *
 * `QMRFViewer` receives these as props, but the components that need them — the toolbar deciding
 * what to offer, a field editor deciding whether to render — are several levels down. Passing them
 * down by hand is how a component ends up taking four props it only forwards, so they arrive through
 * context instead, which is also the seam a host embed will use once it wants to say "the header is
 * mine" from its own tree.
 */

import { createContext, useContext, useMemo } from 'react'

/**
 * @typedef {object} ViewerConfig
 * @property {boolean} readOnly
 * @property {boolean} showHeader
 * @property {boolean} showNav
 * @property {((xml: string) => void | Promise<void>)|undefined} onSave
 * @property {string} uid prefix that keeps element ids unique when a host embeds two viewers
 */

/** @type {React.Context<ViewerConfig>} */
const ViewerConfigContext = createContext(
  /** @type {ViewerConfig} */ ({
    readOnly: true,
    showHeader: true,
    showNav: true,
    onSave: undefined,
    uid: 'qmrf'
  })
)

/**
 * @param {{config: Partial<ViewerConfig>, children: React.ReactNode}} props
 */
export function ViewerConfigProvider({ config, children }) {
  const value = useMemo(
    () => ({
      readOnly: config.readOnly ?? true,
      showHeader: config.showHeader ?? true,
      showNav: config.showNav ?? true,
      onSave: config.onSave,
      uid: config.uid ?? 'qmrf'
    }),
    [config.readOnly, config.showHeader, config.showNav, config.onSave, config.uid]
  )
  return <ViewerConfigContext.Provider value={value}>{children}</ViewerConfigContext.Provider>
}

/** @returns {ViewerConfig} */
export function useViewerConfig() {
  return useContext(ViewerConfigContext)
}
