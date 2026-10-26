import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const links = [
  ['/exhibits', 'Үзмэрүүд'],
  ['/virtual', 'Виртуал үзэсгэлэн'],
  ['/teachers', 'Багш нар'],
  ['/events', 'Арга хэмжээ'],
  ['/history', 'Түүх'],
  ['/creators', 'ISM Creators'],
]

export default function Navbar({ dark }) {
  const { user, profile, isAdmin, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])

  const logout = async () => { await signOut(); navigate('/') }

  return (
    <header className={`nav ${dark ? 'nav-dark' : ''}`}>
      <div className="container nav-inner">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden>
            <svg viewBox="0 0 64 64" width="30" height="30"><rect width="64" height="64" rx="14" fill="currentColor"/><path d="M14 50h36M18 46V28M27 46V28M37 46V28M46 46V28M12 26l20-12 20 12z" stroke="#fff" strokeWidth="4" fill="none" strokeLinejoin="round" strokeLinecap="round"/></svg>
          </span>
          <span className="brand-text">ISM <b>Digital Museum</b></span>
        </Link>
        <button className="nav-toggle" aria-label="Цэс" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span /><span /><span />
        </button>
        <nav className={`nav-links ${open ? 'open' : ''}`}>
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>{label}</NavLink>
          ))}
          <div className="nav-auth">
            {user ? (
              <>
                {isAdmin && <NavLink to="/admin" className="pill pill-admin">Админ</NavLink>}
                <NavLink to="/dashboard" className="pill">{profile?.display_name || 'Миний самбар'}</NavLink>
                <button className="btn btn-ghost btn-sm" onClick={logout}>Гарах</button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="btn btn-ghost btn-sm">Нэвтрэх</NavLink>
                <NavLink to="/register" className="btn btn-primary btn-sm">Бүртгүүлэх</NavLink>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}
