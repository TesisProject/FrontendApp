import type { Role } from './role.vo'

export interface User {
  id: number
  email: string
  role: Role
}
