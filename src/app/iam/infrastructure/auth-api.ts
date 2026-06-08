import { httpClient } from '../../shared/infrastructure/http-client'
import type { SignInRequest, SignInResponse, RegisterRequest, RegisterResponse, UpdateProfileRequest } from './auth-response'

export class AuthApi {
  private base = '/iam'

  signIn(credentials: SignInRequest): Promise<SignInResponse> {
    return httpClient.post<SignInResponse>(`${this.base}/auth/sign-in`, credentials, { skipAuth: true })
  }

  register(payload: RegisterRequest): Promise<RegisterResponse> {
    return httpClient.post<RegisterResponse>(`${this.base}/users`, payload, { skipAuth: true })
  }

  updateProfile(userId: number, payload: UpdateProfileRequest): Promise<void> {
    return httpClient.put<void>(`${this.base}/users/${userId}/profile`, payload)
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
