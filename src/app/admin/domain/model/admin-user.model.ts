export type AdminRole = 'ADMIN' | 'OPERATOR' | 'USER'

export interface AdminUser {
  id:         number
  email:      string
  role:       AdminRole
  active:     boolean
  /** Nombre y apellido del perfil, si los cargó. */
  fullName?:  string | null
  firstName?: string
  lastName?:  string
  createdAt?: string
}
