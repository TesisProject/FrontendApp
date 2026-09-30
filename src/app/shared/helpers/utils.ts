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
    },
  },
})

/** Merge conditional class lists, resolving Tailwind conflicts (last wins). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
