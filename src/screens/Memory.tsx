// "משחק הזיכרון": match a player's photo to his name, number, or another
// photo. Without a verified photo, the pair is name ↔ shirt number.

import { useEffect, useMemo, useRef, useState } from 'react'
import { playablePhotos, spokenFull } from '../data/names'
import type { Player } from '../data/types'
import { countPlayers, numberToHebrew } from '../engine/hebrewNumbers'
import { pickOne, shuffle } from '../engine/random'
import { PRAISE } from '../engine/questions'
import { say } from '../speech/narrator'
import { sfx } from '../speech/sfx'
import { addStar, finishRound, recordPair, useProgress } from '../store/progress'
import { getRoster } from '../store/roster'
import { currentPool } from '../store/session'
import { burst, RewardPop, type Reward } from '../ui/celebrate'
import { Caption, TopBar } from '../ui/controls'
import { PlayerPhoto } from '../ui/PlayerPhoto'
import { RoundSummary } from '../ui/RoundSummary'

type Face = 'photo' | 'photo2' | 'name' | 'number'
interface Card {
  key: string
  pairId: string
  player: Player
  face: Face
}

/** Pairs per level: 6, 8, then 12 cards. */
const LEVELS = [3, 4, 6]

function buildDeck(pairs: number): Card[] {
  const usable = (p: Player) => p.active && (p.jerseyNumber !== null || playablePhotos(p).length > 0)
  const candidates = [...shuffle(currentPool().filter(usable)), ...shuffle(getRoster().filter(usable))]
  const chosen: Player[] = []
  const numbers = new Set<number>()
  for (const p of candidates) {
    if (chosen.length >= pairs) break
    if (chosen.some((c) => c.id === p.id || c.lastName === p.lastName)) continue
    if (p.jerseyNumber !== null && numbers.has(p.jerseyNumber)) continue
    if (p.jerseyNumber !== null) numbers.add(p.jerseyNumber)
    chosen.push(p)
  }
  const cards = chosen.flatMap((p): Card[] => {
    const photos = playablePhotos(p).length
    const kinds: [Face, Face][] = []
    if (photos) {
      kinds.push(['photo', 'name'])
      if (p.jerseyNumber !== null) kinds.push(['photo', 'number'])
      if (photos >= 2) kinds.push(['photo', 'photo2'])
    } else kinds.push(['name', 'number'])
    const [a, b] = pickOne(kinds)
    return [
      { key: `${p.id}-a`, pairId: p.id, player: p, face: a },
      { key: `${p.id}-b`, pairId: p.id, player: p, face: b },
    ]
  })
  return shuffle(cards)
}

function useLandscape() {
  const get = () => typeof window !== 'undefined' && window.innerWidth > window.innerHeight
  const [landscape, setLandscape] = useState(get)
  useEffect(() => {
    const on = () => setLandscape(get())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return landscape
}

export function Memory({ onHome }: { onHome: () => void }) {
  const { points } = useProgress()
  const [level, setLevel] = useState(0)
  const [game, setGame] = useState(0)
  const deck = useMemo(() => buildDeck(LEVELS[level]), [level, game])
  const [open, setOpen] = useState<string[]>([])
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [reward, setReward] = useState<Reward | null>(null)
  const [done, setDone] = useState(false)
  const lock = useRef(false)
  const landscape = useLandscape()

  useEffect(() => {
    setOpen([])
    setMatched(new Set())
    setDone(false)
    lock.current = false
    void say(level === 0 && game === 0 ? 'משחק הזיכרון! מצא את הזוגות!' : `שלב חדש! ${deck.length} קלפים!`)
  }, [deck])

  function speakFace(card: Card) {
    const p = card.player
    if (card.face === 'name') void say({ say: spokenFull(p), show: p.fullName }, { remember: false })
    else if (card.face === 'number' && p.jerseyNumber !== null) void say({ say: numberToHebrew(p.jerseyNumber), show: String(p.jerseyNumber) }, { remember: false })
  }

  function flip(card: Card) {
    if (lock.current || matched.has(card.pairId) || open.includes(card.key)) return
    sfx.flip()
    speakFace(card)
    const nowOpen = [...open, card.key]
    setOpen(nowOpen)
    if (nowOpen.length < 2) return

    lock.current = true
    const [a, b] = nowOpen.map((k) => deck.find((c) => c.key === k)!)
    if (a.pairId === b.pairId) {
      setTimeout(() => {
        const nextMatched = new Set(matched).add(a.pairId)
        setMatched(nextMatched)
        setOpen([])
        lock.current = false
        recordPair(a.pairId)
        setReward({ id: Date.now(), points: 10 })
        sfx.correct()
        burst(0.5)
        const p = a.player
        void say({ say: `${pickOne(PRAISE)} ${spokenFull(p)}!`, show: `${p.fullName}!` })
        if (nextMatched.size * 2 === deck.length) {
          addStar()
          finishRound(getRoster())
          setTimeout(() => setDone(true), 1600)
        }
      }, 450)
    } else {
      setTimeout(() => {
        setOpen([])
        lock.current = false
      }, 1300)
    }
  }

  const cols = landscape ? (deck.length <= 6 ? 3 : 4) : deck.length <= 8 ? 2 : 3
  const rows = Math.ceil(deck.length / cols)
  const lastLevel = level === LEVELS.length - 1

  return (
    <div className="safe-pad mx-auto flex h-dvh w-full max-w-3xl flex-col gap-3 overflow-hidden">
      <TopBar title="משחק הזיכרון" onHome={onHome} points={points} />
      {done ? (
        <RoundSummary
          count={deck.length / 2}
          points={(deck.length / 2) * 10}
          stars={1}
          stageUp={null}
          headline={{ say: `וואו! מצאת את כל הזוגות! הכרת ${countPlayers(deck.length / 2)}!`, show: 'וואו! מצאת את כל הזוגות!' }}
          againLabel={lastLevel ? 'עוד משחק' : 'לשלב הבא'}
          onAgain={() => {
            if (!lastLevel) setLevel(level + 1)
            setGame((g) => g + 1)
          }}
          onHome={onHome}
        />
      ) : (
        <>
          <div className="text-center text-sm font-medium text-white/60">
            שלב {level + 1} · {deck.length} קלפים · נמצאו {matched.size} מתוך {deck.length / 2}
          </div>
          <div
            className="grid min-h-0 flex-1 gap-2.5"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
          >
            {deck.map((card) => (
              <MemoryCard key={card.key} card={card} open={open.includes(card.key) || matched.has(card.pairId)} matched={matched.has(card.pairId)} onFlip={() => flip(card)} />
            ))}
          </div>
          <Caption />
        </>
      )}
      <RewardPop reward={reward} />
    </div>
  )
}

function MemoryCard({ card, open, matched, onFlip }: { card: Card; open: boolean; matched: boolean; onFlip: () => void }) {
  const p = card.player
  return (
    <button type="button" onClick={onFlip} aria-label={open ? p.fullName : 'קלף סגור'} className="flip min-h-0 w-full active:scale-95">
      <div className={`flip-inner ${open ? 'is-open' : ''}`}>
        <div className="flip-face stripes grid place-items-center overflow-hidden rounded-2xl ring-2 ring-white/20">
          <span className="grid size-14 place-items-center rounded-full bg-ink text-4xl shadow-lg">⚽</span>
        </div>
        <div className={`flip-face flip-front overflow-hidden rounded-2xl ${matched ? 'ring-4 ring-good' : 'ring-2 ring-beitar'}`}>
          {(card.face === 'photo' || card.face === 'photo2') && (
            <PlayerPhoto player={p} imageIndex={card.face === 'photo2' ? 1 : 0} className="h-full w-full rounded-2xl! ring-0!" />
          )}
          {card.face === 'name' && (
            <div className="flex h-full flex-col items-center justify-center bg-white p-1 text-center leading-tight font-black text-ink">
              <span className="text-xl sm:text-2xl">{p.firstName}</span>
              <span className="text-2xl sm:text-4xl">{p.lastName}</span>
            </div>
          )}
          {card.face === 'number' && (
            <div className="grid h-full place-items-center bg-beitar text-5xl font-black text-ink tabular-nums sm:text-7xl">{p.jerseyNumber}</div>
          )}
        </div>
      </div>
    </button>
  )
}
