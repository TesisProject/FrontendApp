---
name: zone-classification-helper
description: Helper de dominio para colores/labels de clasificación de zonas — adopción parcial, follow-up pendiente
metadata:
  type: project
---

Existe `src/app/parking/domain/zone-classification.ts` como fuente única de verdad para la paleta y labels de clasificación de zonas (`CLASSIFICATION_COLOR`/`CLASSIFICATION_LABEL` + `classificationColor()`/`classificationLabel()`). Su espejo declarativo son los tokens CSS `--zone-libre/--zone-moderado/--zone-ocupado` en `src/style.css`. También se añadió `--font-display` ahí.

**Why:** La paleta `LIBRE:#38a169 / MODERADO:#f2894a / OCUPADO:#e53e3e` estaba duplicada en ~16 archivos (ver memoria de qa-code-advisor [[classification-color-duplication]]). Se centralizó al refactorizar `ZonesView.vue` (2026-06-26).

**How to apply:** Solo `ZonesView.vue` y el nuevo `ZoneCard.vue` adoptaron el helper. Los otros ~15 consumidores (ZoneDetailView, FavoritesView, AdminZonesView, UserDashboardView, PredictionsView, etc.) AÚN definen su propia copia — migrarlos al helper es un follow-up pendiente. Verificar antes de recomendar que el archivo siga existiendo.
