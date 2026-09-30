<script setup lang="ts">
import { useRouter } from 'vue-router'
import {
  CircleUserRound, KeyRound, LayoutGrid, Server, TriangleAlert, User, Users, Video,
} from '@lucide/vue'
import { useAuthStore } from '../../../iam/application/auth.store'
import AppShell from './AppShell.vue'
import type { NavItem } from './nav-item'

const router    = useRouter()
const authStore = useAuthStore()

const nav: NavItem[] = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/admin/zones',     label: 'Zonas',     icon: CircleUserRound },
  { to: '/admin/cameras',   label: 'Cámaras',   icon: Video },
  { to: '/admin/nodes',     label: 'Nodos',     icon: Server },
  { to: '/admin/api-keys',  label: 'API Keys',  icon: KeyRound },
  { to: '/admin/alerts',    label: 'Alertas',   icon: TriangleAlert },
  { to: '/admin/users',     label: 'Usuarios',  icon: Users },
]

const footerNav: NavItem[] = [
  { to: '/admin/profile', label: 'Mi perfil', icon: User },
]

function handleLogout() {
  authStore.logout()
  router.push('/admin')
}
</script>

<template>
  <AppShell
    :nav="nav"
    :footer-nav="footerNav"
    tag="Admin"
    nav-label="Panel de administración"
    @logout="handleLogout"
  />
</template>
