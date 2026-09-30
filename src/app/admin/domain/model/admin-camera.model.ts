export interface AdminCamera {
  id:       number
  code:     string
  nodeId:   number | null
  zoneId:   number
  name:     string
  location: string
  active:   boolean
}

export interface AdminCameraForm {
  zoneId:   number | ''
  nodeId:   number | ''
  name:     string
  location: string
  active:   boolean
}
