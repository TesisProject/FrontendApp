<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../../../app/iam/application/auth.store'
import { useFavoriteStore } from '../../application/favorite.store'
import { useZoneStore } from '../../../../app/parking/application/zone.store'
import type { ZoneClassification } from '../../../../app/parking/domain/model/zone.model'

const router        = useRouter()
const authStore     = useAuthStore()
const favoriteStore = useFavoriteStore()
const zoneStore     = useZoneStore()

const userId = computed(() => authStore.user?.id ?? 0)

const favoriteZones = computed(() => {
  const ids = favoriteStore.favoriteZoneIds
  return (zoneStore.zones as any[]).filter(z => ids.has(z.id))
})

const savedAtMap = computed(() => {
  const map = new Map<number, string>()
  favoriteStore.favorites.forEach(f => map.set(f.zoneId, f.savedAt))
  return map
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function classificationColor(c: ZoneClassification) {
  return { LIBRE: '#38a169', MODERADO: '#f2894a', OCUPADO: '#e53e3e' }[c]
}

function classificationLabel(c: ZoneClassification) {
  return { LIBRE: 'Libre', MODERADO: 'Moderado', OCUPADO: 'Ocupado' }[c]
}

async function handleRemove(zoneId: number) {
  await favoriteStore.removeFavorite(userId.value, zoneId)
}

onMounted(async () => {
  await Promise.all([
    favoriteStore.fetchFavorites(userId.value),
    (zoneStore.zones as any[]).length === 0 ? zoneStore.fetchZones() : Promise.resolve(),
  ])
})
</script>

<template>
  <div class="favorites-page">

    <div class="page-header">
      <div>
        <h1 class="page-title">Mis Favoritos</h1>
        <p class="page-subtitle">Zonas que guardaste para acceso rápido</p>
      </div>
      <span v-if="favoriteZones.length > 0" class="count-badge">
        {{ favoriteZones.length }} {{ favoriteZones.length === 1 ? 'zona' : 'zonas' }}
      </span>
    </div>

    <!-- Loading -->
    <div v-if="favoriteStore.loading || zoneStore.zonesLoading" class="center-state">
      <span class="state-text">Cargando favoritos...</span>
    </div>

    <!-- Error -->
    <div v-else-if="favoriteStore.error" class="center-state">
      <span class="state-text error">{{ favoriteStore.error }}</span>
    </div>

    <!-- Empty state -->
    <div v-else-if="favoriteZones.length === 0" class="empty-state">
      <div class="empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </div>
      <p class="empty-title">Sin zonas guardadas</p>
      <p class="empty-sub">Guarda zonas desde el detalle para acceder a ellas rápidamente.</p>
      <button class="btn-explore" @click="router.push('/dashboard/zones')">
        Explorar zonas
      </button>
    </div>

    <!-- Zones grid -->
    <div v-else class="zones-grid">
      <div
        v-for="zone in favoriteZones"
        :key="zone.id"
        class="zone-card"
      >
        <div class="card-header">
          <div class="card-info">
            <p class="zone-name">{{ zone.name }}</p>
            <p class="zone-address">{{ zone.street }}, {{ zone.district }}</p>
          </div>
          <div class="card-actions">
            <span class="badge" :style="{ background: classificationColor(zone.classification) }">
              {{ classificationLabel(zone.classification) }}
            </span>
            <button class="remove-btn" title="Quitar de favoritos" @click="handleRemove(zone.id)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="bar-wrap">
          <div class="bar">
            <div class="bar-fill" :style="{ width: zone.occupancyPercentage + '%', background: classificationColor(zone.classification) }" />
          </div>
          <span class="bar-pct">{{ Math.round(zone.occupancyPercentage) }}%</span>
        </div>

        <div class="spaces-row">
          <span class="stat free">{{ zone.freeCount }} libres</span>
          <span class="sep">·</span>
          <span class="stat occupied">{{ zone.occupiedCount }} ocupados</span>
          <span class="sep">·</span>
          <span class="stat total">{{ zone.totalSpaces }} total</span>
        </div>

        <div class="card-footer">
          <span class="saved-at" v-if="savedAtMap.get(zone.id)">
            Guardado el {{ formatDate(savedAtMap.get(zone.id)!) }}
          </span>
          <button class="detail-link" @click="router.push(`/dashboard/zones/${zone.id}`)">
            Ver detalle →
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.favorites-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: #092c4c;
  margin: 0 0 4px;
}

.page-subtitle {
  font-size: 13px;
  color: #888;
  margin: 0;
}

.count-badge {
  background: #eef2f7;
  color: #092c4c;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 12px;
  margin-top: 4px;
}

.center-state {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}
.state-text       { font-size: 14px; color: #aaa; }
.state-text.error { color: #e53e3e; }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 0;
  gap: 10px;
}
.empty-icon  { margin-bottom: 8px; }
.empty-title { font-size: 16px; font-weight: 600; color: #555; margin: 0; }
.empty-sub   { font-size: 13px; color: #aaa; margin: 0; text-align: center; }

.btn-explore {
  margin-top: 8px;
  padding: 8px 20px;
  background: #092c4c;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-explore:hover { background: #0d3d6b; }

.zones-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.zone-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e8e8e8;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: box-shadow 0.2s;
}
.zone-card:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.09); }

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.zone-name {
  font-size: 14px;
  font-weight: 700;
  color: #092c4c;
  margin: 0 0 3px;
}

.zone-address {
  font-size: 12px;
  color: #888;
  margin: 0;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.badge {
  padding: 3px 9px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 700;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.remove-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #ccc;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  transition: color 0.2s, background 0.2s;
}
.remove-btn:hover { color: #e53e3e; background: #fde8e8; }

.bar-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.bar {
  flex: 1;
  height: 5px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s;
}
.bar-pct {
  font-size: 11px;
  font-weight: 600;
  color: #666;
  min-width: 28px;
  text-align: right;
}

.spaces-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.stat          { font-size: 11px; }
.stat.free     { color: #38a169; font-weight: 600; }
.stat.occupied { color: #e53e3e; font-weight: 600; }
.stat.total    { color: #bbb; }
.sep           { color: #ddd; font-size: 11px; }

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid #f5f5f5;
}

.saved-at {
  font-size: 11px;
  color: #bbb;
}

.detail-link {
  background: none;
  border: none;
  padding: 0;
  font-size: 11px;
  font-weight: 600;
  color: #f2894a;
  cursor: pointer;
  transition: color 0.2s;
}
.detail-link:hover { color: #e07a3a; }
</style>
