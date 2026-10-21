import { useEffect, useState } from 'react'
import type { QuizMode } from './engine/questions'
import { Home } from './screens/Home'
import { Learn } from './screens/Learn'
import { Memory } from './screens/Memory'
import { Parent } from './screens/Parent'
import { Quiz } from './screens/Quiz'
import { say, stopAll } from './speech/narrator'
import { unlockAudio } from './speech/sfx'
import { JerseyArt } from './ui/PlayerPhoto'

export type Route = 'home' | 'learn' | QuizMode | 'memory' | 'parent'
const ROUTES: Route[] = ['home', 'learn', 'who', 'complete', 'numbers', 'memory', 'parent']

function readRoute(): Route {
  const r = window.location.hash.replace(/^#\/?/, '') as Route
  return ROUTES.includes(r) ? r : 'home'
}

export function go(route: Route) {
  window.location.hash = route === 'home' ? '/' : `/${route}`
}

/** Browsers only allow speech after a tap, so the game opens with a big start button. */
function Splash({ onStart }: { onStart: () => void }) {
  return (
    <div className="stadium safe-pad flex h-dvh flex-col items-center justify-center gap-6 text-center">
      <JerseyArt number={7} name="בית״ר" className="h-48 animate-bounce-in drop-shadow-[0_10px_30px_rgba(247,203,35,0.35)] sm:h-60" />
      <h1 className="text-5xl font-black text-beitar sm:text-6xl">מכירים את בית״ר!</h1>
      <p className="text-xl text-white/85">משחק השחקנים של עונת 2026/27</p>
      <button
        type="button"
        onClick={() => {
          unlockAudio()
          void say([{ say: 'ברוכים הבאים! מכירים את בֵּיתָר!', show: 'ברוכים הבאים! מכירים את בית״ר!' }, { say: 'בוא נראה כמה שחקנים אתה מכיר! בחר משחק!' }])
          onStart()
        }}
        className="mt-2 min-h-20 animate-glow rounded-full bg-beitar px-12 text-3xl font-black text-ink shadow-[0_8px_0_#a8850a] active:translate-y-1 active:shadow-none"
      >
        ▶ יאללה מתחילים!
      </button>
    </div>
  )
}

export default function App() {
  const [route, setRoute] = useState<Route>(readRoute)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const onHash = () => setRoute(readRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Leaving a screen silences it (and closes the microphone).
  useEffect(() => () => stopAll(), [route])

  const home = () => go('home')
  if (route === 'parent') return <Parent onExit={home} />
  if (!started) return <Splash onStart={() => setStarted(true)} />

  switch (route) {
    case 'learn':
      return <Learn onHome={home} />
    case 'who':
    case 'complete':
    case 'numbers':
      return <Quiz key={route} mode={route} onHome={home} />
    case 'memory':
      return <Memory onHome={home} />
    default:
      return <Home go={go} />
  }
}
