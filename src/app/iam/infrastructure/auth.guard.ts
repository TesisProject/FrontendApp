import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { tokenRepository } from '../../shared/infrastructure/token-repository'
import { useAuthStore } from '../application/auth.store'

/**
 * Entrada al área del usuario. Exige un token presente y vigente (`exp`, HU-05): un token vencido
 * se trata como sesión cerrada, se borra todo lo local y se lleva a login.
 */
export const authGuard = (
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext,
) => {
  if (tokenRepository.isAuthenticated()) {
    useAuthStore().initSession()
    next()
  } else {
    useAuthStore().clearLocalSession()
    next({ path: '/login', query: { returnUrl: to.fullPath } })
  }
}

/**
 * Guard global para la navegación DENTRO de un área protegida. El `beforeEnter` de `/dashboard` y
 * `/admin` solo corre al entrar desde fuera; entre pantallas hijas (o con el botón "atrás" después
 * de que el token venció) no vuelve a correr. Este guard revisa la sesión en cada navegación hacia
 * una ruta de superficie `user` o `admin` (HU-05 E2).
 */
export const sessionGuard = (to: RouteLocationNormalized) => {
  const surface = to.meta.surface
  const isProtected = surface === 'user' || (surface === 'admin' && to.path !== '/admin')
  if (!isProtected || tokenRepository.isAuthenticated()) return true
  useAuthStore().clearLocalSession()
  return surface === 'admin'
    ? { path: '/admin' }
    : { path: '/login', query: { returnUrl: to.fullPath } }
}

/**
 * El navegador puede restaurar la página desde la caché de atrás/adelante (bfcache) sin ejecutar
 * el router: después de cerrar sesión, "atrás" mostraría la pantalla anterior tal cual. Si la página
 * vuelve así y ya no hay sesión, se recarga para que pasen los guards.
 */
export function reloadRestoredPagesWithoutSession(): void {
  window.addEventListener('pageshow', (event) => {
    const path = window.location.pathname
    const protectedPath = path.startsWith('/dashboard') || (path.startsWith('/admin/'))
    if (event.persisted && protectedPath && !tokenRepository.isAuthenticated()) {
      window.location.reload()
    }
  })
}
