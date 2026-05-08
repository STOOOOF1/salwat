import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()

  const isActive = (path) =>
    location.pathname === path ? 'text-primary-600 border-primary-600' : 'text-gray-600 border-transparent'

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🕌</span>
            <h1 className="text-xl font-bold text-primary-800 font-cairo">صلوات</h1>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 font-cairo">
                {user.first_name}
              </span>
              <button
                onClick={() => { if (window.confirm('هل أنت متأكد من تسجيل الخروج؟')) logout() }}
                className="text-sm text-red-500 hover:text-red-700 font-cairo"
              >
                خروج
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 pb-24">
        {children}
      </main>

      {/* Bottom Navigation */}
      {user && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
          <div className="max-w-lg mx-auto flex justify-around">
            {user.role === 'admin' ? (
              <>
                <NavLink to="/mother" icon="📊" label="لوحة التحكم" isActive={isActive('/mother')} />
                <NavLink to="/leaderboard" icon="🏆" label="المتصدرون" isActive={isActive('/leaderboard')} />
              </>
            ) : (
              <>
                <NavLink to="/child" icon="🕌" label="صلاتي" isActive={isActive('/child')} />
                <NavLink to="/leaderboard" icon="🏆" label="المتصدرون" isActive={isActive('/leaderboard')} />
              </>
            )}
          </div>
        </nav>
      )}
    </div>
  )
}

function NavLink({ to, icon, label, isActive }) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center py-2 px-4 border-t-2 transition-colors ${
        isActive || ''
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-xs mt-1 font-cairo">{label}</span>
    </Link>
  )
}
