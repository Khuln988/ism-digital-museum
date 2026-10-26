import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Loader, ErrorBox, Empty, Avatar } from '../components/States'

export default function Teachers() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(null)

  const load = async () => {
    setError('')
    const { data, error } = await supabase.from('teachers').select('*').order('sort_order').order('name')
    if (error) setError(error.message); else setItems(data)
  }
  useEffect(() => { load() }, [])

  const s = q.trim().toLowerCase()
  const shown = (items || []).filter((t) => !s || [t.name, t.position, ...(t.courses || [])].join(' ').toLowerCase().includes(s))

  return (
    <div className="container page">
      <div className="page-head">
        <p className="eyebrow">Хамт олон</p>
        <h1>Тэнхимийн багш нар</h1>
        <p className="lead">Оюутнуудын мэдлэг, ур чадварыг төлөвшүүлж буй багш нар.</p>
      </div>
      <div className="filters">
        <div className="search">
          <span aria-hidden>🔍</span>
          <input type="search" placeholder="Нэр, албан тушаал, хичээлээр хайх…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Багш хайх" />
        </div>
      </div>
      <ErrorBox error={error} onRetry={load} />
      {!items && !error && <Loader />}
      {items && shown.length === 0 && <Empty icon="👩‍🏫" title="Багш олдсонгүй" />}
      <div className="grid grid-3">
        {shown.map((t) => (
          <article key={t.id} className={`card teacher-card ${open === t.id ? 'expanded' : ''}`}>
            <div className="teacher-top">
              <Avatar name={t.name} src={t.photo_url} size={72} />
              <div>
                <h3 className="card-title">{t.name}</h3>
                <div className="muted">{t.position}</div>
              </div>
            </div>
            <div className="chips">{(t.courses || []).map((c) => <span key={c} className="chip">{c}</span>)}</div>
            <p className="card-text">{t.bio}</p>
            <div className="teacher-foot">
              {t.email && <a href={`mailto:${t.email}`} className="link-arrow">✉ {t.email}</a>}
              {t.bio && t.bio.length > 90 && (
                <button className="btn btn-text btn-sm" onClick={() => setOpen(open === t.id ? null : t.id)}>{open === t.id ? 'Хураах' : 'Дэлгэрэнгүй'}</button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
