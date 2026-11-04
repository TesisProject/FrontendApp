/** OpeningHoursResource — `dayOfWeek` ISO (1 = lunes … 7 = domingo) o `null` con `holiday = true`. */
export interface OpeningHoursDto {
  dayOfWeek: number | null
  holiday:   boolean
  opensAt:   string
  closesAt:  string
}

/** ZonePhotoResource — foto subida; `url` presignada (vence a los `expiresInSeconds`), `null` sin R2. */
export interface ZonePhotoResponse {
  id:               string
  url:              string | null
  expiresInSeconds: number
}

/** Zona estática del catálogo de parking (el "límite"). La disponibilidad viva viene de vision. */
export interface ZoneResponse {
  id:            number
  name:          string
  street:        string
  district:      string
  city:          string
  latitude:      number
  longitude:     number
  totalSpaces:   number
  totalCapacity: number
  /** `[]` = sin información. */
  openingHours?:  OpeningHoursDto[] | null
  googlePlaceId?: string | null
  photos?:        ZonePhotoResponse[] | null
  active:        boolean
}
