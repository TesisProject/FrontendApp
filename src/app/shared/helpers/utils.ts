import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Teach tailwind-merge the custom theme keys from src/style.css (@theme) so
// e.g. `shadow-brand` correctly overrides a variant's `shadow-sm`.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      shadow: ['brand', 'card'],
      font:   ['display', 'signage', 'heading'],
      // Escala tipográfica en rem: sin esto `text-title` se toma por un color
      // y `cn('text-title', 'text-heading')` descartaría el tamaño.
      text:   ['micro', 'caption', 'body', 'title', 'lead', 'subhead', 'page', 'display', 'display-lg', 'jumbo'],
    },
  },
})

/** Merge conditional class lists, resolving Tailwind conflicts (last wins). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
