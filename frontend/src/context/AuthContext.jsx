import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { login as apiLogin } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('salwat_user')
    if (stored) {
      setUser(JSON.parse(stored))
    }
    setLoading(false)
  }, [])

  const login = async (first_name, pin) => {
    const res = await apiLogin(first_name, pin)
    const { access_token, user: userData } = res.data
    localStorage.setItem('salwat_token', access_token)
    localStorage.setItem('salwat_user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }

  const logout = () => {
    localStorage.removeItem('salwat_token')
    localStorage.removeItem('salwat_user')
    setUser(null)
  }

  const refreshUser = (userData) => {
    setUser(userData)
    localStorage.setItem('salwat_user', JSON.stringify(userData))
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
