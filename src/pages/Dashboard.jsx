import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, errorText } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Loader, ErrorBox, Empty, StatusBadge, Avatar } from '../components/States'
import ImageInput from '../components/ImageInput'
import { FALLBACK_IMG } from '../components/ExhibitCard'

export default function Dashboard() {
  const { user, profile, refreshProfile, isAdmin } = useAuth()
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [edit, setEdit] = useState(false)
  const [pf, setPf] = useState({ display_name: '', bio: '', avatar_url: '' })

  useEffect(() => { if (profile) setPf({ display_name: profile.display_name || '', bio: profile.bio || '', avatar_url: profile.avatar_url || '' }) }, [profile])

  const load = async () => {
    setError('')
    const { data, error } = await supabase.from('exhibits').select('*, exhibition_categories(name)').eq('creator_id', user.id).order('created_at', { ascending: false })
    if (error) setError(error.message); else setItems(data)
  }
  useEffect(() => { load() }, []) // eslint-disable-line

  const remove = async (ex) => {
    if (!window.confirm(`"${ex.title}" бүтээлийг устгах уу?`)) return
    const { error } = await supabase.from('exhibits').delete().eq('id', ex.id)
    if (error) setError(errorText(error))
    else { setItems(items.filter((i) => i.id !== ex.id)); setMsg('Бүтээл устгагдлаа') }
  }

  const saveProfile = async (e) => {
    e.preventDefault()
    if (pf.display_name.trim().length < 2) return setError('Нэр хамгийн багадаа 2 тэмдэгт')
    const { error } = await supabase.from('profiles').update({ display_name: pf.display_name.trim(), bio: pf.bio.trim() || null, avatar_url: pf.avatar_url || null }).eq('id', user.id)
    if (error) return setError(errorText(error))
    await refreshProfile(); setEdit(false); setMsg('Профайл шинэчлэгдлээ')
  }

  return (
    <div className="container page">
      <div className="dash-head card">
        <Avatar name={profile?.display_name || '?'} src={profile?.avatar_url} size={72} />
        <div className="dash-who">
          <h1>{profile?.display_name}</h1>
          <div className="muted">{user.email} · {isAdmin ? 'Администратор' : 'Бүтээгч / оюутан'}</div>
          {profile?.bio && <p>{profile.bio}</p>}
        </div>
        <div className="dash-actions">
          <button className="btn btn-ghost" onClick={() => setEdit(!edit)}>{edit ? 'Болих' : 'Профайл засах'}</button>
          <Link to="/dashboard/new" className="btn btn-primary">+ Шинэ бүтээл</Link>
        </div>
      </div>

      {msg && <div className="alert alert-ok" onClick={() => setMsg('')}>{msg}</div>}
      <ErrorBox error={error} />

      {edit && (
        <form className="card form-card" onSubmit={saveProfile}>
          <h3>Профайл</h3>
          <div className="field"><label>Нэр</label><input value={pf.display_name} onChange={(e) => setPf({ ...pf, display_name: e.target.value })} /></div>
          <div className="field"><label>Товч танилцуулга</label><textarea rows={3} value={pf.bio} onChange={(e) => setPf({ ...pf, bio: e.target.value })} /></div>
          <ImageInput label="Профайл зураг" folder="avatar" value={pf.avatar_url} onChange={(v) => setPf({ ...pf, avatar_url: v })} />
          <button className="btn btn-primary">Хадгалах</button>
        </form>
      )}

      <h2 className="section-title">Миний бүтээлүүд</h2>
      <p className="muted small">Шинэ болон зассан бүтээл админ хянаж баталсны дараа нийтэд харагдана.</p>
      {!items && !error && <Loader />}
      {items && items.length === 0 && (
        <Empty icon="🎨" title="Одоогоор бүтээл алга" text="Анхны бүтээлээ нэмж үзэсгэлэнд тавиарай.">
          <Link to="/dashboard/new" className="btn btn-primary">+ Бүтээл нэмэх</Link>
        </Empty>
      )}
      <div className="list">
        {items?.map((ex) => (
          <div key={ex.id} className="list-row card">
            <img src={ex.image_url || FALLBACK_IMG} alt="" />
            <div className="list-main">
              <Link to={`/exhibits/${ex.id}`} className="list-title">{ex.title}</Link>
              <div className="muted small">{ex.exhibition_categories?.name || 'Ангилалгүй'} · {ex.year_created || '—'}</div>
            </div>
            <StatusBadge status={ex.status} />
            <div className="list-actions">
              <Link to={`/dashboard/edit/${ex.id}`} className="btn btn-ghost btn-sm">Засах</Link>
              <button className="btn btn-danger btn-sm" onClick={() => remove(ex)}>Устгах</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
