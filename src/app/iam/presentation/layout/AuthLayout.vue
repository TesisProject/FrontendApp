<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { RouterView } from 'vue-router'
import BrandWordmark from '../../../shared/presentation/components/BrandWordmark.vue'

const year = new Date().getFullYear()

// ── Signature: a live parking-availability grid that mimics ParkVision's
//    computer-vision feed. Spots flip between states like a real lot. ──
type Status = 'free' | 'moderate' | 'occupied'
const COLS = 8
const ROWS = 6
const TOTAL = COLS * ROWS

function randomStatus(): Status {
  const r = Math.random()
  if (r < 0.52) return 'free'
  if (r < 0.74) return 'moderate'
  return 'occupied'
}

const spots = ref<Status[]>(Array.from({ length: TOTAL }, randomStatus))
const reduceMotion = ref(false)
let flipTimer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  reduceMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduceMotion.value) return
  flipTimer = setInterval(() => {
    const i = Math.floor(Math.random() * TOTAL)
    let next = randomStatus()
    if (next === spots.value[i]) next = randomStatus()
    spots.value[i] = next
  }, 900)
})

onBeforeUnmount(() => clearInterval(flipTimer))
</script>

<template>
  <div class="grid min-h-screen grid-cols-1 min-[981px]:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)]">
    <!-- ───────────── Brand showcase ───────────── -->
    <aside class="showcase relative hidden flex-col overflow-hidden px-12 pt-[38px] pb-[30px] text-white min-[981px]:flex">
      <div class="showcase-glow showcase-glow--amber" />
      <div class="showcase-glow showcase-glow--green" />

      <header class="relative z-1">
        <BrandWordmark />
      </header>

      <div class="relative z-1 flex max-w-[460px] flex-1 flex-col justify-center py-6">
        <p class="mb-4 text-xs font-semibold tracking-[0.16em] text-[#f2a878] uppercase">
          Visión artificial en tiempo real
        </p>
        <h1 class="mb-3.5 font-display text-[38px] leading-[1.08] font-bold tracking-[-0.025em]">
          Encuentra estacionamiento<br />antes de llegar.
        </h1>
        <p class="mb-[34px] max-w-[400px] text-[15px] leading-[1.6] text-white/60">
          Cámaras inteligentes leen cada plaza y te muestran dónde aparcar
          en tu ciudad, plaza por plaza.
        </p>

        <!-- live availability grid -->
        <div class="mb-[22px]" aria-hidden="true">
          <div class="lot-stage">
            <div class="lot-grid">
              <span
                v-for="(s, i) in spots"
                :key="i"
                class="spot"
                :data-status="s"
              />
            </div>
            <div v-if="!reduceMotion" class="lot-scan" />
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-[18px] text-xs text-white/70">
          <span class="inline-flex items-center gap-[7px]"><i class="size-[9px] rounded-[3px] bg-[#16b178]" />Libre</span>
          <span class="inline-flex items-center gap-[7px]"><i class="size-[9px] rounded-[3px] bg-[#f2894a]" />Moderado</span>
          <span class="inline-flex items-center gap-[7px]"><i class="size-[9px] rounded-[3px] bg-[#ff5d5d]" />Ocupado</span>
          <span class="ml-auto inline-flex items-center gap-[7px] text-[11px] text-white/50">
            <i class="live-dot" aria-hidden="true" />En vivo · cada 30 s
          </span>
        </div>
      </div>

      <footer class="relative z-1 flex items-center justify-between text-xs text-white/45">
        <span>© {{ year }} ParkVision</span>
        <nav class="flex gap-5">
          <a href="#" class="text-white/55 hover:text-white">Términos</a>
          <a href="#" class="text-white/55 hover:text-white">Privacidad</a>
        </nav>
      </footer>
    </aside>

    <!-- ───────────── Form panel ───────────── -->
    <main class="flex flex-col overflow-y-auto bg-white px-[22px] pt-7 pb-10 min-[981px]:p-10">
      <div class="flex justify-center pt-3 pb-2 min-[981px]:hidden">
        <BrandWordmark tone="dark" />
      </div>
      <div class="m-auto w-full max-w-[410px]">
        <RouterView />
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Signature pieces (glows, live lot grid, scan line, pulse) stay as CSS:
   they are bespoke art direction, not layout. */
.showcase {
  background:
    radial-gradient(120% 80% at 15% 0%, #103057 0%, transparent 55%),
    linear-gradient(160deg, #0a1e38 0%, #07182e 55%, #060f20 100%);
}

.showcase-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  pointer-events: none;
}
.showcase-glow--amber {
  width: 460px; height: 460px;
  background: radial-gradient(circle, rgba(242, 137, 74, 0.32) 0%, transparent 70%);
  top: -160px; left: -120px;
}
.showcase-glow--green {
  width: 420px; height: 420px;
  background: radial-gradient(circle, rgba(22, 177, 120, 0.2) 0%, transparent 70%);
  bottom: -160px; right: -100px;
}

/* live parking grid */
.lot-stage {
  position: relative;
  width: 100%;
  max-width: 380px;
  perspective: 900px;
  -webkit-mask-image: linear-gradient(to bottom, #000 72%, transparent 100%);
  mask-image: linear-gradient(to bottom, #000 72%, transparent 100%);
}
.lot-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 7px;
  transform: rotateX(20deg);
  transform-origin: center top;
}
.spot {
  aspect-ratio: 1 / 1.5;
  border-radius: 5px;
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.05);
  transition: background 0.6s ease, border-color 0.6s ease, box-shadow 0.6s ease;
}
.spot[data-status='free'] {
  background: rgba(22, 177, 120, 0.18);
  border-color: rgba(22, 177, 120, 0.6);
  box-shadow: inset 0 0 10px rgba(22, 177, 120, 0.25);
}
.spot[data-status='moderate'] {
  background: rgba(242, 137, 74, 0.18);
  border-color: rgba(242, 137, 74, 0.55);
}
.spot[data-status='occupied'] {
  background: rgba(255, 93, 93, 0.16);
  border-color: rgba(255, 93, 93, 0.5);
}

.lot-scan {
  position: absolute;
  left: 0; right: 0; top: 0;
  height: 34%;
  background: linear-gradient(to bottom, transparent, rgba(22, 177, 120, 0.14), transparent);
  animation: lot-scan 3.4s linear infinite;
  pointer-events: none;
}
@keyframes lot-scan {
  0% { transform: translateY(-100%); opacity: 0; }
  15% { opacity: 1; }
  85% { opacity: 1; }
  100% { transform: translateY(320%); opacity: 0; }
}
</style>
