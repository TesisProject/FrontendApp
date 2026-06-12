export type CameraStatus = 'ACTIVE' | 'INACTIVE' | 'ERROR'

export interface AdminCamera {
  id:               number
  zoneId:           number
  zoneName?:        string
  name:             string
  streamUrl:        string
  status:           CameraStatus
  resolution?:      string
  fps?:             number
  detectorVersion?: string
}

export interface AdminCameraForm {
  zoneId:           number | ''
  name:             string
  streamUrl:        string
  resolution:       string
  fps:              number | ''
  detectorVersion:  string
}
