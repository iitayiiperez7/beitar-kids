import { useSyncExternalStore } from 'react'

export interface Store<T> {
  get(): T
  set(next: T | ((prev: T) => T)): void
  subscribe(listener: () => void): () => void
}

/** Tiny observable store, optionally persisted to localStorage. */
export function createStore<T>(initial: T, persistKey?: string): Store<T> {
  let state = initial
  if (persistKey) {
    try {
      const raw = localStorage.getItem(persistKey)
      if (raw) {
        const parsed = JSON.parse(raw) as T
        state = typeof initial === 'object' && !Array.isArray(initial) ? { ...initial, ...parsed } : parsed
      }
    } catch {
      /* private mode or corrupted data: start fresh */
    }
  }
  const listeners = new Set<() => void>()
  return {
    get: () => state,
    set(next) {
      state = typeof next === 'function' ? (next as (prev: T) => T)(state) : next
      if (persistKey) {
        try {
          localStorage.setItem(persistKey, JSON.stringify(state))
        } catch {
          /* storage full or blocked */
        }
      }
      listeners.forEach((l) => l())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}
