import { describe, expect, it } from 'vitest'
import { createPinia, defineStore, setActivePinia } from 'pinia'
import { ref } from 'vue'
import { resetStores } from './reset-stores'

const useFavorites = defineStore('favorite', () => ({ items: ref<number[]>([]) }))
const useAuth      = defineStore('auth',     () => ({ user: ref<string | null>(null) }))

describe('resetStores (HU-05: cerrar sesión limpia los stores)', () => {
  it('descarta los datos de los stores salvo los conservados', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    useFavorites().items.push(7)
    useAuth().user = 'ana'

    resetStores(pinia, ['auth'])

    expect(useFavorites().items).toEqual([])
    expect(useAuth().user).toBe('ana')
  })
})
