<script setup lang="ts">
import {
  classificationColor,
  classificationLabel,
} from '../../domain/zone-classification'
import type { Zone } from '../../domain/model/zone.model'
import IconPin from '../../../shared/presentation/components/IconPin.vue'
import IconArrowRight from '../../../shared/presentation/components/IconArrowRight.vue'

defineProps<{
  zone: Zone
  selected: boolean
  isFavorite: boolean
}>()

defineEmits<{
  focus: []
  'toggle-favorite': []
  'view-detail': []
}>()
</script>

<template>
  <div
    class="zone-card"
    :class="{ selected }"
    role="button"
    tabindex="0"
    @click="$emit('focus')"
    @keydown.enter.prevent="$emit('focus')"
    @keydown.space.prevent="$emit('focus')"
  >
    <span
      class="zone-spine"
      :style="{ background: classificationColor(zone.classification) }"
    />
    <div class="zone-body">
      <div class="card-head">
        <div class="card-title-wrap">
          <p class="zone-name">{{ zone.name }}</p>
          <p class="zone-address">
            <IconPin :size="11" />
            {{ zone.street }}, {{ zone.district }}
          </p>
        </div>
        <button
          class="fav-icon-btn"
          :class="{ active: isFavorite }"
          :aria-pressed="isFavorite"
          :aria-label="
            isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'
          "
          :title="isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'"
          @click.stop="$emit('toggle-favorite')"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            :fill="isFavorite ? 'currentColor' : 'none'"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
            />
          </svg>
        </button>
      </div>

      <div class="avail-row">
        <div class="avail-figure">
          <span
            class="avail-num"
            :style="{ color: classificationColor(zone.classification) }"
            >{{ zone.freeCount }}</span
          >
          <span class="avail-text">
            <span class="avail-t1">libres</span>
            <span class="avail-t2">de {{ zone.totalSpaces }} espacios</span>
          </span>
        </div>
        <span
          class="status-pill"
          :style="{ background: classificationColor(zone.classification) }"
        >
          {{ classificationLabel(zone.classification) }}
        </span>
      </div>

      <div class="meter">
        <div class="meter-track">
          <div
            class="meter-fill"
            :style="{
              width: zone.occupancyPercentage + '%',
              background: classificationColor(zone.classification),
            }"
          />
        </div>
        <span class="meter-pct"
          >{{ Math.round(zone.occupancyPercentage) }}% ocupado</span
        >
      </div>

      <button class="detail-link" @click.stop="$emit('view-detail')">
        Ver detalle
        <IconArrowRight :size="13" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.zone-card {
  position: relative;
  display: flex;
  background: #fff;
  border-radius: 12px;
  border: 1.5px solid #eef1f4;
  box-shadow: 0 1px 3px rgba(10, 30, 60, 0.05);
  cursor: pointer;
  overflow: hidden;
  transition:
    border-color 0.2s,
    box-shadow 0.2s,
    transform 0.2s;
}

.zone-card:hover {
  box-shadow: 0 6px 18px rgba(10, 30, 60, 0.12);
  transform: translateY(-2px);
}
.zone-card.selected {
  border-color: #f2894a;
  box-shadow: 0 6px 18px rgba(242, 137, 74, 0.22);
}

.zone-spine {
  width: 4px;
  flex-shrink: 0;
}

.zone-body {
  flex: 1;
  min-width: 0;
  padding: 14px 15px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.card-title-wrap { min-width: 0; }

.zone-name {
  font-size: 15px;
  font-weight: 700;
  color: #0a1e38;
  margin: 0 0 4px;
  line-height: 1.2;
}

.zone-address {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #8a98a8;
  margin: 0;
}
.zone-address svg { flex-shrink: 0; color: #b3bdc8; }

.fav-icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #cfd6de;
  padding: 3px;
  display: flex;
  align-items: center;
  border-radius: 6px;
  flex-shrink: 0;
  transition: color 0.2s, background 0.2s;
}
.fav-icon-btn:hover { color: #f2894a; background: #fff5ef; }
.fav-icon-btn.active { color: #f2894a; }

.avail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.avail-figure {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.avail-num {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.02em;
}

.avail-text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}
.avail-t1 { font-size: 12px; font-weight: 600; color: #3d4a5a; }
.avail-t2 { font-size: 11px; color: #9aa7b4; }

.status-pill {
  padding: 4px 11px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  white-space: nowrap;
  flex-shrink: 0;
}

.meter {
  display: flex;
  align-items: center;
  gap: 9px;
}
.meter-track {
  flex: 1;
  height: 7px;
  background: #eef1f4;
  border-radius: 6px;
  overflow: hidden;
}
.meter-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.5s ease;
}
.meter-pct {
  font-size: 11px;
  font-weight: 600;
  color: #6b7a8a;
  white-space: nowrap;
}

.detail-link {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: none;
  padding: 0;
  font-size: 12px;
  font-weight: 600;
  color: #f2894a;
  cursor: pointer;
  transition: gap 0.2s, color 0.2s;
}
.detail-link:hover { gap: 8px; color: #e07a3a; }
</style>
