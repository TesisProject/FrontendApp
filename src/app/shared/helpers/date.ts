/** "hace un momento" · "hace 5 min" · "hace 3 h"; pasado un día, la fecha corta (es-PE). */
export function formatRelative(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1)  return 'hace un momento'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  return formatShortDate(iso)
}

/** "28 sept. 2026" */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}
