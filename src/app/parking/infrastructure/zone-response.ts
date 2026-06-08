export interface ZoneResponse {
  id:                  number
  name:                string
  street:              string
  district:            string
  city:                string
  latitude:            number
  longitude:           number
  totalSpaces:         number
  totalCapacity:       number
  active:              boolean
  occupiedCount:       number
  freeCount:           number
  occupancyPercentage: number
  classification:      string
}
