// Builds one quiz question for a player: what the narrator asks, the tap
// options, and what a spoken answer is checked against.

import { POSITION_LABEL, type Player } from '../data/types'
import { spokenFirst, spokenFull, spokenLast } from '../data/names'
import type { Line } from '../speech/types'
import { normalizeHebrew } from './hebrew'
import { numberToHebrew } from './hebrewNumbers'
import type { AnswerCandidate } from './matching'
import { shuffle, type Rng } from './random'

export type QuizMode = 'who' | 'complete' | 'numbers'
export type QuestionKind = 'who' | 'lastName' | 'firstName' | 'numberOf' | 'whoHasNumber'

export interface QuizOption {
  id: string
  label: string
  spoken: string
  player?: Player
  number?: number
}

export type VoiceTarget = { type: 'name'; candidates: AnswerCandidate[] } | { type: 'number'; target: number }

export interface Question {
  kind: QuestionKind
  player: Player
  options: QuizOption[]
  correctId: string
  prompt: Line[]
  voice: VoiceTarget
  hint: Line[]
  /** What the child sees as the "blank" in complete-the-name. */
  partial?: { given: string; missing: 'first' | 'last' }
}

const OPTION_COUNT = 3

export function canAsk(mode: QuizMode, p: Player): boolean {
  return mode !== 'numbers' || p.jerseyNumber !== null
}

/** Distractor players: prefer the practice pool, fall back to the whole squad. */
function distractors(target: Player, pool: Player[], active: Player[], distinct: (p: Player) => string, rng: Rng): Player[] {
  const seen = new Set([distinct(target)])
  const out: Player[] = []
  for (const p of [...shuffle(pool, rng), ...shuffle(active, rng)]) {
    if (out.length >= OPTION_COUNT - 1) break
    const key = distinct(p)
    if (p.id === target.id || seen.has(key)) continue
    seen.add(key)
    out.push(p)
  }
  return out
}

const nameOption = (p: Player): QuizOption => ({ id: p.id, label: p.fullName, spoken: spokenFull(p), player: p })

export function whoCandidates(active: Player[]): AnswerCandidate[] {
  return active.map((p) => ({
    id: p.id,
    forms: [p.fullName, ...p.aliases, p.lastName, ...p.lastNameAliases, p.firstName, ...p.firstNameAliases],
  }))
}

function partCandidates(active: Player[], target: Player, part: 'first' | 'last'): AnswerCandidate[] {
  const main = (p: Player) => (part === 'first' ? p.firstName : p.lastName)
  const extra = (p: Player) => (part === 'first' ? p.firstNameAliases : p.lastNameAliases)
  const targetKey = normalizeHebrew(main(target))
  return active
    .filter((p) => p.id === target.id || normalizeHebrew(main(p)) !== targetKey)
    .map((p) => ({ id: p.id, forms: [main(p), ...extra(p)] }))
}

function numberHint(n: number): Line[] {
  if (n < 10) return [{ say: 'רמז: זה מספר קטן, פחות מעשר!' }]
  if (n < 20) return [{ say: 'רמז: הוא בין עשר לעשרים!' }]
  const tens = Math.floor(n / 10) * 10
  return [{ say: `רמז: הוא מתחיל ב${numberToHebrew(tens)}...`, show: `רמז: הוא מתחיל ב-${tens}...` }]
}

export function buildQuestion(mode: QuizMode, player: Player, pool: Player[], roster: Player[], rng: Rng = Math.random): Question {
  const active = roster.filter((p) => p.active)

  if (mode === 'who') {
    const others = distractors(player, pool, active, (p) => p.fullName, rng)
    const hintLine: Line =
      player.jerseyNumber !== null
        ? { say: `רמז: המספר שלו הוא ${numberToHebrew(player.jerseyNumber)}!`, show: `רמז: המספר שלו הוא ${player.jerseyNumber}!` }
        : { say: `רמז: הוא ${POSITION_LABEL[player.position]}!` }
    return {
      kind: 'who',
      player,
      options: shuffle([player, ...others], rng).map(nameOption),
      correctId: player.id,
      prompt: [{ say: 'מי השחקן הזה?' }],
      voice: { type: 'name', candidates: whoCandidates(active) },
      hint: [hintLine],
    }
  }

  if (mode === 'complete') {
    const askFirst = rng() < 0.3
    const part = askFirst ? 'first' : 'last'
    const value = (p: Player) => (askFirst ? p.firstName : p.lastName)
    const spokenValue = (p: Player) => (askFirst ? spokenFirst(p) : spokenLast(p))
    const others = distractors(player, pool, active, (p) => normalizeHebrew(value(p)), rng)
    const prompt: Line[] = askFirst
      ? [{ say: `זה ${spokenLast(player)}. מה השם הפרטי שלו?`, show: `זה ${player.lastName}. מה השם הפרטי שלו?` }]
      : [{ say: `זה ${spokenFirst(player)}...`, show: `זה ${player.firstName}...` }]
    return {
      kind: askFirst ? 'firstName' : 'lastName',
      player,
      options: shuffle([player, ...others], rng).map((p) => ({ id: p.id, label: value(p), spoken: spokenValue(p), player: p })),
      correctId: player.id,
      prompt,
      voice: { type: 'name', candidates: partCandidates(active, player, part) },
      hint: [{ say: `בוא נגיד ביחד: ${spokenFull(player)}!`, show: `בוא נגיד ביחד: ${player.fullName}!` }],
      partial: { given: askFirst ? player.lastName : player.firstName, missing: part },
    }
  }

  const n = player.jerseyNumber
  if (n === null) throw new Error(`no jersey number for ${player.id}`)

  if (rng() < 0.6) {
    const numbers = new Set([n])
    for (const p of shuffle(active, rng)) {
      if (numbers.size >= OPTION_COUNT) break
      if (p.jerseyNumber !== null) numbers.add(p.jerseyNumber)
    }
    while (numbers.size < OPTION_COUNT) numbers.add(1 + Math.floor(rng() * 99))
    return {
      kind: 'numberOf',
      player,
      options: shuffle([...numbers], rng).map((x) => ({ id: `n${x}`, label: String(x), spoken: numberToHebrew(x), number: x })),
      correctId: `n${n}`,
      prompt: [{ say: `איזה מספר יש ל${spokenFull(player)}?`, show: `איזה מספר יש ל${player.fullName}?` }],
      voice: { type: 'number', target: n },
      hint: numberHint(n),
    }
  }

  const others = distractors(player, pool.filter((p) => p.jerseyNumber !== n), active.filter((p) => p.jerseyNumber !== n), (p) => p.fullName, rng)
  return {
    kind: 'whoHasNumber',
    player,
    options: shuffle([player, ...others], rng).map(nameOption),
    correctId: player.id,
    prompt: [{ say: `מי משחק עם מספר ${numberToHebrew(n)}?`, show: `מי משחק עם מספר ${n}?` }],
    voice: { type: 'name', candidates: whoCandidates(active) },
    hint: [{ say: `רמז: השם הפרטי שלו הוא ${spokenFirst(player)}!`, show: `רמז: השם הפרטי שלו הוא ${player.firstName}!` }],
  }
}

/** Narration after a correct answer. */
export function correctLine(q: Question, praise: string): Line {
  const p = q.player
  switch (q.kind) {
    case 'who':
      return { say: `יש! זה ${spokenFull(p)}!`, show: `יש! זה ${p.fullName}!` }
    case 'lastName':
    case 'firstName':
      return { say: `${praise} ${spokenFull(p)}! תשובה נכונה!`, show: `${praise} ${p.fullName}! תשובה נכונה!` }
    case 'numberOf':
      return {
        say: `${praise} ל${spokenFull(p)} יש מספר ${numberToHebrew(p.jerseyNumber ?? 0)}!`,
        show: `${praise} ל${p.fullName} יש מספר ${p.jerseyNumber}!`,
      }
    case 'whoHasNumber':
      return {
        say: `${praise} ${spokenFull(p)} משחק עם מספר ${numberToHebrew(p.jerseyNumber ?? 0)}!`,
        show: `${praise} ${p.fullName} משחק עם מספר ${p.jerseyNumber}!`,
      }
  }
}

export const PRAISE = ['אלוף!', 'כל הכבוד!', 'נכון מאוד!', 'מדהים!', 'יופי!', 'וואו!']
