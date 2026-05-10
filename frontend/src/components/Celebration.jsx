import { useEffect } from 'react'

export default function Celebration({ show, onClose }) {
  useEffect(() => {
    if (!show) return
    const timer = setTimeout(() => onClose?.(), 2000)
    return () => clearTimeout(timer)
  }, [show, onClose])

  if (!show) return null

  return null
}
