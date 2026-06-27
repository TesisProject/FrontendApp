import { ref, onUnmounted } from 'vue'

const SEARCH_DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 2
const HIDE_DELAY_MS = 150

export interface PlaceSuggestion {
  mainText: string
  secondaryText: string
  prediction: google.maps.places.PlacePrediction
}

interface UsePlacesAutocompleteOptions {
  onSelect: (location: google.maps.LatLng | google.maps.LatLngLiteral) => void
}

export function usePlacesAutocomplete(options: UsePlacesAutocompleteOptions) {
  const search = ref('')
  const suggestions = ref<PlaceSuggestion[]>([])
  const showSuggestions = ref(false)

  let placesLib: google.maps.PlacesLibrary | null = null
  let sessionToken: google.maps.places.AutocompleteSessionToken | null = null
  let suggestTimer: ReturnType<typeof setTimeout> | null = null

  async function init() {
    placesLib = (await google.maps.importLibrary(
      'places',
    )) as google.maps.PlacesLibrary
  }

  async function fetchSuggestions(input: string) {
    if (!placesLib || input.trim().length < MIN_QUERY_LENGTH) {
      suggestions.value = []
      showSuggestions.value = false
      return
    }
    if (!sessionToken) sessionToken = new placesLib.AutocompleteSessionToken()
    try {
      const { suggestions: results } =
        await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          sessionToken,
          includedRegionCodes: ['pe'],
        })
      suggestions.value = results
        .map((s): PlaceSuggestion | null => {
          const pred = s.placePrediction
          if (!pred) return null
          return {
            mainText:
              pred.mainText?.toString() ?? pred.text?.toString() ?? '',
            secondaryText: pred.secondaryText?.toString() ?? '',
            prediction: pred,
          }
        })
        .filter((s): s is PlaceSuggestion => s !== null)
      showSuggestions.value = suggestions.value.length > 0
    } catch (err: unknown) {
      console.error('[Places] error:', err)
      suggestions.value = []
      showSuggestions.value = false
    }
  }

  function onInput() {
    if (suggestTimer) clearTimeout(suggestTimer)
    suggestTimer = setTimeout(
      () => fetchSuggestions(search.value),
      SEARCH_DEBOUNCE_MS,
    )
  }

  async function select(item: PlaceSuggestion) {
    showSuggestions.value = false
    suggestions.value = []
    sessionToken = null
    const place = item.prediction.toPlace()
    await place.fetchFields({ fields: ['location'] })
    if (place.location) {
      options.onSelect(place.location)
      search.value = ''
    }
  }

  function hide() {
    setTimeout(() => {
      showSuggestions.value = false
    }, HIDE_DELAY_MS)
  }

  onUnmounted(() => {
    if (suggestTimer) clearTimeout(suggestTimer)
  })

  return { search, suggestions, showSuggestions, init, onInput, select, hide }
}
