import { useState } from 'react'
import { uploadImage, errorText } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

/** Supabase Storage руу зураг байршуулж URL-ийг onChange-аар буцаана */
export default function ImageInput({ value, onChange, folder = 'misc', label = 'Зураг' }) {
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const handle = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true); setErr('')
    try {
      onChange(await uploadImage(file, user.id, folder))
    } catch (ex) {
      setErr(errorText(ex))
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  return (
    <div className="field">
      <label>{label}</label>
      <div className="image-input">
        {value ? <img src={value} alt="Урьдчилан харах" /> : <div className="image-placeholder">Зураг сонгоогүй</div>}
        <div className="image-input-actions">
          <label className="btn btn-ghost btn-sm file-btn">
            {busy ? 'Байршуулж байна…' : 'Файл сонгох'}
            <input type="file" accept="image/*" onChange={handle} disabled={busy} hidden />
          </label>
          {value && <button type="button" className="btn btn-sm btn-text" onClick={() => onChange('')}>Арилгах</button>}
          <small className="muted">JPG/PNG/WEBP, ≤ 5MB</small>
        </div>
      </div>
      {err && <div className="field-error">{err}</div>}
    </div>
  )
}
