import { httpClient } from '../../shared/infrastructure/http-client'
import type { SignInRequest, SignInResponse, SignUpRequest } from './auth-response'

export class AuthApi {
  private base = '/iam'

  signIn(credentials: SignInRequest): Promise<SignInResponse> {
    return httpClient.post<SignInResponse>(`${this.base}/auth/sign-in`, credentials, { skipAuth: true })
  }

  signUp(payload: SignUpRequest): Promise<SignInResponse> {
    return httpClient.post<SignInResponse>(`${this.base}/auth/sign-up`, payload, { skipAuth: true })
  }

  forgotPassword(email: string): Promise<void> {
    return httpClient.post<void>(`${this.base}/auth/forgot-password`, { email }, { skipAuth: true })
  }

  verifyOtp(email: string, code: string): Promise<void> {
    return httpClient.post<void>(`${this.base}/auth/verify-otp`, { email, otp: code }, { skipAuth: true })
  }

  resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    return httpClient.post<void>(`${this.base}/auth/reset-password`, { email, otp: code, newPassword }, { skipAuth: true })
  }
}
