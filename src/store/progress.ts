// The child's learning progress and rewards, saved on this device.
// Rewards: 10 points per correct answer, a bonus star every 3 correct in a
// row, a medal for every 5 players learned. Mistakes never cost anything.

import type { Player } from '../data/types'
import { STAGE_COUNT, stageReady } from '../engine/pool'
import { applyAnswer, applyMistake, applySeen, emptyProgress, isLearned, type PlayerProgress } from '../engine/srs'
import { createStore, useStore } from './createStore'

export interface ProgressState {
  players: Record<string, PlayerProgress>
  points: number
  stars: number
  medals: number
  streak: number
  bestStreak: number
  stage: number
  rounds: number
}

const INITIAL: ProgressState = { players: {}, points: 0, stars: 0, medals: 0, streak: 0, bestStreak: 0, stage: 1, rounds: 0 }

export const progressStore = createStore<ProgressState>(INITIAL, 'beitar.progress.v1')
export const useProgress = () => useStore(progressStore)

export const POINTS_PER_CORRECT = 10
export const STREAK_FOR_STAR = 3
export const PLAYERS_PER_MEDAL = 5

export interface Rewards {
  points: number
  starEarned: boolean
  medalEarned: boolean
}

export function learnedCount(roster: Player[], s: ProgressState = progressStore.get()): number {
  return roster.filter((p) => p.active && isLearned(s.players[p.id])).length
}

function player(s: ProgressState, id: string): PlayerProgress {
  return s.players[id] ?? emptyProgress()
}

export function markSeen(id: string) {
  progressStore.set((s) => ({ ...s, players: { ...s.players, [id]: applySeen(player(s, id), Date.now()) } }))
}

/** A wrong attempt: noted for spaced repetition, breaks the streak, costs no points. */
export function recordMistake(id: string) {
  progressStore.set((s) => ({ ...s, streak: 0, players: { ...s.players, [id]: applyMistake(player(s, id), Date.now()) } }))
}

export function recordCorrect(id: string, firstTry: boolean, roster: Player[]): Rewards {
  const before = progressStore.get()
  const streak = before.streak + 1
  const starEarned = streak % STREAK_FOR_STAR === 0
  const players = { ...before.players, [id]: applyAnswer(player(before, id), firstTry, Date.now()) }
  const medalsDue = Math.floor(learnedCount(roster, { ...before, players }) / PLAYERS_PER_MEDAL)
  const medalEarned = medalsDue > before.medals
  progressStore.set({
    ...before,
    players,
    points: before.points + POINTS_PER_CORRECT,
    stars: before.stars + (starEarned ? 1 : 0),
    medals: Math.max(before.medals, medalsDue),
    streak,
    bestStreak: Math.max(before.bestStreak, streak),
  })
  return { points: POINTS_PER_CORRECT, starEarned, medalEarned }
}

/** Memory-game pair: points and familiarity, but no spaced-repetition box change. */
export function recordPair(id: string) {
  progressStore.set((s) => ({
    ...s,
    points: s.points + POINTS_PER_CORRECT,
    players: { ...s.players, [id]: applySeen(player(s, id), Date.now()) },
  }))
}

export function addStar() {
  progressStore.set((s) => ({ ...s, stars: s.stars + 1 }))
}

/** Called at the end of a round; returns the new stage if the child moved up. */
export function finishRound(roster: Player[]): number | null {
  const s = progressStore.get()
  const up = stageReady(roster, s.stage, s.players)
  const stage = up ? Math.min(STAGE_COUNT, s.stage + 1) : s.stage
  progressStore.set({ ...s, rounds: s.rounds + 1, stage })
  return up ? stage : null
}

export function setStage(stage: number) {
  progressStore.set((s) => ({ ...s, stage: Math.min(Math.max(1, stage), STAGE_COUNT) }))
}

export function resetProgress() {
  progressStore.set(INITIAL)
}
