export type FaqCategory = 'general' | 'zonas' | 'predicciones' | 'cuenta'

export interface FaqItem {
  id: number
  category: FaqCategory
  question: string
  answer: string
}
