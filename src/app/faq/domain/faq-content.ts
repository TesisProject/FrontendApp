import type { FaqItem } from './model/faq.model'

/**
 * Contenido de la ayuda (HU-32). Es estático y va dentro del bundle: así la PWA lo tiene en caché y
 * se puede consultar sin conexión. Mantener alineado con el sistema real (umbrales 40/80, YOLO,
 * refresco cada 30 s).
 */
export const FAQS: FaqItem[] = [
  // General
  {
    id: 1,
    category: 'general',
    question: '¿Qué es ParkVision?',
    answer: 'ParkVision es un sistema de gestión inteligente de estacionamientos. Combina cámaras, visión por computadora y un modelo de inteligencia artificial para mostrar la ocupación en tiempo real y predecir la disponibilidad de los próximos minutos, para que encuentres espacio más rápido.',
  },
  {
    id: 2,
    category: 'general',
    question: '¿Cómo funciona el monitoreo en tiempo real?',
    answer: 'Cada zona tiene cámaras que toman una foto cada 30 segundos. Un modelo de visión por computadora (YOLO) analiza cada foto y detecta qué espacios están libres u ocupados. El resultado llega a la app y el mapa se actualiza solo cada 30 segundos.',
  },
  {
    id: 3,
    category: 'general',
    question: '¿Necesito instalar alguna aplicación?',
    answer: 'No. ParkVision funciona desde el navegador. Si quieres, puedes instalarla en tu celular desde el menú del navegador ("Agregar a la pantalla de inicio"); la sección de Ayuda queda disponible incluso sin conexión.',
  },
  {
    id: 17,
    category: 'general',
    question: '¿Puedo usar la app sin conexión a internet?',
    answer: 'Sin conexión no se puede ver la ocupación en vivo, pero la app lo avisa sin bloquearse y la sección de preguntas frecuentes sigue disponible desde la caché del dispositivo. Al volver la conexión, los datos se actualizan solos.',
  },
  // Zonas
  {
    id: 4,
    category: 'zonas',
    question: '¿Qué significan los colores Libre, Moderado, Ocupado y Sin datos?',
    answer: 'Indican el nivel de ocupación de la zona: verde (Libre) es menos del 40 % de espacios ocupados, amarillo (Moderado) entre el 40 % y el 80 %, y rojo (Ocupado) más del 80 %. Gris (Sin datos) significa que la zona no tiene cámaras funcionando o no hay lecturas recientes.',
  },
  {
    id: 5,
    category: 'zonas',
    question: '¿Con qué frecuencia se actualiza la disponibilidad?',
    answer: 'Cada 30 segundos: es el ritmo con el que las cámaras toman fotos y con el que la app vuelve a consultar el estado, sin que tengas que recargar la página.',
  },
  {
    id: 18,
    category: 'zonas',
    question: '¿Qué significa "Datos no actualizados"?',
    answer: 'Que la zona no envía lecturas nuevas desde hace más de 90 segundos (por ejemplo, si una cámara perdió la conexión). Se muestra el último estado conocido junto con la hora de esa lectura, para que sepas qué tan reciente es.',
  },
  {
    id: 19,
    category: 'zonas',
    question: '¿Cómo encuentro estacionamientos cerca de mí?',
    answer: 'En la sección Zonas, toca "Cerca de mí" o elige una distancia (500 m, 1, 2 o 5 km). La app usa la ubicación de tu dispositivo y muestra solo las zonas dentro de ese radio, de la más cercana a la más lejana. Si no hay resultados, puedes ampliar el radio o tocar "Limpiar filtro" para ver todas.',
  },
  {
    id: 20,
    category: 'zonas',
    question: '¿Cómo llego a un estacionamiento?',
    answer: 'En el detalle de la zona, en "Cómo llegar", toca "Abrir en Waze" o "Google Maps": se abre la app (o la web) con la ruta hasta el estacionamiento.',
  },
  {
    id: 6,
    category: 'zonas',
    question: '¿Puedo guardar zonas como favoritas?',
    answer: 'Sí. Desde la lista de zonas o desde el detalle de una zona puedes marcarla como favorita. Tus zonas guardadas aparecen en la sección "Favoritos" para acceder más rápido.',
  },
  {
    id: 7,
    category: 'zonas',
    question: '¿Qué información muestra el detalle de una zona?',
    answer: 'El nombre, la dirección, la clasificación actual, el porcentaje de ocupación, los espacios libres y ocupados, el estado de cada espacio sobre la foto de la cámara, el historial de ocupación, el horario de atención, cómo llegar y el pronóstico de disponibilidad.',
  },
  // Predicciones
  {
    id: 8,
    category: 'predicciones',
    question: '¿Cómo funciona la predicción de disponibilidad?',
    answer: 'ParkVision usa un modelo de Machine Learning (Random Forest) entrenado con el historial de ocupación de cada zona. El modelo aprende los patrones según la hora y el día de la semana para estimar la disponibilidad de los próximos intervalos.',
  },
  {
    id: 21,
    category: 'predicciones',
    question: '¿Cómo se eligen las zonas recomendadas?',
    answer: 'En "Recomendaciones" la app sugiere al menos 3 zonas cercanas con mayor probabilidad de espacio libre. Combina la ocupación actual con la predicción de los próximos minutos y prefiere las más cercanas. La lista se actualiza sola cada 30 segundos o cuando te mueves.',
  },
  {
    id: 9,
    category: 'predicciones',
    question: '¿Qué tan precisa es la predicción?',
    answer: 'Depende del historial disponible de cada zona: con más días de datos, más precisa es. En el detalle de la zona se muestra la confiabilidad del modelo, que compara lo predicho con lo que realmente ocurrió.',
  },
  {
    id: 10,
    category: 'predicciones',
    question: '¿Las predicciones se actualizan automáticamente?',
    answer: 'Sí. El modelo se vuelve a entrenar periódicamente con los nuevos datos de ocupación, lo que le permite mejorar con el tiempo.',
  },
  // Cuenta
  {
    id: 14,
    category: 'cuenta',
    question: '¿Cómo actualizo mi información personal?',
    answer: 'Ve a "Mi perfil" en el menú. En "Información personal" puedes actualizar tu nombre, apellido, teléfono, foto de perfil y una breve biografía. Recuerda guardar los cambios.',
  },
  {
    id: 15,
    category: 'cuenta',
    question: '¿Puedo activar el modo oscuro?',
    answer: 'Sí. En tu perfil, en la pestaña "Preferencias", está el interruptor de modo oscuro. Al activarlo, la interfaz cambia de inmediato y se mantiene aunque navegues a otras secciones.',
  },
  {
    id: 16,
    category: 'cuenta',
    question: '¿Mis datos están seguros?',
    answer: 'Sí. Las contraseñas se guardan cifradas y nunca en texto plano. La sesión usa tokens con vencimiento. Las cámaras solo procesan imágenes para detectar la ocupación y no graban video.',
  },
]
