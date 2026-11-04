<script setup lang="ts">
import { useRouter } from 'vue-router'
import { CircleHelp, Heart, LayoutGrid, Sparkles, SquareParking, User } from '@lucide/vue'
import { useAuthStore } from '../../../iam/application/auth.store'
import AppShell from './AppShell.vue'
import type { NavGroup, NavItem } from './nav-item'

const router    = useRouter()
const authStore = useAuthStore()

// Orden de uso: buscar sitio primero; la ayuda baja al pie junto al perfil.
const nav: NavGroup[] = [
  { items: [
    { to: '/dashboard',                 label: 'Dashboard',       icon: LayoutGrid, exact: true },
    { to: '/dashboard/zones',           label: 'Zonas',           icon: SquareParking },
    { to: '/dashboard/recommendations', label: 'Recomendaciones', icon: Sparkles },
    { to: '/dashboard/favorites',       label: 'Favoritos',       icon: Heart },
  ] },
]

const footerNav: NavItem[] = [
  { to: '/dashboard/faq',     label: 'Ayuda',     icon: CircleHelp },
  { to: '/dashboard/profile', label: 'Mi perfil', icon: User },
]

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <AppShell
    :nav="nav"
    :footer-nav="footerNav"
    :email="authStore.user?.email"
    nav-label="Navegación principal"
    @logout="handleLogout"
  />
</template>
