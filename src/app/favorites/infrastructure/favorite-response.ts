export interface FavoriteResponse {
  userId:          number
  zoneId:          number
  savedAt:         string
  zoneName?:       string | null
  classification?: string | null
  available?:      number | null
  total?:          number | null
}
