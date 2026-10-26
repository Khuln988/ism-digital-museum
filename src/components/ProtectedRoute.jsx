import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loader } from './States'

export default function ProtectedRoute({ children, admin = false }) {
  const { user, profile, isAdmin, loading } = useAuth()
  const location = useLocation()
  if (loading || (user && !profile)) return <Loader />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (admin && !isAdmin) {
    return (
      <div className="container page">
        <div className="state-box">
          <div className="state-icon">🔒</div>
          <h2>Хандах эрхгүй</h2>
          <p>Энэ хуудсыг зөвхөн администратор үзнэ.</p>
        </div>
      </div>
    )
  }
  return children
}
