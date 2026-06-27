---
name: classification-color-duplication
description: Deuda técnica — paleta y labels de clasificación de zonas duplicados en ~16 archivos
metadata:
  type: project
---

La paleta de colores de clasificación de zonas `LIBRE:'#38a169' / MODERADO:'#f2894a' / OCUPADO:'#e53e3e'` y sus labels están hardcodeados y duplicados en al menos 16 archivos (ZonesView, ZoneDetailView, FavoritesView, AdminZonesView, UserDashboardView, PredictionsView, etc.). Cada vista redefine su propia `classificationColor`/`classificationLabel` (o variante como objeto `{color,label}` en UserDashboardView, lo que ya genera divergencia de formato).

**Why:** No existe una fuente única de verdad para tokens de diseño; los colores naranja (#f2894a) y azul (#092c4c/#0a1e38) también se repiten como magic strings. Hay un `var(--color-border)` usado puntualmente, señal de que sí existe algún sistema de variables CSS infrautilizado.

**How to apply:** Al revisar cualquier vista que muestre estado/clasificación de zonas, recomendar centralizar en un helper de dominio (p.ej. `parking/domain` o `shared/helpers`) + variables CSS/tokens, en vez de repetir el mapa. Recomendación ya entregada en la revisión de ZonesView (2026-06-26).
