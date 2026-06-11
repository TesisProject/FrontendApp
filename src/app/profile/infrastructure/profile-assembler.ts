import type { UserProfileResponse, UserPreferencesResponse } from './profile-response'
import type { UserProfile }     from '../domain/model/user-profile.model'
import type { UserPreferences } from '../domain/model/user-preferences.model'

export function toUserProfile(res: UserProfileResponse): UserProfile {
  return {
    userId:    res.userId,
    firstName: res.firstName ?? '',
    lastName:  res.lastName  ?? '',
    phone:     res.phone     ?? '',
    avatarUrl: res.avatarUrl ?? '',
    bio:       res.bio       ?? '',
    isActive:  res.isActive,
    updatedAt: res.updatedAt,
  }
}

export function toUserPreferences(res: UserPreferencesResponse): UserPreferences {
  return {
    userId:             res.userId,
    darkMode:           res.darkMode,
    language:           res.language,
    alertFreeSpace:     res.alertFreeSpace,
    alertSaturated:     res.alertSaturated,
    alertCameraFailure: res.alertCameraFailure,
    alertRadiusM:       res.alertRadiusM,
    updatedAt:          res.updatedAt,
  }
}
