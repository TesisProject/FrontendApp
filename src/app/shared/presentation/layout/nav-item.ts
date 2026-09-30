import type { Component } from 'vue'

/** Entrada de navegación del AppShell. */
export interface NavItem {
  to:     string
  label:  string
  icon:   Component
  /** Solo activo en coincidencia exacta (p. ej. la raíz del dashboard). */
  exact?: boolean
}
