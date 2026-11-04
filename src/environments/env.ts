export const env = {
  apiBaseUrl:     import.meta.env.VITE_API_BASE_URL     as string,
  googleMapsKey:  import.meta.env.VITE_GOOGLE_MAPS_KEY  as string,
  /** Correo de soporte que muestra la Ayuda (HU-32); genérico por defecto. */
  supportEmail:   (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined) || 'soporte@parkvision.pe',
} as const
