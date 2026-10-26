import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Loader, ErrorBox, Empty, Avatar } from '../components/States'
import { FALLBACK_IMG } from '../components/ExhibitCard'

export default function Creators() {
  const [groups, setGroups] = useState(null)
  const [error, setError] = useState('')

  const load = async () => {
    const { data, error } = await supabase
      .from('exhibits')
      .select('id, title, image_url, year_created, technology_stack, creator_name, creator_id, profiles(id, display_name, avatar_url, bio)')
      .eq('status', 'published')
      .order('year_created', { ascending: false })
    if (error) return setError(error.message)
    const map = new Map()
    for (const ex of data) {
      if (ex.creator_name === 'Тэнхимийн архив' && !ex.profiles) continue
      const key = ex.profiles?.id || `name:${ex.creator_name || 'Тодорхойгүй'}`
      if (!map.has(key)) map.set(key, { key, name: ex.profiles?.display_name || ex.creator_name || 'Тодорхойгүй', avatar: ex.profiles?.avatar_url, bio: ex.profiles?.bio, works: [], tech: new Set() })
      const g = map.get(key)
      g.works.push(ex)
      ex.technology_stack?.forEach((t) => g.tech.add(t))
    }
    setGroups([...map.values()].sort((a, b) => b.works.length - a.works.length))
  }
  useEffect(() => { load() }, [])

  return (
    <div className="container page">
      <div className="page-head">
        <p className="eyebrow">ISM Creators</p>
        <h1>Бүтээгчид ба тэдний бүтээл</h1>
        <p className="lead">Оюутнуудын танилцуулга, бүтээлүүд нэг дор. Та ч бүртгүүлж өөрийн бүтээлээ нэмээрэй.</p>
        <Link to="/dashboard/new" className="btn btn-primary">+ Бүтээл нэмэх</Link>
      </div>
      <ErrorBox error={error} onRetry={load} />
      {!groups && !error && <Loader />}
      {groups && groups.length === 0 && <Empty icon="👩‍💻" title="Бүтээгч алга" />}
      <div className="creators">
        {groups?.map((g) => (
          <section key={g.key} className="card creator-card">
            <div className="creator-head">
              <Avatar name={g.name} src={g.avatar} size={64} />
              <div>
                <h3 className="card-title">{g.name}</h3>
                <div className="muted">{g.works.length} бүтээл</div>
                {g.bio && <p className="card-text">{g.bio}</p>}
              </div>
            </div>
            <div className="chips">{[...g.tech].slice(0, 6).map((t) => <span key={t} className="chip">{t}</span>)}</div>
            <div className="creator-works">
              {g.works.map((w) => (
                <Link key={w.id} to={`/exhibits/${w.id}`} className="mini-work">
                  <img src={w.image_url || FALLBACK_IMG} alt="" loading="lazy" />
                  <span>{w.title}<small>{w.year_created}</small></span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
