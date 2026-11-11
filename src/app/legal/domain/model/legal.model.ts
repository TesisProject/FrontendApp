export interface LegalSection {
  title: string
  /** Párrafos de la sección. */
  paragraphs?: string[]
  /** Lista de puntos que va después de los párrafos. */
  items?: string[]
}

export interface LegalDocument {
  title: string
  /** Fecha de la última actualización en formato ISO (AAAA-MM-DD). */
  updatedAt: string
  intro: string
  sections: LegalSection[]
}
