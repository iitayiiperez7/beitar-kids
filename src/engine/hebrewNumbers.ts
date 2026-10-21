// Spoken Hebrew numbers (0–99): parsing what a child says, and producing
// words for the narrator.

import { normalizeHebrew } from './hebrew'

type NumToken = { kind: 'unit' | 'ten' | 'tens'; value: number }

const WORDS = new Map<string, NumToken>()
function add(kind: NumToken['kind'], value: number, words: string[]) {
  for (const w of words) WORDS.set(normalizeHebrew(w), { kind, value })
}
add('unit', 0, ['אפס'])
add('unit', 1, ['אחד', 'אחת'])
add('unit', 2, ['שתיים', 'שתים', 'שניים', 'שנים', 'שני', 'שתי'])
add('unit', 3, ['שלוש', 'שלושה', 'שלש', 'שלשה'])
add('unit', 4, ['ארבע', 'ארבעה'])
add('unit', 5, ['חמש', 'חמישה', 'חמשה'])
add('unit', 6, ['שש', 'שישה', 'ששה'])
add('unit', 7, ['שבע', 'שבעה'])
add('unit', 8, ['שמונה', 'שמנה'])
add('unit', 9, ['תשע', 'תשעה'])
add('ten', 10, ['עשר', 'עשרה'])
add('tens', 20, ['עשרים'])
add('tens', 30, ['שלושים', 'שלשים'])
add('tens', 40, ['ארבעים'])
add('tens', 50, ['חמישים', 'חמשים'])
add('tens', 60, ['שישים', 'ששים'])
add('tens', 70, ['שבעים'])
add('tens', 80, ['שמונים'])
add('tens', 90, ['תשעים'])

function classify(word: string): NumToken | null {
  const direct = WORDS.get(word)
  if (direct) return direct
  // "ושבע" → "שבע"
  if (word.startsWith('ו')) return WORDS.get(word.slice(1)) ?? null
  return null
}

/**
 * Parses a spoken number: "שבעים ושבע", "שבע שבע" (digit by digit),
 * "77", "7 7", "שתים עשרה". Returns null when no number is found.
 */
export function parseHebrewNumber(text: string): number | null {
  const norm = normalizeHebrew(text)
  const digitGroups = norm.match(/\d+/g)
  if (digitGroups) {
    if (digitGroups.length > 1 && digitGroups.every((g) => g.length === 1)) {
      return Number(digitGroups.slice(0, 2).join(''))
    }
    return Number(digitGroups[0])
  }

  const tokens = norm.split(' ').map(classify).filter((t): t is NumToken => t !== null)
  if (!tokens.length) return null

  const parts: number[] = []
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    const next = tokens[i + 1]
    if (t.kind === 'tens') {
      if (next?.kind === 'unit' && next.value > 0) {
        parts.push(t.value + next.value)
        i++
      } else parts.push(t.value)
    } else if (t.kind === 'unit') {
      if (next?.kind === 'ten') {
        parts.push(10 + t.value)
        i++
      } else parts.push(t.value)
    } else parts.push(10)
  }

  if (parts.length === 1) return parts[0]
  // Digit-by-digit: "שבע שבע" → 77, "תשע אחת" → 91
  if (parts.length === 2 && parts.every((p) => p < 10)) return parts[0] * 10 + parts[1]
  return parts[0]
}

const F_UNITS = ['אפס', 'אחת', 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע', 'שמונה', 'תשע']
const F_TEENS = ['עשר', 'אחת עשרה', 'שתים עשרה', 'שלוש עשרה', 'ארבע עשרה', 'חמש עשרה', 'שש עשרה', 'שבע עשרה', 'שמונה עשרה', 'תשע עשרה']
const TENS = ['', '', 'עשרים', 'שלושים', 'ארבעים', 'חמישים', 'שישים', 'שבעים', 'שמונים', 'תשעים']

/** Number as spoken when counting / reading a shirt: 77 → "שבעים ושבע". */
export function numberToHebrew(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 99) return String(n)
  if (n < 10) return F_UNITS[n]
  if (n < 20) return F_TEENS[n - 10]
  const unit = n % 10
  const tens = TENS[Math.floor(n / 10)]
  return unit ? `${tens} ו${F_UNITS[unit]}` : tens
}

const M_UNITS = ['', 'אחד', 'שניים', 'שלושה', 'ארבעה', 'חמישה', 'שישה', 'שבעה', 'שמונה', 'תשעה']
const M_TEENS = ['עשרה', 'אחד עשר', 'שנים עשר', 'שלושה עשר', 'ארבעה עשר', 'חמישה עשר', 'שישה עשר', 'שבעה עשר', 'שמונה עשר', 'תשעה עשר']

/** "שחקן אחד", "שני שחקנים", "שמונה שחקנים", "עשרים ושניים שחקנים". */
export function countPlayers(n: number): string {
  if (n === 1) return 'שחקן אחד'
  if (n === 2) return 'שני שחקנים'
  let words: string
  if (n < 10) words = M_UNITS[n]
  else if (n < 20) words = M_TEENS[n - 10]
  else if (n < 100) {
    const unit = n % 10
    words = unit ? `${TENS[Math.floor(n / 10)]} ו${M_UNITS[unit]}` : TENS[Math.floor(n / 10)]
  } else words = String(n)
  return `${words} שחקנים`
}
