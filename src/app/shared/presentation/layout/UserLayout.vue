<script setup lang="ts">
import { useRouter } from 'vue-router'
import { CircleHelp, CircleUserRound, Heart, LayoutGrid, User } from '@lucide/vue'
import { useAuthStore } from '../../../iam/application/auth.store'
import AppShell from './AppShell.vue'
import type { NavItem } from './nav-item'

const router    = useRouter()
const authStore = useAuthStore()

const nav: NavItem[] = [
  { to: '/dashboard',           label: 'Dashboard', icon: LayoutGrid, exact: true },
  { to: '/dashboard/zones',     label: 'Zonas',     icon: CircleUserRound },
  { to: '/dashboard/favorites', label: 'Favoritos', icon: Heart },
  { to: '/dashboard/faq',       label: 'Ayuda',     icon: CircleHelp },
]

const footerNav: NavItem[] = [
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
