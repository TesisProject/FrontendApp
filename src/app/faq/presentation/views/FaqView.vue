<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Mail, Search, WifiOff } from '@lucide/vue'
import type { FaqCategory } from '../../domain/model/faq.model'
import { FAQS } from '../../domain/faq-content'
import { searchFaqs } from '../../domain/faq-search'
import { env } from '../../../../environments/env'
import { useNetworkStatus } from '../../../shared/presentation/composables/useNetworkStatus'
import { Input } from '@/app/shared/presentation/components/ui/input'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/app/shared/presentation/components/ui/accordion'
import FilterPills from '../../../shared/presentation/components/FilterPills.vue'
import PageHeader from '../../../shared/presentation/components/PageHeader.vue'
import StateMessage from '../../../shared/presentation/components/StateMessage.vue'

const search      = ref('')
const activeCategory = ref<FaqCategory | 'all'>('all')
const openItem    = ref<string | undefined>(undefined)
const { online }  = useNetworkStatus()
const supportMailto = `mailto:${env.supportEmail}`

const categories: { value: FaqCategory | 'all'; label: string }[] = [
  { value: 'all',            label: 'Todas'          },
  { value: 'general',        label: 'General'        },
  { value: 'zonas',          label: 'Zonas'          },
  { value: 'predicciones',   label: 'Predicciones'   },
  { value: 'cuenta',         label: 'Cuenta'         },
]

const filtered = computed(() => searchFaqs(FAQS, search.value, activeCategory.value))

// Changing category collapses whatever was open.
watch(activeCategory, () => { openItem.value = undefined })
</script>

<template>
  <div class="mx-auto flex w-full max-w-reading flex-col gap-5">
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

    <p
      v-if="!online"
      class="flex items-center gap-2 rounded-[10px] border border-warning/30 bg-warning-soft px-3 py-2.5 text-body text-warning"
      role="status"
    >
      <WifiOff class="size-4 shrink-0" aria-hidden="true" />
      Sin conexión: estás viendo las preguntas frecuentes guardadas en este dispositivo.
    </p>

    <StateMessage v-if="filtered.length === 0" tone="empty" :icon="Search">
      No hay resultados para "<strong>{{ search }}</strong>". Prueba con otras palabras o escríbenos a
      soporte y te ayudamos.
      <template #action>
        <a
          :href="supportMailto"
          class="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-caption font-semibold text-link hover:bg-accent"
        >
          <Mail class="size-3.5" aria-hidden="true" /> Contactar a soporte
        </a>
      </template>
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
        <AccordionContent class="px-5 pb-4 text-body leading-relaxed text-muted-foreground">
          {{ item.answer }}
        </AccordionContent>
      </AccordionItem>
    </Accordion>

    <p class="text-center text-body text-muted-foreground">
      ¿No encontraste lo que buscabas?
      <a :href="supportMailto" class="font-medium text-link hover:underline">
        Contacta a soporte ({{ env.supportEmail }})
      </a>
    </p>
  </div>
</template>
