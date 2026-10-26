export const EXHIBIT_SELECT = '*, exhibition_categories(id, name), profiles(id, display_name, avatar_url)'

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('mn-MN', { year: 'numeric', month: 'long', day: 'numeric' }) : ''

export const isValidUrl = (s) => {
  if (!s) return true
  try { const u = new URL(s); return u.protocol === 'http:' || u.protocol === 'https:' } catch { return false }
}
