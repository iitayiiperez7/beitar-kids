import { useEffect } from 'react'
import { countPlayers } from '../engine/hebrewNumbers'
import { say } from '../speech/narrator'
import { sfx } from '../speech/sfx'
import type { Line } from '../speech/types'
import { bigCelebration } from './celebrate'

interface Props {
  /** Players the child got to know this round. */
  count: number
  points: number
  stars: number
  stageUp: number | null
  /** Overrides the default "you met N players" headline (memory game). */
  headline?: Line
  againLabel?: string
  onAgain: () => void
  onHome: () => void
}

export function RoundSummary({ count, points, stars, stageUp, headline, againLabel = 'עוד סיבוב', onAgain, onHome }: Props) {
  const main: Line = headline ?? { say: `וואו! הכרת היום ${countPlayers(count)}! אתה אלוף!`, show: `וואו! הכרת היום ${count === 1 ? 'שחקן אחד' : `${count} שחקנים`}! אתה אלוף!` }

  useEffect(() => {
    bigCelebration()
    sfx.cheer()
    const lines: Line[] = [main]
    if (stageUp) lines.push({ say: `עלית לשלב ${stageUp}! מחכים לך שחקנים חדשים!` })
    void say(lines)
  }, [])

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
      <div className="animate-bounce-in text-8xl">🏆</div>
      <h2 className="animate-fade-up text-4xl font-black text-beitar">וואו!</h2>
      <p className="animate-fade-up text-2xl font-bold [animation-delay:120ms]">{main.show ?? main.say}</p>
      <div className="flex animate-fade-up gap-3 [animation-delay:240ms]">
        <div className="rounded-2xl bg-white/10 px-5 py-3 text-2xl font-bold">🏆 +{points}</div>
        {stars > 0 && <div className="rounded-2xl bg-white/10 px-5 py-3 text-2xl font-bold">⭐ +{stars}</div>}
      </div>
      {stageUp && (
        <div className="animate-pop rounded-2xl bg-beitar px-5 py-3 text-xl font-black text-ink [animation-delay:400ms]">🚀 עלית לשלב {stageUp}!</div>
      )}
      <div className="mt-4 grid w-full max-w-sm gap-3">
        <button type="button" onClick={onAgain} className="min-h-16 rounded-2xl bg-beitar text-2xl font-black text-ink shadow-[0_6px_0_#a8850a] active:translate-y-1 active:shadow-none">
          🔁 {againLabel}
        </button>
        <button type="button" onClick={onHome} className="min-h-14 rounded-2xl bg-white/10 text-xl font-bold active:scale-95">
          🏠 הביתה
        </button>
      </div>
    </div>
  )
}
