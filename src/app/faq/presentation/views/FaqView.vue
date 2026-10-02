<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Search } from '@lucide/vue'
import type { FaqCategory, FaqItem } from '../../domain/model/faq.model'
import { Input } from '@/app/shared/presentation/components/ui/input'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/app/shared/presentation/components/ui/accordion'
import FilterPills from '../../../shared/presentation/components/FilterPills.vue'
import PageHeader from '../../../shared/presentation/components/PageHeader.vue'
import StateMessage from '../../../shared/presentation/components/StateMessage.vue'

const search      = ref('')
const activeCategory = ref<FaqCategory | 'all'>('all')
const openItem    = ref<string | undefined>(undefined)

const categories: { value: FaqCategory | 'all'; label: string }[] = [
  { value: 'all',            label: 'Todas'          },
  { value: 'general',        label: 'General'        },
  { value: 'zonas',          label: 'Zonas'          },
  { value: 'predicciones',   label: 'Predicciones'   },
  { value: 'cuenta',         label: 'Cuenta'         },
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

// Changing category collapses whatever was open.
watch(activeCategory, () => { openItem.value = undefined })
</script>

<template>
  <div class="mx-auto flex w-full max-w-[760px] flex-col gap-5">
    <PageHeader title="Preguntas frecuentes" sub="Encuentra respuestas sobre el funcionamiento de ParkVision" />

    <div class="relative">
      <Search class="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        v-model="search"
        type="search"
        aria-label="Buscar pregunta"
        placeholder="Buscar pregunta..."
        class="h-11 rounded-xl border bg-card pl-10 text-sm"
      />
    </div>

    <FilterPills v-model="activeCategory" :options="categories" label="Filtrar por categoría" />

    <StateMessage v-if="filtered.length === 0" tone="empty" :icon="Search">
      No hay resultados para "<strong>{{ search }}</strong>"
    </StateMessage>

    <Accordion v-else v-model="openItem" type="single" collapsible class="flex flex-col gap-2.5">
      <AccordionItem
        v-for="item in filtered"
        :key="item.id"
        :value="String(item.id)"
        class="overflow-hidden rounded-xl border bg-card transition-[border-color,box-shadow] last:border-b data-[state=open]:border-primary/40 data-[state=open]:shadow-[0_4px_14px_rgba(0,0,0,0.06)]"
      >
        <AccordionTrigger class="px-5 py-4 text-sm font-semibold text-heading hover:no-underline [&>svg]:size-4">
          {{ item.question }}
        </AccordionTrigger>
        <AccordionContent class="px-5 pb-4 text-[13px] leading-relaxed text-muted-foreground">
          {{ item.answer }}
        </AccordionContent>
      </AccordionItem>
    </Accordion>

    <p class="text-center text-[13px] text-muted-foreground">
      ¿No encontraste lo que buscabas?
      <a href="mailto:jefreysi20@gmail.com" class="font-medium text-link hover:underline" target="_blank" rel="noopener">
        Contacta al administrador del sistema
      </a>
    </p>
  </div>
</template>
