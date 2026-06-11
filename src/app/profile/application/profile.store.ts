import { defineStore } from 'pinia'
import { useAsyncState } from '../../shared/helpers/async-state'
import { ProfileApi } from '../infrastructure/profile-api'
import { toUserProfile, toUserPreferences } from '../infrastructure/profile-assembler'
import type { UserProfile }     from '../domain/model/user-profile.model'
import type { UserPreferences } from '../domain/model/user-preferences.model'
import type { UpdateProfileRequest, UpdatePreferencesRequest } from '../infrastructure/profile-response'

const profileApi = new ProfileApi()

export const useProfileStore = defineStore('profile', () => {
  const profileState     = useAsyncState<UserProfile | null>(null)
  const preferencesState = useAsyncState<UserPreferences | null>(null)
  const saveState        = useAsyncState<null>(null)

  async function fetchProfile(userId: number): Promise<void> {
    profileState.setLoading()
    try {
      const res = await profileApi.getProfile(userId)
      profileState.setData(toUserProfile(res))
    } catch (err: any) {
      profileState.setError(err?.message ?? 'Error al cargar perfil')
    }
  }

  async function fetchPreferences(userId: number): Promise<void> {
    preferencesState.setLoading()
    try {
      const res = await profileApi.getPreferences(userId)
      preferencesState.setData(toUserPreferences(res))
    } catch (err: any) {
      preferencesState.setError(err?.message ?? 'Error al cargar preferencias')
    }
  }

  async function updateProfile(userId: number, payload: UpdateProfileRequest): Promise<boolean> {
    saveState.setLoading()
    try {
      const res = await profileApi.updateProfile(userId, payload)
      profileState.setData(toUserProfile(res))
      saveState.setData(null)
      return true
    } catch (err: any) {
      saveState.setError(err?.message ?? 'Error al guardar perfil')
      return false
    }
  }

  async function updatePreferences(userId: number, payload: UpdatePreferencesRequest): Promise<boolean> {
    saveState.setLoading()
    try {
      const res = await profileApi.updatePreferences(userId, payload)
      preferencesState.setData(toUserPreferences(res))
      saveState.setData(null)
      return true
    } catch (err: any) {
      saveState.setError(err?.message ?? 'Error al guardar preferencias')
      return false
    }
  }

  return {
    profile:        profileState.data,
    profileLoading: profileState.loading,
    profileError:   profileState.error,
    preferences:    preferencesState.data,
    prefsLoading:   preferencesState.loading,
    prefsError:     preferencesState.error,
    saving:         saveState.loading,
    saveError:      saveState.error,
    fetchProfile,
    fetchPreferences,
    updateProfile,
    updatePreferences,
  }
})
