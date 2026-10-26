import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fmtDate } from '../lib/queries'
import { Loader, ErrorBox, Empty } from '../components/States'
import Lightbox from '../components/Lightbox'

export default function EventDetail() {
  const { id } = useParams()
  const [ev, setEv] = useState(undefined)
  const [error, setError] = useState('')
  const [lb, setLb] = useState(null)

  useEffect(() => {
    supabase.from('events').select('*, event_photos(*)').eq('id', id).maybeSingle().then(({ data, error }) => {
      if (error) setError(error.message)
      if (data) data.event_photos.sort((a, b) => a.created_at.localeCompare(b.created_at))
      setEv(data)
    })
  }, [id])

  if (error) return <div className="container page"><ErrorBox error={error} /></div>
  if (ev === undefined) return <Loader />
  if (!ev) return <div className="container page"><Empty icon="📅" title="Арга хэмжээ олдсонгүй"><Link to="/events" className="btn btn-primary">Буцах</Link></Empty></div>

  const photos = ev.event_photos || []
  return (
    <div className="page">
      <div className="event-hero" style={{ backgroundImage: ev.cover_image_url ? `url(${ev.cover_image_url})` : undefined }}>
        <div className="container event-hero-inner">
          <Link to="/events" className="link-back light">← Арга хэмжээ</Link>
          <p className="eyebrow light">{fmtDate(ev.event_date)}{ev.location ? ` · ${ev.location}` : ''}</p>
          <h1>{ev.title}</h1>
        </div>
      </div>
      <div className="container section">
        <p className="lead">{ev.description}</p>
        <h2>Зурагт цомог <span className="muted">({photos.length})</span></h2>
        {photos.length === 0 ? <Empty icon="📷" title="Зураг оруулаагүй байна" /> : (
          <div className="masonry">
            {photos.map((p, i) => (
              <button key={p.id} className="masonry-item" onClick={() => setLb(i)} aria-label={p.caption || 'Зураг'}>
                <img src={p.image_url} alt={p.caption || ''} loading="lazy" />
                {p.caption && <span>{p.caption}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      {lb !== null && <Lightbox photos={photos} index={lb} onIndex={setLb} onClose={() => setLb(null)} />}
    </div>
  )
}
