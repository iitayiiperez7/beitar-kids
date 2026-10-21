import type { PoolMode } from '../engine/pool'
import { createStore, useStore } from './createStore'

export interface Settings {
  /** Quiet mode: no narration, captions only. */
  narrationMuted: boolean
  sfxMuted: boolean
  rate: number
  pitch: number
  voiceURI: string | null
  sttEnabled: boolean
  roundLength: number
  poolMode: PoolMode
  customPool: string[]
}

export const DEFAULT_SETTINGS: Settings = {
  narrationMuted: false,
  sfxMuted: false,
  rate: 0.9,
  pitch: 1.1,
  voiceURI: null,
  sttEnabled: true,
  roundLength: 8,
  poolMode: 'stage',
  customPool: [],
}

export const settingsStore = createStore<Settings>(DEFAULT_SETTINGS, 'beitar.settings.v1')

export const useSettings = () => useStore(settingsStore)

export function updateSettings(patch: Partial<Settings>) {
  settingsStore.set((s) => ({ ...s, ...patch }))
}
