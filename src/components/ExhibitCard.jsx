import { Link } from 'react-router-dom'

export const FALLBACK_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 280"><rect width="400" height="280" fill="#e8e6fb"/><path d="M150 190h100M160 182v-50M180 182v-50M200 182v-50M220 182v-50M240 182v-50M150 128l50-30 50 30z" stroke="#1a0dbf" stroke-width="6" fill="none" stroke-linejoin="round"/></svg>')

export default function ExhibitCard({ exhibit }) {
  const creator = exhibit.profiles?.display_name || exhibit.creator_name || 'Тодорхойгүй'
  return (
    <Link to={`/exhibits/${exhibit.id}`} className="card exhibit-card">
      <div className="card-img">
        <img src={exhibit.image_url || FALLBACK_IMG} alt={exhibit.title} loading="lazy" onError={(e) => { e.currentTarget.src = FALLBACK_IMG }} />
        {exhibit.exhibition_categories?.name && <span className="card-tag">{exhibit.exhibition_categories.name}</span>}
      </div>
      <div className="card-body">
        <div className="card-meta">{exhibit.year_created || '—'} · {creator}</div>
        <h3 className="card-title">{exhibit.title}</h3>
        <p className="card-text">{exhibit.description}</p>
        <div className="chips">
          {(exhibit.technology_stack || []).slice(0, 4).map((t) => <span className="chip" key={t}>{t}</span>)}
        </div>
      </div>
    </Link>
  )
}
