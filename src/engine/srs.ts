// Simple Leitner-style spaced repetition. Each player sits in a box 0–4:
// a first-try correct answer moves him up, a struggle moves him down.
// Lower boxes and overdue players are picked more often.

export interface PlayerProgress {
  seen: boolean
  box: number
  correct: number
  wrong: number
  lastSeen: number
  /** Timestamp after which the player is due for review. */
  due: number
}

export type LearnStatus = 'new' | 'practicing' | 'almost' | 'mastered'

export const STATUS_LABEL: Record<LearnStatus, string> = {
  new: 'חדש',
  practicing: 'מתרגל',
  almost: 'כמעט זוכר',
  mastered: 'מכיר מצוין',
}

export const MAX_BOX = 4
const MINUTE = 60_000
const INTERVALS = [0, 2 * MINUTE, 20 * MINUTE, 24 * 60 * MINUTE, 3 * 24 * 60 * MINUTE]

export function emptyProgress(): PlayerProgress {
  return { seen: false, box: 0, correct: 0, wrong: 0, lastSeen: 0, due: 0 }
}

export function statusOf(p: PlayerProgress | undefined): LearnStatus {
  if (!p || !p.seen) return 'new'
  if (p.box <= 1) return 'practicing'
  if (p.box < MAX_BOX) return 'almost'
  return 'mastered'
}

/** "Learned" for medals and the home-screen counter. */
export function isLearned(p: PlayerProgress | undefined): boolean {
  return !!p && p.seen && p.box >= 2
}

export function applySeen(p: PlayerProgress, now: number): PlayerProgress {
  return { ...p, seen: true, lastSeen: now }
}

export function applyAnswer(p: PlayerProgress, firstTry: boolean, now: number): PlayerProgress {
  const box = firstTry ? Math.min(MAX_BOX, p.box + 1) : Math.max(0, p.box - 1)
  return { ...p, seen: true, box, correct: p.correct + 1, lastSeen: now, due: now + INTERVALS[box] }
}

export function applyMistake(p: PlayerProgress, now: number): PlayerProgress {
  return { ...p, seen: true, wrong: p.wrong + 1, lastSeen: now }
}

const BOX_WEIGHT = [6, 4, 2.5, 1.5, 0.6]

export function weightOf(p: PlayerProgress | undefined, now: number): number {
  if (!p || !p.seen) return 5
  const base = BOX_WEIGHT[Math.min(p.box, MAX_BOX)]
  return now >= p.due ? base * 1.6 : base * 0.5
}

/** Weighted random pick that avoids the most recent players when possible. */
export function pickNext(
  pool: string[],
  progress: Record<string, PlayerProgress>,
  recent: string[],
  now: number,
  rng: () => number = Math.random,
): string {
  if (!pool.length) throw new Error('empty pool')
  const avoid = new Set(recent.slice(-Math.min(recent.length, Math.max(0, pool.length - 1), 2)))
  const choices = pool.filter((id) => !avoid.has(id))
  const weights = choices.map((id) => weightOf(progress[id], now))
  const total = weights.reduce((a, b) => a + b, 0)
  let r = rng() * total
  for (let i = 0; i < choices.length; i++) {
    r -= weights[i]
    if (r <= 0) return choices[i]
  }
  return choices[choices.length - 1]
}
