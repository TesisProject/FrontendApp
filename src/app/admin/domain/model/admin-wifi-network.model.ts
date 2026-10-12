/** Red WiFi de un nodo Fog. La contraseña es de solo escritura: nunca llega al cliente. */
export interface AdminWifiNetwork {
  id:                number
  nodeId:            number
  ssid:              string
  /** Cámaras que apuntan a esta red; con alguna, no se puede borrar. */
  cameraCount:       number
  passwordUpdatedAt: string | null
}

/** Alta o edición. Al editar, `password` vacío = conservar la actual. */
export interface AdminWifiNetworkForm {
  ssid:     string
  password: string
}
