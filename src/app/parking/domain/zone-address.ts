import { UNKNOWN_TEXT } from '../../shared/helpers/text'

/** "Calle, Distrito · Ciudad" sin las partes vacías; "Sin información" si no hay ninguna. */
export function formatZoneAddress(z: { street?: string | null; district?: string | null; city?: string | null }): string {
  const clean = (v?: string | null) => v?.trim() || ''
  const local = [clean(z.street), clean(z.district)].filter(Boolean).join(', ')
  const full = [local, clean(z.city)].filter(Boolean).join(' · ')
  return full || UNKNOWN_TEXT
}
