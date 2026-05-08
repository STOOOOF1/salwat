import { useState, useEffect } from 'react'
import { getLeaderboard, getArchivedWeeks, getArchivedLeaderboard } from '../services/api'

const RANK_MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default function LeaderboardPage() {
  const [category, setCategory] = useState('Kids')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showArchive, setShowArchive] = useState(false)
  const [weeks, setWeeks] = useState([])
  const [selectedWeek, setSelectedWeek] = useState(null)
  const [archiveData, setArchiveData] = useState(null)

  useEffect(() => {
    let cancelled = false; setLoading(true)
    getLeaderboard(category).then(res => { if (!cancelled) setData(res.data) }).catch(() => { if (!cancelled) setError('فشل في تحميل لوحة المتصدرين') }).finally(() => { if (!cancelled) setLoading(false) })
    const interval = setInterval(() => {
      getLeaderboard(category).then(res => { if (!cancelled) setData(res.data) }).catch(() => {})
    }, 30000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [category])

  useEffect(() => {
    if (!showArchive) return
    getArchivedWeeks().then(res => setWeeks(res.data)).catch(() => {})
  }, [showArchive])

  useEffect(() => {
    if (!selectedWeek) { setArchiveData(null); return }
    getArchivedLeaderboard(selectedWeek.week_start, selectedWeek.week_end, selectedWeek.category)
      .then(res => setArchiveData(res.data))
      .catch(() => {})
  }, [selectedWeek])

  const loadArchive = (week) => {
    setSelectedWeek(prev => prev?.week_start === week.week_start && prev?.category === week.category ? null : week)
  }

  return (
    <div className="space-y-6">
      <div className="card text-center">
        <div className="text-5xl mb-3">🏆</div>
        <h1 className="text-2xl font-bold font-cairo text-primary-800">لوحة المتصدرين</h1>
        <p className="text-gray-500 text-sm font-cairo">{data ? `${data.week_start} - ${data.week_end}` : ''}</p>
      </div>

      <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
        <button onClick={() => setCategory('Kids')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold font-cairo transition-all ${category === 'Kids' ? 'bg-white shadow text-primary-700' : 'text-gray-500'}`}>👶 الأطفال</button>
        <button onClick={() => setCategory('Adults')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold font-cairo transition-all ${category === 'Adults' ? 'bg-white shadow text-primary-700' : 'text-gray-500'}`}>👨 البالغون</button>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm text-center font-cairo">{error}</div>}

      {loading ? <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div> : (
        <>
          {data?.entries?.slice(0, 3).length > 0 && (
            <div className="card mb-4">
              <div className="flex justify-around items-end gap-2">
                {data.entries[1] && <PodiumItem entry={data.entries[1]} />}
                {data.entries[0] && <PodiumItem entry={data.entries[0]} isFirst />}
                {data.entries[2] && <PodiumItem entry={data.entries[2]} />}
              </div>
            </div>
          )}
          <div className="space-y-2">
            {data?.entries?.length === 0 ? (
              <div className="card text-center py-8"><div className="text-3xl mb-2">📭</div><p className="text-gray-400 font-cairo">لا يوجد متسابقون في هذه الفئة</p></div>
            ) : data?.entries?.map(entry => (
              <div key={entry.user_id} className={`card flex items-center justify-between py-3 ${entry.rank <= 3 ? 'bg-gradient-to-l from-gold-50 to-white border border-gold-200' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold font-cairo ${entry.rank <= 3 ? 'text-lg' : 'bg-gray-100 text-gray-500 text-sm'}`}>
                    {RANK_MEDALS[entry.rank] || `#${entry.rank}`}
                  </div>
                  <div>
                    <div className="font-bold font-cairo">{entry.first_name}</div>
                    <div className="text-xs text-gray-400 font-cairo">{entry.age} سنة - {entry.gender === 'Male' ? 'ذكر' : 'أنثى'}</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-primary-600 font-cairo">{entry.total_points}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Archived Leaderboards */}
      <div className="card">
        <button onClick={() => setShowArchive(!showArchive)} className="w-full flex items-center justify-between font-cairo">
          <span className="font-bold">📚 الأسابيع السابقة</span>
          <span className="text-gray-400">{showArchive ? '▲' : '▼'}</span>
        </button>
        {showArchive && (
          <div className="mt-4 space-y-2">
            {weeks.length === 0 ? <p className="text-gray-400 text-center py-4 text-sm font-cairo">لا توجد أسابيع مؤرشفة بعد</p> : (
              weeks.filter(w => w.category === category).map(w => (
                <div key={`${w.week_start}-${w.category}`}>
                  <button onClick={() => loadArchive(w)} className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 font-cairo text-sm">
                    <span>{w.week_start} - {w.week_end}</span>
                    <span className={`transition-transform ${selectedWeek?.week_start === w.week_start ? 'rotate-180' : ''}`}>▼</span>
                  </button>
                  {selectedWeek?.week_start === w.week_start && archiveData && (
                    <div className="mt-2 space-y-1 pr-4">
                      {archiveData.map((e, i) => (
                        <div key={i} className="flex items-center justify-between p-2 text-sm">
                          <div className="flex items-center gap-2 font-cairo">
                            <span className="text-gray-400">#{e.rank}</span>
                            <span className="font-bold">{e.user_name}</span>
                          </div>
                          <span className="text-primary-600 font-bold">{e.total_points}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function PodiumItem({ entry, isFirst = false }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className={`font-bold font-cairo ${isFirst ? 'text-xl text-gold-600' : 'text-base text-gray-600'}`}>{entry.first_name}</div>
      <div className={`${isFirst ? 'text-4xl' : 'text-3xl'} my-1`}>{RANK_MEDALS[entry.rank]}</div>
      <div className={`font-bold font-cairo ${isFirst ? 'text-2xl text-primary-700' : 'text-lg text-primary-500'}`}>{entry.total_points}</div>
      <div className="text-xs text-gray-400 font-cairo">{entry.age} سنة</div>
    </div>
  )
}
