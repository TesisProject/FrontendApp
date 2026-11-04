export interface UserProfileResponse {
  userId:    number
  firstName: string
  lastName:  string
  phone:     string
  isActive:  boolean
  avatarUrl: string
  bio:       string
  updatedAt: string
}

export interface UserPreferencesResponse {
  userId:             number
  darkMode:           boolean
  language:           string
  alertFreeSpace:     boolean
  alertSaturated:     boolean
  alertCameraFailure: boolean
  alertRadiusM:       number
  updatedAt:          string
}

/** La foto no va aquí: se sube aparte con `POST /iam/users/{id}/avatar` (HU-04). */
export interface UpdateProfileRequest {
  firstName: string
  lastName:  string
  phone:     string
  bio:       string
}

export interface UpdatePreferencesRequest {
  darkMode:           boolean
  language:           string
  alertFreeSpace:     boolean
  alertSaturated:     boolean
  alertCameraFailure: boolean
  alertRadiusM:       number
}
