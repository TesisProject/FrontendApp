---
name: architecture-conventions
description: Convención de arquitectura por feature (domain/application/infrastructure/presentation) y helper useAsyncState
metadata:
  type: project
---

El proyecto organiza el código por feature bajo `src/app/<feature>/` con capas estilo hexagonal: `domain/model`, `application` (stores Pinia), `infrastructure` (Api + assemblers), `presentation` (views/components). Features: parking, favorites, iam, predictions, ratings, profile, notifications, admin, shared.

Los stores usan un helper compartido `src/app/shared/helpers/async-state.ts` (`useAsyncState`) que expone `data/loading/error` + `setLoading/setData/setError/reset`. Convención: exponer en el store nombres planos como `zonesLoading`, `zonesError`.

**How to apply:** Al recomendar manejo de estado asíncrono, alinear con `useAsyncState` en lugar de proponer patrones nuevos. Respetar la separación por capas: lógica de datos en application/infrastructure, no en componentes de presentation.
