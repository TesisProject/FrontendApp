import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAsyncState } from '../../shared/helpers/async-state'
import { errorCode } from '../../shared/infrastructure/http-client'
import { useThemeStore } from '../../shared/application/theme.store'
import { validationFieldErrors } from '../../shared/helpers/api-errors'
import { ProfileApi } from '../infrastructure/profile-api'
import { toUserProfile, toUserPreferences } from '../infrastructure/profile-assembler'
import type { UserProfile }     from '../domain/model/user-profile.model'
import type { UserPreferences } from '../domain/model/user-preferences.model'
import type { UpdateProfileRequest, UpdatePreferencesRequest } from '../infrastructure/profile-response'

const profileApi = new ProfileApi()

const PROFILE_FIELDS = ['firstName', 'lastName', 'phone', 'bio'] as const
export type ProfileField = typeof PROFILE_FIELDS[number]

const AVATAR_ERRORS: Record<string, string> = {
  INVALID_AVATAR:             'La foto debe ser JPG, PNG o WebP de hasta 2 MB.',
  FILE_TOO_LARGE:             'La foto supera el tamaño máximo permitido.',
  AVATAR_STORAGE_UNAVAILABLE: 'No se pudo guardar la foto en este momento. Inténtalo más tarde.',
}

export const useProfileStore = defineStore('profile', () => {
  const profileState     = useAsyncState<UserProfile | null>(null)
  const preferencesState = useAsyncState<UserPreferences | null>(null)
  const saveState        = useAsyncState<null>(null)
  /** Error por campo del último guardado del perfil, tal como lo validó el backend (HU-04). */
  const fieldErrors      = ref<Partial<Record<ProfileField, string>>>({})
  const avatarUploading  = ref(false)

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
    fieldErrors.value = {}
    try {
      const res = await profileApi.updateProfile(userId, payload)
      profileState.setData(toUserProfile(res))
      saveState.setData(null)
      return true
    } catch (err: any) {
      fieldErrors.value = validationFieldErrors(err, PROFILE_FIELDS)
      saveState.setError(Object.keys(fieldErrors.value).length
        ? 'Revisa los campos marcados.'
        : 'No se pudieron guardar los cambios. Inténtalo de nuevo.')
      return false
    }
  }

  /** Sube la foto y actualiza el perfil con la URL nueva. Devuelve el mensaje de error o null. */
  async function uploadAvatar(userId: number, file: File): Promise<string | null> {
    avatarUploading.value = true
    try {
      const res = await profileApi.uploadAvatar(userId, file)
      profileState.setData(toUserProfile(res))
      return null
    } catch (err) {
      return AVATAR_ERRORS[errorCode(err) ?? ''] ?? 'No se pudo subir la foto.'
    } finally {
      avatarUploading.value = false
    }
  }

  async function removeAvatar(userId: number): Promise<string | null> {
    avatarUploading.value = true
    try {
      const res = await profileApi.removeAvatar(userId)
      profileState.setData(toUserProfile(res))
      return null
    } catch {
      return 'No se pudo quitar la foto.'
    } finally {
      avatarUploading.value = false
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

  /**
   * Trae la preferencia de modo oscuro de la cuenta y la aplica (HU-30). Se llama al iniciar sesión
   * y al reabrir la app con sesión, así un cambio hecho en otro dispositivo se ve aquí.
   */
  async function applyAccountTheme(userId: number): Promise<void> {
    await fetchPreferences(userId)
    const prefs = preferencesState.data.value
    if (prefs) useThemeStore().setDark(prefs.darkMode)
  }

  /**
   * Aplica el modo oscuro al instante y lo guarda en la cuenta. Si el backend falla, vuelve al
   * valor anterior para que la pantalla no muestre algo que no quedó guardado.
   */
  async function saveDarkMode(userId: number, dark: boolean): Promise<boolean> {
    const theme    = useThemeStore()
    const previous = theme.isDark
    theme.setDark(dark)
    try {
      if (!preferencesState.data.value) await fetchPreferences(userId)
      const saved = preferencesState.data.value
      const res = await profileApi.updatePreferences(userId, {
        darkMode:           dark,
        language:           saved?.language ?? 'es',
        alertFreeSpace:     saved?.alertFreeSpace ?? false,
        alertSaturated:     saved?.alertSaturated ?? false,
        alertCameraFailure: saved?.alertCameraFailure ?? false,
        alertRadiusM:       saved?.alertRadiusM ?? 0,
      })
      preferencesState.setData(toUserPreferences(res))
      return true
    } catch {
      theme.setDark(previous)
      return false
    }
  }

  function clearFieldError(field: ProfileField) {
    if (!fieldErrors.value[field]) return
    const next = { ...fieldErrors.value }
    delete next[field]
    fieldErrors.value = next
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
    fieldErrors,
    avatarUploading,
    fetchProfile,
    fetchPreferences,
    updateProfile,
    uploadAvatar,
    removeAvatar,
    updatePreferences,
    applyAccountTheme,
    saveDarkMode,
    clearFieldError,
  }
})
