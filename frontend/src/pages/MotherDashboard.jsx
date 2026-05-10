import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getUsers, createUser, updateUser, deleteUser, resetUserPin, resetUserPoints,
  getAllLogs, approveLog,
  getRewards, approveReward,
  toggleLeaderboard,
  markAttendance,
  getAdminSettings, updateSettings,
} from '../services/api'
import { fmtHijri, fmtTime } from '../utils/date'

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']
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
      <div className="flex rounded-xl bg-gray-100 p-1 gap-1 flex-wrap">
        {[
          { key: 'users', label: 'الأطفال', icon: '👶' },
          { key: 'logs', label: 'التسجيلات', icon: '📝' },
          { key: 'rewards', label: 'المكافآت', icon: '🎁' },
          { key: 'attendance', label: 'تحضير', icon: '📋' },
          { key: 'settings', label: 'الإعدادات', icon: '⚙️' },
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

  const handleToggleLeaderboard = async (id, name) => {
    try {
      await toggleLeaderboard(id)
      setSuccess(`تم تغيير إظهار المتصدرين لـ ${name}`)
      fetchUsers()
    } catch { setError('فشل في تغيير الإعداد') }
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
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => openEdit(u)} className="text-sm text-blue-600 hover:text-blue-800 font-cairo">تعديل</button>
              <button onClick={() => handleResetPin(u.id)} className="text-sm text-gold-600 hover:text-gold-800 font-cairo">PIN</button>
              <button onClick={() => handleResetPoints(u.id, u.first_name)} className="text-sm text-orange-600 hover:text-orange-800 font-cairo">تصفير</button>
              <button onClick={() => handleToggleLeaderboard(u.id, u.first_name)} className={`text-sm font-cairo ${u.show_leaderboard ? 'text-green-600 hover:text-green-800' : 'text-gray-400 hover:text-gray-600'}`}>
                {u.show_leaderboard ? '🏆 ظاهر' : '🏆 مخفي'}
              </button>
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
    if (selectedIds.size === logs.filter(l => !l.is_approved).length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(logs.filter(l => !l.is_approved).map(l => l.id)))
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
    setCustomPoints({})
    fetchLogs()
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

      {selectedIds.size > 0 && (
        <button
          onClick={approveSelected}
          className="btn-primary w-full mb-4 font-cairo bg-green-600"
        >
          ✓ قبول الكل ({selectedIds.size})
        </button>
      )}

      {logs.length === 0 ? (
        <p className="text-gray-400 text-center py-8 font-cairo">
          {pendingOnly ? 'لا توجد تسجيلات بانتظار المراجعة' : 'لا توجد تسجيلات'}
        </p>
      ) : (
        <div className="space-y-3">
          {logs.filter(l => !l.is_approved).length > 1 && (
            <label className="flex items-center gap-2 mb-2 cursor-pointer font-cairo text-sm">
              <input
                type="checkbox"
                checked={selectedIds.size === logs.filter(l => !l.is_approved).length && logs.filter(l => !l.is_approved).length > 0}
                onChange={selectAll}
                className="w-4 h-4"
              />
              <span>تحديد الكل للقبول</span>
            </label>
          )}
          {logs.map((log) => (
            <div key={log.id} className={`card ${!log.is_approved && selectedIds.has(log.id) ? 'border-2 border-green-400' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 font-cairo">
                  {!log.is_approved && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(log.id)}
                      onChange={() => toggleSelect(log.id)}
                      className="w-4 h-4 ml-1"
                    />
                  )}
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
                <span>{PRAYER_LABELS[log.prayer_name]} | {fmtHijri(log.logged_at)}</span>
                <span className="flex gap-1">
                  {log.is_congregation && <span title="صلاة الجماعة">🕌</span>}
                  {log.is_early_time && <span title="في أول الوقت">⏰</span>}
                  {log.is_within_golden_window ? '✅ النافذة الذهبية' : '⏰ خارج النافذة'}
                </span>
              </div>
              {!log.is_approved && (
                <div className="mt-3 space-y-2">
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      placeholder="نقاط مخصصة (اختياري)"
                      value={customPoints[log.id] ?? ''}
                      onChange={(e) => setCustomPoints({ ...customPoints, [log.id]: e.target.value })}
                      className="input-field font-cairo text-sm flex-1"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(log.id, true)}
                      disabled={approvingId === log.id}
                      className="flex-1 py-2 bg-green-500 text-white rounded-xl text-sm font-bold font-cairo hover:bg-green-600 disabled:opacity-50"
                    >
                      {approvingId === log.id ? '...' : '✓ قبول'}
                    </button>
                    <button
                      onClick={() => handleApprove(log.id, false)}
                      disabled={approvingId === log.id}
                      className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-bold font-cairo hover:bg-red-600 disabled:opacity-50"
                    >
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

  const fetchRewards = useCallback(() => {
    let cancelled = false
    getRewards(true).then(res => { if (!cancelled) setRewards(res.data) }).catch(() => { if (!cancelled) setError('فشل في تحميل المكافآت') }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const cleanup = fetchRewards()
    return cleanup
  }, [fetchRewards])

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
                {fmtHijri(rw.created_at)}
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

function AttendanceManagement() {
  const [users, setUsers] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [prayerName, setPrayerName] = useState('Fajr')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
      const res = await markAttendance(prayerName, Array.from(selectedIds))
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
  const [goldenWindow, setGoldenWindow] = useState(30)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    getAdminSettings().then(res => setGoldenWindow(res.data.golden_window_minutes)).catch(() => setError('فشل في تحميل الإعدادات')).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess('')
    try {
      await updateSettings({ golden_window_minutes: goldenWindow })
      setSuccess('تم حفظ الإعدادات بنجاح')
    } catch (err) { setError(err.response?.data?.detail || 'فشل في حفظ الإعدادات') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="text-center py-8 text-gray-400 font-cairo">جاري التحميل...</div>

  return (
    <div>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-3 text-sm font-cairo">{error}</div>}
      {success && <div className="bg-green-50 text-green-600 p-3 rounded-xl mb-3 text-sm font-cairo">{success}</div>}

      <div className="card space-y-4">
        <h3 className="font-bold font-cairo text-lg">⚙️ الإعدادات</h3>

        <div>
          <label className="block text-sm font-cairo text-gray-600 mb-1">مدة النافذة الذهبية (بالدقائق):</label>
          <input
            type="number"
            value={goldenWindow}
            onChange={(e) => setGoldenWindow(parseInt(e.target.value) || 30)}
            className="input-field font-cairo"
            min="1"
            max="180"
          />
          <p className="text-xs text-gray-400 mt-1 font-cairo">
            المدة المسموحة بعد الأذان لتسجيل الصلاة بنقاط كاملة. حالياً: {goldenWindow} دقيقة
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full font-cairo disabled:opacity-50"
        >
          {saving ? 'جاري الحفظ...' : '💾 حفظ الإعدادات'}
        </button>
      </div>

      <div className="card mt-4 space-y-3">
        <h4 className="font-bold font-cairo">نقاط التقييم الحالية</h4>
        <div className="text-sm font-cairo text-gray-600 space-y-1">
          <p>🧒 الأطفال (أقل من 15 سنة): 5 نقاط أساسي + 3 نقاط مكافأة = 8 نقاط</p>
          <p>🧑 الكبار (15 سنة فأكثر): 2 نقطة أساسي + 5 نقاط مكافأة = 7 نقاط</p>
        </div>
      </div>
    </div>
  )
}
