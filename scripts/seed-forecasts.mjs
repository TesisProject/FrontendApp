#!/usr/bin/env node
/**
 * Siembra forecasts ficticios (pero con curvas realistas) en el servicio de
 * predicción, para demos y desarrollo del frontend.
 *
 * Uso:
 *   node scripts/seed-forecasts.mjs --token <jwt-admin> [--base http://localhost:8080/api/v1] [--zone 1]
 *   node scripts/seed-forecasts.mjs --email admin@x.com --password secret
 *
 * Los POST son upserts: re-ejecutar el script actualiza los valores.
 */

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]])
    return acc
  }, []),
)

const BASE = args.base ?? 'http://localhost:8080/api/v1'
const ZONE_ID = Number(args.zone ?? 1)
const MODEL_VERSION = args.model ?? '1.0.0'
// El backend solo acepta ventanas de 15 o 30 minutos (TimeWindow VO).
const WINDOW_MIN = 30
const START_HOUR = 6
const END_HOUR = 22 // exclusivo: última ventana 21:30–22:00
const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
const CONCURRENCY = 10

async function getToken() {
  if (args.token) return args.token
  if (args.email && args.password) {
    const res = await fetch(`${BASE}/iam/auth/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: args.email, password: args.password }),
    })
    if (!res.ok) throw new Error(`Sign-in falló: ${res.status}`)
    return (await res.json()).token
  }
  throw new Error('Falta --token o --email/--password')
}

/**
 * Curva de disponibilidad por hora del día:
 * temprano libre → pico de entrada → mediodía lleno → tarde moderada →
 * pico de salida → noche liberándose. Fin de semana más holgado en horas laborales.
 */
function availability(day, startMinute, spotSeed) {
  const hour = startMinute / 60
  let base
  if (hour < 8) base = 0.85
  else if (hour < 10) base = 0.35
  else if (hour < 14) base = 0.2
  else if (hour < 17) base = 0.45
  else if (hour < 20) base = 0.25
  else base = 0.7

  const weekend = day === 'SATURDAY' || day === 'SUNDAY'
  if (weekend && hour >= 8 && hour < 20) base += 0.15

  // Jitter determinista por espacio y ventana para que la data no sea plana.
  const h = Math.sin(spotSeed * 7919 + startMinute * 104729 + DAYS.indexOf(day) * 1299709)
  const jitter = h * 0.08

  return Math.min(0.95, Math.max(0.05, +(base + jitter).toFixed(3)))
}

function windows() {
  const list = []
  for (let m = START_HOUR * 60; m < END_HOUR * 60; m += WINDOW_MIN) list.push(m)
  return list
}

async function run() {
  const token = await getToken()
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  const zoneRes = await fetch(`${BASE}/parking/zones/${ZONE_ID}`, { headers })
  if (!zoneRes.ok) throw new Error(`No se pudo leer la zona ${ZONE_ID}: ${zoneRes.status}`)
  const zone = await zoneRes.json()

  const spacesRes = await fetch(`${BASE}/parking/spaces?zoneId=${ZONE_ID}`, { headers })
  if (!spacesRes.ok) throw new Error(`No se pudieron leer los espacios: ${spacesRes.status}`)
  const spaces = await spacesRes.json()
  if (!spaces.length) throw new Error('La zona no tiene espacios registrados')

  console.log(`Zona "${zone.name}" (${zone.totalSpots ?? zone.totalSpaces} espacios de capacidad) · ${spaces.length} espacios en catálogo`)

  // ── Construir todos los payloads ──────────────────────────────────────────
  const spotJobs = []
  for (const space of spaces) {
    for (const day of DAYS) {
      for (const startMinuteOfDay of windows()) {
        spotJobs.push({
          url: `${BASE}/prediction/forecasts`,
          body: {
            parkingSpotId: space.id,
            dayOfWeek: day,
            startMinuteOfDay,
            windowSizeMinutes: WINDOW_MIN,
            availabilityProbability: availability(day, startMinuteOfDay, space.id),
            modelVersion: MODEL_VERSION,
          },
        })
      }
    }
  }

  // La comparación predicho-vs-real resuelve la "ventana actual" con granularidad
  // de 15 min sobre la hora UTC del servidor: la zona se siembra a 15 min las 24 h
  // (curva evaluada en hora local Lima = UTC-5) para que el panel siempre encuentre ventana.
  const zoneJobs = []
  for (const day of DAYS) {
    for (let startMinuteOfDay = 0; startMinuteOfDay < 24 * 60; startMinuteOfDay += 15) {
      const localMinute = (startMinuteOfDay - 5 * 60 + 24 * 60) % (24 * 60)
      const avg =
        spaces.reduce((s, sp) => s + availability(day, localMinute, sp.id), 0) / spaces.length
      zoneJobs.push({
        url: `${BASE}/prediction/zones/${ZONE_ID}/forecasts`,
        body: {
          dayOfWeek: day,
          startMinuteOfDay,
          windowSizeMinutes: 15,
          availabilityProbability: +avg.toFixed(3),
          totalSpots: spaces.length,
          modelVersion: MODEL_VERSION,
        },
      })
    }
  }

  const jobs = [...spotJobs, ...zoneJobs]
  console.log(`Sembrando ${spotJobs.length} forecasts de espacio + ${zoneJobs.length} de zona...`)

  // ── Ejecutar con concurrencia limitada ────────────────────────────────────
  let ok = 0
  let fail = 0
  let cursor = 0

  async function worker() {
    while (cursor < jobs.length) {
      const job = jobs[cursor++]
      try {
        const res = await fetch(job.url, { method: 'POST', headers, body: JSON.stringify(job.body) })
        if (res.ok || res.status === 201) ok++
        else {
          fail++
          if (fail <= 3) console.error(`  ✗ ${res.status} en ${job.url}:`, await res.text())
        }
      } catch (e) {
        fail++
        if (fail <= 3) console.error(`  ✗ ${e.message}`)
      }
      if ((ok + fail) % 200 === 0) console.log(`  ...${ok + fail}/${jobs.length}`)
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  console.log(`Listo: ${ok} upserts OK, ${fail} fallidos.`)
  if (fail > 0) process.exitCode = 1
}

run().catch(e => {
  console.error(e.message)
  process.exit(1)
})
