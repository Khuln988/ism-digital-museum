import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { EXHIBIT_SELECT } from '../lib/queries'
import { Loader, ErrorBox } from '../components/States'
import { FALLBACK_IMG } from '../components/ExhibitCard'

const TOUR_MS = 7000

/**
 * Бүтээлч шийдэл — Virtual Exhibition
 * Ангилал бүр нэг "танхим". Бүтээлүүд 3D коридорын хананд өлгөгдсөн жааз шиг
 * харагдаж, гар/товч/swipe-ээр алхаж, аудио хөтөчөөр тайлбар сонсоно.
 */
export default function VirtualExhibition() {
  const [params] = useSearchParams()
  const focusId = params.get('focus')
  const [exhibits, setExhibits] = useState(null)
  const [rooms, setRooms] = useState([])
  const [room, setRoom] = useState('all')
  const [idx, setIdx] = useState(0)
  const [entered, setEntered] = useState(Boolean(focusId))
  const [touring, setTouring] = useState(false)
  const [narrate, setNarrate] = useState(false)
  const [error, setError] = useState('')
  const [visited, setVisited] = useState(() => new Set())
  const stageRef = useRef(null)
  const touchX = useRef(null)

  const load = async () => {
    setError('')
    const [ex, cats] = await Promise.all([
      supabase.from('exhibits').select(EXHIBIT_SELECT).eq('status', 'published').order('year_created', { ascending: true }),
      supabase.from('exhibition_categories').select('*').order('name'),
    ])
    if (ex.error || cats.error) return setError((ex.error || cats.error).message)
    setExhibits(ex.data)
    setRooms(cats.data.filter((c) => ex.data.some((e) => e.category_id === c.id)))
  }
  useEffect(() => { load() }, [])

  const list = useMemo(
    () => (exhibits || []).filter((e) => room === 'all' || e.category_id === Number(room)),
    [exhibits, room]
  )
  const current = list[idx]

  // ?focus=<id> үед тухайн бүтээл дээр очно
  useEffect(() => {
    if (focusId && exhibits) {
      const i = exhibits.findIndex((e) => e.id === focusId)
      if (i >= 0) { setRoom('all'); setIdx(i) }
    }
  }, [focusId, exhibits])

  useEffect(() => { if (current) setVisited((v) => new Set(v).add(current.id)) }, [current])

  const go = useCallback((d) => setIdx((i) => (list.length ? (i + d + list.length) % list.length : 0)), [list.length])

  // Гарын товч
  useEffect(() => {
    const onKey = (e) => {
      if (!entered) return
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === ' ') { e.preventDefault(); setTouring((t) => !t) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, entered])

  // Автомат аялал
  useEffect(() => {
    if (!touring || narrate) return
    const t = setTimeout(() => go(1), TOUR_MS)
    return () => clearTimeout(t)
  }, [touring, narrate, idx, go])

  // Аудио хөтөч (Web Speech API)
  useEffect(() => {
    const synth = window.speechSynthesis
    if (!synth) return
    synth.cancel()
    if (!narrate || !current || !entered) return
    const creator = current.profiles?.display_name || current.creator_name || ''
    const u = new SpeechSynthesisUtterance(`${current.title}. ${creator ? 'Зохиогч ' + creator + '.' : ''} ${current.year_created || ''} он. ${current.description || ''}`)
    const voices = synth.getVoices()
    u.voice = voices.find((v) => v.lang?.startsWith('mn')) || voices.find((v) => v.lang?.startsWith('ru')) || null
    u.lang = u.voice?.lang || 'mn-MN'
    u.rate = 0.95
    u.onend = () => { if (touring) setTimeout(() => go(1), 900) }
    synth.speak(u)
    return () => synth.cancel()
  }, [narrate, current, entered, touring, go])

  useEffect(() => () => window.speechSynthesis?.cancel(), [])

  const fullscreen = () => {
    const el = stageRef.current
    if (!document.fullscreenElement) el?.requestFullscreen?.()
    else document.exitFullscreen?.()
  }

  const changeRoom = (r) => { setRoom(r); setIdx(0) }

  if (error) return <div className="container page"><ErrorBox error={error} onRetry={load} /></div>
  if (!exhibits) return <div className="vx-loading"><Loader text="Үзэсгэлэнгийн танхимыг бэлдэж байна…" /></div>

  const creator = current ? current.profiles?.display_name || current.creator_name || 'Тодорхойгүй' : ''
  const roomName = room === 'all' ? 'Гол танхим' : rooms.find((r) => r.id === Number(room))?.name

  return (
    <div className="vx" ref={stageRef}>
      {!entered && (
        <div className="vx-entrance">
          <div className="vx-door">
            <p className="eyebrow light">ISM Digital Museum</p>
            <h1>Виртуал үзэсгэлэн</h1>
            <p>{exhibits.length} бүтээл · {rooms.length} танхим. Гэрэлтүүлэгтэй коридороор алхаж, бүтээл бүрийн түүхийг сонсоорой.</p>
            <ul className="vx-hints">
              <li><kbd>←</kbd><kbd>→</kbd> алхах</li>
              <li><kbd>Space</kbd> автомат аялал</li>
              <li>📱 Утсан дээр шудрах</li>
            </ul>
            <div className="hero-actions center">
              <button className="btn btn-light btn-lg" onClick={() => setEntered(true)}>Үзэсгэлэнд орох →</button>
              <button className="btn btn-outline-light btn-lg" onClick={() => { setEntered(true); setNarrate(true); setTouring(true) }}>🎧 Аудио хөтөчтэй аялал</button>
            </div>
          </div>
        </div>
      )}

      <div className="vx-rooms" role="tablist" aria-label="Танхимууд">
        <button role="tab" aria-selected={room === 'all'} className={room === 'all' ? 'active' : ''} onClick={() => changeRoom('all')}>Гол танхим <small>{exhibits.length}</small></button>
        {rooms.map((r) => (
          <button role="tab" key={r.id} aria-selected={room === String(r.id)} className={room === String(r.id) ? 'active' : ''} onClick={() => changeRoom(String(r.id))}>
            {r.name} <small>{exhibits.filter((e) => e.category_id === r.id).length}</small>
          </button>
        ))}
      </div>

      <div
        className="vx-hall"
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          if (touchX.current == null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
          touchX.current = null
        }}
      >
        <div className="vx-room-title">{roomName}</div>
        <div className="vx-wall" aria-hidden />
        <div className="vx-floor" aria-hidden />
        <div className="vx-track">
          {list.map((e, i) => {
            let off = i - idx
            if (off > list.length / 2) off -= list.length
            if (off < -list.length / 2) off += list.length
            const abs = Math.abs(off)
            if (abs > 4) return null
            const style = {
              transform: `translateX(calc(${off} * var(--vx-gap))) translateZ(${-abs * 160}px) rotateY(${off === 0 ? 0 : off > 0 ? -38 : 38}deg) scale(${off === 0 ? 1 : 0.86})`,
              zIndex: 10 - abs,
              opacity: abs > 3 ? 0 : 1 - abs * 0.18,
            }
            return (
              <button key={e.id} className={`vx-frame ${off === 0 ? 'is-active' : ''}`} style={style}
                onClick={() => (off === 0 ? null : setIdx(i))} aria-label={e.title} tabIndex={off === 0 ? 0 : -1}>
                {off === 0 && <span className="vx-spot" aria-hidden />}
                <span className="vx-canvas">
                  <img src={e.image_url || FALLBACK_IMG} alt={e.title} onError={(ev) => { ev.currentTarget.src = FALLBACK_IMG }} />
                </span>
                <span className="vx-reflection" aria-hidden><img src={e.image_url || FALLBACK_IMG} alt="" /></span>
              </button>
            )
          })}
        </div>
        {list.length > 1 && (
          <>
            <button className="vx-arrow left" onClick={() => go(-1)} aria-label="Өмнөх бүтээл">‹</button>
            <button className="vx-arrow right" onClick={() => go(1)} aria-label="Дараах бүтээл">›</button>
          </>
        )}
      </div>

      {current ? (
        <div className="vx-plaque" key={current.id}>
          <div className="vx-plaque-main">
            <div className="vx-plaque-meta">№ {String(idx + 1).padStart(2, '0')} / {String(list.length).padStart(2, '0')} · {current.exhibition_categories?.name}</div>
            <h2>{current.title}</h2>
            <div className="vx-plaque-sub">{creator} · {current.year_created}</div>
            <p>{current.description}</p>
            <div className="chips">{current.technology_stack?.map((t) => <span key={t} className="chip chip-dark">{t}</span>)}</div>
          </div>
          <div className="vx-controls">
            <button className={`vx-ctrl ${touring ? 'on' : ''}`} onClick={() => setTouring(!touring)} aria-pressed={touring}>{touring ? '⏸ Аялал' : '▶ Аялал'}</button>
            <button className={`vx-ctrl ${narrate ? 'on' : ''}`} onClick={() => setNarrate(!narrate)} aria-pressed={narrate} disabled={!('speechSynthesis' in window)}>🎧 Аудио хөтөч</button>
            <button className="vx-ctrl" onClick={fullscreen}>⛶ Бүтэн дэлгэц</button>
            <Link className="vx-ctrl" to={`/exhibits/${current.id}`}>Дэлгэрэнгүй →</Link>
          </div>
          {touring && !narrate && <div className="vx-progress"><span key={idx} style={{ animationDuration: `${TOUR_MS}ms` }} /></div>}
        </div>
      ) : (
        <div className="vx-plaque"><p>Энэ танхимд бүтээл алга.</p></div>
      )}

      <div className="vx-map" aria-label="Танхимын зураглал">
        {list.map((e, i) => (
          <button key={e.id} className={`${i === idx ? 'active' : ''} ${visited.has(e.id) ? 'seen' : ''}`} onClick={() => setIdx(i)} title={e.title} aria-label={e.title} />
        ))}
        <span className="vx-map-label">Үзсэн: {list.filter((e) => visited.has(e.id)).length}/{list.length}</span>
      </div>
    </div>
  )
}
