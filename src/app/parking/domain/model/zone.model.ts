export type ZoneClassification = 'LIBRE' | 'MODERADO' | 'OCUPADO'

export interface Zone {
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
  classification:      ZoneClassification
  active:              boolean
}
