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
  active:        boolean
}
