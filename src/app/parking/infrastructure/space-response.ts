export interface SpaceResponse {
  id:            number
  zoneId:        number
  spaceNumber:   string
  currentStatus: 'FREE' | 'OCCUPIED'
  createdAt:     string
  updatedAt:     string
}
