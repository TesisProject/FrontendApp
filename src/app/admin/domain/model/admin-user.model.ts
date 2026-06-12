export type AdminRole = 'ADMIN' | 'OPERATOR' | 'USER'

export interface AdminUser {
  id:         number
  email:      string
  role:       AdminRole
  active:     boolean
  firstName?: string
  lastName?:  string
  createdAt?: string
}
