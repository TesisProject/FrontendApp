import { ref, watch, onBeforeUnmount, type Ref } from 'vue'

/** Distancia (px) desde el borde superior del contenedor a partir de la cual una sección cuenta como "actual". */
const ACTIVE_OFFSET = 96
/** Respaldo para navegadores sin `scrollend`: tiempo tras el que se libera el bloqueo del clic. */
const SCROLL_LOCK_FALLBACK_MS = 900

/**
 * useScrollSpy — navegación por secciones dentro de un contenedor con scroll.
 * Las secciones se marcan con `data-section="<id>"`; `active` sigue a la que se está
 * leyendo y `scrollTo(id)` desplaza hasta ella sin ocultar las demás.
 *
 * El contenedor puede montarse y desmontarse (p. ej. dentro de un diálogo): cada vez que
 * aparece, se engancha el listener y se reinicia `active` a la primera sección.
 */
export function useScrollSpy(container: Ref<HTMLElement | null>, ids: readonly string[]) {
  const active = ref(ids[0] ?? '')

  /** Mientras un clic desplaza el contenedor, el spy no pisa la sección elegida. */
  let locked = false
  let lockTimer: ReturnType<typeof setTimeout> | null = null
  let frame = 0

  function sectionTop(el: HTMLElement, root: HTMLElement): number {
    return el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop
  }

  function findSection(root: HTMLElement, id: string): HTMLElement | null {
    return root.querySelector<HTMLElement>(`[data-section="${id}"]`)
  }

  function update() {
    frame = 0
    const root = container.value
    if (!root || locked) return

    // Al llegar al fondo, la última sección puede no alcanzar el borde superior: se activa igual.
    if (root.scrollTop + root.clientHeight >= root.scrollHeight - 2) {
      active.value = ids[ids.length - 1] ?? active.value
      return
    }

    let current = ids[0] ?? ''
    for (const id of ids) {
      const el = findSection(root, id)
      if (el && sectionTop(el, root) - root.scrollTop <= ACTIVE_OFFSET) current = id
    }
    active.value = current
  }

  function onScroll() {
    if (!frame) frame = requestAnimationFrame(update)
  }

  function unlock() {
    locked = false
    if (lockTimer) clearTimeout(lockTimer)
    lockTimer = null
  }

  function scrollTo(id: string) {
    const root = container.value
    const el = root && findSection(root, id)
    if (!root || !el) return

    active.value = id
    locked = true
    if (lockTimer) clearTimeout(lockTimer)
    lockTimer = setTimeout(unlock, SCROLL_LOCK_FALLBACK_MS)

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const paddingTop = parseFloat(getComputedStyle(root).paddingTop) || 0
    root.scrollTo({
      top: Math.max(0, sectionTop(el, root) - paddingTop),
      behavior: reduceMotion ? 'auto' : 'smooth',
    })
  }

  watch(
    container,
    (el, prev) => {
      prev?.removeEventListener('scroll', onScroll)
      prev?.removeEventListener('scrollend', unlock)
      unlock()
      active.value = ids[0] ?? ''
      el?.addEventListener('scroll', onScroll, { passive: true })
      el?.addEventListener('scrollend', unlock)
    },
    { flush: 'post' },
  )

  onBeforeUnmount(() => {
    container.value?.removeEventListener('scroll', onScroll)
    container.value?.removeEventListener('scrollend', unlock)
    if (frame) cancelAnimationFrame(frame)
    unlock()
  })

  return { active, scrollTo }
}
