<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router'
import {
  CircleUserRound, KeyRound, LayoutGrid, LogOut, Server, TriangleAlert, User, Users, Video,
} from '@lucide/vue'
import { useAuthStore } from '../../../iam/application/auth.store'

const router    = useRouter()
const authStore = useAuthStore()

const nav = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/admin/zones',     label: 'Zonas',     icon: CircleUserRound },
  { to: '/admin/cameras',   label: 'Cámaras',   icon: Video },
  { to: '/admin/nodes',     label: 'Nodos',     icon: Server },
  { to: '/admin/api-keys',  label: 'API Keys',  icon: KeyRound },
  { to: '/admin/alerts',    label: 'Alertas',   icon: TriangleAlert },
  { to: '/admin/users',     label: 'Usuarios',  icon: Users },
]

// Active item: tinted background + amber indicator bar on the sidebar edge.
const itemClass = [
  'relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-white/70 no-underline transition-colors',
  'hover:bg-white/8 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber',
  '[&.router-link-active]:bg-white/12 [&.router-link-active]:font-semibold [&.router-link-active]:text-white',
  "[&.router-link-active]:before:absolute [&.router-link-active]:before:inset-y-2 [&.router-link-active]:before:-left-4 [&.router-link-active]:before:w-[3px] [&.router-link-active]:before:rounded-r-[3px] [&.router-link-active]:before:bg-amber [&.router-link-active]:before:content-['']",
]

function handleLogout() {
  authStore.logout()
  router.push('/admin')
}
</script>

<template>
  <div class="flex min-h-screen bg-background">
    <aside class="fixed inset-y-0 left-0 flex w-[220px] flex-col overflow-y-auto bg-navy px-4 py-6 [scrollbar-color:rgba(255,255,255,0.2)_transparent] [scrollbar-width:thin]">
      <div class="mb-9 flex items-center gap-2 px-2">
        <span class="text-lg font-bold text-white">ParkVision</span>
        <span class="rounded bg-amber px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.5px] text-white uppercase">Admin</span>
      </div>

      <nav class="flex flex-1 flex-col gap-1" aria-label="Panel de administración">
        <RouterLink v-for="item in nav" :key="item.to" :to="item.to" :class="itemClass">
          <component :is="item.icon" class="size-[18px]" />
          {{ item.label }}
        </RouterLink>
      </nav>

      <RouterLink to="/admin/profile" :class="[itemClass, 'mt-auto rounded-t-none border-t border-white/8 pt-3']">
        <User class="size-[18px]" />
        Mi perfil
      </RouterLink>

      <button type="button" :class="[itemClass, 'w-full text-white/60 hover:bg-white/10']" @click="handleLogout">
        <LogOut class="size-[18px]" />
        Cerrar sesión
      </button>
    </aside>

    <main class="ml-[220px] flex-1 p-8">
      <RouterView />
    </main>
  </div>
</template>
