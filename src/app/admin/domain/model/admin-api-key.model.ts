export interface AdminApiKey {
  id:         number
  keyId:      string
  name:       string
  nodeId:     number | null
  active:     boolean
  expiresAt:  string | null
  lastUsedAt: string | null
  createdAt:  string
}

export interface AdminApiKeyForm {
  name:      string
  nodeId:    number | ''
  expiresAt: string // datetime-local; vacío = sin expiración
}
