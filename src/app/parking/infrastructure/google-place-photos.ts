import { loadGoogleMaps } from '../../shared/infrastructure/maps-loader'
import type { GooglePlacePhoto } from '../domain/model/zone-photo.model'

/** Fotos de Google que se muestran como máximo (cada `getURI` cuenta como una petición facturable). */
export const GOOGLE_PHOTOS_MAX = 6

/** Lo mínimo de `google.maps.places.Photo` que se usa; permite pasar fotos ya obtenidas del autocompletado. */
interface PlacePhotoLike {
  getURI(options?: { maxWidth?: number; maxHeight?: number }): string
  authorAttributions?: { displayName: string; uri: string | null }[]
}

export function toGooglePlacePhotos(
  photos: readonly PlacePhotoLike[] | null | undefined,
  { max = GOOGLE_PHOTOS_MAX, maxWidth = 800 }: { max?: number; maxWidth?: number } = {},
): GooglePlacePhoto[] {
  return (photos ?? []).slice(0, max).map((p) => ({
    url: p.getURI({ maxWidth }),
    attributions: (p.authorAttributions ?? []).map((a) => ({ name: a.displayName, uri: a.uri || null })),
  }))
}

/**
 * Fotos de un lugar de Google Places. Se piden cada vez (los ToS de Google no permiten guardarlas)
 * y nunca lanzan: sin clave, sin red o con un placeId inválido devuelven `[]`.
 */
export async function fetchGooglePlacePhotos(
  placeId: string | null | undefined,
  options?: { max?: number; maxWidth?: number },
): Promise<GooglePlacePhoto[]> {
  if (!placeId) return []
  try {
    await loadGoogleMaps()
    const { Place } = (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary
    const place = new Place({ id: placeId })
    await place.fetchFields({ fields: ['photos'] })
    return toGooglePlacePhotos(place.photos, options)
  } catch {
    return []
  }
}
