/** CameraResource — GET /occupancy/cameras (ver API-Frontend.md). */
export interface CameraResponse {
  id:        number
  code:      string
  nodeId:    number | null
  zoneId:    number
  name:      string | null
  location:  string | null
  active:    boolean
  createdAt: string
  updatedAt: string
}
