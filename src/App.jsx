import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import { isConfigured } from './lib/supabase'
import Home from './pages/Home'
import Exhibits from './pages/Exhibits'
import ExhibitDetail from './pages/ExhibitDetail'
import Teachers from './pages/Teachers'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import History from './pages/History'
import Creators from './pages/Creators'
import VirtualExhibition from './pages/VirtualExhibition'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import ExhibitForm from './pages/ExhibitForm'
import Admin from './pages/Admin'
import NotFound from './pages/NotFound'

export default function App() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  const immersive = pathname.startsWith('/virtual')

  return (
    <div className={`app ${immersive ? 'app-dark' : ''}`}>
      <Navbar dark={immersive} />
      {!isConfigured && (
        <div className="config-warning">VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY тохируулаагүй байна (.env.example-г үзнэ үү).</div>
      )}
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/exhibits" element={<Exhibits />} />
          <Route path="/exhibits/:id" element={<ExhibitDetail />} />
          <Route path="/virtual" element={<VirtualExhibition />} />
          <Route path="/teachers" element={<Teachers />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/history" element={<History />} />
          <Route path="/creators" element={<Creators />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/dashboard/new" element={<ProtectedRoute><ExhibitForm /></ProtectedRoute>} />
          <Route path="/dashboard/edit/:id" element={<ProtectedRoute><ExhibitForm /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute admin><Admin /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!immersive && <Footer />}
    </div>
  )
}
