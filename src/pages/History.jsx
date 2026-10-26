import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Loader, ErrorBox, Empty } from '../components/States'

export default function History() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')

  const load = async () => {
    const { data, error } = await supabase.from('history_milestones').select('*').order('year')
    if (error) setError(error.message); else setItems(data)
  }
  useEffect(() => { load() }, [])

  return (
    <div className="container page">
      <div className="page-head">
        <p className="eyebrow">1991 — өнөөг хүртэл</p>
        <h1>Тэнхимийн түүх</h1>
        <p className="lead">Мэдээллийн Системийн Менежментийн тэнхим нь бизнес ба технологийн огтлолцолд мэргэжилтэн бэлтгэх зорилготой. Доорх нь тэнхимийн хөгжлийн онцлох үе шатууд.</p>
      </div>
      <ErrorBox error={error} onRetry={load} />
      {!items && !error && <Loader />}
      {items && items.length === 0 && <Empty icon="📜" title="Түүхийн мэдээлэл оруулаагүй байна" />}
      {items && items.length > 0 && (
        <ol className="timeline">
          {items.map((m, i) => (
            <li key={m.id} className={i % 2 ? 'right' : 'left'} style={{ animationDelay: `${i * 80}ms` }}>
              <div className="timeline-dot" />
              <div className="timeline-card">
                <span className="timeline-year">{m.year}</span>
                <h3>{m.title}</h3>
                <p>{m.description}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
