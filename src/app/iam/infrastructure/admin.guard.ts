import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { tokenRepository } from '../../shared/infrastructure/token-repository'
import { Role } from '../domain/model/role.vo'

interface JwtClaims {
  role: string
  sub:  string
  exp:  number
}

/**
 * Entrada al panel de administración. Con un token de administrador vigente se pasa; con una sesión
 * vigente de otro rol (p. ej. un conductor que escribe /admin/... a mano) se lo devuelve a su área sin
 * cerrarle la sesión; sin sesión vigente se limpia lo local y se va al login de administrador.
 */
export const adminGuard = (
  _to:   RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next:  NavigationGuardNext,
) => {
  const claims = tokenRepository.parseToken<JwtClaims>()
  const now    = Math.floor(Date.now() / 1000)
  const valid  = !!claims && claims.exp > now

  if (valid && claims!.role === Role.ADMIN) {
    next()
  } else if (valid) {
    next('/dashboard')
  } else {
    tokenRepository.clear()
    next('/admin')
  }
}
