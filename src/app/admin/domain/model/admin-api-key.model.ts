/** Rol de sistema que concede una API key: nodo Fog o prediction-engine. */
export type ApiKeyRole = 'FOG' | 'PREDICTION'

export const API_KEY_ROLE_LABEL: Record<ApiKeyRole, string> = {
  FOG:        'Nodo Fog',
  PREDICTION: 'Prediction engine',
}

export interface AdminApiKey {
  id:         number
  keyId:      string
  name:       string
  role:       ApiKeyRole
  nodeId:     number | null
  active:     boolean
  expiresAt:  string | null
  lastUsedAt: string | null
  createdAt:  string
}

export interface AdminApiKeyForm {
  name:      string
  role:      ApiKeyRole
  /** Obligatorio con `FOG`; se ignora con `PREDICTION`. */
  nodeId:    number | ''
  expiresAt: string // datetime-local; vacío = sin expiración
}
