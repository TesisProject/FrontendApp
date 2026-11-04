<script setup lang="ts">
import { onMounted, onUnmounted, toRef } from 'vue'
import { useRouter } from 'vue-router'
import {
  Bell, BrainCircuit, ChartColumnBig, Cpu, Flame, KeyRound, LayoutGrid,
  ScrollText, Server, SquareParking, User, Users, Video,
} from '@lucide/vue'
import { useAuthStore } from '../../../iam/application/auth.store'
import { useCameraAlertsStore } from '../../../notifications/application/camera-alerts.store'
import AppShell from './AppShell.vue'
import type { NavGroup, NavItem } from './nav-item'

const router    = useRouter()
const authStore = useAuthStore()
// Campana de alertas de cámara (HU-17): avisos sin leer del usuario, refrescados cada 30 s.
const alertsStore = useCameraAlertsStore()

const nav: NavGroup[] = [
  { items: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutGrid },
    { to: '/admin/alerts',    label: 'Alertas',   icon: Bell, badge: toRef(alertsStore, 'unreadCount') },
  ] },
  { label: 'Estacionamiento', items: [
    { to: '/admin/zones',     label: 'Zonas',     icon: SquareParking },
    { to: '/admin/cameras',   label: 'Cámaras',   icon: Video },
  ] },
  { label: 'Análisis', items: [
    { to: '/admin/statistics', label: 'Estadísticas', icon: ChartColumnBig },
    { to: '/admin/demand',     label: 'Demanda',      icon: Flame },
    { to: '/admin/model',      label: 'Modelo IA',    icon: BrainCircuit },
  ] },
  { label: 'Infraestructura', items: [
    { to: '/admin/nodes',     label: 'Nodos',     icon: Server },
    { to: '/admin/firmware',  label: 'Firmware',  icon: Cpu },
    { to: '/admin/api-keys',  label: 'API Keys',  icon: KeyRound },
  ] },
  { label: 'Accesos', items: [
    { to: '/admin/users',     label: 'Usuarios',  icon: Users },
    { to: '/admin/audit',     label: 'Auditoría', icon: ScrollText },
  ] },
]

const footerNav: NavItem[] = [
  { to: '/admin/profile', label: 'Mi perfil', icon: User },
]

onMounted(() => alertsStore.startInboxPolling())
onUnmounted(() => alertsStore.stopInboxPolling())

function handleLogout() {
  alertsStore.stopInboxPolling()
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
