// "בוא נכיר את השחקנים": one player at a time, big photo, name, number and
// role — everything tappable to hear it again.

import { useEffect, useState } from 'react'
import { BEITAR_SPOKEN, playablePhotos, spokenFull } from '../data/names'
import { POSITION_ICON, POSITION_LABEL, type Player } from '../data/types'
import { numberToHebrew } from '../engine/hebrewNumbers'
import { emptyProgress } from '../engine/srs'
import { say } from '../speech/narrator'
import type { Line } from '../speech/types'
import { finishRound, markSeen, progressStore } from '../store/progress'
import { getRoster } from '../store/roster'
import { currentPool } from '../store/session'
import { Caption, TopBar } from '../ui/controls'
import { Fit, PlayerPhoto } from '../ui/PlayerPhoto'
import { RoundSummary } from '../ui/RoundSummary'

function introLines(p: Player): Line[] {
  const lines: Line[] = [
    { say: `זה ${spokenFull(p)}!`, show: `זה ${p.fullName}!` },
    { say: `הוא משחק ב${BEITAR_SPOKEN}.`, show: 'הוא משחק בבית״ר ירושלים.' },
  ]
  if (p.jerseyNumber !== null) lines.push({ say: `המספר שלו הוא ${numberToHebrew(p.jerseyNumber)}!`, show: `המספר שלו הוא ${p.jerseyNumber}!` })
  if (p.position !== 'unknown') lines.push({ say: `הוא ${POSITION_LABEL[p.position]}.` })
  return lines
}

/** New players first, then the ones the child knows least. */
function learnOrder(): Player[] {
  const progress = progressStore.get().players
  const rank = (p: Player) => {
    const pr = progress[p.id] ?? emptyProgress()
    return pr.seen ? 1 + pr.box : 0
  }
  return [...currentPool()].sort((a, b) => rank(a) - rank(b) || a.learningPriority - b.learningPriority)
}

export function Learn({ onHome }: { onHome: () => void }) {
  const [round, setRound] = useState(0)
  const [order, setOrder] = useState(learnOrder)
  const [index, setIndex] = useState(0)
  const [photo, setPhoto] = useState(0)
  const [summary, setSummary] = useState<{ count: number; stageUp: number | null } | null>(null)
  const player = order[index]

  useEffect(() => {
    if (!player) return
    markSeen(player.id)
    setPhoto(0)
    void say(introLines(player))
  }, [player, round])

  const next = () => {
    if (index + 1 < order.length) setIndex(index + 1)
    else setSummary({ count: order.length, stageUp: finishRound(getRoster()) })
  }
  const again = () => {
    setOrder(learnOrder())
    setIndex(0)
    setSummary(null)
    setRound((r) => r + 1)
  }

  if (summary) {
    return (
      <div className="safe-pad mx-auto flex h-dvh w-full max-w-xl flex-col gap-3 overflow-hidden">
        <TopBar title="בוא נכיר את השחקנים" onHome={onHome} />
        <RoundSummary count={summary.count} points={0} stars={0} stageUp={summary.stageUp} againLabel="עוד פעם" onAgain={again} onHome={onHome} />
      </div>
    )
  }

  if (!player) {
    return (
      <div className="safe-pad mx-auto flex h-dvh w-full max-w-xl flex-col gap-3">
        <TopBar title="בוא נכיר את השחקנים" onHome={onHome} />
        <p className="m-auto text-center text-xl">אין שחקנים פעילים. אפשר להוסיף במסך ההורים.</p>
      </div>
    )
  }

  const photos = playablePhotos(player)
  return (
    <div className="safe-pad mx-auto flex h-dvh w-full max-w-xl flex-col gap-3 overflow-hidden">
      <TopBar title="בוא נכיר את השחקנים" onHome={onHome} />
      <div className="text-center text-sm font-medium text-white/60">
        שחקן {index + 1} מתוך {order.length}
      </div>

      <section className="flex min-h-0 flex-1 flex-col items-center gap-3">
        <Fit>
          <PlayerPhoto
            key={player.id}
            player={player}
            imageIndex={photo}
            showName
            className="h-full w-full animate-pop"
            onClick={() => photos.length > 1 && setPhoto((i) => (i + 1) % photos.length)}
          />
        </Fit>
        {photos.length > 1 && (
          <div className="flex gap-2" aria-label="תמונות">
            {photos.map((_, i) => (
              <button key={i} type="button" aria-label={`תמונה ${i + 1}`} onClick={() => setPhoto(i)} className={`size-3 rounded-full ${i === photo % photos.length ? 'bg-beitar' : 'bg-white/30'}`} />
            ))}
          </div>
        )}

        <button type="button" onClick={() => say({ say: spokenFull(player), show: player.fullName })} className="animate-fade-up text-4xl font-black leading-tight active:scale-95">
          {player.fullName}
        </button>
        <div className="flex items-center gap-3">
          {player.jerseyNumber !== null && (
            <button
              type="button"
              aria-label={`מספר ${player.jerseyNumber}`}
              onClick={() => say({ say: `מספר ${numberToHebrew(player.jerseyNumber!)}`, show: `מספר ${player.jerseyNumber}` })}
              className="grid size-16 place-items-center rounded-full bg-beitar text-3xl font-black text-ink shadow-[0_5px_0_#a8850a] active:scale-90"
            >
              {player.jerseyNumber}
            </button>
          )}
          {player.position !== 'unknown' && (
            <button type="button" onClick={() => say(`הוא ${POSITION_LABEL[player.position]}`)} className="rounded-full bg-white/10 px-4 py-3 text-xl font-bold active:scale-95">
              {POSITION_ICON[player.position]} {POSITION_LABEL[player.position]}
            </button>
          )}
        </div>
      </section>

      <Caption />
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <button type="button" aria-label="שמע שוב" onClick={() => say(introLines(player))} className="grid size-16 place-items-center rounded-2xl bg-white/10 text-3xl active:scale-90">
          🔁
        </button>
        <button type="button" onClick={next} className="min-h-16 rounded-2xl bg-beitar text-2xl font-black text-ink shadow-[0_6px_0_#a8850a] active:translate-y-1 active:shadow-none">
          {index + 1 < order.length ? 'השחקן הבא ←' : 'סיימתי! 🎉'}
        </button>
      </div>
    </div>
  )
}
