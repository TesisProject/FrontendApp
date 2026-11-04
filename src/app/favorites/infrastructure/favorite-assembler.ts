import type { Favorite } from '../domain/model/favorite.model'
import type { ZoneClassification } from '../../parking/domain/model/zone.model'
import type { FavoriteResponse } from './favorite-response'

const KNOWN: readonly string[] = ['LIBRE', 'MODERADO', 'OCUPADO']

export function toFavorite(r: FavoriteResponse): Favorite {
  return {
    userId:         r.userId,
    zoneId:         r.zoneId,
    savedAt:        r.savedAt,
    zoneName:       r.zoneName ?? null,
    // Cualquier otro valor (p. ej. SIN_DATOS) queda en null y la vista muestra "Sin datos".
    classification: r.classification && KNOWN.includes(r.classification)
      ? r.classification as ZoneClassification
      : null,
    available:      r.available ?? null,
    total:          r.total ?? null,
  }
}
