import type { Component, MaybeRef } from 'vue'

/** Entrada de navegación del AppShell. */
export interface NavItem {
  to:     string
  label:  string
  icon:   Component
  /** Solo activo en coincidencia exacta (p. ej. la raíz del dashboard). */
  exact?: boolean
  /** Contador junto al ícono (p. ej. avisos sin leer); 0 o ausente = sin contador. */
  badge?: MaybeRef<number>
}

/** Bloque del sidebar: entradas afines bajo una etiqueta (sin etiqueta = bloque suelto). */
export interface NavGroup {
  label?: string
  items:  NavItem[]
}
