import { httpClient } from '../../shared/infrastructure/http-client'
import type {
  UserProfileResponse,
  UserPreferencesResponse,
  UpdateProfileRequest,
  UpdatePreferencesRequest,
} from './profile-response'

export class ProfileApi {
  private base = '/iam'

  getProfile(userId: number): Promise<UserProfileResponse> {
    return httpClient.get<UserProfileResponse>(`${this.base}/users/${userId}/profile`)
  }

  updateProfile(userId: number, payload: UpdateProfileRequest): Promise<UserProfileResponse> {
    return httpClient.put<UserProfileResponse>(`${this.base}/users/${userId}/profile`, payload)
  }

  /** Sube la foto de perfil a R2 (JPEG, PNG o WebP, máx. 2 MB). Devuelve el perfil con la URL nueva. */
  uploadAvatar(userId: number, file: File): Promise<UserProfileResponse> {
    const form = new FormData()
    form.append('file', file)
    return httpClient.postForm<UserProfileResponse>(`${this.base}/users/${userId}/avatar`, form)
  }

  removeAvatar(userId: number): Promise<UserProfileResponse> {
    return httpClient.delete<UserProfileResponse>(`${this.base}/users/${userId}/avatar`)
  }

  getPreferences(userId: number): Promise<UserPreferencesResponse> {
    return httpClient.get<UserPreferencesResponse>(`${this.base}/users/${userId}/preferences`)
  }

  updatePreferences(userId: number, payload: UpdatePreferencesRequest): Promise<UserPreferencesResponse> {
    return httpClient.put<UserPreferencesResponse>(`${this.base}/users/${userId}/preferences`, payload)
  }
}
