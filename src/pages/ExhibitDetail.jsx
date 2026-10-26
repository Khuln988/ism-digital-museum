import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { EXHIBIT_SELECT } from '../lib/queries'
import { useAuth } from '../context/AuthContext'
import { Loader, ErrorBox, Empty, StatusBadge, Avatar } from '../components/States'
import { FALLBACK_IMG } from '../components/ExhibitCard'

export default function ExhibitDetail() {
  const { id } = useParams()
  const { user, isAdmin } = useAuth()
  const [ex, setEx] = useState(undefined)
  const [error, setError] = useState('')

  useEffect(() => {
    setEx(undefined)
    supabase.from('exhibits').select(EXHIBIT_SELECT).eq('id', id).maybeSingle().then(({ data, error }) => {
      if (error) setError(error.message)
      setEx(data)
    })
  }, [id])

  if (error) return <div className="container page"><ErrorBox error={error} /></div>
  if (ex === undefined) return <Loader />
  if (!ex) return <div className="container page"><Empty icon="🏺" title="Үзмэр олдсонгүй" text="Устгагдсан эсвэл нийтлэгдээгүй байж магадгүй."><Link to="/exhibits" className="btn btn-primary">Үзмэрүүд рүү буцах</Link></Empty></div>

  const creator = ex.profiles?.display_name || ex.creator_name || 'Тодорхойгүй'
  const canEdit = user && (ex.creator_id === user.id || isAdmin)

  return (
    <div className="container page">
      <Link to="/exhibits" className="link-back">← Үзмэрүүд</Link>
      <article className="detail">
        <div className="detail-media">
          <img src={ex.image_url || FALLBACK_IMG} alt={ex.title} onError={(e) => { e.currentTarget.src = FALLBACK_IMG }} />
        </div>
        <div className="detail-info">
          {ex.exhibition_categories && (
            <Link to={`/exhibits?cat=${ex.exhibition_categories.id}`} className="eyebrow">{ex.exhibition_categories.name}</Link>
          )}
          <h1>{ex.title}</h1>
          {ex.status !== 'published' && <StatusBadge status={ex.status} />}
          <div className="creator-line">
            <Avatar name={creator} src={ex.profiles?.avatar_url} size={40} />
            <div><b>{creator}</b><div className="muted">Зохиогч · {ex.year_created || '—'} он</div></div>
          </div>
          <p className="detail-desc">{ex.description}</p>
          {ex.technology_stack?.length > 0 && (
            <>
              <h4>Ашигласан технологи</h4>
              <div className="chips">
                {ex.technology_stack.map((t) => <Link key={t} to={`/exhibits?tech=${encodeURIComponent(t)}`} className="chip chip-link">{t}</Link>)}
              </div>
            </>
          )}
          <div className="detail-actions">
            {ex.demo_url && <a className="btn btn-primary" href={ex.demo_url} target="_blank" rel="noreferrer">Demo үзэх ↗</a>}
            {ex.github_url && <a className="btn btn-ghost" href={ex.github_url} target="_blank" rel="noreferrer">GitHub ↗</a>}
            <Link className="btn btn-ghost" to={`/virtual?focus=${ex.id}`}>🏛️ Үзэсгэлэнд харах</Link>
            {canEdit && <Link className="btn btn-text" to={`/dashboard/edit/${ex.id}`}>✏️ Засах</Link>}
          </div>
        </div>
      </article>
    </div>
  )
}
