import { describe, expect, it } from 'vitest'
import { SEED_PLAYERS } from '../data/players'
import { normalizeHebrew } from './hebrew'
import { countPlayers, numberToHebrew, parseHebrewNumber } from './hebrewNumbers'
import { matchNameAnswer, matchNumberAnswer, type SpeechAlternative } from './matching'
import { resolvePool, stagePool, stageReady } from './pool'
import { buildQuestion } from './questions'
import { applyAnswer, emptyProgress, pickNext, statusOf } from './srs'

const said = (...t: string[]): SpeechAlternative[] => t.map((transcript, i) => ({ transcript, confidence: i === 0 ? 0.9 : 0 }))
const byId = (id: string) => SEED_PLAYERS.find((p) => p.id === id)!
const active = SEED_PLAYERS.filter((p) => p.active)

/** Spoken-answer verdict for a question about `id`, built like the game does. */
function answer(mode: 'who' | 'complete' | 'numbers', id: string, part: 'first' | 'last' | null, alts: SpeechAlternative[]) {
  // Force the question variant with a fixed rng: <0.3 asks first name / <0.6 asks the number.
  const rng = part === 'first' ? () => 0.1 : () => 0.95
  const q = buildQuestion(mode, byId(id), active, SEED_PLAYERS, rng)
  return q.voice.type === 'number' ? matchNumberAnswer(alts, q.voice.target) : matchNameAnswer(alts, id, q.voice.candidates)
}

describe('normalizeHebrew', () => {
  it('strips niqqud, geresh and final letters', () => {
    expect(normalizeHebrew("יוּגִ'ין")).toBe('יוגינ')
    expect(normalizeHebrew('שׁוּעָה!')).toBe('שועה')
    expect(normalizeHebrew('  זה   כהן ')).toBe('זה כהנ')
  })
})

describe('Hebrew numbers', () => {
  it.each([
    ['שבעים ושבע', 77],
    ['שבע שבע', 77],
    ['77', 77],
    ['7 7', 77],
    ['עשרים ושש', 26],
    ['ארבעים וארבע', 44],
    ['שתים עשרה', 12],
    ['תשע אחת', 91],
    ['המספר שלו הוא שבע', 7],
    ['חמישים וחמש', 55],
    ['עשר', 10],
    ['אחת עשרה', 11],
    ['שלושים', 30],
    ['תשעים ואחת', 91],
  ])('parses "%s" → %i', (text, n) => expect(parseHebrewNumber(text)).toBe(n))

  it('returns null without a number', () => {
    expect(parseHebrewNumber('בננה')).toBeNull()
    expect(parseHebrewNumber('')).toBeNull()
  })

  it('speaks numbers', () => {
    expect(numberToHebrew(77)).toBe('שבעים ושבע')
    expect(numberToHebrew(2)).toBe('שתיים')
    expect(numberToHebrew(13)).toBe('שלוש עשרה')
    expect(numberToHebrew(91)).toBe('תשעים ואחת')
    expect(numberToHebrew(30)).toBe('שלושים')
    expect(countPlayers(8)).toBe('שמונה שחקנים')
    expect(countPlayers(1)).toBe('שחקן אחד')
    expect(countPlayers(22)).toBe('עשרים ושניים שחקנים')
  })
})

describe('complete the name (last name)', () => {
  it('accepts the right last name and close pronunciations', () => {
    expect(answer('complete', 'yarden-shua', 'last', said('שועה')).kind).toBe('correct')
    expect(answer('complete', 'yarden-shua', 'last', said('ירדן שועה')).kind).toBe('correct')
    expect(answer('complete', 'eugene-ansah', 'last', said('אנסא')).kind).toBe('correct')
    expect(answer('complete', 'daniel-worko', 'last', said('ורקו')).kind).toBe('correct')
    expect(answer('complete', 'boris-enow', 'last', said('אנו')).kind).toBe('correct')
    expect(answer('complete', 'ziv-ben-shimol', 'last', said('בן שימול')).kind).toBe('correct')
  })

  it('rejects another player and nonsense', () => {
    expect(answer('complete', 'yarden-shua', 'last', said('אצילי'))).toMatchObject({ kind: 'wrong', matchedId: 'omer-atzili' })
    expect(answer('complete', 'yarden-shua', 'last', said('בננה')).kind).toBe('unclear')
    expect(answer('complete', 'yarden-shua', 'last', []).kind).toBe('unclear')
  })

  it('never accepts low-confidence recognition', () => {
    expect(answer('complete', 'yarden-shua', 'last', [{ transcript: 'שועה', confidence: 0.2 }]).kind).toBe('unclear')
    // Engines that report no confidence (0) fall back to strict matching.
    expect(answer('complete', 'yarden-shua', 'last', [{ transcript: 'שועה', confidence: 0 }]).kind).toBe('correct')
  })

  it('counts a shared last name as correct', () => {
    expect(answer('complete', 'gil-cohen', 'last', said('כהן')).kind).toBe('correct')
  })

  it('uses a lower alternative only when it is exact', () => {
    expect(answer('complete', 'omer-atzili', 'last', said('אצל לי', 'אצילי')).kind).toBe('correct')
  })
})

describe('complete the name (first name)', () => {
  it('accepts the first name and nicknames', () => {
    expect(answer('complete', 'daniel-worko', 'first', said('דניאל')).kind).toBe('correct')
    expect(answer('complete', 'daniel-worko', 'first', said('דני')).kind).toBe('correct')
    expect(answer('complete', 'eugene-ansah', 'first', said("יוג'ין")).kind).toBe('correct')
  })
  it('rejects a different first name', () => {
    expect(answer('complete', 'daniel-worko', 'first', said('עומר')).kind).toBe('wrong')
  })
})

describe('who is it', () => {
  it('accepts full name or a unique part', () => {
    expect(answer('who', 'omer-atzili', null, said('עומר אצילי')).kind).toBe('correct')
    expect(answer('who', 'omer-atzili', null, said('זה אצילי')).kind).toBe('correct')
    expect(answer('who', 'omer-atzili', null, said('עומר')).kind).toBe('correct')
  })
  it('asks for more when only a shared name is said', () => {
    expect(answer('who', 'yarden-shua', null, said('ירדן')).kind).toBe('ambiguous')
    expect(answer('who', 'gil-cohen', null, said('כהן')).kind).toBe('ambiguous')
  })
  it('rejects a different player', () => {
    expect(answer('who', 'yarden-shua', null, said('ירדן כהן'))).toMatchObject({ kind: 'wrong', matchedId: 'yarden-cohen' })
  })
})

describe('shirt numbers', () => {
  it('checks spoken numbers', () => {
    expect(answer('numbers', 'omer-atzili', 'first', said('שבעים ושבע')).kind).toBe('correct')
    expect(answer('numbers', 'omer-atzili', 'first', said('שבע שבע')).kind).toBe('correct')
    expect(answer('numbers', 'omer-atzili', 'first', said('שבע'))).toMatchObject({ kind: 'wrong', matchedId: '7' })
    expect(answer('numbers', 'omer-atzili', 'first', said('אני לא יודע')).kind).toBe('unclear')
  })
})

describe('roster data', () => {
  it('has unique ids and unique shirt numbers among active players', () => {
    expect(new Set(SEED_PLAYERS.map((p) => p.id)).size).toBe(SEED_PLAYERS.length)
    const numbers = active.map((p) => p.jerseyNumber).filter((n) => n !== null)
    expect(new Set(numbers).size).toBe(numbers.length)
  })
  it('only marks players active once verified', () => {
    for (const p of active) expect(p.dataVerified, p.id).toBe(true)
  })
})

describe('spaced repetition', () => {
  it('moves through the statuses', () => {
    let p = emptyProgress()
    expect(statusOf(p)).toBe('new')
    p = applyAnswer(p, true, 0)
    expect(statusOf(p)).toBe('practicing')
    p = applyAnswer(p, true, 0)
    expect(statusOf(p)).toBe('almost')
    p = applyAnswer(applyAnswer(p, true, 0), true, 0)
    expect(statusOf(p)).toBe('mastered')
    p = applyAnswer(p, false, 0)
    expect(statusOf(p)).toBe('almost')
  })

  it('does not repeat the last player and favors weak players', () => {
    const pool = ['a', 'b', 'c']
    const strong = { ...emptyProgress(), seen: true, box: 4, due: Infinity }
    const weak = { ...emptyProgress(), seen: true, box: 0 }
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 }
    let seed = 1
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < 2000; i++) counts[pickNext(pool, { a: strong, b: weak, c: weak }, ['c'], 1, rng)]++
    expect(counts.c).toBe(0)
    expect(counts.b).toBeGreaterThan(counts.a * 5)
  })
})

describe('stages', () => {
  it('starts with five players and grows', () => {
    expect(stagePool(SEED_PLAYERS, 1).map((p) => p.id)).toEqual(['yarden-shua', 'miguel-silva', 'shon-weissman', 'omer-atzili', 'adi-yona'])
    expect(stagePool(SEED_PLAYERS, 2)).toHaveLength(10)
    expect(stagePool(SEED_PLAYERS, 4)).toHaveLength(active.length)
    expect(resolvePool(SEED_PLAYERS, 'custom', 1, [])).toHaveLength(5)
  })
  it('advances when most of the stage is learned', () => {
    const learned = { ...emptyProgress(), seen: true, box: 2 }
    const progress = Object.fromEntries(stagePool(SEED_PLAYERS, 1).slice(0, 4).map((p) => [p.id, learned]))
    expect(stageReady(SEED_PLAYERS, 1, progress)).toBe(true)
    expect(stageReady(SEED_PLAYERS, 2, progress)).toBe(false)
  })
})
