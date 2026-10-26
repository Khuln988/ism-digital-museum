import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, errorText, uploadImage } from '../lib/supabase'
import { EXHIBIT_SELECT, fmtDate } from '../lib/queries'
import { useAuth } from '../context/AuthContext'
import { Loader, ErrorBox, Empty, StatusBadge } from '../components/States'
import ImageInput from '../components/ImageInput'
import { FALLBACK_IMG } from '../components/ExhibitCard'

const TABS = [
  ['exhibits', 'Үзмэрүүд'],
  ['teachers', 'Багш нар'],
  ['events', 'Арга хэмжээ'],
  ['categories', 'Ангилал'],
  ['history', 'Түүх'],
  ['users', 'Хэрэглэгчид'],
]

const CONFIG = {
  teachers: {
    table: 'teachers', order: 'sort_order', title: (r) => r.name, sub: (r) => r.position, img: 'photo_url', folder: 'teachers',
    fields: [
      ['name', 'Нэр', 'text', true], ['position', 'Албан тушаал', 'text'], ['courses', 'Заадаг хичээл (таслалаар)', 'tags'],
      ['bio', 'Танилцуулга', 'textarea'], ['email', 'Имэйл', 'text'], ['sort_order', 'Эрэмбэ', 'number'], ['photo_url', 'Зураг', 'image'],
    ],
  },
  events: {
    table: 'events', order: 'event_date', desc: true, title: (r) => r.title, sub: (r) => fmtDate(r.event_date), img: 'cover_image_url', folder: 'events',
    fields: [
      ['title', 'Нэр', 'text', true], ['event_date', 'Огноо', 'date', true], ['location', 'Байршил', 'text'],
      ['description', 'Тайлбар', 'textarea'], ['cover_image_url', 'Нүүр зураг', 'image'],
    ],
  },
  categories: {
    table: 'exhibition_categories', order: 'name', title: (r) => r.name, sub: (r) => r.description,
    fields: [['name', 'Нэр', 'text', true], ['description', 'Тайлбар', 'textarea']],
  },
  history: {
    table: 'history_milestones', order: 'year', title: (r) => `${r.year} — ${r.title}`, sub: (r) => r.description,
    fields: [['year', 'Он', 'number', true], ['title', 'Гарчиг', 'text', true], ['description', 'Тайлбар', 'textarea']],
  },
}

export default function Admin() {
  const [tab, setTab] = useState('exhibits')
  return (
    <div className="container page">
      <div className="page-head">
        <p className="eyebrow">Администратор</p>
        <h1>Удирдлагын самбар</h1>
      </div>
      <div className="tabs">
        {TABS.map(([k, l]) => <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      {tab === 'exhibits' && <ExhibitsAdmin />}
      {tab === 'users' && <UsersAdmin />}
      {CONFIG[tab] && <CrudPanel key={tab} cfg={CONFIG[tab]} withPhotos={tab === 'events'} />}
    </div>
  )
}

/* ---------- Үзмэр хянах ---------- */
function ExhibitsAdmin() {
  const [items, setItems] = useState(null)
  const [filter, setFilter] = useState('pending')
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    let q = supabase.from('exhibits').select(EXHIBIT_SELECT).order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('status', filter)
    const { data, error } = await q
    if (error) setError(error.message); else setItems(data)
  }
  useEffect(() => { setItems(null); load() }, [filter]) // eslint-disable-line

  const patch = async (ex, values) => {
    const { error } = await supabase.from('exhibits').update(values).eq('id', ex.id)
    if (error) return setError(errorText(error))
    load()
  }
  const remove = async (ex) => {
    if (!window.confirm(`"${ex.title}" устгах уу?`)) return
    const { error } = await supabase.from('exhibits').delete().eq('id', ex.id)
    if (error) setError(errorText(error)); else load()
  }

  return (
    <>
      <div className="filters">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Төлөв">
          <option value="pending">Хянагдаж буй</option>
          <option value="published">Нийтлэгдсэн</option>
          <option value="rejected">Татгалзсан</option>
          <option value="all">Бүгд</option>
        </select>
        <Link to="/dashboard/new" className="btn btn-primary">+ Үзмэр нэмэх</Link>
      </div>
      <ErrorBox error={error} onRetry={load} />
      {!items && !error && <Loader />}
      {items?.length === 0 && <Empty icon="✅" title="Энд үзмэр алга" />}
      <div className="list">
        {items?.map((ex) => (
          <div key={ex.id} className="list-row card">
            <img src={ex.image_url || FALLBACK_IMG} alt="" />
            <div className="list-main">
              <Link to={`/exhibits/${ex.id}`} className="list-title">{ex.title}</Link>
              <div className="muted small">{ex.profiles?.display_name || ex.creator_name || '—'} · {ex.exhibition_categories?.name || '—'} · {ex.year_created}</div>
            </div>
            <StatusBadge status={ex.status} />
            <div className="list-actions">
              {ex.status !== 'published' && <button className="btn btn-primary btn-sm" onClick={() => patch(ex, { status: 'published' })}>Нийтлэх</button>}
              {ex.status !== 'rejected' && <button className="btn btn-ghost btn-sm" onClick={() => patch(ex, { status: 'rejected' })}>Татгалзах</button>}
              <button className={`btn btn-sm ${ex.featured ? 'btn-gold' : 'btn-ghost'}`} onClick={() => patch(ex, { featured: !ex.featured })} title="Онцлох">★</button>
              <Link to={`/dashboard/edit/${ex.id}`} className="btn btn-ghost btn-sm">Засах</Link>
              <button className="btn btn-danger btn-sm" onClick={() => remove(ex)}>Устгах</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

/* ---------- Ерөнхий CRUD ---------- */
function CrudPanel({ cfg, withPhotos }) {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // null | {} | row
  const [photosFor, setPhotosFor] = useState(null)

  const load = async () => {
    setError('')
    const { data, error } = await supabase.from(cfg.table).select('*').order(cfg.order, { ascending: !cfg.desc })
    if (error) setError(error.message); else setItems(data)
  }
  useEffect(() => { load() }, []) // eslint-disable-line

  const remove = async (r) => {
    if (!window.confirm(`"${cfg.title(r)}" устгах уу?`)) return
    const { error } = await supabase.from(cfg.table).delete().eq('id', r.id)
    if (error) setError(errorText(error)); else load()
  }

  if (photosFor) return <PhotoManager event={photosFor} onBack={() => setPhotosFor(null)} />

  return (
    <>
      <div className="filters"><button className="btn btn-primary" onClick={() => setEditing({})}>+ Шинээр нэмэх</button></div>
      <ErrorBox error={error} onRetry={load} />
      {editing && <CrudForm cfg={cfg} row={editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
      {!items && !error && <Loader />}
      {items?.length === 0 && <Empty icon="📭" title="Мэдээлэл алга" />}
      <div className="list">
        {items?.map((r) => (
          <div key={r.id} className="list-row card">
            {cfg.img && <img src={r[cfg.img] || FALLBACK_IMG} alt="" />}
            <div className="list-main">
              <div className="list-title">{cfg.title(r)}</div>
              <div className="muted small clamp-1">{cfg.sub(r)}</div>
            </div>
            <div className="list-actions">
              {withPhotos && <button className="btn btn-ghost btn-sm" onClick={() => setPhotosFor(r)}>📷 Зургууд</button>}
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(r)}>Засах</button>
              <button className="btn btn-danger btn-sm" onClick={() => remove(r)}>Устгах</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function CrudForm({ cfg, row, onCancel, onSaved }) {
  const init = {}
  cfg.fields.forEach(([k, , type]) => { init[k] = type === 'tags' ? (row[k] || []).join(', ') : row[k] ?? '' })
  const [form, setForm] = useState(init)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    const missing = cfg.fields.filter(([k, , , req]) => req && !String(form[k]).trim())
    if (missing.length) return setError(`Заавал бөглөх: ${missing.map((m) => m[1]).join(', ')}`)
    const payload = {}
    cfg.fields.forEach(([k, , type]) => {
      const v = form[k]
      if (type === 'tags') payload[k] = String(v).split(',').map((s) => s.trim()).filter(Boolean)
      else if (type === 'number') payload[k] = v === '' ? null : Number(v)
      else payload[k] = v === '' ? null : typeof v === 'string' ? v.trim() : v
    })
    setBusy(true)
    const res = row.id ? await supabase.from(cfg.table).update(payload).eq('id', row.id) : await supabase.from(cfg.table).insert(payload)
    setBusy(false)
    if (res.error) return setError(errorText(res.error))
    onSaved()
  }

  return (
    <form className="card form-card" onSubmit={submit} noValidate>
      <h3>{row.id ? 'Засах' : 'Шинээр нэмэх'}</h3>
      {error && <div className="alert alert-error">{error}</div>}
      {cfg.fields.map(([k, label, type, req]) => {
        if (type === 'image') return <ImageInput key={k} label={label} folder={cfg.folder} value={form[k]} onChange={(v) => setForm({ ...form, [k]: v })} />
        const common = { id: k, value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }) }
        return (
          <div className="field" key={k}>
            <label htmlFor={k}>{label}{req && ' *'}</label>
            {type === 'textarea' ? <textarea rows={3} {...common} /> : <input type={type === 'tags' ? 'text' : type} {...common} />}
          </div>
        )
      })}
      <div className="form-actions">
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Хадгалж байна…' : 'Хадгалах'}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Болих</button>
      </div>
    </form>
  )
}

/* ---------- Арга хэмжээний зургийн цомог ---------- */
function PhotoManager({ event, onBack }) {
  const { user } = useAuth()
  const [photos, setPhotos] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const { data, error } = await supabase.from('event_photos').select('*').eq('event_id', event.id).order('created_at')
    if (error) setError(error.message); else setPhotos(data)
  }
  useEffect(() => { load() }, []) // eslint-disable-line

  const upload = async (e) => {
    const files = [...(e.target.files || [])]
    if (!files.length) return
    setBusy(true); setError('')
    try {
      for (const f of files) {
        const url = await uploadImage(f, user.id, `events/${event.id}`)
        const { error } = await supabase.from('event_photos').insert({ event_id: event.id, image_url: url, caption: f.name.replace(/\.[^.]+$/, '') })
        if (error) throw error
      }
      await load()
    } catch (ex) { setError(errorText(ex)) } finally { setBusy(false); e.target.value = '' }
  }

  const updateCaption = async (p, caption) => {
    const { error } = await supabase.from('event_photos').update({ caption }).eq('id', p.id)
    if (error) setError(errorText(error))
  }
  const remove = async (p) => {
    if (!window.confirm('Зургийг устгах уу?')) return
    const { error } = await supabase.from('event_photos').delete().eq('id', p.id)
    if (error) setError(errorText(error)); else load()
  }

  return (
    <div>
      <button className="link-back btn-text" onClick={onBack}>← Арга хэмжээний жагсаалт</button>
      <h2>{event.title} — зурагт цомог</h2>
      <div className="filters">
        <label className="btn btn-primary file-btn">
          {busy ? 'Байршуулж байна…' : '+ Зураг нэмэх (олноор)'}
          <input type="file" accept="image/*" multiple hidden onChange={upload} disabled={busy} />
        </label>
      </div>
      <ErrorBox error={error} />
      {!photos && <Loader />}
      {photos?.length === 0 && <Empty icon="📷" title="Зураг алга" />}
      <div className="grid grid-4">
        {photos?.map((p) => (
          <div key={p.id} className="card photo-admin">
            <img src={p.image_url} alt={p.caption || ''} />
            <input defaultValue={p.caption || ''} onBlur={(e) => e.target.value !== (p.caption || '') && updateCaption(p, e.target.value)} aria-label="Тайлбар" placeholder="Тайлбар" />
            <button className="btn btn-danger btn-sm" onClick={() => remove(p)}>Устгах</button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- Хэрэглэгчид ---------- */
function UsersAdmin() {
  const { user } = useAuth()
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const load = async () => {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (error) setError(error.message); else setItems(data)
  }
  useEffect(() => { load() }, [])
  const toggle = async (p) => {
    const role = p.role === 'admin' ? 'student' : 'admin'
    if (!window.confirm(`${p.display_name}-ийн эрхийг "${role}" болгох уу?`)) return
    const { error } = await supabase.from('profiles').update({ role }).eq('id', p.id)
    if (error) setError(errorText(error)); else load()
  }
  return (
    <>
      <ErrorBox error={error} />
      {!items && <Loader />}
      <div className="list">
        {items?.map((p) => (
          <div key={p.id} className="list-row card">
            <div className="list-main">
              <div className="list-title">{p.display_name}</div>
              <div className="muted small">Бүртгүүлсэн: {fmtDate(p.created_at)}</div>
            </div>
            <span className={`badge ${p.role === 'admin' ? 'badge-ok' : ''}`}>{p.role === 'admin' ? 'Админ' : 'Оюутан'}</span>
            <div className="list-actions">
              {p.id !== user.id && <button className="btn btn-ghost btn-sm" onClick={() => toggle(p)}>{p.role === 'admin' ? 'Админ эрх хасах' : 'Админ болгох'}</button>}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
