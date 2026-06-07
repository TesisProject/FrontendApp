import { defineStore } from 'pinia'
import { useAsyncState } from '../../shared/helpers/async-state'
import { AuthApi } from '../infrastructure/auth-api'
import { toAuthToken } from '../infrastructure/auth-assembler'
import { tokenRepository } from '../../shared/infrastructure/token-repository'
import type { User } from '../domain/model/user.model'

const authApi = new AuthApi()

export const useAuthStore = defineStore('auth', () => {
  const loginState    = useAsyncState<User | null>(null)
  const registerState = useAsyncState<null>(null)
  const recoveryState = useAsyncState<null>(null)

  async function login(email: string, password: string): Promise<boolean> {
    loginState.setLoading()
    try {
      const response  = await authApi.signIn({ email, password })
      const authToken = toAuthToken(response)
      tokenRepository.save(authToken.token)
      loginState.setData(authToken.user)
      return true
    } catch (err: any) {
      loginState.setError(err?.message ?? 'Credenciales incorrectas')
      return false
    }
  }

  async function register(email: string, password: string): Promise<boolean> {
    registerState.setLoading()
    try {
      await authApi.register({ email, password, roleName: 'USER' })
      registerState.setData(null)
      return true
    } catch (err: any) {
      registerState.setError(err?.message ?? 'Error al registrar usuario')
      return false
    }
  }

  async function forgotPassword(email: string): Promise<boolean> {
    recoveryState.setLoading()
    try {
      await authApi.forgotPassword(email)
      recoveryState.setData(null)
      return true
    } catch (err: any) {
      recoveryState.setError(err?.message ?? 'Error al enviar código')
      return false
    }
  }

  async function verifyOtp(email: string, code: string): Promise<boolean> {
    recoveryState.setLoading()
    try {
      await authApi.verifyOtp(email, code)
      recoveryState.setData(null)
      return true
    } catch (err: any) {
      recoveryState.setError(err?.message ?? 'Código incorrecto')
      return false
    }
  }

  async function resetPassword(email: string, code: string, newPassword: string): Promise<boolean> {
    recoveryState.setLoading()
    try {
      await authApi.resetPassword(email, code, newPassword)
      recoveryState.setData(null)
      return true
    } catch (err: any) {
      recoveryState.setError(err?.message ?? 'Error al actualizar contraseña')
      return false
    }
  }

  function logout(): void {
    tokenRepository.clear()
    loginState.reset()
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
    register,
    forgotPassword,
    verifyOtp,
    resetPassword,
    logout,
  }
})
