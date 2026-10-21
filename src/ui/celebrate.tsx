import confetti from 'canvas-confetti'
import { useEffect, useState } from 'react'

const COLORS = ['#F7CB23', '#FFFFFF', '#FFE27A', '#D9AB0A', '#2a2a2a']

export function burst(power = 1) {
  void confetti({ particleCount: Math.round(70 * power), spread: 80, startVelocity: 38, origin: { y: 0.55 }, colors: COLORS, disableForReducedMotion: true })
}

export function bigCelebration() {
  const fire = (x: number, angle: number) =>
    confetti({ particleCount: 90, angle, spread: 65, startVelocity: 55, origin: { x, y: 0.75 }, colors: COLORS, disableForReducedMotion: true })
  void fire(0.1, 60)
  void fire(0.9, 120)
  setTimeout(() => {
    void fire(0.25, 70)
    void fire(0.75, 110)
  }, 350)
}

export interface Reward {
  id: number
  points: number
  star?: boolean
  medal?: boolean
}

/** "+10", bonus star and medal pop-ups shown over the game for a moment. */
export function RewardPop({ reward }: { reward: Reward | null }) {
  const [visible, setVisible] = useState<Reward | null>(null)
  useEffect(() => {
    if (!reward) return
    setVisible(reward)
    const t = setTimeout(() => setVisible(null), 2200)
    return () => clearTimeout(t)
  }, [reward])
  if (!visible) return null
  return (
    <div key={visible.id} className="pointer-events-none fixed inset-x-0 top-[18%] z-40 flex flex-col items-center gap-2">
      <div className="animate-bounce-in rounded-full bg-beitar px-6 py-2 text-4xl font-black text-ink shadow-xl">+{visible.points}</div>
      {visible.star && <div className="animate-bounce-in rounded-full bg-white px-5 py-2 text-2xl font-bold text-ink shadow-xl [animation-delay:150ms]">⭐ כוכב בונוס!</div>}
      {visible.medal && <div className="animate-bounce-in rounded-full bg-white px-5 py-2 text-2xl font-bold text-ink shadow-xl [animation-delay:300ms]">🏅 מדליה!</div>}
    </div>
  )
}
