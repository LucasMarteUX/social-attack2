import { Navigate, Outlet } from 'react-router-dom'
import Spinner from '../ui/Spinner'
import { useAuth } from '../../hooks/useAuth'

export default function AuthGuard() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
