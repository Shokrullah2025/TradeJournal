import { useEffect } from 'react'
import { createPortal } from 'react-dom'

// Tracks how many portals are currently mounted so we only remove the
// scroll lock when the last one unmounts (handles nested modals / lightboxes).
let _openCount = 0

/**
 * Renders children into document.body via a React portal so that modal
 * backdrops are never clipped by ancestor overflow:hidden/auto containers
 * (including Safari's quirky scroll-container clipping behaviour).
 * Also locks body scroll while any portal is mounted.
 */
const ModalPortal = ({ children }) => {
  useEffect(() => {
    _openCount++
    if (_openCount === 1) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      _openCount--
      if (_openCount === 0) {
        document.body.style.overflow = ''
      }
    }
  }, [])

  return createPortal(children, document.body)
}

export default ModalPortal
