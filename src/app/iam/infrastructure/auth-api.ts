import { httpClient } from '../../shared/infrastructure/http-client'
import type { SignInRequest, SignInResponse, RegisterRequest } from './auth-response'

export class AuthApi {
  private base = '/iam'

  signIn(credentials: SignInRequest): Promise<SignInResponse> {
    return httpClient.post<SignInResponse>(`${this.base}/auth/sign-in`, credentials)
  }

  register(payload: RegisterRequest): Promise<void> {
    return httpClient.post<void>(`${this.base}/users`, payload)
  }

  forgotPassword(email: string): Promise<void> {
    return httpClient.post<void>(`${this.base}/auth/forgot-password`, { email })
  }

  verifyOtp(email: string, code: string): Promise<void> {
    return httpClient.post<void>(`${this.base}/auth/verify-otp`, { email, code })
  }

  resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    return httpClient.post<void>(`${this.base}/auth/reset-password`, { email, code, newPassword })
  }
}
