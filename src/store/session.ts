import type { Player } from '../data/types'
import { resolvePool } from '../engine/pool'
import { progressStore } from './progress'
import { getRoster } from './roster'
import { settingsStore } from './settings'

/** The players the child is practicing right now (stage / all / parent's pick). */
export function currentPool(): Player[] {
  const s = settingsStore.get()
  return resolvePool(getRoster(), s.poolMode, progressStore.get().stage, s.customPool)
}
