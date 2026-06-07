import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { tokenRepository } from '../../shared/infrastructure/token-repository'

export const authGuard = (
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext,
) => {
  if (tokenRepository.isAuthenticated()) {
    next()
  } else {
    next({ path: '/login', query: { returnUrl: to.fullPath } })
  }
}
