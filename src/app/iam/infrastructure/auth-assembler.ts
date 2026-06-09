import { Role } from '../domain/model/role.vo'
import type { AuthToken } from '../domain/model/auth-token.model'
import type { SignInResponse } from './auth-response'

export function parseRole(value?: string): Role {
  const upper = (value ?? '').toUpperCase() as Role
  return Object.values(Role).includes(upper) ? upper : Role.USER
}

export function toAuthToken(response: SignInResponse): AuthToken {
  return {
    token: response.token,
    user: {
      id: response.userId,
      email: response.email ?? '',
      role: parseRole(response.role),
    },
  }
}
