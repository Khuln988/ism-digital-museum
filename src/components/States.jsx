export function Loader({ text = 'Ачаалж байна…' }) {
  return (
    <div className="loader" role="status">
      <div className="spinner" />
      <span>{text}</span>
    </div>
  )
}

export function ErrorBox({ error, onRetry }) {
  if (!error) return null
  return (
    <div className="alert alert-error" role="alert">
      <span>⚠️ {error}</span>
      {onRetry && <button className="btn btn-sm btn-ghost" onClick={onRetry}>Дахин оролдох</button>}
    </div>
  )
}

export function Empty({ icon = '🔍', title = 'Илэрц олдсонгүй', text, children }) {
  return (
    <div className="state-box">
      <div className="state-icon">{icon}</div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {children}
    </div>
  )
}

export function Avatar({ name = '?', src, size = 56 }) {
  const initials = name.split(/\s+/).map((p) => p.replace('.', '')[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 360
  if (src) return <img className="avatar" src={src} alt={name} style={{ width: size, height: size }} />
  return (
    <div className="avatar avatar-fallback" style={{ width: size, height: size, fontSize: size * 0.36, background: `hsl(${hash} 55% 45%)` }} aria-label={name}>
      {initials}
    </div>
  )
}

export function StatusBadge({ status }) {
  const map = { published: ['Нийтлэгдсэн', 'ok'], pending: ['Хянагдаж буй', 'warn'], rejected: ['Татгалзсан', 'bad'] }
  const [label, cls] = map[status] || [status, '']
  return <span className={`badge badge-${cls}`}>{label}</span>
}
