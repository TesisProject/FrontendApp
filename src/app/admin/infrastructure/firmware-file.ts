/**
 * Lee solo el primer byte de un fichero elegido por el usuario (no el binario entero) para
 * comprobar el byte mágico antes de subirlo. `null` si el fichero está vacío o no se puede leer.
 */
export function readFirstByte(file: File): Promise<number | null> {
  if (file.size === 0) return Promise.resolve(null)
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload  = () => resolve(new Uint8Array(reader.result as ArrayBuffer)[0] ?? null)
    reader.onerror = () => resolve(null)
    reader.readAsArrayBuffer(file.slice(0, 1))
  })
}
