import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { EXHIBIT_SELECT } from '../lib/queries'
import ExhibitCard from '../components/ExhibitCard'
import { Loader, ErrorBox, Empty } from '../components/States'

export default function Exhibits() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const cat = params.get('cat') || ''
  const year = params.get('year') || ''
  const tech = params.get('tech') || ''
  const sort = params.get('sort') || 'new'

  const [search, setSearch] = useState(q)
  const [categories, setCategories] = useState([])
  const [allTech, setAllTech] = useState([])
  const [years, setYears] = useState([])
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')

  const setParam = (k, v) => {
    const p = new URLSearchParams(params)
    v ? p.set(k, v) : p.delete(k)
    setParams(p, { replace: true })
  }

  // Шүүлтүүрийн сонголтууд
  useEffect(() => {
    supabase.from('exhibition_categories').select('*').order('name').then(({ data }) => setCategories(data || []))
    supabase.from('exhibits').select('technology_stack, year_created').eq('status', 'published').then(({ data }) => {
      setAllTech([...new Set((data || []).flatMap((d) => d.technology_stack || []))].sort())
      setYears([...new Set((data || []).map((d) => d.year_created).filter(Boolean))].sort((a, b) => b - a))
    })
  }, [])

  // Хайлтыг debounce хийнэ
  useEffect(() => {
    const t = setTimeout(() => { if (search !== q) setParam('q', search.trim()) }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const load = async () => {
    setItems(null); setError('')
    let query = supabase.from('exhibits').select(EXHIBIT_SELECT).eq('status', 'published')
    if (q) {
      const safe = q.replace(/[%,()]/g, ' ')
      query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%,creator_name.ilike.%${safe}%`)
    }
    if (cat) query = query.eq('category_id', cat)
    if (year) query = query.eq('year_created', year)
    if (tech) query = query.contains('technology_stack', [tech])
    if (sort === 'old') query = query.order('year_created', { ascending: true })
    else if (sort === 'az') query = query.order('title', { ascending: true })
    else query = query.order('year_created', { ascending: false }).order('created_at', { ascending: false })
    const { data, error } = await query
    if (error) setError(error.message)
    else setItems(data)
  }
  useEffect(() => { load() }, [q, cat, year, tech, sort]) // eslint-disable-line

  const activeCount = useMemo(() => [q, cat, year, tech].filter(Boolean).length, [q, cat, year, tech])

  return (
    <div className="container page">
      <div className="page-head">
        <p className="eyebrow">Цуглуулга</p>
        <h1>Дижитал үзэсгэлэн</h1>
        <p className="lead">Нэр, он, ангилал, технологиор хайж шүүнэ үү.</p>
      </div>

      <div className="filters">
        <div className="search">
          <span aria-hidden>🔍</span>
          <input type="search" placeholder="Үзмэрийн нэр, тайлбар, зохиогч…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Хайх" />
        </div>
        <select value={cat} onChange={(e) => setParam('cat', e.target.value)} aria-label="Ангилал">
          <option value="">Бүх ангилал</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={year} onChange={(e) => setParam('year', e.target.value)} aria-label="Он">
          <option value="">Бүх он</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={tech} onChange={(e) => setParam('tech', e.target.value)} aria-label="Технологи">
          <option value="">Бүх технологи</option>
          {allTech.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={sort} onChange={(e) => setParam('sort', e.target.value)} aria-label="Эрэмбэ">
          <option value="new">Шинэ нь эхэндээ</option>
          <option value="old">Хуучин нь эхэндээ</option>
          <option value="az">Нэрээр (А-Я)</option>
        </select>
      </div>

      {activeCount > 0 && (
        <div className="filter-summary">
          {items && <span>{items.length} илэрц</span>}
          <button className="btn btn-text btn-sm" onClick={() => { setSearch(''); setParams({}, { replace: true }) }}>Шүүлтүүр арилгах ✕</button>
        </div>
      )}

      <ErrorBox error={error} onRetry={load} />
      {!items && !error && <Loader />}
      {items && items.length === 0 && (
        <Empty title="Илэрц олдсонгүй" text="Өөр түлхүүр үг эсвэл шүүлтүүр сонгож үзнэ үү." />
      )}
      {items && items.length > 0 && (
        <div className="grid grid-3">{items.map((e) => <ExhibitCard key={e.id} exhibit={e} />)}</div>
      )}
    </div>
  )
}
