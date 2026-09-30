<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowLeft } from '@lucide/vue'
import { Button } from '@/app/shared/presentation/components/ui/button'
import { tokenRepository } from '../../infrastructure/token-repository'
import BrandWordmark from '../components/BrandWordmark.vue'

// Send signed-in users back to their app; everyone else to the login.
const home = computed(() => (tokenRepository.isAuthenticated() ? '/dashboard' : '/login'))
</script>

<template>
  <main class="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6 py-12 text-center">
    <BrandWordmark tone="dark" />

    <div class="flex flex-col items-center">
      <p class="font-display text-[88px] leading-none font-bold tracking-[-0.04em] text-heading tabular-nums">404</p>
      <div class="bay-stripe" aria-hidden="true" />
      <h1 class="mt-5 mb-2 font-display text-2xl font-bold text-heading">Esta plaza no existe</h1>
      <p class="max-w-sm text-sm text-muted-foreground">
        La página que buscas no está disponible o fue movida. Vuelve al inicio para seguir buscando estacionamiento.
      </p>
    </div>

    <Button as-child size="lg">
      <RouterLink :to="home"><ArrowLeft /> Volver al inicio</RouterLink>
    </Button>
  </main>
</template>
