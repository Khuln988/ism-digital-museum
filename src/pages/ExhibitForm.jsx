import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase, errorText } from '../lib/supabase'
import { isValidUrl } from '../lib/queries'
import { useAuth } from '../context/AuthContext'
import ImageInput from '../components/ImageInput'
import { Loader } from '../components/States'

const empty = { title: '', description: '', image_url: '', category_id: '', technology_stack: '', year_created: new Date().getFullYear(), demo_url: '', github_url: '' }

export default function ExhibitForm() {
  const { id } = useParams()
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(id ? null : empty)
  const [categories, setCategories] = useState([])
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.from('exhibition_categories').select('*').order('name').then(({ data }) => setCategories(data || []))
    if (id) {
      supabase.from('exhibits').select('*').eq('id', id).maybeSingle().then(({ data, error }) => {
        if (error || !data) return setError('Бүтээл олдсонгүй эсвэл засах эрхгүй байна')
        if (data.creator_id !== user.id && !isAdmin) return setError('Та зөвхөн өөрийн бүтээлийг засна')
        setForm({ ...data, category_id: data.category_id ?? '', technology_stack: (data.technology_stack || []).join(', '), demo_url: data.demo_url || '', github_url: data.github_url || '', image_url: data.image_url || '', description: data.description || '' })
      })
    }
  }, [id]) // eslint-disable-line

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const validate = () => {
    const er = {}
    const y = Number(form.year_created)
    if (form.title.trim().length < 3) er.title = 'Нэр хамгийн багадаа 3 тэмдэгт'
    if (form.title.length > 120) er.title = 'Нэр 120 тэмдэгтээс ихгүй'
    if (form.description.trim().length < 20) er.description = 'Тайлбар хамгийн багадаа 20 тэмдэгт'
    if (!form.category_id) er.category_id = 'Ангилал сонгоно уу'
    if (!y || y < 1990 || y > new Date().getFullYear() + 1) er.year_created = 'Он буруу байна'
    if (!isValidUrl(form.demo_url)) er.demo_url = 'https://… хэлбэрийн холбоос оруулна уу'
    if (!isValidUrl(form.github_url)) er.github_url = 'https://… хэлбэрийн холбоос оруулна уу'
    if (!form.image_url) er.image_url = 'Зураг оруулна уу'
    setErrors(er)
    return Object.keys(er).length === 0
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!validate()) return
    setBusy(true)
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      image_url: form.image_url,
      category_id: Number(form.category_id),
      technology_stack: form.technology_stack.split(',').map((s) => s.trim()).filter(Boolean),
      year_created: Number(form.year_created),
      demo_url: form.demo_url.trim() || null,
      github_url: form.github_url.trim() || null,
    }
    const res = id
      ? await supabase.from('exhibits').update(payload).eq('id', id).select().single()
      : await supabase.from('exhibits').insert({ ...payload, creator_id: user.id }).select().single()
    setBusy(false)
    if (res.error) return setError(errorText(res.error))
    navigate(isAdmin && id ? '/admin' : '/dashboard')
  }

  if (error && !form) return <div className="container page"><div className="alert alert-error">{error}</div><Link to="/dashboard">← Буцах</Link></div>
  if (!form) return <Loader />

  return (
    <div className="container page narrow">
      <Link to="/dashboard" className="link-back">← Миний самбар</Link>
      <h1>{id ? 'Бүтээл засах' : 'Шинэ бүтээл нэмэх'}</h1>
      {!isAdmin && <p className="muted">Хадгалсны дараа админ хянаж нийтэлнэ.</p>}
      {error && <div className="alert alert-error">{error}</div>}
      <form className="card form-card" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="title">Бүтээлийн нэр *</label>
          <input id="title" value={form.title} onChange={set('title')} maxLength={120} />
          {errors.title && <div className="field-error">{errors.title}</div>}
        </div>
        <div className="field">
          <label htmlFor="desc">Тайлбар *</label>
          <textarea id="desc" rows={5} value={form.description} onChange={set('description')} />
          <small className="muted">{form.description.length} тэмдэгт</small>
          {errors.description && <div className="field-error">{errors.description}</div>}
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="cat">Ангилал *</label>
            <select id="cat" value={form.category_id} onChange={set('category_id')}>
              <option value="">— Сонгох —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.category_id && <div className="field-error">{errors.category_id}</div>}
          </div>
          <div className="field">
            <label htmlFor="year">Он *</label>
            <input id="year" type="number" value={form.year_created} onChange={set('year_created')} />
            {errors.year_created && <div className="field-error">{errors.year_created}</div>}
          </div>
        </div>
        <div className="field">
          <label htmlFor="tech">Технологи (таслалаар)</label>
          <input id="tech" value={form.technology_stack} onChange={set('technology_stack')} placeholder="React, Supabase, Tailwind" />
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="demo">Demo холбоос</label>
            <input id="demo" value={form.demo_url} onChange={set('demo_url')} placeholder="https://…" />
            {errors.demo_url && <div className="field-error">{errors.demo_url}</div>}
          </div>
          <div className="field">
            <label htmlFor="gh">GitHub холбоос</label>
            <input id="gh" value={form.github_url} onChange={set('github_url')} placeholder="https://github.com/…" />
            {errors.github_url && <div className="field-error">{errors.github_url}</div>}
          </div>
        </div>
        <ImageInput label="Бүтээлийн зураг *" folder="exhibits" value={form.image_url} onChange={(v) => setForm({ ...form, image_url: v })} />
        {errors.image_url && <div className="field-error">{errors.image_url}</div>}
        <div className="form-actions">
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Хадгалж байна…' : 'Хадгалах'}</button>
          <Link to="/dashboard" className="btn btn-ghost">Болих</Link>
        </div>
      </form>
    </div>
  )
}
