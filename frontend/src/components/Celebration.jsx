import { useEffect, useState } from 'react'

export default function Celebration({ show, message, onClose }) {
  const [particles, setParticles] = useState([])

  useEffect(() => {
    if (!show) {
      setParticles([])
      return
    }
    const items = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 1 + Math.random() * 2,
      emoji: ['🎉', '⭐', '🌟', '💫', '🎊', '🏆'][Math.floor(Math.random() * 6)],
    }))
    setParticles(items)

    const timer = setTimeout(() => {
      onClose?.()
    }, 4000)

    return () => clearTimeout(timer)
  }, [show])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      {/* Particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute text-3xl animate-bounce"
          style={{
            left: `${p.left}%`,
            top: '-5%',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        >
          {p.emoji}
        </div>
      ))}
      {/* Message */}
      <div className="bg-white/95 rounded-3xl shadow-2xl p-8 text-center pointer-events-auto animate-pulse">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-primary-700 font-cairo mb-2">
          {message || 'أحسنت! 🎉'}
        </h2>
        <p className="text-gray-500 font-cairo">استمر في الصلاة يا بطل!</p>
      </div>
    </div>
  )
}
