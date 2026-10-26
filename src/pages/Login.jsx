import { useState } from 'react'
import { Link, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { supabase, errorText } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  if (user) return <Navigate to={location.state?.from || '/dashboard'} replace />

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email.includes('@')) return setError('Зөв имэйл хаяг оруулна уу')
    if (!password) return setError('Нууц үгээ оруулна уу')
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) return setError(errorText(error))
    navigate(location.state?.from || '/dashboard', { replace: true })
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1>Нэвтрэх</h1>
        <p className="muted">Бүтээлээ нэмэх, засахын тулд нэвтэрнэ үү.</p>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="field">
          <label htmlFor="email">Имэйл</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
        </div>
        <div className="field">
          <label htmlFor="password">Нууц үг</label>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Нэвтэрч байна…' : 'Нэвтрэх'}</button>
        <p className="auth-alt">Бүртгэлгүй юу? <Link to="/register">Бүртгүүлэх</Link></p>
      </form>
    </div>
  )
}
