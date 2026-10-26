import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fmtDate } from '../lib/queries'
import { Loader, ErrorBox, Empty } from '../components/States'

export default function Events() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [year, setYear] = useState('')

  const load = async () => {
    setError('')
    const { data, error } = await supabase.from('events').select('*, event_photos(count)').order('event_date', { ascending: false })
    if (error) setError(error.message); else setItems(data)
  }
  useEffect(() => { load() }, [])

  const years = [...new Set((items || []).map((e) => e.event_date?.slice(0, 4)))]
  const shown = (items || []).filter((e) => !year || e.event_date?.startsWith(year))

  return (
    <div className="container page">
      <div className="page-head">
        <p className="eyebrow">Дурсамж</p>
        <h1>Өдөрлөг ба арга хэмжээ</h1>
        <p className="lead">Тэнхимийн семинар, тэмцээн, өдөрлөгүүдийн зурагт цомог.</p>
      </div>
      <div className="tabs">
        <button className={!year ? 'active' : ''} onClick={() => setYear('')}>Бүгд</button>
        {years.map((y) => <button key={y} className={year === y ? 'active' : ''} onClick={() => setYear(y)}>{y}</button>)}
      </div>
      <ErrorBox error={error} onRetry={load} />
      {!items && !error && <Loader />}
      {items && shown.length === 0 && <Empty icon="📅" title="Арга хэмжээ алга" />}
      <div className="grid grid-2">
        {shown.map((ev) => (
          <Link key={ev.id} to={`/events/${ev.id}`} className="card event-card event-wide">
            <div className="card-img">
              {ev.cover_image_url && <img src={ev.cover_image_url} alt={ev.title} loading="lazy" />}
              <span className="card-tag">📷 {ev.event_photos?.[0]?.count ?? 0} зураг</span>
            </div>
            <div className="card-body">
              <div className="card-meta">{fmtDate(ev.event_date)}{ev.location ? ` · ${ev.location}` : ''}</div>
              <h3 className="card-title">{ev.title}</h3>
              <p className="card-text">{ev.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
