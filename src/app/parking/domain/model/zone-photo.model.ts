/** Foto subida por el administrador (R2). `url` es presignada y vence; `null` si R2 no está configurado. */
export interface ZonePhoto {
  id:  string
  url: string | null
}

/** Autor de una foto de Google Places: Google exige mostrarlo junto a la foto. */
export interface PhotoAttribution {
  name: string
  uri:  string | null
}

/** Foto de Google Places, resuelta en el navegador (los ToS no permiten guardarla). */
export interface GooglePlacePhoto {
  url:          string
  attributions: PhotoAttribution[]
}
