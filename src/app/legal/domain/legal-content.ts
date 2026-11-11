import type { LegalDocument } from './model/legal.model'

export const TERMS: LegalDocument = {
  title: 'Términos y condiciones',
  updatedAt: '2026-11-11',
  intro:
    'Estos términos regulan el uso de ParkVision. Al crear una cuenta o usar la aplicación aceptas lo que se indica a continuación.',
  sections: [
    {
      title: '1. El servicio',
      paragraphs: [
        'ParkVision muestra la disponibilidad de estacionamiento en zonas monitoreadas por cámaras con visión artificial, además de predicciones de ocupación, recomendaciones, favoritos, calificaciones y alertas.',
      ],
    },
    {
      title: '2. Tu cuenta',
      items: [
        'Debes registrarte con datos verdaderos y mantenerlos actualizados.',
        'Eres responsable de cuidar tu contraseña y de lo que se haga desde tu cuenta.',
        'Si detectas un uso no autorizado, avísanos a soporte lo antes posible.',
      ],
    },
    {
      title: '3. Uso permitido',
      paragraphs: ['Te comprometes a no:'],
      items: [
        'Usar la aplicación con fines ilícitos o que perjudiquen a otras personas.',
        'Intentar acceder sin permiso a sistemas, cámaras o datos de ParkVision.',
        'Publicar calificaciones o comentarios falsos, ofensivos o que no correspondan a tu experiencia.',
        'Extraer información de forma automatizada o sobrecargar el servicio.',
      ],
    },
    {
      title: '4. Información de disponibilidad',
      paragraphs: [
        'La ocupación se calcula de forma automática y las predicciones son estimaciones. Pueden existir errores o retrasos, por lo que ParkVision no garantiza que una plaza siga libre cuando llegues.',
        'Respeta siempre las señales de tránsito y las normas del lugar. No manipules el celular mientras conduces.',
      ],
    },
    {
      title: '5. Disponibilidad del servicio',
      paragraphs: [
        'Podemos modificar, suspender o interrumpir la aplicación, total o parcialmente, por mantenimiento o mejoras. El servicio se ofrece "tal cual", sin garantías de funcionamiento continuo.',
      ],
    },
    {
      title: '6. Suspensión de cuentas',
      paragraphs: [
        'Podemos suspender o eliminar cuentas que incumplan estos términos. También puedes dejar de usar el servicio y pedir la eliminación de tu cuenta en cualquier momento.',
      ],
    },
    {
      title: '7. Responsabilidad',
      paragraphs: [
        'ParkVision no se hace responsable por multas, daños, robos o pérdidas ocurridos en las zonas de estacionamiento, ni por decisiones tomadas a partir de la información mostrada.',
      ],
    },
    {
      title: '8. Cambios a estos términos',
      paragraphs: [
        'Podemos actualizar estos términos. Publicaremos la nueva versión en esta página con su fecha de actualización; si sigues usando la aplicación, se entiende que aceptas los cambios.',
      ],
    },
    {
      title: '9. Ley aplicable',
      paragraphs: ['Estos términos se rigen por las leyes de la República del Perú.'],
    },
  ],
}

export const PRIVACY: LegalDocument = {
  title: 'Política de privacidad',
  updatedAt: '2026-11-11',
  intro:
    'En ParkVision cuidamos tus datos personales conforme a la Ley N.° 29733, Ley de Protección de Datos Personales del Perú, y su reglamento. Aquí te explicamos qué datos usamos y para qué.',
  sections: [
    {
      title: '1. Datos que recopilamos',
      items: [
        'Datos de registro: nombre, apellido, correo electrónico, tipo y número de documento, y celular.',
        'Contraseña, que se guarda cifrada y nunca se muestra.',
        'Datos de uso: zonas favoritas, calificaciones, comentarios y preferencias de notificaciones.',
      ],
    },
    {
      title: '2. Tu ubicación',
      paragraphs: [
        'Si das permiso, usamos la ubicación de tu dispositivo para mostrarte las zonas cercanas y calcular distancias. Se usa dentro de la aplicación mientras la tienes abierta y puedes retirar el permiso cuando quieras desde la configuración de tu navegador.',
      ],
    },
    {
      title: '3. Imágenes de las cámaras',
      paragraphs: [
        'Las cámaras de las zonas monitoreadas se usan solo para detectar si cada plaza está libre u ocupada. No usamos esas imágenes para identificar personas ni vehículos, ni las asociamos a tu cuenta.',
      ],
    },
    {
      title: '4. Para qué usamos tus datos',
      items: [
        'Crear y administrar tu cuenta, y verificar tu identidad (por ejemplo, con códigos de verificación).',
        'Mostrarte disponibilidad, predicciones y recomendaciones de estacionamiento.',
        'Enviarte las notificaciones que actives.',
        'Mejorar el servicio con estadísticas agregadas que no te identifican.',
      ],
    },
    {
      title: '5. Con quién los compartimos',
      paragraphs: [
        'No vendemos tus datos. Solo los compartimos con proveedores que necesitamos para operar el servicio (por ejemplo, alojamiento, envío de correos y mapas), o cuando lo exija una autoridad competente.',
      ],
    },
    {
      title: '6. Cuánto tiempo los guardamos',
      paragraphs: [
        'Conservamos tus datos mientras tu cuenta esté activa. Si pides eliminarla, borraremos o anonimizaremos tu información, salvo lo que debamos conservar por obligación legal.',
      ],
    },
    {
      title: '7. Seguridad',
      paragraphs: [
        'Aplicamos medidas técnicas razonables, como conexiones cifradas y contraseñas protegidas, para evitar accesos no autorizados. Ningún sistema es totalmente seguro, por eso también te pedimos cuidar tus credenciales.',
      ],
    },
    {
      title: '8. Tus derechos',
      paragraphs: [
        'Puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición (ARCO) escribiendo a soporte. Muchos de tus datos también puedes editarlos directamente desde tu perfil.',
      ],
    },
    {
      title: '9. Cambios a esta política',
      paragraphs: [
        'Si actualizamos esta política, publicaremos la nueva versión en esta página con su fecha de actualización.',
      ],
    },
  ],
}
