import { defineStore, getActivePinia } from 'pinia'
import { useAsyncState } from '../../shared/helpers/async-state'
import { AuthApi } from '../infrastructure/auth-api'
import { toAuthToken } from '../infrastructure/auth-assembler'
import { recoverySession } from '../infrastructure/recovery-session'
import { tokenRepository } from '../../shared/infrastructure/token-repository'
import { resetStores } from '../../shared/application/reset-stores'
import { useThemeStore } from '../../shared/application/theme.store'
import { useProfileStore } from '../../profile/application/profile.store'
import { Role } from '../domain/model/role.vo'
import type { User } from '../domain/model/user.model'
import type { SignUpRequest } from '../infrastructure/auth-response'
import { authErrorMessage, isOtpExpired } from './auth-error-messages'

const authApi = new AuthApi()

/** Stores que sobreviven al cierre de sesión: el propio auth y el tema (que se reinicia aparte). */
const STORES_KEPT_ON_LOGOUT = ['auth', 'theme'] as const

export const useAuthStore = defineStore('auth', () => {
  const loginState    = useAsyncState<User | null>(null)
  const registerState = useAsyncState<null>(null)
  const recoveryState = useAsyncState<null>(null)

  function startSession(token: string, user: User) {
    tokenRepository.save(token)
    tokenRepository.saveUser(user)
    loginState.setData(user)
    // HU-30: la preferencia de modo oscuro es de la cuenta, no del navegador.
    if (user.role === Role.USER) void useProfileStore().applyAccountTheme(user.id)
  }

  async function login(email: string, password: string): Promise<boolean> {
    loginState.setLoading()
    try {
      const response  = await authApi.signIn({ email, password })
      const authToken = toAuthToken(response)
      startSession(authToken.token, authToken.user)
      return true
    } catch (err) {
      loginState.setError(authErrorMessage(err, 'No se pudo iniciar sesión. Inténtalo de nuevo.'))
      return false
    }
  }

  async function register(payload: SignUpRequest): Promise<boolean> {
    registerState.setLoading()
    try {
      const response  = await authApi.signUp(payload)
      const authToken = toAuthToken(response)
      // mantener la sesión iniciada para entrar directo al dashboard
      startSession(authToken.token, authToken.user)
      registerState.setData(null)
      return true
    } catch (err) {
      tokenRepository.clear()
      registerState.setError(authErrorMessage(err, 'No se pudo crear la cuenta. Inténtalo de nuevo.'))
      return false
    }
  }

  async function adminLogin(email: string, password: string): Promise<boolean> {
    loginState.setLoading()
    try {
      const response = await authApi.signIn({ email, password })
      if (response.role !== Role.ADMIN) {
        loginState.setError('Acceso no autorizado')
        return false
      }
      const authToken = toAuthToken(response)
      startSession(authToken.token, authToken.user)
      return true
    } catch (err) {
      loginState.setError(authErrorMessage(err, 'No se pudo iniciar sesión. Inténtalo de nuevo.'))
      return false
    }
  }

  /**
   * Pide el código de recuperación. El backend responde igual exista o no el correo (HU-03), así
   * que aquí siempre se avanza a la pantalla del código con el mismo mensaje genérico.
   */
  async function forgotPassword(email: string): Promise<boolean> {
    recoveryState.setLoading()
    try {
      await authApi.forgotPassword(email)
      recoverySession.start(email)
      recoveryState.setData(null)
      return true
    } catch (err) {
      recoveryState.setError(authErrorMessage(err, 'No se pudo enviar el código. Inténtalo de nuevo.'))
      return false
    }
  }

  /** Resultado de verificar o usar un código: `expired` = hay que pedir uno nuevo. */
  type CodeResult = 'ok' | 'invalid' | 'expired'

  async function verifyOtp(email: string, code: string): Promise<CodeResult> {
    recoveryState.setLoading()
    try {
      await authApi.verifyOtp(email, code)
      recoverySession.saveCode(code)
      recoveryState.setData(null)
      return 'ok'
    } catch (err) {
      recoveryState.setError(authErrorMessage(err, 'No se pudo verificar el código.'))
      if (isOtpExpired(err)) {
        recoverySession.clearCode()
        return 'expired'
      }
      return 'invalid'
    }
  }

  async function resetPassword(email: string, code: string, newPassword: string): Promise<CodeResult> {
    recoveryState.setLoading()
    try {
      await authApi.resetPassword(email, code, newPassword)
      recoverySession.clear()
      recoveryState.setData(null)
      return 'ok'
    } catch (err) {
      recoveryState.setError(authErrorMessage(err, 'No se pudo actualizar la contraseña.'))
      if (isOtpExpired(err)) {
        recoverySession.clearCode()
        return 'expired'
      }
      return 'invalid'
    }
  }

  function clearRecoveryError() {
    recoveryState.setData(null)
  }

  function initSession(): void {
    if (loginState.data.value) return
    const user = tokenRepository.getUser<User>()
    if (!user) return
    loginState.setData(user)
    if (user.role === Role.USER) void useProfileStore().applyAccountTheme(user.id)
  }

  /** Borra todo lo local de la sesión: token, usuario, stores y caché del tema. */
  function clearLocalSession(): void {
    tokenRepository.clear()
    loginState.reset()
    const pinia = getActivePinia()
    if (pinia) resetStores(pinia, STORES_KEPT_ON_LOGOUT)
    useThemeStore().forget()
  }

  /**
   * Cierra la sesión (HU-05): limpia lo local al instante y revoca el token en el backend con
   * `sign-out`. Lo local se borra antes de esperar la respuesta para que un backend caído no deje la
   * sesión abierta en el dispositivo; si la revocación falla, el token vence solo a las 24 h.
   */
  async function logout(): Promise<void> {
    const token = tokenRepository.getAccessToken()
    clearLocalSession()
    if (!token) return
    try {
      await authApi.signOut(token)
    } catch {
      // 401 = ya estaba vencido o revocado; cualquier otro fallo no impide salir.
    }
  }

  return {
    user:            loginState.data,
    loginLoading:    loginState.loading,
    loginError:      loginState.error,
    registerLoading: registerState.loading,
    registerError:   registerState.error,
    recoveryLoading: recoveryState.loading,
    recoveryError:   recoveryState.error,
    login,
    adminLogin,
    register,
    forgotPassword,
    verifyOtp,
    resetPassword,
    clearRecoveryError,
    logout,
    clearLocalSession,
    initSession,
  }
})
