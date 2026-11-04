# AGENTS.md

Guía para agentes de código (Claude Code, Codex, Copilot, etc.) y colaboradores que trabajan en este repositorio.

## Proyecto

ParkVision Frontend: SPA en **Vue 3 + TypeScript + Vite** que consume el backend `spoticar-service`.
Estado con Pinia, UI con Tailwind CSS v4 + componentes shadcn-vue (`src/app/shared/presentation/components/ui`), mapas con Google Maps JS API.

## Comandos

Gestor de paquetes: **pnpm** (hay `pnpm-lock.yaml`; no usar npm ni yarn).

```bash
pnpm install --frozen-lockfile   # dependencias
pnpm dev                         # servidor de desarrollo
pnpm build                       # vue-tsc -b + vite build
pnpm test                        # vitest
```

Antes de dar un cambio por terminado: `pnpm build` (incluye el typecheck) y `pnpm test` deben pasar.

## Variables de entorno

Copia `.env.example` a `.env` y completa los valores. `.env` nunca se commitea.
Si agregas una variable nueva, añádela también a `.env.example` y a `src/environments/env.ts`.

## Arquitectura

DDD por bounded contexts en `src/app/` (`iam`, `parking`, `admin`, `vision`, `predictions`, `notifications`, `favorites`, `ratings`, `profile`, `faq`, `analytics`, `shared`). Cada contexto tiene cuatro capas:

```
domain/          modelos e interfaces puras
infrastructure/  cliente HTTP y assemblers
application/     stores Pinia (casos de uso)
presentation/    vistas, componentes y composables Vue
```

- La UI, los textos visibles y los comentarios del código están en **español**.
- Reutiliza los componentes existentes (`ui/*`, `Admin*` del panel) antes de crear nuevos.

## Commits

Los mensajes de commit se escriben en **inglés** y siguen [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Tipos permitidos**

| Tipo       | Uso                                                        |
|------------|------------------------------------------------------------|
| `feat`     | Nueva funcionalidad                                        |
| `fix`      | Corrección de un bug                                       |
| `refactor` | Cambio de código que no agrega funcionalidad ni corrige bugs |
| `style`    | Cambios visuales/CSS o de formato sin cambiar lógica       |
| `perf`     | Mejora de rendimiento                                      |
| `test`     | Agregar o ajustar tests                                    |
| `docs`     | Solo documentación                                         |
| `build`    | Dependencias, Vite, Docker, configuración de build         |
| `ci`       | Pipelines de CI/CD                                         |
| `chore`    | Mantenimiento que no encaja en los anteriores              |
| `revert`   | Revierte un commit previo                                  |

**Scope**: opcional, en minúsculas. Usa el bounded context afectado (`admin`, `parking`, `iam`, `vision`, `predictions`, `notifications`, `favorites`, `ratings`, `profile`, `faq`, `analytics`, `shared`) o un área transversal (`ui`, `deps`, `docker`, `env`).

**Reglas**

- Descripción en inglés, modo imperativo y en minúscula, sin punto final: `add`, `fix`, `remove` (no `added`, `fixes`).
- Primera línea de máximo 72 caracteres.
- El body (opcional, separado por una línea en blanco) explica el *qué* y el *por qué*, no el *cómo*.
- Referencia historias de usuario o issues en el footer: `Refs: HU-17`.
- Cambios incompatibles: `!` tras el tipo/scope (`feat(iam)!: ...`) y/o footer `BREAKING CHANGE: <detalle>`.
- Un commit = un cambio lógico. No mezcles refactors con features.

**Ejemplos**

```
feat(admin): add sectioned layout with scroll navigation to zone form
fix(parking): keep map pin in sync with typed coordinates
build(env): add .env.example with required Vite variables
docs: document commit conventions in AGENTS.md
refactor(shared)!: rename useGoogleMap options

BREAKING CHANGE: `onMarkerEnter` is now `onMarkerHover`.
```
