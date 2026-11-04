import { z } from 'zod'

/**
 * Reglas del formulario de perfil (HU-04): las mismas que valida el backend en
 * `UpdateUserProfileRequest`. Vacío = sin dato (el backend lo guarda como null).
 */
export const profileFormSchema = z.object({
  firstName: z.string().trim().min(2, 'Debe tener entre 2 y 100 caracteres').max(100, 'Debe tener entre 2 y 100 caracteres'),
  lastName:  z.string().trim().min(2, 'Debe tener entre 2 y 100 caracteres').max(100, 'Debe tener entre 2 y 100 caracteres'),
  phone:     z.string().trim().refine(v => v === '' || /^\+?\d{6,15}$/.test(v.replace(/[\s-]/g, '')), {
    message: 'Ingresa de 6 a 15 dígitos, con + opcional',
  }),
  bio:       z.string().max(500, 'Máximo 500 caracteres'),
})

export type ProfileForm = z.infer<typeof profileFormSchema>
export type ProfileFormField = keyof ProfileForm

/** Errores por campo; cada campo se valida por separado para no tocar los demás. */
export function validateProfileForm(form: ProfileForm): Partial<Record<ProfileFormField, string>> {
  const result = profileFormSchema.safeParse(form)
  if (result.success) return {}
  const errors: Partial<Record<ProfileFormField, string>> = {}
  for (const issue of result.error.issues) {
    const field = issue.path[0] as ProfileFormField
    errors[field] ??= issue.message
  }
  return errors
}

/** Datos a enviar: sin espacios ni guiones en el teléfono. */
export function toProfilePayload(form: ProfileForm): ProfileForm {
  return {
    firstName: form.firstName.trim(),
    lastName:  form.lastName.trim(),
    phone:     form.phone.replace(/[\s-]/g, ''),
    bio:       form.bio,
  }
}

/** Hay cambios sin guardar respecto de lo cargado. */
export function isProfileFormDirty(form: ProfileForm, saved: ProfileForm): boolean {
  return (Object.keys(saved) as ProfileFormField[]).some(k => form[k] !== saved[k])
}

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

/** Comprobación previa de la foto antes de subirla; el backend vuelve a validar por la firma. */
export function avatarFileError(file: Pick<File, 'size' | 'type'>): string | null {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) return 'La foto debe ser JPG, PNG o WebP.'
  if (file.size > AVATAR_MAX_BYTES) return 'La foto no puede superar los 2 MB.'
  return null
}
