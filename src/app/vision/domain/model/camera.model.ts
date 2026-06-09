export type CameraStatus = 'ACTIVE' | 'INACTIVE' | 'ERROR'

export interface Camera {
  id:        string
  zoneId:    string
  ipAddress: string
  status:    CameraStatus
}
