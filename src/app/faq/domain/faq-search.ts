import type { FaqCategory, FaqItem } from './model/faq.model'

/** Minúsculas y sin tildes: "cámara" encuentra "camara" y viceversa. */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/**
 * Preguntas que contienen todas las palabras de la búsqueda (en la pregunta o en la respuesta), dentro
 * de la categoría elegida. Búsqueda vacía = todas las de la categoría (HU-32).
 */
export function searchFaqs(items: FaqItem[], query: string, category: FaqCategory | 'all' = 'all'): FaqItem[] {
  const words = normalizeText(query).split(/\s+/).filter(Boolean)
  return items.filter((item) => {
    if (category !== 'all' && item.category !== category) return false
    if (words.length === 0) return true
    const haystack = normalizeText(`${item.question} ${item.answer}`)
    return words.every(w => haystack.includes(w))
  })
}
