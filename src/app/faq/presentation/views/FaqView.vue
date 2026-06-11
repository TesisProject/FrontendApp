<script setup lang="ts">
import { ref, computed } from 'vue'
import type { FaqCategory, FaqItem } from '../../domain/model/faq.model'

const search      = ref('')
const activeCategory = ref<FaqCategory | 'all'>('all')
const openId      = ref<number | null>(null)

const categories: { key: FaqCategory | 'all'; label: string }[] = [
  { key: 'all',           label: 'Todas'          },
  { key: 'general',       label: 'General'        },
  { key: 'zonas',         label: 'Zonas'          },
  { key: 'predicciones',  label: 'Predicciones'   },
  { key: 'notificaciones',label: 'Notificaciones' },
  { key: 'cuenta',        label: 'Cuenta'         },
]

const faqs: FaqItem[] = [
  // General
  {
    id: 1,
    category: 'general',
    question: '¿Qué es ParkVision?',
    answer: 'ParkVision es un sistema de gestión inteligente de estacionamientos. Combina cámaras IP, visión computacional y modelos de inteligencia artificial para monitorear la ocupación en tiempo real y predecir la disponibilidad futura, ayudándote a encontrar espacio de forma rápida y eficiente.',
  },
  {
    id: 2,
    category: 'general',
    question: '¿Cómo funciona el monitoreo en tiempo real?',
    answer: 'Cada zona cuenta con cámaras IP que capturan imágenes continuamente. Un módulo de visión computacional (OpenCV) analiza cada frame para detectar si los espacios están ocupados o libres. El resultado se refleja en la app en cuestión de segundos.',
  },
  {
    id: 3,
    category: 'general',
    question: '¿Necesito instalar alguna aplicación adicional?',
    answer: 'No. ParkVision funciona directamente desde el navegador web. No requiere ninguna descarga ni instalación adicional en tu dispositivo.',
  },
  // Zonas
  {
    id: 4,
    category: 'zonas',
    question: '¿Qué significan las clasificaciones Libre, Moderado y Ocupado?',
    answer: 'Las clasificaciones indican el nivel de ocupación de una zona: Libre significa menos del 30% de espacios ocupados, Moderado entre el 30% y el 70%, y Ocupado más del 70%. Esta información se actualiza automáticamente a medida que cambia la ocupación.',
  },
  {
    id: 5,
    category: 'zonas',
    question: '¿Con qué frecuencia se actualiza la disponibilidad?',
    answer: 'La disponibilidad se actualiza en tiempo real conforme las cámaras detectan cambios de ocupación. En condiciones normales, el tiempo de actualización es de pocos segundos desde que ocurre el cambio físico en el estacionamiento.',
  },
  {
    id: 6,
    category: 'zonas',
    question: '¿Puedo guardar zonas como favoritas?',
    answer: 'Sí. Desde la vista de detalle de cualquier zona puedes marcarla como favorita. Todas tus zonas guardadas se listan en la sección "Mis Favoritos" para un acceso más rápido.',
  },
  {
    id: 7,
    category: 'zonas',
    question: '¿Qué información muestra el detalle de una zona?',
    answer: 'El detalle de zona muestra el nombre, dirección, clasificación actual, porcentaje de ocupación, cantidad de espacios libres y ocupados, el estado individual de cada espacio en una grilla visual, y las cámaras asociadas a esa zona.',
  },
  // Predicciones
  {
    id: 8,
    category: 'predicciones',
    question: '¿Cómo funciona la predicción de disponibilidad?',
    answer: 'ParkVision utiliza un modelo de Machine Learning (Random Forest) entrenado con el historial de ocupación de cada zona. El modelo analiza patrones según la hora del día y el día de la semana para estimar cuántos espacios estarán disponibles en un momento futuro.',
  },
  {
    id: 9,
    category: 'predicciones',
    question: '¿Qué tan precisa es la predicción?',
    answer: 'La precisión depende del historial disponible de cada zona. Mientras más datos históricos tenga el sistema, más precisa será la predicción. Cada predicción incluye un puntaje de confianza que te indica qué tan fiable es ese resultado.',
  },
  {
    id: 10,
    category: 'predicciones',
    question: '¿Las predicciones se actualizan automáticamente?',
    answer: 'Sí. El sistema regenera las predicciones periódicamente con los nuevos datos de ocupación, lo que permite que el modelo mejore su exactitud con el tiempo.',
  },
  // Notificaciones
  {
    id: 11,
    category: 'notificaciones',
    question: '¿Qué tipos de alertas puedo recibir?',
    answer: 'Puedes recibir tres tipos de alertas: Espacio libre disponible (cuando hay espacios libres cerca de ti), Zona saturada (cuando una zona supera el 70% de ocupación) y Fallo de cámara (cuando una cámara queda fuera de línea). Puedes activar o desactivar cada tipo desde tu perfil.',
  },
  {
    id: 12,
    category: 'notificaciones',
    question: '¿Cómo configuro el radio de alertas?',
    answer: 'En la sección Preferencias de tu perfil puedes definir el radio en metros dentro del cual deseas recibir alertas de disponibilidad. Solo las zonas dentro de ese radio te enviarán notificaciones.',
  },
  {
    id: 13,
    category: 'notificaciones',
    question: '¿Dónde veo mis notificaciones anteriores?',
    answer: 'En la sección "Alertas" del menú lateral puedes revisar todas tus notificaciones, filtrarlas entre todas y no leídas, marcarlas como leídas individualmente o todas a la vez, y eliminar las que ya no necesites.',
  },
  // Cuenta
  {
    id: 14,
    category: 'cuenta',
    question: '¿Cómo actualizo mi información personal?',
    answer: 'Ve a la sección "Perfil" en el menú lateral. En la pestaña "Información personal" puedes actualizar tu nombre, apellido, teléfono, foto de perfil y una breve biografía. Recuerda guardar los cambios.',
  },
  {
    id: 15,
    category: 'cuenta',
    question: '¿Puedo activar el modo oscuro?',
    answer: 'Sí. En tu perfil, dentro de la pestaña "Preferencias", encontrarás el interruptor de modo oscuro. Al activarlo, la interfaz cambia a una paleta de colores oscura de forma inmediata y se mantiene así aunque navegues a otras secciones.',
  },
  {
    id: 16,
    category: 'cuenta',
    question: '¿Mis datos están seguros?',
    answer: 'Sí. Las contraseñas se almacenan cifradas con BCrypt y nunca se guardan en texto plano. La sesión utiliza tokens JWT con tiempo de expiración, por lo que no se mantiene ninguna sesión abierta en el servidor. Las cámaras solo procesan imágenes para detección de ocupación y no almacenan video.',
  },
]

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  return faqs.filter(f => {
    const matchCategory = activeCategory.value === 'all' || f.category === activeCategory.value
    const matchSearch   = !q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
    return matchCategory && matchSearch
  })
})

function toggle(id: number) {
  openId.value = openId.value === id ? null : id
}
</script>

<template>
  <div class="faq-page">

    <div class="page-header">
      <div>
        <h1 class="page-title">Preguntas frecuentes</h1>
        <p class="page-subtitle">Encuentra respuestas sobre el funcionamiento de ParkVision</p>
      </div>
    </div>

    <!-- Search -->
    <div class="search-wrap">
      <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        v-model="search"
        type="text"
        class="search-input"
        placeholder="Buscar pregunta..."
      />
    </div>

    <!-- Category filters -->
    <div class="category-tabs">
      <button
        v-for="cat in categories"
        :key="cat.key"
        class="cat-tab"
        :class="{ active: activeCategory === cat.key }"
        @click="activeCategory = cat.key; openId = null"
      >
        {{ cat.label }}
      </button>
    </div>

    <!-- Empty state -->
    <div v-if="filtered.length === 0" class="empty-state">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-faint)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <p class="empty-text">No hay resultados para "<strong>{{ search }}</strong>"</p>
    </div>

    <!-- Accordion -->
    <div v-else class="accordion">
      <div
        v-for="item in filtered"
        :key="item.id"
        class="accordion-item"
        :class="{ open: openId === item.id }"
      >
        <button class="accordion-header" @click="toggle(item.id)">
          <span class="question-text">{{ item.question }}</span>
          <svg
            class="chevron"
            width="16" height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <div class="accordion-body">
          <p class="answer-text">{{ item.answer }}</p>
        </div>
      </div>
    </div>

    <p class="footer-note">
      ¿No encontraste lo que buscabas?
      <a href="mailto:jefreysi20@gmail.com" class="footer-link" target="_blank" rel="noopener">Contacta al administrador del sistema</a>
    </p>

  </div>
</template>

<style scoped>
.faq-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 760px;
  width: 100%;
  margin: 0 auto;
}

.page-header { margin-bottom: 4px; }

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-title);
  margin: 0 0 4px;
}

.page-subtitle {
  font-size: 13px;
  color: var(--color-muted);
  margin: 0;
}

/* Search */
.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: var(--color-faint);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 10px 14px 10px 38px;
  border: 1.5px solid var(--color-border);
  border-radius: 10px;
  font-size: 14px;
  color: var(--color-text);
  background: var(--color-input-bg);
  outline: none;
  font-family: inherit;
  transition: border-color 0.2s;
}

.search-input:focus { border-color: var(--color-title); }
.search-input::placeholder { color: var(--color-faint); }

/* Category tabs */
.category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cat-tab {
  padding: 6px 14px;
  border: 1.5px solid var(--color-border);
  border-radius: 20px;
  background: none;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-muted);
  cursor: pointer;
  transition: all 0.18s;
  font-family: inherit;
}

.cat-tab:hover { border-color: var(--color-title); color: var(--color-title); }

.cat-tab.active {
  background: var(--color-title);
  border-color: var(--color-title);
  color: #ffffff;
}

/* Accordion */
.accordion {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.accordion-item {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.accordion-item.open {
  box-shadow: 0 4px 14px rgba(0,0,0,0.07);
  border-color: var(--color-border);
}

.accordion-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
}

.question-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-title);
  line-height: 1.45;
  flex: 1;
}

.chevron {
  flex-shrink: 0;
  color: var(--color-faint);
  transition: transform 0.25s ease;
}

.open .chevron { transform: rotate(180deg); }

.accordion-body {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease, padding 0.3s ease;
  padding: 0 20px;
}

.open .accordion-body {
  max-height: 300px;
  padding: 0 20px 18px;
}

.answer-text {
  font-size: 13px;
  color: var(--color-sub);
  line-height: 1.7;
  margin: 0;
  border-top: 1px solid var(--color-border-soft);
  padding-top: 14px;
}

/* Empty */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 0;
}

.empty-text {
  font-size: 14px;
  color: var(--color-muted);
  margin: 0;
}

/* Footer */
.footer-note {
  font-size: 12px;
  color: var(--color-faint);
  text-align: center;
  padding-top: 8px;
}

.footer-link {
  color: var(--color-primary);
  font-weight: 500;
  text-decoration: none;
  transition: opacity 0.2s;
}

.footer-link:hover { opacity: 0.75; }
</style>
