// Which players the child practices: by stage, everyone, or a parent's pick.

import type { Player } from '../data/types'
import { isLearned, type PlayerProgress } from './srs'

export type PoolMode = 'stage' | 'all' | 'custom'

/** Cumulative stage sizes: 5 top players, +5, then 20, then the whole squad. */
export const STAGE_SIZES = [5, 10, 20, Infinity]
export const STAGE_COUNT = STAGE_SIZES.length
const STAGE_READY_RATIO = 0.8

export function sortedActive(roster: Player[]): Player[] {
  return roster
    .filter((p) => p.active)
    .sort((a, b) => a.learningPriority - b.learningPriority || (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999))
}

export function stagePool(roster: Player[], stage: number): Player[] {
  const size = STAGE_SIZES[Math.min(Math.max(stage, 1), STAGE_COUNT) - 1]
  return sortedActive(roster).slice(0, size)
}

export function resolvePool(roster: Player[], mode: PoolMode, stage: number, customIds: string[]): Player[] {
  if (mode === 'all') return sortedActive(roster)
  if (mode === 'custom') {
    const chosen = sortedActive(roster).filter((p) => customIds.includes(p.id))
    if (chosen.length) return chosen
  }
  return stagePool(roster, stage)
}

/** True when most of the current stage is learned and there is a next stage. */
export function stageReady(roster: Player[], stage: number, progress: Record<string, PlayerProgress>): boolean {
  if (stage >= STAGE_COUNT) return false
  const pool = stagePool(roster, stage)
  if (pool.length >= sortedActive(roster).length) return false
  const learned = pool.filter((p) => isLearned(progress[p.id])).length
  return pool.length > 0 && learned / pool.length >= STAGE_READY_RATIO
}

export function stageLabel(stage: number, roster: Player[]): string {
  const size = stagePool(roster, stage).length
  return `שלב ${stage} · ${size} שחקנים`
}
