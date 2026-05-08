import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoadingSpinner from './components/LoadingSpinner'
import ErrorBoundary from './components/ErrorBoundary'
import LoginPage from './pages/LoginPage'
import ChildDashboard from './pages/ChildDashboard'
import MotherDashboard from './pages/MotherDashboard'
import LeaderboardPage from './pages/LeaderboardPage'

function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!user) return <Navigate to="/" replace />
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={`/${user.role === 'admin' ? 'mother' : 'child'}`} replace />
  }
  return children
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <LoadingSpinner />

  return (
    <Layout>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={user ? <Navigate to={user.role === 'admin' ? '/mother' : '/child'} replace /> : <LoginPage />} />
          <Route path="/child" element={<ProtectedRoute><ErrorBoundary><ChildDashboard /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/mother" element={<ProtectedRoute requiredRole="admin"><ErrorBoundary><MotherDashboard /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><ErrorBoundary><LeaderboardPage /></ErrorBoundary></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </Layout>
  )
}
