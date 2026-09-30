<script setup lang="ts">
import type { NavItem } from './nav-item'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { LogOut } from '@lucide/vue'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/app/shared/presentation/components/ui/sidebar'

/**
 * AppShell — marco de las superficies autenticadas (usuario y admin):
 * sidebar navy colapsable a íconos en desktop, drawer en móvil (<768px) y
 * barra superior móvil con el disparador. Ctrl/⌘+B alterna el sidebar.
 */
defineProps<{
  nav:        NavItem[]
  footerNav:  NavItem[]
  tag?:       string
  email?:     string
  navLabel:   string
}>()

const emit = defineEmits<{ logout: [] }>()

const route = useRoute()

function isActive(item: NavItem) {
  return item.exact ? route.path === item.to : route.path.startsWith(item.to)
}
</script>

<template>
  <SidebarProvider>
    <Sidebar collapsible="icon" class="border-r-0">
      <SidebarHeader class="mb-5 flex-row items-center gap-2 px-3 pt-5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
        <SidebarTrigger class="hidden size-8 shrink-0 rounded-md bg-white/8 text-white/70 hover:bg-white/15 hover:text-white md:inline-flex" />
        <span class="truncate text-[17px] font-bold text-white group-data-[collapsible=icon]:hidden">ParkVision</span>
        <span
          v-if="tag"
          class="rounded bg-amber px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.5px] text-white uppercase group-data-[collapsible=icon]:hidden"
        >{{ tag }}</span>
      </SidebarHeader>

      <SidebarContent class="px-3 group-data-[collapsible=icon]:px-2">
        <nav :aria-label="navLabel">
          <SidebarMenu class="gap-1">
            <SidebarMenuItem v-for="item in nav" :key="item.to">
              <SidebarMenuButton as-child :is-active="isActive(item)" :tooltip="item.label">
                <RouterLink :to="item.to" :aria-current="isActive(item) ? 'page' : undefined">
                  <component :is="item.icon" />
                  <span>{{ item.label }}</span>
                </RouterLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </nav>
      </SidebarContent>

      <SidebarFooter class="gap-1 px-3 pb-5 group-data-[collapsible=icon]:px-2">
        <span v-if="email" class="truncate px-2 pb-1 text-[11px] text-white/40 group-data-[collapsible=icon]:hidden">
          {{ email }}
        </span>
        <SidebarMenu class="gap-1 border-t border-sidebar-border pt-2">
          <SidebarMenuItem v-for="item in footerNav" :key="item.to">
            <SidebarMenuButton as-child :is-active="isActive(item)" :tooltip="item.label">
              <RouterLink :to="item.to" :aria-current="isActive(item) ? 'page' : undefined">
                <component :is="item.icon" />
                <span>{{ item.label }}</span>
              </RouterLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Cerrar sesión" class="text-white/60" @click="emit('logout')">
              <LogOut />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>

    <SidebarInset class="min-w-0 bg-background text-foreground">
      <!-- Mobile top bar -->
      <header class="sticky top-0 z-30 flex h-14 items-center gap-3 bg-navy px-3.5 md:hidden">
        <SidebarTrigger class="size-[38px] rounded-lg bg-white/10 text-white hover:bg-white/20 hover:text-white focus-visible:ring-amber" />
        <span class="text-base font-bold text-white">ParkVision</span>
      </header>

      <main class="flex-1 px-4 py-6 md:p-8">
        <RouterView />
      </main>
    </SidebarInset>
  </SidebarProvider>
</template>
