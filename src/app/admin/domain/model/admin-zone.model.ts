export interface AdminZone {
  id:                  number
  name:                string
  street:              string
  district:            string
  city:                string
  latitude:            number
  longitude:           number
  totalSpaces:         number
  occupiedCount:       number
  freeCount:           number
  occupancyPercentage: number
  classification:      string
  active:              boolean
}

export interface AdminZoneForm {
  name:          string
  street:        string
  district:      string
  city:          string
  latitude:      number
  longitude:     number
  totalSpaces:   number
  totalCapacity: number
}
