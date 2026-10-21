// Hebrew text helpers used by speech matching: normalization, a coarse
// "sounds-like" key, and edit distance.

const NIQQUD = /[֑-ֽֿ-ׇ]/g
const MAQAF = /־/g
const FINALS: Record<string, string> = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' }

/** Lowercase, strip niqqud / geresh / punctuation, unify final letters, collapse spaces. */
export function normalizeHebrew(input: string): string {
  return input
    .toLowerCase()
    .replace(MAQAF, ' ')
    .replace(NIQQUD, '')
    .replace(/[׳'`’‘״"]/g, '')
    .replace(/[ךםןףץ]/g, (c) => FINALS[c])
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Letters that a recognizer (or a 5-year-old) easily swaps.
const SOUND_ALIKE: Record<string, string> = { ע: 'א', ח: 'כ', ק: 'כ', ט: 'ת', ס: 'ש', ב: 'ו' }
const SOFT_LETTERS = 'אהוי'

/**
 * Coarse phonetic key: merges sound-alike letters, drops vowel letters
 * (א ה ו י) after the first letter of each word, and collapses repeats.
 * Expects normalized input.
 */
export function phoneticKey(normalized: string): string {
  return normalized
    .split(' ')
    .filter(Boolean)
    .map((word) => {
      const letters = [...word].map((c) => SOUND_ALIKE[c] ?? c)
      let out = letters[0]
      for (let i = 1; i < letters.length; i++) {
        const c = letters[i]
        if (SOFT_LETTERS.includes(c)) continue
        if (c === out[out.length - 1]) continue
        out += c
      }
      return out
    })
    .join('')
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  const s = [...a]
  const t = [...b]
  if (!s.length) return t.length
  if (!t.length) return s.length
  let prev = Array.from({ length: t.length + 1 }, (_, i) => i)
  for (let i = 1; i <= s.length; i++) {
    const cur = [i]
    for (let j = 1; j <= t.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (s[i - 1] === t[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[t.length]
}

/** How many edits we tolerate for a name of this length (short names must be exact). */
export function plainAllowance(length: number): number {
  if (length <= 3) return 0
  if (length <= 5) return 1
  if (length <= 9) return 2
  return 3
}

export function phoneticAllowance(length: number): number {
  if (length <= 3) return 0
  if (length <= 6) return 1
  return 2
}
