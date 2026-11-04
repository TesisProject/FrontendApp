/**
 * Política de contraseña de la cuenta (HU-02). Es la misma regla que valida el backend
 * (`PasswordPolicy` en iam): si cambia allá, cambia acá. El formulario muestra la lista como
 * checklist en vivo y no deja enviar hasta que se cumplan todas.
 */
export interface PasswordRequirement {
  id:    'length' | 'upper' | 'lower' | 'digit' | 'symbol'
  label: string
  test:  (password: string) => boolean
}

export const PASSWORD_MIN_LENGTH = 8

export const PASSWORD_REQUIREMENTS: readonly PasswordRequirement[] = [
  { id: 'length', label: `Al menos ${PASSWORD_MIN_LENGTH} caracteres`, test: pw => pw.length >= PASSWORD_MIN_LENGTH },
  { id: 'upper',  label: 'Una letra mayúscula', test: pw => /\p{Lu}/u.test(pw) },
  { id: 'lower',  label: 'Una letra minúscula', test: pw => /\p{Ll}/u.test(pw) },
  { id: 'digit',  label: 'Un número',           test: pw => /\d/.test(pw) },
  // Símbolo = ni letra, ni dígito, ni espacio: "ñ" o "á" cuentan como letra, igual que en el backend.
  { id: 'symbol', label: 'Un símbolo (!, @, #, …)', test: pw => /[^\p{L}\p{N}\s]/u.test(pw) },
]

/** Requisitos que `password` no cumple, en el orden de la lista. */
export function missingPasswordRequirements(password: string | null | undefined): PasswordRequirement[] {
  const value = password ?? ''
  return PASSWORD_REQUIREMENTS.filter(r => !r.test(value))
}

export function isStrongPassword(password: string | null | undefined): boolean {
  return missingPasswordRequirements(password).length === 0
}

/** Mensaje corto para el campo: "Falta: una letra mayúscula, un símbolo". */
export function passwordPolicyMessage(password: string | null | undefined): string | null {
  const missing = missingPasswordRequirements(password)
  if (missing.length === 0) return null
  return `Falta: ${missing.map(r => r.label.toLowerCase()).join(', ')}`
}
