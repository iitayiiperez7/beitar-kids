// The three question games: "נחש מי זה!", "השלם את השם", "מה המספר?".
// Every question can be answered by voice (when the browser supports Hebrew
// recognition) or by tapping one of three options.

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Player } from '../data/types'
import { matchNameAnswer, matchNumberAnswer, type VoiceVerdict } from '../engine/matching'
import { numberToHebrew } from '../engine/hebrewNumbers'
import { buildQuestion, canAsk, correctLine, PRAISE, type Question, type QuizMode, type QuizOption } from '../engine/questions'
import { pickOne } from '../engine/random'
import { pickNext } from '../engine/srs'
import { hush, say, stt } from '../speech/narrator'
import { sfx } from '../speech/sfx'
import type { Line } from '../speech/types'
import { finishRound, progressStore, recordCorrect, recordMistake, useProgress } from '../store/progress'
import { getRoster } from '../store/roster'
import { currentPool } from '../store/session'
import { useSettings } from '../store/settings'
import { burst, RewardPop, type Reward } from '../ui/celebrate'
import { AnswerButton, Caption, MicButton, TopBar, type OptionState } from '../ui/controls'
import { Fit, JerseyArt, PlayerPhoto } from '../ui/PlayerPhoto'
import { RoundSummary } from '../ui/RoundSummary'

const TITLE: Record<QuizMode, string> = { who: 'נחש מי זה!', complete: 'השלם את השם', numbers: 'מה המספר?' }
const INTRO: Record<QuizMode, Line> = {
  who: { say: 'נחש מי זה!' },
  complete: { say: 'השלם את השם! לחץ על המיקרופון ותגיד!' },
  numbers: { say: 'מה המספר?' },
}
const TRY_AGAIN: Line = { say: 'כמעט! בוא ננסה שוב!' }
const NOT_HEARD: Line = { say: 'לא שמעתי טוב, בוא ננסה שוב!' }
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

interface Round {
  known: Set<string>
  points: number
  stars: number
  recent: string[]
  /** Players the child struggled with, asked again a few questions later. */
  retry: { id: string; at: number }[]
}
const newRound = (): Round => ({ known: new Set(), points: 0, stars: 0, recent: [], retry: [] })

interface Summary {
  count: number
  points: number
  stars: number
  stageUp: number | null
}

export function Quiz({ mode, onHome }: { mode: QuizMode; onHome: () => void }) {
  const settings = useSettings()
  const { points } = useProgress()
  const [roundKey, setRoundKey] = useState(0)
  const pool = useMemo(() => currentPool().filter((p) => canAsk(mode, p)), [mode, roundKey])
  const total = useMemo(() => settings.roundLength, [roundKey])

  const [micBlocked, setMicBlocked] = useState(false)
  const voiceOn = settings.sttEnabled && stt.isSupported() && !micBlocked

  const [q, setQ] = useState<Question | null>(null)
  const [step, setStep] = useState(0)
  const [eliminated, setEliminated] = useState<Set<string>>(new Set())
  const [hint, setHint] = useState(false)
  const [solved, setSolved] = useState(false)
  const [listening, setListening] = useState(false)
  const [showOptions, setShowOptions] = useState(true)
  const [heard, setHeard] = useState('')
  const [reward, setReward] = useState<Reward | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)

  const round = useRef<Round>(newRound())
  // Mutable mirrors for async flows (speech results arrive after awaits).
  const live = useRef({ seq: 0, mistakes: 0, voiceFails: 0, hint: false, solved: false, mounted: true })
  useEffect(() => {
    live.current.mounted = true
    return () => {
      live.current.mounted = false
    }
  }, [])

  function ask(index: number, withIntro: boolean) {
    const r = round.current
    const dueAt = r.retry.findIndex((x) => x.at <= index)
    const id = dueAt >= 0 ? r.retry.splice(dueAt, 1)[0].id : pickNext(pool.map((p) => p.id), progressStore.get().players, r.recent, Date.now())
    r.recent.push(id)
    const player = pool.find((p) => p.id === id) as Player
    const question = buildQuestion(mode, player, pool, getRoster())

    live.current = { ...live.current, seq: live.current.seq + 1, mistakes: 0, voiceFails: 0, hint: false, solved: false }
    setQ(question)
    setStep(index)
    setEliminated(new Set())
    setHint(false)
    setSolved(false)
    setHeard('')
    setShowOptions(mode !== 'complete' || !voiceOn)

    const lines: Line[] = withIntro ? [INTRO[mode], ...question.prompt] : [...question.prompt]
    if (question.kind === 'numberOf') {
      const [a, b, c] = question.options
      lines.push({ say: `${a.spoken}? ${b.spoken}? או ${c.spoken}?`, show: `${a.label}? ${b.label}? או ${c.label}?` })
    }
    void say(lines)
  }

  useEffect(() => {
    round.current = newRound()
    setSummary(null)
    if (pool.length) ask(0, true)
    else void say('אין עדיין שחקנים לתרגול כאן. בקשו מההורים לבחור שחקנים!')
  }, [pool])

  async function onCorrect(question: Question) {
    const l = live.current
    if (l.solved) return
    l.solved = true
    setSolved(true)
    stt.abort()
    setListening(false)

    const firstTry = l.mistakes === 0 && !l.hint
    const rewards = recordCorrect(question.player.id, firstTry, getRoster())
    const r = round.current
    r.known.add(question.player.id)
    r.points += rewards.points
    if (rewards.starEarned) r.stars++
    if (!firstTry && step + 3 < total) r.retry.push({ id: question.player.id, at: step + 3 })

    setReward({ id: Date.now(), points: rewards.points, star: rewards.starEarned, medal: rewards.medalEarned })
    sfx.correct()
    burst(0.8)
    if (rewards.starEarned) setTimeout(sfx.star, 450)
    if (rewards.medalEarned) setTimeout(sfx.medal, 800)

    const lines: Line[] = [correctLine(question, pickOne(PRAISE))]
    if (rewards.starEarned) lines.push({ say: 'שלוש תשובות נכונות ברצף! קיבלת כוכב בונוס!' })
    if (rewards.medalEarned) lines.push({ say: 'וואו! למדת עוד חמישה שחקנים! קיבלת מדליה!' })
    const seq = l.seq
    await say(lines)
    await wait(450)
    if (!live.current.mounted || live.current.seq !== seq) return
    if (step + 1 >= total) {
      const stageUp = finishRound(getRoster())
      setSummary({ count: r.known.size, points: r.points, stars: r.stars, stageUp })
    } else ask(step + 1, false)
  }

  function onWrong(question: Question, optionId?: string) {
    const l = live.current
    l.mistakes++
    recordMistake(question.player.id)
    if (optionId) setEliminated((s) => new Set(s).add(optionId))
    sfx.tryAgain()
    const lines: Line[] = [TRY_AGAIN]
    if (l.mistakes >= 2 && !l.hint) {
      l.hint = true
      setHint(true)
      setShowOptions(true)
      lines.push(...question.hint)
    }
    void say(lines)
  }

  function onNotHeard() {
    const l = live.current
    l.voiceFails++
    const lines: Line[] = [NOT_HEARD]
    if (l.voiceFails >= 2) {
      setShowOptions(true)
      lines.push({ say: 'אפשר גם לבחור באצבע!' })
    }
    void say(lines)
  }

  function choose(option: QuizOption) {
    if (!q || live.current.solved) return
    if (listening) {
      stt.abort()
      setListening(false)
    }
    if (option.id === q.correctId) void onCorrect(q)
    else onWrong(q, option.id)
  }

  async function listen() {
    if (!q || live.current.solved || listening) return
    hush()
    setHeard('')
    setListening(true)
    const seq = live.current.seq
    const result = await stt.listen()
    if (!live.current.mounted || live.current.seq !== seq || live.current.solved) return
    setListening(false)

    if (result.status === 'aborted') return
    if (result.status === 'not-allowed' || result.status === 'no-microphone' || result.status === 'unsupported') {
      setMicBlocked(true)
      setShowOptions(true)
      void say('המיקרופון לא זמין עכשיו. אפשר לבחור באצבע!')
      return
    }
    if (result.status !== 'ok') return onNotHeard()

    const verdict: VoiceVerdict =
      q.voice.type === 'number'
        ? matchNumberAnswer(result.alternatives, q.voice.target)
        : matchNameAnswer(result.alternatives, q.player.id, q.voice.candidates)
    setHeard(verdict.heard)
    if (verdict.kind === 'correct') return void onCorrect(q)
    if (verdict.kind === 'wrong') {
      const option = q.options.find((o) => o.id === verdict.matchedId || o.id === `n${verdict.matchedId}`)
      return onWrong(q, option?.id)
    }
    if (verdict.kind === 'ambiguous') return void say('נכון! ואיך קוראים לו בשם המלא?')
    onNotHeard()
  }

  function optionState(o: QuizOption): OptionState {
    if (solved && o.id === q?.correctId) return 'correct'
    if (eliminated.has(o.id)) return 'eliminated'
    if (hint && o.id === q?.correctId) return 'hint'
    return 'idle'
  }

  const home = () => {
    stt.abort()
    onHome()
  }

  return (
    <div className="safe-pad mx-auto flex h-dvh w-full max-w-xl flex-col gap-3 overflow-hidden">
      <TopBar title={TITLE[mode]} onHome={home} step={summary ? total : step} total={total} points={points} />

      {summary ? (
        <RoundSummary {...summary} onAgain={() => setRoundKey((k) => k + 1)} onHome={home} />
      ) : !q ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <JerseyArt className="h-40" />
          <Caption />
        </div>
      ) : (
        <>
          <section className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2">
            <QuestionVisual q={q} />
          </section>

          <Caption />
          {heard && <div className="-mt-1 text-center text-sm text-white/50">שמעתי: "{heard}"</div>}

          {voiceOn && mode === 'complete' && (
            <div className="flex items-end justify-center gap-6">
              <MicButton listening={listening} onPress={listen} />
              {!showOptions && (
                <button type="button" onClick={() => setShowOptions(true)} className="mb-7 rounded-full bg-white/10 px-4 py-2 text-lg font-bold active:scale-95">
                  👆 לבחור
                </button>
              )}
            </div>
          )}

          {showOptions && <Options q={q} stateOf={optionState} onChoose={choose} />}

          {voiceOn && mode !== 'complete' && (
            <div className="flex items-center justify-center gap-3">
              <MicButton size="sm" listening={listening} onPress={listen} />
            </div>
          )}
        </>
      )}
      <RewardPop reward={reward} />
    </div>
  )
}

function QuestionVisual({ q }: { q: Question }) {
  const p = q.player
  if (q.kind === 'whoHasNumber') {
    return (
      <Fit ratio={1}>
        <div className="grid h-full w-full place-items-center rounded-[1.75rem] bg-white/5 ring-4 ring-beitar">
          <JerseyArt key={p.id} number={p.jerseyNumber} className="h-[85%] animate-pop drop-shadow-[0_8px_18px_rgba(0,0,0,0.5)]" />
        </div>
      </Fit>
    )
  }
  return (
    <>
      <Fit>
        <PlayerPhoto key={p.id} player={p} showNumber={q.kind !== 'numberOf'} className="h-full w-full animate-pop" />
      </Fit>
      {q.kind === 'numberOf' && (
        <button type="button" onClick={() => say(q.prompt)} className="text-3xl font-black">
          {p.fullName}
        </button>
      )}
      {q.partial && (
        <button type="button" onClick={() => say(q.prompt)} className="text-3xl font-black">
          {q.partial.missing === 'last' ? (
            <>
              {q.partial.given} <span className="text-beitar">___</span>
            </>
          ) : (
            <>
              <span className="text-beitar">___</span> {q.partial.given}
            </>
          )}
        </button>
      )}
    </>
  )
}

function Options({ q, stateOf, onChoose }: { q: Question; stateOf: (o: QuizOption) => OptionState; onChoose: (o: QuizOption) => void }) {
  if (q.kind === 'numberOf') {
    return (
      <div className="grid grid-cols-3 gap-3">
        {q.options.map((o) => {
          const state = stateOf(o)
          return (
            <button
              key={o.id}
              type="button"
              disabled={state === 'eliminated'}
              onClick={() => onChoose(o)}
              aria-label={numberToHebrew(o.number ?? 0)}
              className={`grid aspect-square max-h-28 place-items-center justify-self-center rounded-full text-5xl font-black tabular-nums transition active:scale-90 w-full max-w-28 ${
                state === 'correct'
                  ? 'animate-pop bg-good text-ink ring-4 ring-white'
                  : state === 'eliminated'
                    ? 'animate-shake bg-white/15 text-white/40'
                    : state === 'hint'
                      ? 'animate-glow bg-beitar text-ink'
                      : 'bg-beitar text-ink shadow-[0_6px_0_#a8850a]'
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    )
  }
  return (
    <div className="grid gap-2.5">
      {q.options.map((o) => (
        <AnswerButton key={o.id} label={o.label} spoken={o.spoken} state={stateOf(o)} onChoose={() => onChoose(o)} />
      ))}
    </div>
  )
}
