import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { tokenRepository } from '../../shared/infrastructure/token-repository'
import { Role } from '../domain/model/role.vo'

interface JwtClaims {
  role: string
  sub:  string
  exp:  number
}

export const adminGuard = (
  _to:   RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next:  NavigationGuardNext,
) => {
  const claims = tokenRepository.parseToken<JwtClaims>()
  const now    = Math.floor(Date.now() / 1000)

  if (claims && claims.role === Role.ADMIN && claims.exp > now) {
    next()
  } else {
    tokenRepository.clear()
    next('/admin')
  }
}
