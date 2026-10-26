import { useEffect } from 'react'

export default function Lightbox({ photos, index, onClose, onIndex }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onIndex((index + 1) % photos.length)
      if (e.key === 'ArrowLeft') onIndex((index - 1 + photos.length) % photos.length)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [index, photos.length, onClose, onIndex])

  const p = photos[index]
  if (!p) return null
  return (
    <div className="lightbox" onClick={onClose} role="dialog" aria-modal="true">
      <button className="lb-close" onClick={onClose} aria-label="Хаах">✕</button>
      <button className="lb-nav lb-prev" aria-label="Өмнөх" onClick={(e) => { e.stopPropagation(); onIndex((index - 1 + photos.length) % photos.length) }}>‹</button>
      <figure onClick={(e) => e.stopPropagation()}>
        <img src={p.image_url} alt={p.caption || ''} />
        <figcaption>{p.caption} <span className="muted">· {index + 1}/{photos.length}</span></figcaption>
      </figure>
      <button className="lb-nav lb-next" aria-label="Дараах" onClick={(e) => { e.stopPropagation(); onIndex((index + 1) % photos.length) }}>›</button>
    </div>
  )
}
