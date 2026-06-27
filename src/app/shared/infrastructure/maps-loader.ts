import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { env } from '../../../environments/env'

let configured = false

export async function loadGoogleMaps(): Promise<void> {
  if (!configured) {
    setOptions({ key: env.googleMapsKey, v: 'weekly' })
    configured = true
  }
  await importLibrary('maps')
  await importLibrary('marker')
}
