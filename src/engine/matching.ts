// Judges a spoken answer against the expected one. Strict by design: a
// recognized answer is accepted only if it is closer to the target than to
// any other player, and low-confidence recognition is never accepted.

import { levenshtein, normalizeHebrew, phoneticAllowance, phoneticKey, plainAllowance } from './hebrew'
import { parseHebrewNumber } from './hebrewNumbers'

export interface SpeechAlternative {
  transcript: string
  /** 0–1; 0 means the engine did not report a confidence. */
  confidence: number
}

export interface AnswerCandidate {
  id: string
  /** Accepted spellings of this candidate's answer (name, aliases). */
  forms: string[]
}

export type VoiceVerdict =
  | { kind: 'correct'; heard: string }
  | { kind: 'wrong'; heard: string; matchedId: string }
  /** Matches the target but also another player equally well (e.g. only "ירדן"). */
  | { kind: 'ambiguous'; heard: string }
  /** Nothing usable was recognized — ask again, never count as a mistake. */
  | { kind: 'unclear'; heard: string }

export const MIN_CONFIDENCE = 0.4

const FILLER = new Set(
  ['זה', 'זאת', 'הוא', 'השם', 'שם', 'שלו', 'שמו', 'קוראים', 'לו', 'אה', 'אמ', 'אממ', 'נו', 'כן', 'אולי', 'מספר', 'המספר', 'השחקן', 'שחקן'].map(
    normalizeHebrew,
  ),
)

interface Prepared {
  plain: string
  phon: string
}

function prepare(text: string): Prepared {
  const norm = normalizeHebrew(text)
  return { plain: norm.replace(/ /g, ''), phon: phoneticKey(norm) }
}

/** Every run of 1–3 consecutive meaningful words in the transcript. */
function segments(transcript: string): Prepared[] {
  const words = normalizeHebrew(transcript)
    .split(' ')
    .filter((w) => w && !FILLER.has(w))
  const out: Prepared[] = []
  for (let size = 1; size <= Math.min(3, words.length); size++) {
    for (let i = 0; i + size <= words.length; i++) out.push(prepare(words.slice(i, i + size).join(' ')))
  }
  return out
}

/**
 * Roughly "how many letters matched" when within tolerance, otherwise -1.
 * Weighting by length lets "ירדן כהן" beat a bare "ירדן" match.
 */
function score(form: Prepared, seg: Prepared, strict: boolean): number {
  const len = form.plain.length
  if (!len) return -1
  const covered = Math.min(len, seg.plain.length)
  const d1 = levenshtein(form.plain, seg.plain)
  if (d1 <= (strict ? 0 : plainAllowance(len))) return covered * (1 - d1 / len)
  if (form.phon.length >= 2) {
    const d2 = levenshtein(form.phon, seg.phon)
    if (d2 <= (strict ? 0 : phoneticAllowance(form.phon.length))) return 0.9 * covered * (1 - d2 / form.phon.length)
  }
  return -1
}

type Judgement = { kind: 'target' } | { kind: 'other'; id: string } | { kind: 'tie' } | { kind: 'none' }

function judge(transcript: string, targetId: string, candidates: AnswerCandidate[], strict: boolean): Judgement {
  const segs = segments(transcript)
  if (!segs.length) return { kind: 'none' }
  const scored = candidates.map((c) => {
    let best = -1
    for (const f of c.forms) {
      const pf = prepare(f)
      for (const s of segs) best = Math.max(best, score(pf, s, strict))
    }
    return { id: c.id, best }
  })
  const top = Math.max(...scored.map((s) => s.best))
  if (top < 0) return { kind: 'none' }
  const winners = scored.filter((s) => s.best >= top - 1e-9)
  const hasTarget = winners.some((w) => w.id === targetId)
  if (hasTarget) return winners.length === 1 ? { kind: 'target' } : { kind: 'tie' }
  return { kind: 'other', id: winners[0].id }
}

function lowConfidence(alts: SpeechAlternative[]): boolean {
  const top = alts[0]
  return top.confidence > 0 && top.confidence < MIN_CONFIDENCE
}

/**
 * @param candidates must include the target. Callers should leave out other
 *   players whose answer is spelled exactly like the target's (e.g. two "כהן"
 *   when asking for a last name), since saying it is genuinely correct.
 */
export function matchNameAnswer(
  alternatives: SpeechAlternative[],
  targetId: string,
  candidates: AnswerCandidate[],
): VoiceVerdict {
  const alts = alternatives.filter((a) => a.transcript.trim())
  if (!alts.length) return { kind: 'unclear', heard: '' }
  const heard = alts[0].transcript.trim()
  if (lowConfidence(alts)) return { kind: 'unclear', heard }

  const first = judge(alts[0].transcript, targetId, candidates, false)
  if (first.kind === 'target') return { kind: 'correct', heard }
  if (first.kind === 'other') return { kind: 'wrong', heard, matchedId: first.id }
  if (first.kind === 'tie') return { kind: 'ambiguous', heard }

  // The best guess matched nobody; a lower-ranked guess may still be an exact hit.
  for (const alt of alts.slice(1)) {
    if (judge(alt.transcript, targetId, candidates, true).kind === 'target') {
      return { kind: 'correct', heard: alt.transcript.trim() }
    }
  }
  return { kind: 'unclear', heard }
}

export function matchNumberAnswer(alternatives: SpeechAlternative[], target: number): VoiceVerdict {
  const alts = alternatives.filter((a) => a.transcript.trim())
  if (!alts.length) return { kind: 'unclear', heard: '' }
  const heard = alts[0].transcript.trim()
  if (lowConfidence(alts)) return { kind: 'unclear', heard }

  const n = parseHebrewNumber(alts[0].transcript)
  if (n === target) return { kind: 'correct', heard }
  if (n !== null) return { kind: 'wrong', heard, matchedId: String(n) }
  for (const alt of alts.slice(1)) {
    if (parseHebrewNumber(alt.transcript) === target) return { kind: 'correct', heard: alt.transcript.trim() }
  }
  return { kind: 'unclear', heard }
}
