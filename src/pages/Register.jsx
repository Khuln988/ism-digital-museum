import { useState } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { supabase, errorText } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()
  if (user) return <Navigate to="/dashboard" replace />

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const validate = () => {
    const er = {}
    if (form.name.trim().length < 2) er.name = 'Нэрээ оруулна уу (≥ 2 тэмдэгт)'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) er.email = 'Зөв имэйл хаяг оруулна уу'
    if (form.password.length < 6) er.password = 'Нууц үг хамгийн багадаа 6 тэмдэгт'
    if (form.password !== form.confirm) er.confirm = 'Нууц үг таарахгүй байна'
    setErrors(er)
    return Object.keys(er).length === 0
  }

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setInfo('')
    if (!validate()) return
    setBusy(true)
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: { data: { display_name: form.name.trim() } },
    })
    setBusy(false)
    if (error) return setError(errorText(error))
    if (data.session) navigate('/dashboard', { replace: true })
    else setInfo('Бүртгэл үүслээ! Имэйлээ шалгаж баталгаажуулаад нэвтэрнэ үү.')
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1>Бүртгүүлэх</h1>
        <p className="muted">ISM Creators-д нэгдэж өөрийн бүтээлээ үзэсгэлэнд тавиарай.</p>
        {error && <div className="alert alert-error">{error}</div>}
        {info && <div className="alert alert-ok">{info}</div>}
        <div className="field">
          <label htmlFor="name">Нэр</label>
          <input id="name" value={form.name} onChange={set('name')} placeholder="Б. Тэмүүлэн" />
          {errors.name && <div className="field-error">{errors.name}</div>}
        </div>
        <div className="field">
          <label htmlFor="email">Имэйл</label>
          <input id="email" type="email" autoComplete="email" value={form.email} onChange={set('email')} />
          {errors.email && <div className="field-error">{errors.email}</div>}
        </div>
        <div className="field">
          <label htmlFor="password">Нууц үг</label>
          <input id="password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} />
          {errors.password && <div className="field-error">{errors.password}</div>}
        </div>
        <div className="field">
          <label htmlFor="confirm">Нууц үг давтах</label>
          <input id="confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
          {errors.confirm && <div className="field-error">{errors.confirm}</div>}
        </div>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Бүртгэж байна…' : 'Бүртгүүлэх'}</button>
        <p className="auth-alt">Бүртгэлтэй юу? <Link to="/login">Нэвтрэх</Link></p>
      </form>
    </div>
  )
}
