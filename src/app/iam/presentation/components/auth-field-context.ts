import type { ComputedRef, InjectionKey } from 'vue'

/**
 * Ids que AuthField comparte con su control (AuthInput / AuthSelect) para
 * enlazar label, mensaje y estado inválido de forma accesible.
 */
export interface AuthFieldContext {
  id:          string
  describedBy: ComputedRef<string | undefined>
  invalid:     ComputedRef<boolean>
}

export const AUTH_FIELD_KEY: InjectionKey<AuthFieldContext> = Symbol('auth-field')

/** Skin compartido por los controles de auth: 46px, anillo de 4px y borde verde al validar. */
export function authControlClass(valid: boolean | undefined) {
  return [
    'h-[46px] px-3.5 text-sm text-[#1f2d3d] placeholder:text-(--pv-placeholder)',
    'focus-visible:ring-4 aria-invalid:ring-4',
    valid && 'border-(--pv-success) ring-4 ring-(--pv-success-ring) focus-visible:border-(--pv-success) focus-visible:ring-(--pv-success-ring)',
  ]
}
