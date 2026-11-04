import type { Zone, ZoneClassification } from '../domain/model/zone.model'
import type { OpeningHoursEntry } from '../domain/model/opening-hours.model'
import type { ZonePhoto } from '../domain/model/zone-photo.model'
import { isIsoDayOfWeek, normalizeTime } from '../domain/opening-hours'
import type { OpeningHoursDto, ZoneResponse, ZonePhotoResponse } from './zone-response'
import type { ZoneAvailabilityResponse } from './availability-response'

/**
 * Fusiona la zona estática (parking) con la disponibilidad viva (vision) en el mismo `Zone` que ya
 * consumen las vistas. Sin disponibilidad (vision caído o zona sin espacios monitoreados) la zona se
 * muestra como libre.
 */
export function toZone(r: ZoneResponse, availability?: ZoneAvailabilityResponse): Zone {
  return {
    id:                  r.id,
    name:                r.name,
    street:              r.street,
    district:            r.district,
    city:                r.city,
    latitude:            r.latitude,
    longitude:           r.longitude,
    totalSpaces:         r.totalSpaces,
    totalCapacity:       r.totalCapacity ?? r.totalSpaces,
    occupiedCount:       availability?.occupied ?? 0,
    freeCount:           availability?.available ?? r.totalSpaces,
    occupancyPercentage: availability?.occupancyPercentage ?? 0,
    classification:      (availability?.classification ?? 'LIBRE') as ZoneClassification,
    openingHours:        toOpeningHours(r.openingHours),
    googlePlaceId:       r.googlePlaceId?.trim() || null,
    photos:              (r.photos ?? []).map(toZonePhoto),
    active:              r.active,
  }
}

/** Descarta los tramos mal formados en lugar de romper la vista; las horas quedan como `HH:mm`. */
export function toOpeningHours(dtos: OpeningHoursDto[] | null | undefined): OpeningHoursEntry[] {
  const entries: OpeningHoursEntry[] = []
  for (const d of dtos ?? []) {
    const opensAt = normalizeTime(d.opensAt)
    const closesAt = normalizeTime(d.closesAt)
    if (!opensAt || !closesAt) continue
    if (d.holiday) entries.push({ dayOfWeek: null, holiday: true, opensAt, closesAt })
    else if (isIsoDayOfWeek(d.dayOfWeek)) entries.push({ dayOfWeek: d.dayOfWeek, holiday: false, opensAt, closesAt })
  }
  return entries
}

export function toZonePhoto(r: ZonePhotoResponse): ZonePhoto {
  return { id: r.id, url: r.url || null }
}
