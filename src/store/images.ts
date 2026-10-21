// Photos a parent uploads stay on this device, in IndexedDB.
// They are referenced from player data as "idb:<key>".

import { del, get, set } from 'idb-keyval'
import { useEffect, useState } from 'react'

const PREFIX = 'idb:'
const MAX_SIDE = 1024
const urlCache = new Map<string, string>()

async function downscale(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    return await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.86))
  } catch {
    return file
  }
}

/** Stores the photo locally and returns the "idb:" reference to save on the player. */
export async function saveLocalImage(file: File): Promise<string> {
  const key = `photo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  await set(key, await downscale(file))
  return PREFIX + key
}

export async function deleteLocalImage(url: string) {
  if (!url.startsWith(PREFIX)) return
  const cached = urlCache.get(url)
  if (cached) URL.revokeObjectURL(cached)
  urlCache.delete(url)
  await del(url.slice(PREFIX.length))
}

async function resolveImageUrl(url: string): Promise<string | null> {
  if (!url.startsWith(PREFIX)) return url
  const cached = urlCache.get(url)
  if (cached) return cached
  const blob = await get<Blob>(url.slice(PREFIX.length))
  if (!blob) return null
  const objectUrl = URL.createObjectURL(blob)
  urlCache.set(url, objectUrl)
  return objectUrl
}

/** Resolves a player photo reference to something an <img> can show. */
export function useImageUrl(url: string | null | undefined): string | null {
  const immediate = url && !url.startsWith(PREFIX) ? url : url ? (urlCache.get(url) ?? null) : null
  const [resolved, setResolved] = useState<{ url: string; src: string | null } | null>(null)
  useEffect(() => {
    if (!url || immediate) return
    let alive = true
    resolveImageUrl(url).then((src) => alive && setResolved({ url, src }))
    return () => {
      alive = false
    }
  }, [url, immediate])
  if (immediate) return immediate
  return resolved && resolved.url === url ? resolved.src : null
}
