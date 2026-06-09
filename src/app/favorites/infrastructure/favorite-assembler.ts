import type { Favorite } from '../domain/model/favorite.model'
import type { FavoriteResponse } from './favorite-response'

export function toFavorite(r: FavoriteResponse): Favorite {
  return {
    userId:  r.userId,
    zoneId:  r.zoneId,
    savedAt: r.savedAt,
  }
}
