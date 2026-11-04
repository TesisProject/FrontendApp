import { describe, expect, it } from 'vitest'
import { FAQS } from './faq-content'
import { normalizeText, searchFaqs } from './faq-search'

describe('searchFaqs (HU-32)', () => {
  it('encuentra por palabra clave sin importar tildes ni mayúsculas', () => {
    const ids = searchFaqs(FAQS, 'CAMARA').map(f => f.id)
    expect(ids).toContain(2)
    expect(normalizeText('Cámara')).toBe('camara')
  })

  it('exige todas las palabras de la búsqueda', () => {
    expect(searchFaqs(FAQS, 'modo oscuro').map(f => f.id)).toEqual([15])
  })

  it('filtra por categoría', () => {
    expect(searchFaqs(FAQS, '', 'cuenta').every(f => f.category === 'cuenta')).toBe(true)
  })

  it('devuelve vacío cuando no hay coincidencias', () => {
    expect(searchFaqs(FAQS, 'helicoptero')).toEqual([])
  })

  it('el contenido refleja el sistema real: 40/80 y YOLO, sin OpenCV ni 30/70', () => {
    const all = FAQS.map(f => f.answer).join(' ')
    expect(all).toContain('40 %')
    expect(all).toContain('80 %')
    expect(all).toContain('YOLO')
    expect(all).not.toMatch(/OpenCV|30%|70%/)
  })
})
