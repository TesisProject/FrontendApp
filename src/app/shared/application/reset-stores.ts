import type { Pinia } from 'pinia'

/**
 * Descarta el estado de todos los stores de Pinia salvo los de `keep` (HU-05: al cerrar sesión no
 * deben quedar en memoria favoritos, perfil, zonas, calificaciones ni datos de administración del
 * usuario anterior). Los stores son de tipo setup y no tienen `$reset()`, así que se eliminan: la
 * próxima llamada a `useXStore()` crea uno nuevo con el estado inicial.
 *
 * Usa el registro interno `_s` de Pinia (estable en v2 y v3) para no tener que listar a mano cada
 * store y olvidarse de uno nuevo.
 */
export function resetStores(pinia: Pinia, keep: readonly string[]): void {
  const registry = (pinia as unknown as { _s: Map<string, { $dispose: () => void }> })._s
  for (const [id, store] of [...registry]) {
    if (keep.includes(id)) continue
    store.$dispose()
    delete pinia.state.value[id]
  }
}
