import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { tokenRepository } from '../../shared/infrastructure/token-repository'
import { useAuthStore } from '../application/auth.store'

export const authGuard = (
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext,
) => {
  if (tokenRepository.isAuthenticated()) {
    useAuthStore().initSession()
    next()
  } else {
    next({ path: '/login', query: { returnUrl: to.fullPath } })
  }
}
