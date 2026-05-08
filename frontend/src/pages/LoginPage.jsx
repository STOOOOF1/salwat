import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!name.trim() || pin.length !== 4) {
      setError('يرجى إدخال الاسم ورمز PIN المكون من 4 أرقام')
      return
    }
    setLoading(true)
    try {
      const user = await login(name.trim(), pin)
      navigate(user.role === 'admin' ? '/mother' : '/child')
    } catch (err) {
      setError(err.response?.data?.detail || 'خطأ في تسجيل الدخول. تحقق من الاسم و PIN')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <div className="text-center mb-8">
        <div className="text-7xl mb-4">🕌</div>
        <h1 className="text-3xl font-bold text-primary-800 font-cairo mb-2">صلوات</h1>
        <p className="text-gray-500 font-cairo">تتبع صلواتك واربح النقاط!</p>
      </div>

      <form onSubmit={handleSubmit} className="card w-full max-w-sm">
        <h2 className="text-xl font-bold text-center mb-6 font-cairo">تسجيل الدخول</h2>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm text-center font-cairo">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-gray-700 font-cairo mb-2">الاسم الأول</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="أدخل اسمك"
            className="input-field font-cairo"
            autoFocus
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 font-cairo mb-2">رمز PIN (4 أرقام)</label>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="****"
            className="input-field font-cairo text-center text-2xl tracking-widest"
            inputMode="numeric"
            maxLength={4}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full font-cairo text-lg"
        >
          {loading ? 'جاري تسجيل الدخول...' : 'دخول'}
        </button>
      </form>
    </div>
  )
}
