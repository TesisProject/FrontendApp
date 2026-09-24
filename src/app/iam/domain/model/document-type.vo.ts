export const DocumentType = {
  DNI:      'DNI',
  CE:       'CE',
  PASSPORT: 'PASSPORT',
} as const

export type DocumentType = typeof DocumentType[keyof typeof DocumentType]

export const DOCUMENT_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: DocumentType.DNI,      label: 'DNI' },
  { value: DocumentType.CE,       label: 'Carné de extranjería' },
  { value: DocumentType.PASSPORT, label: 'Pasaporte' },
]

// formato del número según el tipo (el backend solo exige 5-20 alfanuméricos)
export const DOCUMENT_NUMBER_RULES: Record<DocumentType, { pattern: RegExp; message: string }> = {
  DNI:      { pattern: /^\d{8}$/,                message: 'El DNI tiene 8 dígitos' },
  CE:       { pattern: /^[A-Za-z0-9]{9,12}$/,    message: 'Entre 9 y 12 caracteres' },
  PASSPORT: { pattern: /^[A-Za-z0-9]{6,12}$/,    message: 'Entre 6 y 12 caracteres' },
}
