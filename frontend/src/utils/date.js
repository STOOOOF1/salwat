export const fmtHijri = (dateStr, withTime = true) => {
  const d = new Date(dateStr)
  const date = d.toLocaleDateString('ar-SA-u-ca-islamic', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  if (!withTime) return date
  const time = d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
  return `${date} ${time}`
}

export const fmtTime = (dateStr) => {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
}