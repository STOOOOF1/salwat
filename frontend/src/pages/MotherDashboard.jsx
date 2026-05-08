import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getUsers, createUser, updateUser, deleteUser, resetUserPin, resetUserPoints,
  getAllLogs, approveLog,
  getRewards, approveReward,
} from '../services/api'

const PRAYER_LABELS = { Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' }
const PRAYER_ICONS = { Fajr: '🌅', Dhuhr: '☀️', Asr: '🌤', Maghrib: '🌅', Isha: '🌙' }

const REGIONS = ['Makkah', 'Madinah', 'Sharqia', 'Jizan']

export default function MotherDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('users')

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="card text-center">
        <div className="text-4xl mb-2">🌺</div>
        <h1 className="text-2xl font-bold font-cairo text-primary-800">مرحباً يا أمي</h1>
        <p className="text-gray-500 font-cairo">لوحة التحكم والإدارة</p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
        {[
          { key: 'users', label: 'الأطفال', icon: '👶' },
          { key: 'logs', label: 'التسجيلات', icon: '📝' },
          { key: 'rewards', label: 'المكافآت', icon: '🎁' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold font-cairo transition-all ${
              activeTab === tab.key
                ? 'bg-white shadow text-primary-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && <UserManagement />}
      {activeTab === 'logs' && <LogManagement />}
      {activeTab === 'rewards' && <RewardManagement />}
    </div>
  )
}

function UserManagement() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ first_name: '', age: '', gender: 'Male', region: 'Makkah', pin: '1234', role: 'user' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let cancelled = false
    getUsers().then(res => { if (!cancelled) setUsers(res.data) }).catch(() => { if (!cancelled) setError('فشل في تحميل المستخدمين') }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const fetchUsers = () => {
    getUsers().then(res => setUsers(res.data)).catch(() => setError('فشل في تحميل المستخدمين'))
  }

  const resetForm = () => {
    setForm({ first_name: '', age: '', gender: 'Male', region: 'Makkah', pin: '1234', role: 'user' })
    setEditing(null)
    setShowForm(false)
    setError('')
  }

  const openEdit = (u) => {
    setForm({ first_name: u.first_name, age: String(u.age), gender: u.gender, region: u.region, pin: '', role: u.role })
    setEditing(u.id)
    setShowForm(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      if (editing) {
        await updateUser(editing, {
          first_name: form.first_name,
          age: parseInt(form.age),
          gender: form.gender,
          region: form.region,
          role: form.role,
        })
        setSuccess('تم تحديث المستخدم بنجاح')
      } else {
        await createUser({
          first_name: form.first_name,
          age: parseInt(form.age),
          gender: form.gender,
          region: form.region,
          pin: form.pin,
          role: form.role,
        })
        setSuccess('تم إضافة المستخدم بنجاح')
      }
      resetForm()
      fetchUsers()
    } catch (err) {
      setError(err.response?.data?.detail || 'حدث خطأ')
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`هل أنت متأكدة من حذف ${name}؟`)) return
    try {
      await deleteUser(id)
      setSuccess(`تم حذف ${name}`)
      fetchUsers()
    } catch { setError('فشل في الحذف') }
  }

  const handleResetPin = async (id) => {
    const newPin = prompt('أدخل PIN الجديد (4 أرقام):', '1234')
    if (!newPin || newPin.length !== 4) return
    try {
      await resetUserPin(id, newPin)
      setSuccess('تم إعادة تعيين PIN بنجاح')
      fetchUsers()
    } catch { setError('فشل في إعادة تعيين PIN') }
  }

  const handleResetPoints = async (id, name) => {
    if (!window.confirm(`هل أنت متأكدة من تصفير نقاط ${name}؟`)) return
    try {
      await resetUserPoints(id)
      setSuccess(`تم تصفير نقاط ${name}`)
      fetchUsers()
    } catch { setError('فشل في تصفير النقاط') }
  }

  if (loading) return <div className="text-center py-8 text-gray-400 font-cairo">جاري التحميل...</div>

  return (
    <div>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-3 text-sm font-cairo">{error}</div>}
      {success && <div className="bg-green-50 text-green-600 p-3 rounded-xl mb-3 text-sm font-cairo">{success}</div>}

      <button
        onClick={() => { resetForm(); setShowForm(!showForm) }}
        className="btn-primary w-full mb-4 font-cairo"
      >
        {showForm ? 'إلغاء' : '+ إضافة طفل جديد'}
      </button>

      {showForm && (
        <form onSubmit={handleSave} className="card mb-4 space-y-3">
          <input
            placeholder="الاسم"
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            className="input-field font-cairo"
            required
          />
          <input
            type="number"
            placeholder="العمر"
            value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value })}
            className="input-field font-cairo"
            required
            min="1"
            max="120"
          />
          <select
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value })}
            className="input-field font-cairo"
          >
            <option value="Male">ذكر</option>
            <option value="Female">أنثى</option>
          </select>
          <select
            value={form.region}
            onChange={(e) => setForm({ ...form, region: e.target.value })}
            className="input-field font-cairo"
          >
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="input-field font-cairo"
          >
            <option value="user">طفل</option>
            <option value="admin">أم (مشرف)</option>
          </select>
          {!editing && (
            <input
              placeholder="PIN (4 أرقام)"
              value={form.pin}
              onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              className="input-field font-cairo text-center"
              required
              maxLength={4}
            />
          )}
          <button type="submit" className="btn-primary w-full font-cairo">
            {editing ? 'تحديث' : 'إضافة'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {users.filter((u) => u.id !== user?.id).map((u) => (
          <div key={u.id} className="card flex items-center justify-between">
            <div>
              <div className="font-bold font-cairo">{u.first_name}</div>
              <div className="text-xs text-gray-500 font-cairo">
                {u.age} سنة - {u.gender === 'Male' ? 'ذكر' : 'أنثى'} - {u.region} - {u.role === 'admin' ? 'مشرف' : u.category}
              </div>
              <div className="text-primary-600 font-bold font-cairo">{u.total_points} نقطة</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(u)} className="text-sm text-blue-600 hover:text-blue-800 font-cairo">تعديل</button>
              <button onClick={() => handleResetPin(u.id)} className="text-sm text-gold-600 hover:text-gold-800 font-cairo">PIN</button>
              <button onClick={() => handleResetPoints(u.id, u.first_name)} className="text-sm text-orange-600 hover:text-orange-800 font-cairo">تصفير</button>
              <button onClick={() => handleDelete(u.id, u.first_name)} className="text-sm text-red-600 hover:text-red-800 font-cairo">حذف</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LogManagement() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [pendingOnly, setPendingOnly] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false; setLoading(true)
    getAllLogs(pendingOnly).then(res => { if (!cancelled) setLogs(res.data) }).catch(() => { if (!cancelled) setError('فشل في تحميل التسجيلات') }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [pendingOnly])

  const handleApprove = async (logId, isApproved) => {
    try {
      await approveLog(logId, { is_approved: isApproved })
      fetchLogs()
    } catch { setError('فشل في تحديث التسجيل') }
  }

  if (loading) return <div className="text-center py-8 text-gray-400 font-cairo">جاري التحميل...</div>

  return (
    <div>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-3 text-sm font-cairo">{error}</div>}

      <label className="flex items-center gap-2 mb-4 cursor-pointer font-cairo">
        <input
          type="checkbox"
          checked={pendingOnly}
          onChange={(e) => setPendingOnly(e.target.checked)}
          className="w-5 h-5"
        />
        <span>تسجيلات بانتظار المراجعة فقط</span>
      </label>

      {logs.length === 0 ? (
        <p className="text-gray-400 text-center py-8 font-cairo">
          {pendingOnly ? 'لا توجد تسجيلات بانتظار المراجعة' : 'لا توجد تسجيلات'}
        </p>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 font-cairo">
                  <span className="text-lg">{PRAYER_ICONS[log.prayer_name]}</span>
                  <span className="font-bold">{log.user_name || 'مستخدم'}</span>
                  <span className="text-primary-600 font-bold">+{log.points_awarded}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-cairo ${
                  log.is_approved ? 'bg-green-100 text-green-700' : 'bg-gold-100 text-gold-700'
                }`}>
                  {log.is_approved ? 'مقبول' : 'بالانتظار'}
                </span>
              </div>
              <div className="text-xs text-gray-500 font-cairo flex justify-between">
                <span>{PRAYER_LABELS[log.prayer_name]} | {new Date(log.logged_at).toLocaleString('ar-SA')}</span>
                <span className="flex gap-1">
                  {log.is_congregation && <span title="صلاة الجماعة">🕌</span>}
                  {log.is_early_time && <span title="في أول الوقت">⏰</span>}
                  {log.is_within_golden_window ? '✅ النافذة الذهبية' : '⏰ خارج النافذة'}
                </span>
              </div>
              {!log.is_approved && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleApprove(log.id, true)}
                    className="flex-1 py-2 bg-green-500 text-white rounded-xl text-sm font-bold font-cairo hover:bg-green-600"
                  >
                    ✓ قبول
                  </button>
                  <button
                    onClick={() => handleApprove(log.id, false)}
                    className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-bold font-cairo hover:bg-red-600"
                  >
                    ✗ رفض
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RewardManagement() {
  const [rewards, setRewards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getRewards(true).then(res => { if (!cancelled) setRewards(res.data) }).catch(() => { if (!cancelled) setError('فشل في تحميل المكافآت') }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleApprove = async (id, isApproved) => {
    try {
      await approveReward(id, isApproved)
      fetchRewards()
    } catch { setError('فشل في تحديث المكافأة') }
  }

  if (loading) return <div className="text-center py-8 text-gray-400 font-cairo">جاري التحميل...</div>

  return (
    <div>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-3 text-sm font-cairo">{error}</div>}

      {rewards.length === 0 ? (
        <div className="card text-center py-8">
          <div className="text-4xl mb-3">🎁</div>
          <p className="text-gray-400 font-cairo">لا توجد مكافآت بانتظار الموافقة</p>
          <p className="text-gray-400 text-sm font-cairo">عندما يصل الأطفال إلى نقاط المكافأة، ستظهر هنا</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rewards.map((rw) => (
            <div key={rw.id} className="card">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-bold font-cairo">{rw.user_name}</div>
                  <div className="text-sm text-gray-500 font-cairo">
                    🎯 وصل إلى {rw.milestone_points} نقطة!
                  </div>
                </div>
                <span className="text-3xl">🏆</span>
              </div>
              <div className="text-xs text-gray-400 font-cairo mb-3">
                {new Date(rw.created_at).toLocaleString('ar-SA')}
              </div>
              <button
                onClick={() => handleApprove(rw.id, true)}
                className="btn-gold w-full font-cairo text-lg"
              >
                🎉 اعتماد المكافأة
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
