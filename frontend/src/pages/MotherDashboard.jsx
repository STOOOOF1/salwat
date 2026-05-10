import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getUsers, createUser, updateUser, deleteUser, resetUserPin, resetUserPoints,
  getAllLogs, approveLog, getUserLogs, deleteLog,
  getRewards, approveReward,
  toggleLeaderboard,
  markAttendance,
  getAdminSettings, updateSettings, resetWeek,
} from '../services/api'
import { fmtHijri, fmtTime } from '../utils/date'

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']
const PRAYER_LABELS = { Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' }
const PRAYER_ICONS = { Fajr: '🌅', Dhuhr: '☀️', Asr: '🌤', Maghrib: '🌅', Isha: '🌙' }

const REGIONS = ['Makkah', 'Madinah', 'Sharqia', 'Jizan']

export default function MotherDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('users')

  const TABS = [
    { key: 'users', label: 'الأطفال', icon: '👶' },
    { key: 'logs', label: 'التسجيلات', icon: '📝' },
    { key: 'rewards', label: 'المكافآت', icon: '🎁' },
    { key: 'attendance', label: 'تحضير', icon: '📋' },
    { key: 'settings', label: 'الإعدادات', icon: '⚙️' },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="card text-center py-4">
        <div className="text-3xl mb-1">🌺</div>
        <h1 className="text-xl font-bold font-cairo text-primary-800">مرحباً يا أمي</h1>
      </div>

      {/* Tabs - Icon Grid */}
      <div className="grid grid-cols-5 gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-col items-center py-3 rounded-2xl font-cairo transition-all ${
              activeTab === tab.key
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-200 scale-105'
                : 'bg-white text-gray-500 shadow-sm hover:shadow hover:text-gray-700'
            }`}
          >
            <span className="text-2xl">{tab.icon}</span>
            <span className={`text-[10px] mt-1 font-bold ${activeTab === tab.key ? 'text-white' : 'text-gray-400'}`}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && <UserManagement />}
      {activeTab === 'logs' && <LogManagement />}
      {activeTab === 'rewards' && <RewardManagement />}
      {activeTab === 'attendance' && <AttendanceManagement />}
      {activeTab === 'settings' && <SettingsManagement />}
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
  const [menuOpen, setMenuOpen] = useState(null)
  const [recordUser, setRecordUser] = useState(null)
  const [recordLogs, setRecordLogs] = useState([])
  const [recordLoading, setRecordLoading] = useState(false)

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
    setMenuOpen(null)
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

  const handleToggleLeaderboard = async (id, name) => {
    try {
      await toggleLeaderboard(id)
      setSuccess(`تم تغيير إظهار المتصدرين لـ ${name}`)
      fetchUsers()
    } catch { setError('فشل في تغيير الإعداد') }
  }

  const openRecord = async (u) => {
    setMenuOpen(null); setRecordLoading(true); setRecordUser(u)
    try {
      const res = await getUserLogs(u.id)
      setRecordLogs(res.data)
    } catch { setError('فشل في تحميل السجل') }
    finally { setRecordLoading(false) }
  }

  const handleDeleteLog = async (logId) => {
    if (!window.confirm('هل أنت متأكدة من حذف هذا التسجيل؟')) return
    try {
      await deleteLog(logId)
      setSuccess('تم حذف التسجيل')
      const res = await getUserLogs(recordUser.id)
      setRecordLogs(res.data)
      fetchUsers()
    } catch { setError('فشل في الحذف') }
  }

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const close = (e) => { if (!e.target.closest('.user-menu')) setMenuOpen(null) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menuOpen])

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
          <input placeholder="الاسم" value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            className="input-field font-cairo" required />
          <div className="grid grid-cols-2 gap-3">
            <input type="number" placeholder="العمر" value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
              className="input-field font-cairo" required min="1" max="120" />
            <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className="input-field font-cairo">
              <option value="Male">ذكر</option><option value="Female">أنثى</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}
              className="input-field font-cairo">
              {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="input-field font-cairo">
              <option value="user">طفل</option><option value="admin">أم (مشرف)</option>
            </select>
          </div>
          {!editing && (
            <input placeholder="PIN (4 أرقام)" value={form.pin}
              onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              className="input-field font-cairo text-center" required maxLength={4} />
          )}
          <button type="submit" className="btn-primary w-full font-cairo">
            {editing ? 'تحديث' : 'إضافة'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {users.filter((u) => u.id !== user?.id).map((u) => (
          <div key={u.id} className="card flex items-center justify-between relative">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white ${
                u.gender === 'Male' ? 'bg-blue-400' : 'bg-pink-400'
              }`}>
                {u.first_name[0]}
              </div>
              <div>
                <div className="font-bold font-cairo">{u.first_name}</div>
                <div className="text-[11px] text-gray-400 font-cairo">
                  {u.age} سنة · {u.gender === 'Male' ? 'ذكر' : 'أنثى'} · {u.region}
                </div>
                <div className="text-primary-600 font-bold font-cairo text-sm">{u.total_points} نقطة</div>
              </div>
            </div>

            {/* Three-dot menu */}
            <div className="user-menu relative">
              <button onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === u.id ? null : u.id) }}
                className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
                <span className="text-xl leading-none">⋯</span>
              </button>
              {menuOpen === u.id && (
                <div className="absolute left-0 bottom-full mb-1 bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-[140px] z-20">
                  <button onClick={() => openEdit(u)} className="w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 font-cairo flex items-center gap-2">
                    ✏️ تعديل
                  </button>
                  <button onClick={() => { setMenuOpen(null); handleResetPin(u.id) }} className="w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 font-cairo flex items-center gap-2">
                    🔑 PIN
                  </button>
                  <button onClick={() => { setMenuOpen(null); handleResetPoints(u.id, u.first_name) }} className="w-full text-right px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 font-cairo flex items-center gap-2">
                    🔄 تصفير النقاط
                  </button>
                  <button onClick={() => { setMenuOpen(null); handleToggleLeaderboard(u.id, u.first_name) }} className={`w-full text-right px-4 py-2 text-sm hover:bg-gray-50 font-cairo flex items-center gap-2 ${u.show_leaderboard ? 'text-green-600' : 'text-gray-400'}`}>
                    {u.show_leaderboard ? '🏆 إخفاء المتصدرين' : '🏆 إظهار المتصدرين'}
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button onClick={() => openRecord(u)} className="w-full text-right px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 font-cairo flex items-center gap-2">
                    📋 السجل
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button onClick={() => { setMenuOpen(null); handleDelete(u.id, u.first_name) }} className="w-full text-right px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-cairo flex items-center gap-2">
                    🗑️ حذف
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Record Modal */}
      {recordUser && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setRecordUser(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold font-cairo text-lg">📋 سجل {recordUser.first_name}</h3>
              <button onClick={() => setRecordUser(null)} className="text-gray-400 text-xl hover:text-gray-600">✕</button>
            </div>
            {recordLoading ? (
              <div className="text-center py-8 text-gray-400 font-cairo">جاري التحميل...</div>
            ) : recordLogs.length === 0 ? (
              <p className="text-center py-8 text-gray-400 font-cairo">لا توجد تسجيلات</p>
            ) : (
              <div className="space-y-2">
                {recordLogs.map(log => (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 text-sm">
                    <div className="flex items-center gap-2 font-cairo">
                      <span>{PRAYER_ICONS[log.prayer_name]}</span>
                      <span className="font-bold">{PRAYER_LABELS[log.prayer_name]}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${log.is_approved ? 'bg-green-100 text-green-700' : 'bg-gold-100 text-gold-700'}`}>
                        {log.is_approved ? 'مقبول' : 'قيد الانتظار'}
                      </span>
                      <span className="text-xs text-gray-400">{fmtHijri(log.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-primary-600 font-bold">+{log.points_awarded}</span>
                      <button onClick={() => handleDeleteLog(log.id)} className="text-red-400 hover:text-red-600 text-lg">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function LogManagement() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [pendingOnly, setPendingOnly] = useState(true)
  const [error, setError] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [approvingId, setApprovingId] = useState(null)
  const [customPoints, setCustomPoints] = useState({})

  const fetchLogs = useCallback(() => {
    let cancelled = false; setLoading(true)
    getAllLogs(pendingOnly).then(res => { if (!cancelled) setLogs(res.data) }).catch(() => { if (!cancelled) setError('فشل في تحميل التسجيلات') }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [pendingOnly])

  useEffect(() => {
    const cleanup = fetchLogs()
    return cleanup
  }, [fetchLogs])

  useEffect(() => { setSelectedIds(new Set()) }, [logs])

  const handleApprove = async (logId, isApproved) => {
    setApprovingId(logId)
    try {
      const data = { is_approved: isApproved }
      if (customPoints[logId] !== undefined && customPoints[logId] !== '') {
        data.override_points = parseInt(customPoints[logId])
      }
      await approveLog(logId, data)
      setCustomPoints(prev => { const n = { ...prev }; delete n[logId]; return n })
      fetchLogs()
    } catch { setError('فشل في تحديث التسجيل') }
    finally { setApprovingId(null) }
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  const selectAll = () => {
    const pending = logs.filter(l => !l.is_approved)
    if (selectedIds.size === pending.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pending.map(l => l.id)))
    }
  }

  const approveSelected = async () => {
    for (const id of selectedIds) {
      try {
        const data = { is_approved: true }
        if (customPoints[id] !== undefined && customPoints[id] !== '') {
          data.override_points = parseInt(customPoints[id])
        }
        await approveLog(id, data)
      } catch { }
    }
    setCustomPoints({}); fetchLogs()
  }

  if (loading) return <div className="text-center py-8 text-gray-400 font-cairo">جاري التحميل...</div>

  return (
    <div>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-3 text-sm font-cairo">{error}</div>}

      <div className="flex items-center justify-between mb-4">
        <label className="flex items-center gap-2 cursor-pointer font-cairo text-sm">
          <input type="checkbox" checked={pendingOnly}
            onChange={(e) => setPendingOnly(e.target.checked)}
            className="w-4 h-4" />
          <span>بانتظار المراجعة فقط</span>
        </label>
        {logs.filter(l => !l.is_approved).length > 1 && (
          <label className="flex items-center gap-2 cursor-pointer font-cairo text-sm">
            <input type="checkbox"
              checked={selectedIds.size === logs.filter(l => !l.is_approved).length && logs.filter(l => !l.is_approved).length > 0}
              onChange={selectAll} className="w-4 h-4" />
            <span>تحديد الكل</span>
          </label>
        )}
      </div>

      {selectedIds.size > 0 && (
        <button onClick={approveSelected}
          className="btn-primary w-full mb-4 font-cairo bg-green-600">
          ✓ قبول الكل ({selectedIds.size})
        </button>
      )}

      {logs.length === 0 ? (
        <p className="text-gray-400 text-center py-8 font-cairo">
          {pendingOnly ? 'لا توجد تسجيلات بانتظار المراجعة' : 'لا توجد تسجيلات'}
        </p>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className={`card ${!log.is_approved && selectedIds.has(log.id) ? 'ring-2 ring-green-400' : ''}`}>
              {/* Header row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-cairo">
                  {!log.is_approved && (
                    <input type="checkbox" checked={selectedIds.has(log.id)}
                      onChange={() => toggleSelect(log.id)} className="w-4 h-4" />
                  )}
                  <span className="text-lg">{PRAYER_ICONS[log.prayer_name]}</span>
                  <span className="font-bold text-sm">{log.user_name || 'مستخدم'}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    log.is_approved ? 'bg-green-100 text-green-700' : 'bg-gold-100 text-gold-700'
                  }`}>
                    {log.is_approved ? 'مقبول' : 'بانتظار'}
                  </span>
                </div>
                <span className="font-bold text-primary-600">+{log.points_awarded}</span>
              </div>

              {/* Meta row */}
              <div className="flex items-center justify-between mt-1.5 text-[11px] text-gray-400 font-cairo">
                <span>{PRAYER_LABELS[log.prayer_name]} · {fmtHijri(log.logged_at)}</span>
                <span className="flex gap-1.5">
                  {log.is_congregation && <span>🕌</span>}
                  {log.is_early_time && <span>⏰</span>}
                  <span>{log.is_within_golden_window ? '✅ ذهبية' : '⏰ خارج'}</span>
                </span>
              </div>

              {/* Action area for pending */}
              {!log.is_approved && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex gap-2 items-center mb-2">
                    <input type="number" placeholder="نقاط مخصصة"
                      value={customPoints[log.id] ?? ''}
                      onChange={(e) => setCustomPoints({ ...customPoints, [log.id]: e.target.value })}
                      className="input-field font-cairo text-sm flex-1 h-9" min="0" max="100" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleApprove(log.id, true)}
                      disabled={approvingId === log.id}
                      className="flex-1 py-2 bg-green-500 text-white rounded-xl text-sm font-bold font-cairo hover:bg-green-600 disabled:opacity-50">
                      ✓ قبول
                    </button>
                    <button onClick={() => handleApprove(log.id, false)}
                      disabled={approvingId === log.id}
                      className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-bold font-cairo hover:bg-red-600 disabled:opacity-50">
                      ✗ رفض
                    </button>
                  </div>
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
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [rewardDescriptions, setRewardDescriptions] = useState({})

  const fetchRewards = useCallback(() => {
    let cancelled = false
    getRewards(true).then(res => { if (!cancelled) setRewards(res.data) }).catch(() => { if (!cancelled) setError('فشل في تحميل المكافآت') }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const cleanup = fetchRewards()
    return cleanup
  }, [fetchRewards])

  useEffect(() => { setSelectedIds(new Set()) }, [rewards])

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  const selectAll = () => {
    if (selectedIds.size === rewards.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(rewards.map(r => r.id)))
    }
  }

  const handleApprove = async (id, isApproved) => {
    try {
      const desc = rewardDescriptions[id] || null
      await approveReward(id, isApproved, desc)
      setRewardDescriptions(prev => { const n = { ...prev }; delete n[id]; return n })
      fetchRewards()
    } catch { setError('فشل في تحديث المكافأة') }
  }

  const approveSelected = async () => {
    for (const id of selectedIds) {
      try {
        const desc = rewardDescriptions[id] || null
        await approveReward(id, true, desc)
      } catch {}
    }
    setRewardDescriptions({})
    fetchRewards()
  }

  if (loading) return <div className="text-center py-8 text-gray-400 font-cairo">جاري التحميل...</div>

  return (
    <div>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-3 text-sm font-cairo">{error}</div>}

      {rewards.length > 1 && (
        <div className="flex items-center justify-between mb-4">
          <label className="flex items-center gap-2 cursor-pointer font-cairo text-sm">
            <input type="checkbox" checked={selectedIds.size === rewards.length && rewards.length > 0}
              onChange={selectAll} className="w-4 h-4" />
            <span>تحديد الكل</span>
          </label>
          {selectedIds.size > 0 && (
            <button onClick={approveSelected}
              className="px-4 py-2 rounded-xl text-sm font-bold font-cairo bg-green-600 text-white hover:bg-green-700">
              ✓ اعتماد الكل ({selectedIds.size})
            </button>
          )}
        </div>
      )}

      {rewards.length === 0 ? (
        <div className="card text-center py-8">
          <div className="text-4xl mb-3">🎁</div>
          <p className="text-gray-400 font-cairo">لا توجد مكافآت بانتظار الموافقة</p>
          <p className="text-gray-400 text-sm font-cairo">عندما يصل الأطفال إلى نقاط المكافأة، ستظهر هنا</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rewards.map((rw) => (
            <div key={rw.id} className={`card ${selectedIds.has(rw.id) ? 'ring-2 ring-green-400' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={selectedIds.has(rw.id)}
                    onChange={() => toggleSelect(rw.id)} className="w-4 h-4" />
                  <div>
                    <div className="font-bold font-cairo">{rw.user_name}</div>
                    <div className="text-sm text-gray-500 font-cairo">
                      🎯 وصل إلى {rw.milestone_points} نقطة!
                    </div>
                  </div>
                </div>
                <span className="text-3xl">🏆</span>
              </div>
              <div className="text-xs text-gray-400 font-cairo mb-2">
                {fmtHijri(rw.created_at)}
              </div>
              <input type="text" placeholder="وصف المكافأة (اختياري)"
                value={rewardDescriptions[rw.id] ?? ''}
                onChange={(e) => setRewardDescriptions({ ...rewardDescriptions, [rw.id]: e.target.value })}
                className="input-field font-cairo text-sm mb-3" />
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

function AttendanceManagement() {
  const [users, setUsers] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [prayerName, setPrayerName] = useState('Fajr')
  const [daysAgo, setDaysAgo] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const selectedDate = new Date()
  selectedDate.setDate(selectedDate.getDate() - daysAgo)
  const logDate = selectedDate.toISOString().split('T')[0]

  const hijriDate = fmtHijri(selectedDate.toISOString(), false)

  const DAYS_OPTIONS = [
    { value: 0, label: 'اليوم' },
    { value: 1, label: 'أمس' },
    { value: 2, label: 'قبل يومين' },
    { value: 3, label: 'قبل ٣ أيام' },
    { value: 4, label: 'قبل ٤ أيام' },
    { value: 5, label: 'قبل ٥ أيام' },
    { value: 6, label: 'قبل ٦ أيام' },
    { value: 7, label: 'قبل أسبوع' },
    { value: 14, label: 'قبل أسبوعين' },
    { value: 21, label: 'قبل ٣ أسابيع' },
    { value: 30, label: 'قبل شهر' },
  ]

  useEffect(() => {
    getUsers().then(res => setUsers(res.data.filter(u => u.role !== 'admin'))).catch(() => setError('فشل في تحميل المستخدمين'))
  }, [])

  const toggleAll = () => {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(users.map(u => u.id)))
    }
  }

  const toggleUser = (id) => {
    setSelectedIds(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  const handleSubmit = async () => {
    if (selectedIds.size === 0) { setError('اختاري طفلاً واحداً على الأقل'); return }
    setLoading(true); setError(''); setSuccess('')
    try {
      const res = await markAttendance(prayerName, Array.from(selectedIds), logDate)
      setSuccess(res.data.message)
      setSelectedIds(new Set())
    } catch (err) { setError(err.response?.data?.detail || 'فشل في تسجيل الحضور') }
    finally { setLoading(false) }
  }

  return (
    <div>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-3 text-sm font-cairo">{error}</div>}
      {success && <div className="bg-green-50 text-green-600 p-3 rounded-xl mb-3 text-sm font-cairo">{success}</div>}

      <div className="card space-y-4">
        <h3 className="font-bold font-cairo text-lg">📋 تحضير الأطفال للصلاة</h3>

        <div>
          <label className="block text-sm font-cairo text-gray-600 mb-1">اختيار الصلاة:</label>
          <select
            value={prayerName}
            onChange={(e) => setPrayerName(e.target.value)}
            className="input-field font-cairo"
          >
            {PRAYER_NAMES.map(n => <option key={n} value={n}>{PRAYER_ICONS[n]} {PRAYER_LABELS[n]}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-cairo text-gray-600 mb-1">📅 التاريخ الهجري:</label>
          <select
            value={daysAgo}
            onChange={(e) => setDaysAgo(parseInt(e.target.value))}
            className="input-field font-cairo"
          >
            {DAYS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className="mt-2 text-center font-cairo">
            <span className="bg-primary-50 text-primary-700 px-4 py-2 rounded-xl text-lg font-bold block">
              {hijriDate}
            </span>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer font-cairo text-sm">
          <input
            type="checkbox"
            checked={selectedIds.size === users.length && users.length > 0}
            onChange={toggleAll}
            className="w-4 h-4"
          />
          <span>تحديد الكل</span>
        </label>

        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
          {users.map(u => (
            <label key={u.id} className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer font-cairo text-sm ${
              selectedIds.has(u.id) ? 'bg-primary-50 border border-primary-200' : 'bg-gray-50'
            }`}>
              <input
                type="checkbox"
                checked={selectedIds.has(u.id)}
                onChange={() => toggleUser(u.id)}
                className="w-4 h-4"
              />
              <span>{u.first_name}</span>
              <span className="text-xs text-gray-400">{u.category}</span>
            </label>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || selectedIds.size === 0}
          className="btn-primary w-full font-cairo disabled:opacity-50"
        >
          {loading ? 'جاري التسجيل...' : '📋 تسجيل الحضور'}
        </button>
      </div>
    </div>
  )
}

function SettingsManagement() {
  const [form, setForm] = useState({
    golden_window_minutes: 30,
    kids_base_points: 5,
    kids_bonus_points: 3,
    adults_base_points: 2,
    adults_bonus_points: 5,
    reward_milestones: '50,100,150,200,300,500',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    getAdminSettings().then(res => {
      setForm({
        golden_window_minutes: res.data.golden_window_minutes,
        kids_base_points: res.data.kids_base_points,
        kids_bonus_points: res.data.kids_bonus_points,
        adults_base_points: res.data.adults_base_points,
        adults_bonus_points: res.data.adults_bonus_points,
        reward_milestones: (res.data.reward_milestones || []).join(','),
      })
    }).catch(() => setError('فشل في تحميل الإعدادات')).finally(() => setLoading(false))
  }, [])

  const update = (key, value) => setForm({ ...form, [key]: value })

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess('')
    try {
      const milestones = form.reward_milestones.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0)
      await updateSettings({
        golden_window_minutes: parseInt(form.golden_window_minutes) || 30,
        kids_base_points: parseInt(form.kids_base_points) || 0,
        kids_bonus_points: parseInt(form.kids_bonus_points) || 0,
        adults_base_points: parseInt(form.adults_base_points) || 0,
        adults_bonus_points: parseInt(form.adults_bonus_points) || 0,
        reward_milestones: milestones,
      })
      setSuccess('تم حفظ الإعدادات بنجاح')
    } catch (err) { setError(err.response?.data?.detail || 'فشل في حفظ الإعدادات') }
    finally { setSaving(false) }
  }

  const handleResetWeek = async () => {
    if (!window.confirm('⚠️ هل أنت متأكدة؟ سيتم أرشفة بيانات هذا الأسبوع وتصفير نقاط الجميع إلى 0!')) return
    if (!window.confirm('❗ تأكيد نهائي: تصفير الأسبوع ونقل البيانات للأرشيف؟')) return
    setResetting(true); setError(''); setSuccess('')
    try {
      const res = await resetWeek()
      setSuccess(res.data.message)
    } catch (err) { setError(err.response?.data?.detail || 'فشل في تصفير الأسبوع') }
    finally { setResetting(false) }
  }

  if (loading) return <div className="text-center py-8 text-gray-400 font-cairo">جاري التحميل...</div>

  return (
    <div>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-3 text-sm font-cairo">{error}</div>}
      {success && <div className="bg-green-50 text-green-600 p-3 rounded-xl mb-3 text-sm font-cairo">{success}</div>}

      <div className="card space-y-4">
        <h3 className="font-bold font-cairo text-lg">⚙️ الإعدادات</h3>

        {/* Golden Window */}
        <div>
          <label className="block text-sm font-cairo text-gray-600 mb-1">⏱️ مدة النافذة الذهبية (بالدقائق):</label>
          <input type="number" value={form.golden_window_minutes}
            onChange={(e) => update('golden_window_minutes', e.target.value)}
            className="input-field font-cairo" min="1" max="180" />
        </div>

        <div className="border-t pt-4">
          <h4 className="font-bold font-cairo mb-3">🔢 نقاط التقييم</h4>

          <div className="grid grid-cols-2 gap-3">
            <div className="card bg-primary-50">
              <label className="block text-xs font-cairo text-gray-600 mb-1">🧒 الأطفال - الأساسي</label>
              <input type="number" value={form.kids_base_points}
                onChange={(e) => update('kids_base_points', e.target.value)}
                className="input-field font-cairo text-center" min="0" />
            </div>
            <div className="card bg-gold-50">
              <label className="block text-xs font-cairo text-gray-600 mb-1">🧒 الأطفال - المكافأة</label>
              <input type="number" value={form.kids_bonus_points}
                onChange={(e) => update('kids_bonus_points', e.target.value)}
                className="input-field font-cairo text-center" min="0" />
            </div>
            <div className="card bg-primary-50">
              <label className="block text-xs font-cairo text-gray-600 mb-1">🧑 الكبار - الأساسي</label>
              <input type="number" value={form.adults_base_points}
                onChange={(e) => update('adults_base_points', e.target.value)}
                className="input-field font-cairo text-center" min="0" />
            </div>
            <div className="card bg-gold-50">
              <label className="block text-xs font-cairo text-gray-600 mb-1">🧑 الكبار - المكافأة</label>
              <input type="number" value={form.adults_bonus_points}
                onChange={(e) => update('adults_bonus_points', e.target.value)}
                className="input-field font-cairo text-center" min="0" />
            </div>
          </div>

          <div className="text-xs text-gray-400 mt-2 font-cairo">
            الإجمالي: الأطفال {parseInt(form.kids_base_points) || 0} + {parseInt(form.kids_bonus_points) || 0} = {parseInt(form.kids_base_points || 0) + parseInt(form.kids_bonus_points || 0)} | 
            الكبار {parseInt(form.adults_base_points) || 0} + {parseInt(form.adults_bonus_points) || 0} = {parseInt(form.adults_base_points || 0) + parseInt(form.adults_bonus_points || 0)}
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-bold font-cairo mb-3">🏆 نقاط المكافأة ( milestones )</h4>
          <div>
            <label className="block text-xs font-cairo text-gray-600 mb-1">نقاط المكافأة (مفصولة بفاصلة):</label>
            <input type="text" value={form.reward_milestones}
              onChange={(e) => update('reward_milestones', e.target.value)}
              className="input-field font-cairo" placeholder="50,100,150,200,300,500" />
            <p className="text-xs text-gray-400 mt-1 font-cairo">
              كلما وصل الطفل لهذه النقاط تنشأ مكافأة تلقائياً
            </p>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="btn-primary w-full font-cairo disabled:opacity-50">
          {saving ? 'جاري الحفظ...' : '💾 حفظ الإعدادات'}
        </button>
      </div>

      {/* Reset Week */}
      <div className="card mt-4 border-2 border-red-200 bg-red-50 space-y-3">
        <h4 className="font-bold font-cairo text-red-700">⚠️ تصفير الأسبوع</h4>
        <p className="text-xs text-red-600 font-cairo">
          سيتم أرشفة بيانات هذا الأسبوع (نقاط وترتيب الجميع) وتصفير نقاط الجميع إلى 0 لبدء أسبوع جديد.
        </p>
        <button onClick={handleResetWeek} disabled={resetting}
          className="w-full py-3 rounded-xl text-sm font-bold font-cairo bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
          {resetting ? 'جاري التصفير...' : '🔄 تصفير الأسبوع ونقل للأرشيف'}
        </button>
      </div>
    </div>
  )
}
