<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowLeft, Mail } from '@lucide/vue'
import type { LegalDocument } from '../../domain/model/legal.model'
import { env } from '../../../../environments/env'
import { tokenRepository } from '../../../shared/infrastructure/token-repository'
import BrandWordmark from '../../../shared/presentation/components/BrandWordmark.vue'
import TextLink from '../../../shared/presentation/components/TextLink.vue'

/** Página pública que muestra un documento legal (términos o privacidad). */
const props = defineProps<{ doc: LegalDocument }>()

// Con sesión se vuelve a la app; sin ella, al login (desde donde suele llegarse aquí).
const home = computed(() => (tokenRepository.isAuthenticated() ? '/dashboard' : '/login'))

const updatedLabel = computed(() =>
  new Date(`${props.doc.updatedAt}T00:00:00`).toLocaleDateString('es-PE', {
    day: 'numeric', month: 'long', year: 'numeric',
  }),
)
</script>

<template>
  <div class="min-h-screen bg-background">
    <header class="border-b bg-card">
      <div class="mx-auto flex max-w-reading items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <RouterLink :to="home" aria-label="Ir al inicio de ParkVision">
          <BrandWordmark tone="dark" />
        </RouterLink>
        <TextLink :to="home" class="inline-flex items-center gap-1.5">
          <ArrowLeft class="size-4" aria-hidden="true" /> Volver
        </TextLink>
      </div>
    </header>

    <main class="mx-auto flex max-w-reading flex-col gap-8 px-4 py-10 sm:px-6">
      <div>
        <h1 class="mb-2 font-display text-page leading-tight font-bold tracking-[-0.01em] text-heading">
          {{ doc.title }}
        </h1>
        <p class="text-caption text-muted-foreground">Última actualización: {{ updatedLabel }}</p>
      </div>

      <p class="text-body leading-relaxed text-foreground">{{ doc.intro }}</p>

      <section v-for="section in doc.sections" :key="section.title" class="flex flex-col gap-2.5">
        <h2 class="text-title font-bold text-heading">{{ section.title }}</h2>
        <p
          v-for="(paragraph, i) in section.paragraphs"
          :key="i"
          class="text-body leading-relaxed text-muted-foreground"
        >
          {{ paragraph }}
        </p>
        <ul v-if="section.items?.length" class="flex list-disc flex-col gap-1.5 pl-5 text-body leading-relaxed text-muted-foreground">
          <li v-for="(item, i) in section.items" :key="i">{{ item }}</li>
        </ul>
      </section>

      <footer class="flex flex-col gap-3 border-t pt-6 text-body text-muted-foreground">
        <p class="flex flex-wrap items-center gap-1.5">
          <Mail class="size-4" aria-hidden="true" />
          ¿Tienes preguntas? Escríbenos a
          <TextLink :href="`mailto:${env.supportEmail}`">{{ env.supportEmail }}</TextLink>
        </p>
        <nav class="flex gap-5" aria-label="Documentos legales">
          <TextLink to="/terms">Términos y condiciones</TextLink>
          <TextLink to="/privacy">Política de privacidad</TextLink>
        </nav>
      </footer>
    </main>
  </div>
</template>
