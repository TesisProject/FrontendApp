---
name: design-system
description: Sistema de diseño de ParkVision (tokens, tipografía, layout) y decisiones de accesibilidad/responsive tomadas en el dashboard
metadata:
  type: project
---

ParkVision (Vue 3 + Vite + TS). Tokens globales en `src/style.css` (`:root` + `html.dark` para modo oscuro). Fuentes: UI = Inter; display = Space Grotesk (títulos auth y cifras grandes). Acento de marca = ámbar `--color-primary: #f2894a`.

**Decisión accesibilidad (aplicada al dashboard, jun 2026):**
- El ámbar `#f2894a` NO cumple contraste como texto sobre blanco (~2.5:1). Para texto/enlaces naranjas usar el token `--color-accent-text` (#c2410c claro / #fb923c oscuro), no `--color-primary`. `--color-primary` solo para rellenos grandes (botones, barras, dots).
- `--color-muted` se oscureció a `#64748b` (antes #888, fallaba AA). Texto informativo pequeño debe usar `--color-muted`, nunca `--color-faint` (#98a0ab, reservado solo para separadores decorativos como "·" y "/").
- Badges de estado (LIBRE/MODERADO/OCUPADO): patrón pill con fondo tintado + texto oscuro (no color sólido + texto blanco, que fallaba contraste). Ver `classifMeta` con `badgeBg`/`badgeText` en `UserDashboardView.vue`. Colores semánticos: verde #38a169 / ámbar #f2894a / rojo #e53e3e (para barras y dots).

**Why:** Cumplir WCAG 2.1 AA, que el usuario marca como no negociable.
**How to apply:** Reusar estos tokens/patrones en otras vistas (Zonas, Favoritos, Alertas, Predicciones) para mantener consistencia y accesibilidad; varias comparten el mismo gris faint/links naranja con el mismo defecto.

**Layout:** `UserLayout.vue` (usuario) y `AdminLayout.vue` (admin) = sidebar fijo 230px + `margin-left` en `.content`. El sidebar NO era responsive; se añadió un drawer off-canvas con barra superior móvil + backdrop bajo `@media (max-width: 768px)`. Las vistas internas deben asumir ancho completo y `padding-top` para la barra en móvil.

**Modernización visual del dashboard (jun 2026, skill frontend-design):**
- Tipografía: cifras grandes/numéricas usan la fuente display Space Grotesk (`--font-display: 'Space Grotesk','Inter',sans-serif`) con `font-feature-settings:'tnum' 1` (números tabulares) y `letter-spacing:-0.02em`. Reusar en otras vistas para consistencia.
- **Elemento signature:** anillo medidor (ring gauge) SVG de ocupación por zona — `<circle>` track + fill con `stroke-dasharray`/`stroke-dashoffset` (geom: r=22, C=2πr, `ringOffset(pct)=C*(1-pct/100)`, svg `rotate(-90deg)`, `stroke-linecap:round`). Coloreado por `classifMeta[...].color`. Es la pieza memorable; mantener el resto sobrio.
- Tarjetas: `border-radius:16px` + `border:1px solid var(--color-border-soft)` + costura de acento vertical de 3px (`::before`, `background:var(--accent)`) por tarjeta vía vars inline `--accent`/`--accent-tint`. Icono usa `--accent-tint` (claro) / `color-mix(in srgb, var(--accent) 20%, transparent)` (oscuro). Hover: `translateY(-3px)` + sombra.
- Cabecera: eyebrow "Panel en vivo" con punto `live-dot` pulsante (verde #16b178) + medidor de ocupación grande a la derecha.
- Animación de entrada: un único stagger sobrio (`card-rise`, fade+translateY 10px) con delays por `:nth-child`. TODO bajo `@media (prefers-reduced-motion: reduce)` (anima nada, transiciones off). No abusar de motion (lee como AI-generated).
