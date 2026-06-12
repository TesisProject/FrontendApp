# ParkVision — Frontend

> Interfaz web del sistema inteligente de gestión de estacionamientos ParkVision.

---

## ¿Qué es ParkVision?

ParkVision es un sistema de gestión de estacionamientos en tiempo real que combina visión computacional, machine learning y notificaciones push para ofrecer una experiencia moderna tanto a conductores como a administradores de playas de estacionamiento.

Este repositorio contiene la aplicación web (SPA) que consume el backend [`spoticar-service`](https://github.com/TesisProject/CloudService-App).

---

## Funcionalidades

### Para el usuario
- **Mapa interactivo** de zonas de estacionamiento con estado de ocupación en tiempo real.
- **Detalle de zona**: espacios disponibles, estado de cámaras y predicción de ocupación futura.
- **Calificaciones y reseñas**: los usuarios pueden valorar zonas y ver las reseñas de la comunidad.
- **Favoritos**: guardar zonas de interés para acceso rápido.
- **Notificaciones**: alertas sobre disponibilidad y cambios de estado en zonas favoritas.
- **Perfil**: gestión de datos personales y contraseña.

### Para el administrador
- **Dashboard** con métricas generales del sistema.
- **Gestión de zonas**: crear, editar, eliminar zonas y administrar sus espacios individuales.
- **Gestión de cámaras**: configurar cámaras IP por zona.
- **Alertas de cámaras**: visualizar, reconocer y resolver incidencias detectadas automáticamente.
- **Gestión de usuarios**: administrar roles y estado de cuentas.

---

## Stack tecnológico

| | Tecnología |
|---|---|
| Framework | Vue 3 + TypeScript |
| Build | Vite |
| Estado | Pinia |
| Routing | Vue Router |
| Mapas | Google Maps JS API |
| Autenticación | JWT (RS256) |

---

## Arquitectura

La aplicación está estructurada siguiendo **Domain-Driven Design (DDD) por Bounded Contexts**, espejando la arquitectura del backend.

```
src/app/
├── iam/             # Identidad y acceso
├── parking/         # Zonas y espacios
├── ratings/         # Calificaciones
├── favorites/       # Favoritos
├── notifications/   # Notificaciones
├── predictions/     # Predicciones IA
├── vision/          # Cámaras
├── admin/           # Panel administrativo
└── shared/          # Kernel compartido
```

Cada bounded context es autónomo y sigue cuatro capas internas:

```
domain/        →  modelos e interfaces puras
infrastructure →  cliente HTTP y assemblers
application/   →  stores Pinia (casos de uso)
presentation/  →  vistas y componentes Vue
```

---

## Proyecto de tesis

**ParkVision** — Sistema inteligente de gestión de estacionamientos  
Universidad Peruana de Ciencias Aplicadas (UPC) / Facultad de Ingeniería  

| Repositorio | Descripción |
|---|---|
| [`FrontendApp`](https://github.com/TesisProject/FrontendApp) | Este repositorio — interfaz web Vue 3 |
| [`CloudService-App`](https://github.com/TesisProject/CloudService-App) | Backend Java 21 + Spring Boot + Axon Framework |
