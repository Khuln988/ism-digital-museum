import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { EXHIBIT_SELECT, fmtDate } from '../lib/queries'
import ExhibitCard from '../components/ExhibitCard'
import { Loader, ErrorBox } from '../components/States'

export default function Home() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    try {
      const [ex, cnt, t, ev] = await Promise.all([
        supabase.from('exhibits').select(EXHIBIT_SELECT).eq('status', 'published').eq('featured', true).order('year_created', { ascending: false }).limit(6),
        supabase.from('exhibits').select('id', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('teachers').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('*').order('event_date', { ascending: false }).limit(3),
      ])
      const err = ex.error || cnt.error || t.error || ev.error
      if (err) throw err
      setData({ featured: ex.data, exhibitCount: cnt.count, teacherCount: t.count, events: ev.data })
    } catch (e) { setError(e.message) }
  }
  useEffect(() => { load() }, [])

  return (
    <>
      <section className="hero">
        <div className="hero-bg" aria-hidden />
        <div className="container hero-inner">
          <p className="eyebrow">Мэдээллийн Системийн Менежментийн Тэнхим</p>
          <h1>ISM Digital Museum</h1>
          <p className="hero-lead">Тэнхимийн түүх, багш нар, өдөрлөг арга хэмжээ, оюутнуудын бүтээлийг хадгалж танилцуулах интерактив дижитал музей.</p>
          <div className="hero-actions">
            <Link to="/virtual" className="btn btn-light btn-lg">🏛️ Виртуал үзэсгэлэнд орох</Link>
            <Link to="/exhibits" className="btn btn-outline-light btn-lg">Үзмэрүүдийг үзэх</Link>
          </div>
          <div className="stats">
            <div><b>{data?.exhibitCount ?? '–'}</b><span>Үзмэр</span></div>
            <div><b>{data?.teacherCount ?? '–'}</b><span>Багш</span></div>
            <div><b>{new Date().getFullYear() - 1991}+</b><span>Жилийн түүх</span></div>
          </div>
        </div>
      </section>

      <section className="container section">
        <div className="section-head">
          <div><p className="eyebrow">Онцлох</p><h2>Онцлох үзмэрүүд</h2></div>
          <Link to="/exhibits" className="link-arrow">Бүгдийг үзэх →</Link>
        </div>
        <ErrorBox error={error} onRetry={load} />
        {!data && !error ? <Loader /> : (
          <div className="grid grid-3">{data?.featured.map((e) => <ExhibitCard key={e.id} exhibit={e} />)}</div>
        )}
      </section>

      <section className="container section">
        <div className="feature-grid">
          <Link to="/virtual" className="feature feature-dark">
            <span className="feature-icon">🏛️</span>
            <h3>Виртуал үзэсгэлэн</h3>
            <p>Танхим бүрээр алхаж, гэрэлтүүлэгтэй галерейд бүтээлүүдтэй танилцаарай. Аудио хөтөчтэй.</p>
          </Link>
          <Link to="/history" className="feature">
            <span className="feature-icon">📜</span>
            <h3>Тэнхимийн түүх</h3>
            <p>1991 оноос өнөөг хүртэлх хөгжлийн үе шатууд.</p>
          </Link>
          <Link to="/creators" className="feature">
            <span className="feature-icon">👩‍💻</span>
            <h3>ISM Creators</h3>
            <p>Оюутнууд болон тэдний бүтээлүүд.</p>
          </Link>
        </div>
      </section>

      {data?.events?.length > 0 && (
        <section className="container section">
          <div className="section-head">
            <div><p className="eyebrow">Сүүлийн үеийн</p><h2>Өдөрлөг, арга хэмжээ</h2></div>
            <Link to="/events" className="link-arrow">Бүгд →</Link>
          </div>
          <div className="grid grid-3">
            {data.events.map((ev) => (
              <Link key={ev.id} to={`/events/${ev.id}`} className="card event-card">
                <div className="card-img"><img src={ev.cover_image_url} alt={ev.title} loading="lazy" /></div>
                <div className="card-body">
                  <div className="card-meta">{fmtDate(ev.event_date)}</div>
                  <h3 className="card-title">{ev.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
