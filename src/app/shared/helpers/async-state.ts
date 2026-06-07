import { ref } from 'vue'

export function useAsyncState<T>(initial: T) {
  const data    = ref<T>(initial)
  const loading = ref(false)
  const error   = ref<string | null>(null)

  function setData(value: T) {
    data.value    = value as unknown as T
    loading.value = false
    error.value   = null
  }

  function setLoading(isLoading = true) {
    loading.value = isLoading
    if (isLoading) error.value = null
  }

  function setError(message: string) {
    error.value   = message
    loading.value = false
  }

  function reset() {
    data.value    = initial as unknown as T
    loading.value = false
    error.value   = null
  }

  return { data, loading, error, setData, setLoading, setError, reset }
}
