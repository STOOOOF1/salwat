import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getPrayerTimes, logPrayer, getMyLogs, getPrayerSettings } from '../services/api'
import { fmtHijri, fmtTime } from '../utils/date'
import Celebration from '../components/Celebration'

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']
const PRAYER_LABELS = { Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' }
const PRAYER_ICONS = { Fajr: '🌅', Dhuhr: '☀️', Asr: '🌤', Maghrib: '🌅', Isha: '🌙' }

export default function ChildDashboard() {
  const { user, refreshUser } = useAuth()
  const [prayerTimes, setPrayerTimes] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [logging, setLogging] = useState(null)
  const [error, setError] = useState('')
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationMsg, setCelebrationMsg] = useState('')
  const [rewardAlert, setRewardAlert] = useState(null)
  const [goldenState, setGoldenState] = useState({ remaining: null, status: 'none' })
  const [goldenWindow, setGoldenWindow] = useState(30)
  const [pointsConfig, setPointsConfig] = useState({ kids_base_points: 5, kids_bonus_points: 3, adults_base_points: 2, adults_bonus_points: 5 })
  const [rank, setRank] = useState(null)
  const [now, setNow] = useState(new Date())
  const [prayerToggle, setPrayerToggle] = useState({
    is_congregation: true,
    is_early_time: true,
  })

  // ---- Data fetching ----
  useEffect(() => {
    let c = false
    Promise.all([getPrayerTimes(user.region), getMyLogs(), getPrayerSettings()])
      .then(([tr, lr, sr]) => { if (!c) { setPrayerTimes(tr.data); setLogs(lr.data); setGoldenWindow(sr.data.golden_window_minutes); setPointsConfig({ kids_base_points: sr.data.kids_base_points, kids_bonus_points: sr.data.kids_bonus_points, adults_base_points: sr.data.adults_base_points, adults_bonus_points: sr.data.adults_bonus_points }) } })
      .catch(() => {})
      .finally(() => { if (c) return; setLoading(false) })
    return () => { c = true }
  }, [user.region])

  useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i) }, [])

  // ---- Rewards ----
  useEffect(() => {
    const check = async () => {
      try {
        const m = await import('../services/api')
        const res = await m.getMyRewards()
        const approved = res.data.find(r => r.is_approved)
        if (approved) { setCelebrationMsg(`🎉 مبروك! مكافأة ${approved.milestone_points} نقطة!`); setShowCelebration(true) }
      } catch {}
    }
    check(); const i = setInterval(check, 15000); return () => clearInterval(i)
  }, [])

  // ---- Rank ----
  useEffect(() => {
    const fetchRank = async () => {
      try {
        const m = await import('../services/api')
        const res = await m.getLeaderboard(user.age < 15 ? 'Kids' : 'Adults')
        const idx = res.data.entries.findIndex(e => e.user_id === user.id)
        setRank(idx >= 0 ? idx + 1 : null)
      } catch {}
    }
    fetchRank(); const i = setInterval(fetchRank, 30000); return () => clearInterval(i)
  }, [user.id, user.age])

  // ---- Prayer logic ----
  const parseTime = (name) => {
    if (!prayerTimes?.[name]) return null
    const [h, m] = prayerTimes[name].split(':').map(Number)
    const d = new Date(now); d.setHours(h, m, 0, 0)
    return d
  }

  const getCurrentPrayerInfo = () => {
    if (!prayerTimes) return null
    const todayLogs = getTodayLogs()
    const logged = new Set(todayLogs.map(l => l.prayer_name))
    const nowMs = now.getTime()

    // Build list of prayer times
    const times = PRAYER_NAMES.map(name => ({ name, time: parseTime(name), logged: logged.has(name) })).filter(t => t.time)

    // Find current: last prayer whose time has passed, that isn't logged
    let current = null
    for (const t of times) {
      if (nowMs >= t.time.getTime() && !t.logged) current = t
    }
    // If all logged, find next upcoming
    if (!current) {
      current = times.find(t => !t.logged) || times[times.length - 1]
    }
    return current
  }

  const getTodayLogs = () => {
    const today = new Date().toDateString()
    return logs.filter(l => new Date(l.created_at).toDateString() === today)
  }

  const fmt = (s) => {
    if (s === null || s === undefined) return ''
    const m = Math.floor(s / 60); const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const handleLogPrayer = async (prayerName) => {
    if (!prayerTimes?.[prayerName] || logging) return
    setLogging(prayerName); setError('')
    const t = parseTime(prayerName)
    if (!t) return
    try {
      const payload = { prayer_name: prayerName, prayer_time: t.toISOString(), is_congregation: user.gender === 'Male' && prayerToggle.is_congregation, is_early_time: user.gender === 'Female' && prayerToggle.is_early_time }
      const res = await logPrayer(payload)
      const { points_awarded, is_approved } = res.data
      setCelebrationMsg(points_awarded >= 8 ? `+${points_awarded} نقطة! أداء رائع! 🎉` : `+${points_awarded} نقطة! أحسنت!`)
      setShowCelebration(true)
      const [lr, mr] = await Promise.all([getMyLogs(), (await (await import('../services/api')).getMe())])
      setLogs(lr.data); refreshUser(mr.data)
      if (!is_approved) setRewardAlert('بإنتظار مراجعة الأم')
    } catch (err) { setError(err.response?.data?.detail || 'فشل') }
    finally { setLogging(null) }
  }

  const calcGoldenState = () => {
    if (!prayerTimes) return { remaining: null, status: 'none' }
    const info = getCurrentPrayerInfo()
    if (!info) return { remaining: null, status: 'none' }

    const nowMs = now.getTime()
    const prayerMs = info.time.getTime()
    const windowEnd = prayerMs + goldenWindow * 60000
    const diff = Math.floor((windowEnd - nowMs) / 1000)

    if (info.logged) return { remaining: null, status: 'done' }
    if (nowMs < prayerMs) return { remaining: Math.floor((prayerMs - nowMs) / 1000), status: 'upcoming' }
    if (diff > 0) return { remaining: diff, status: 'golden' }
    const next = PRAYER_NAMES.reduce((acc, n) => {
      const t = parseTime(n); if (!t || info.logged) return acc
      if (t.getTime() <= info.time.getTime()) return acc
      return !acc || t.getTime() < acc.getTime() ? t : acc
    }, null)
    const endMs = next ? next.getTime() : prayerMs + 4 * 3600000
    const expired = Math.floor((endMs - nowMs) / 1000)
    return { remaining: Math.max(0, expired), status: 'expired' }
  }

  const currentPrayer = getCurrentPrayerInfo()
  const golden = calcGoldenState()
  const todayLogs = getTodayLogs()
  const isAdult = user.age >= 15

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>

  return (
    <div className="space-y-4">
      <Celebration show={showCelebration} message={celebrationMsg} onClose={() => setShowCelebration(false)} />

      {/* Points bar */}
      <div className="card flex items-center justify-between py-3">
        <div>
          <div className="text-sm text-gray-500 font-cairo">نقاطي</div>
          <div className="text-3xl font-bold text-primary-600 font-cairo">{user.total_points}</div>
        </div>
        {user.show_leaderboard && (
          <div className="text-left">
            <div className="text-sm text-gray-500 font-cairo">الترتيب</div>
            <div className="text-2xl font-bold text-gold-600 font-cairo">{rank ? `#${rank}` : '-'}</div>
          </div>
        )}
      </div>

      {/* Errors & alerts */}
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm text-center font-cairo border border-red-200">{error}</div>}
      {rewardAlert && <div className="bg-gold-50 text-gold-700 p-3 rounded-xl text-sm text-center font-cairo border border-gold-200">{rewardAlert}</div>}

      {/* ===== CURRENT PRAYER HERO ===== */}
      {currentPrayer && !currentPrayer.logged && (
        <div className={`card text-center border-2 ${
          golden.status === 'golden' ? 'border-gold-400 bg-gradient-to-b from-gold-50 to-white shadow-lg shadow-gold-100' :
          golden.status === 'expired' ? 'border-red-300 bg-red-50' : 'border-primary-300 bg-primary-50'
        }`}>
          <div className="text-sm text-gray-500 font-cairo mb-1">الصلاة المفروضة الآن</div>
          <div className="text-4xl mb-1">{PRAYER_ICONS[currentPrayer.name]}</div>
          <div className="text-3xl font-bold font-cairo mb-1">{PRAYER_LABELS[currentPrayer.name]}</div>
          <div className="text-gray-500 font-cairo text-sm mb-3">{prayerTimes?.[currentPrayer.name]}</div>

          {/* Golden window */}
          {golden.status === 'golden' && (
            <div className="bg-gold-500 text-white rounded-xl p-3 mb-4 animate-pulse">
              <div className="text-xs font-cairo opacity-80">النافذة الذهبية — نقاط مضاعفة!</div>
              <div className="text-3xl font-bold font-cairo tracking-widest" dir="ltr">{fmt(golden.remaining)}</div>
              <div className="text-xs font-cairo opacity-80">متبقي للتسجيل داخل النافذة</div>
            </div>
          )}
          {golden.status === 'expired' && (
            <div className="bg-red-100 text-red-700 rounded-xl p-3 mb-4 border border-red-200">
              <div className="text-lg font-bold font-cairo">⏰ انتهت المهلة</div>
              <div className="text-xs font-cairo">التسجيل الآن بانتظار مراجعة الأم</div>
            </div>
          )}
          {golden.status === 'upcoming' && (
            <div className="bg-primary-100 text-primary-700 rounded-xl p-3 mb-4">
              <div className="text-lg font-bold font-cairo">🔔 وقت الصلاة لم يحن بعد</div>
              <div className="text-xs font-cairo">باقي {fmt(golden.remaining)} على الأذان</div>
            </div>
          )}

          {/* Congregation / Early-time toggle */}
          {user.gender === 'Male' && golden.status !== 'upcoming' && (
            <label className="flex items-center justify-center gap-2 mb-3 cursor-pointer font-cairo text-sm">
              <input
                type="checkbox"
                checked={prayerToggle.is_congregation}
                onChange={(e) => setPrayerToggle({ ...prayerToggle, is_congregation: e.target.checked })}
                className="w-4 h-4"
              />
              <span className={prayerToggle.is_congregation ? 'text-primary-700 font-bold' : 'text-gray-500'}>
                🕌 صلاة الجماعة
              </span>
            </label>
          )}
          {user.gender === 'Female' && golden.status !== 'upcoming' && (
            <label className="flex items-center justify-center gap-2 mb-3 cursor-pointer font-cairo text-sm">
              <input
                type="checkbox"
                checked={prayerToggle.is_early_time}
                onChange={(e) => setPrayerToggle({ ...prayerToggle, is_early_time: e.target.checked })}
                className="w-4 h-4"
              />
              <span className={prayerToggle.is_early_time ? 'text-primary-700 font-bold' : 'text-gray-500'}>
                ⏰ في أول الوقت
              </span>
            </label>
          )}

          {/* BIG LOG BUTTON */}
          <button
            onClick={() => handleLogPrayer(currentPrayer.name)}
            disabled={logging === currentPrayer.name || golden.status === 'upcoming'}
            className={`w-full py-4 rounded-2xl text-xl font-bold font-cairo transition-all active:scale-95 shadow-lg ${
              golden.status === 'golden'
                ? 'bg-gold-500 hover:bg-gold-600 text-white shadow-gold-200'
                : 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-200'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {logging === currentPrayer.name ? 'جاري التسجيل...' : `تسجيل ${PRAYER_LABELS[currentPrayer.name]}`}
          </button>

          {/* Points info */}
          <div className="mt-3 text-xs text-gray-400 font-cairo">
            {isAdult
              ? `${pointsConfig.adults_base_points} أساسي + ${pointsConfig.adults_bonus_points} مكافأة = ${pointsConfig.adults_base_points + pointsConfig.adults_bonus_points} نقاط`
              : `${pointsConfig.kids_base_points} أساسي + ${pointsConfig.kids_bonus_points} مكافأة = ${pointsConfig.kids_base_points + pointsConfig.kids_bonus_points} نقاط`}
            {golden.status !== 'golden' && ` (بدون مكافأة: ${isAdult ? pointsConfig.adults_base_points : pointsConfig.kids_base_points} نقاط)`}
          </div>
        </div>
      )}

      {/* All prayers */}
      <div className="card">
        <h2 className="font-bold font-cairo mb-3">جميع الأوقات</h2>
        <div className="space-y-1">
          {PRAYER_NAMES.map(name => {
            const time = prayerTimes?.[name] || '--:--'
            const isLogged = todayLogs.some(l => l.prayer_name === name)
            const isCurrent = currentPrayer?.name === name
            const isLogging = logging === name
            return (
              <div key={name} className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
                isCurrent && !isLogged ? 'bg-primary-50 border border-primary-200' : isLogged ? 'opacity-60' : ''
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{PRAYER_ICONS[name]}</span>
                  <span className={`font-bold font-cairo ${isLogged ? 'text-green-600' : ''}`}>{PRAYER_LABELS[name]}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-cairo text-sm">{time}</span>
                  {isLogged
                    ? <span className="text-green-500 font-bold font-cairo">✓</span>
                    : <button onClick={() => handleLogPrayer(name)} disabled={isLogging}
                        className="px-3 py-1 rounded-lg text-sm font-bold font-cairo bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50">
                        {isLogging ? '...' : 'تسجيل'}
                      </button>
                  }
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent Logs */}
      <div className="card">
        <h3 className="font-bold mb-3 font-cairo">آخر التسجيلات</h3>
        {logs.length === 0 ? <p className="text-gray-400 text-center py-4 font-cairo">لا توجد تسجيلات</p> : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {logs.slice(0, 15).map(log => (
              <div key={log.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2 last:border-0">
                <div className="flex items-center gap-2 font-cairo">
                  <span>{PRAYER_ICONS[log.prayer_name]}</span>
                  <span>{PRAYER_LABELS[log.prayer_name]}</span>
                  {log.is_congregation && <span className="text-xs text-primary-500">🕌</span>}
                  {log.is_early_time && <span className="text-xs text-primary-500">⏰</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${log.is_approved ? 'bg-green-100 text-green-700' : 'bg-gold-100 text-gold-700'}`}>
                    {log.is_approved ? 'مقبول' : 'بالانتظار'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <span className="font-bold text-primary-600">+{log.points_awarded}</span>
                  <span>{fmtTime(log.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
