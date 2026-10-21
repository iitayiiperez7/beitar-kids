import { stagePool } from '../engine/pool'
import { say } from '../speech/narrator'
import { learnedCount, useProgress } from '../store/progress'
import { useRoster } from '../store/roster'
import { updateSettings, useSettings } from '../store/settings'
import { IconButton, QuietToggle } from '../ui/controls'
import type { Route } from '../App'

const GAMES: { route: Route; icon: string; label: string; spoken: string }[] = [
  { route: 'who', icon: '🤔', label: 'נחש מי זה!', spoken: 'נחש מי זה!' },
  { route: 'complete', icon: '🎤', label: 'השלם את השם', spoken: 'השלם את השם!' },
  { route: 'numbers', icon: '🔢', label: 'מה המספר?', spoken: 'מה המספר?' },
  { route: 'memory', icon: '🃏', label: 'משחק הזיכרון', spoken: 'משחק הזיכרון!' },
]

export function Home({ go }: { go: (r: Route) => void }) {
  const roster = useRoster()
  const progress = useProgress()
  const settings = useSettings()
  const active = roster.filter((p) => p.active)
  const learned = learnedCount(roster, progress)
  const stageSize = stagePool(roster, progress.stage).length
  const withPhotos = active.filter((p) => p.imageVerified).length

  const pools: { mode: typeof settings.poolMode; label: string }[] = [
    { mode: 'stage', label: `שלב ${progress.stage} · ${stageSize}` },
    { mode: 'all', label: `כל השחקנים · ${active.length}` },
  ]
  if (settings.customPool.length) pools.push({ mode: 'custom', label: '🎯 בחירת הורים' })

  return (
    <div className="safe-pad mx-auto flex h-dvh w-full max-w-xl flex-col overflow-hidden">
      <header className="flex items-center justify-between">
        <QuietToggle />
        <IconButton label="מסך הורים" onClick={() => go('parent')} className="text-xl">
          🔒
        </IconButton>
      </header>

      <button
        type="button"
        onClick={() => say([{ say: 'מכירים את בֵּיתָר!', show: 'מכירים את בית״ר!' }, { say: 'בוא נראה כמה שחקנים אתה מכיר!' }])}
        className="mt-1 flex flex-col items-center gap-1 text-center"
      >
        <span className="animate-float text-5xl sm:text-6xl">⚽</span>
        <h1 className="text-[2.6rem] leading-none font-black text-beitar drop-shadow-[0_4px_0_rgba(0,0,0,0.6)] sm:text-6xl">מכירים את בית״ר!</h1>
        <p className="text-lg font-medium text-white/85 sm:text-xl">בוא נראה כמה שחקנים אתה מכיר!</p>
      </button>

      <div className="mx-auto mt-3 flex rounded-full bg-white/10 p-1" role="radiogroup" aria-label="אילו שחקנים">
        {pools.map((p) => (
          <button
            key={p.mode}
            type="button"
            role="radio"
            aria-checked={settings.poolMode === p.mode}
            onClick={() => {
              updateSettings({ poolMode: p.mode })
              void say(p.mode === 'all' ? 'כל השחקנים!' : p.mode === 'custom' ? 'השחקנים שההורים בחרו!' : `שלב ${progress.stage}!`)
            }}
            className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition sm:text-base ${settings.poolMode === p.mode ? 'bg-beitar text-ink' : 'text-white/80'}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <nav className="mt-4 flex min-h-0 flex-1 flex-col gap-3">
        <button
          type="button"
          onClick={() => go('learn')}
          className="flex min-h-20 animate-fade-up items-center justify-center gap-3 rounded-3xl bg-beitar px-4 text-2xl font-black text-ink shadow-[0_7px_0_#a8850a] active:translate-y-1 active:shadow-none sm:text-3xl"
        >
          <span className="text-4xl">👀</span> בוא נכיר את השחקנים
        </button>
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
          {GAMES.map((g, i) => (
            <button
              key={g.route}
              type="button"
              onClick={() => go(g.route)}
              style={{ animationDelay: `${80 * (i + 1)}ms` }}
              className="flex max-h-44 animate-fade-up flex-col items-center justify-center gap-1.5 rounded-3xl border-[3px] border-beitar bg-coal p-2 shadow-[0_6px_0_rgba(0,0,0,0.5)] active:translate-y-1 active:shadow-none"
            >
              <span className="text-5xl sm:text-6xl">{g.icon}</span>
              <span className="text-xl leading-tight font-bold sm:text-2xl">{g.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <footer className="mt-3 rounded-3xl bg-black/50 p-3">
        <div className="flex items-center justify-around text-xl font-bold tabular-nums">
          <span title="כוכבים">⭐ {progress.stars}</span>
          <span title="מדליות">🏅 {progress.medals}</span>
          <span title="נקודות">🏆 {progress.points}</span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <span className="shrink-0 text-sm font-medium text-white/80">
            למדתי {learned} מתוך {active.length}
          </span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={learned} aria-valuemax={active.length}>
            <div className="h-full rounded-full bg-beitar transition-all" style={{ width: `${active.length ? (100 * learned) / active.length : 0}%` }} />
          </div>
        </div>
        {withPhotos === 0 && <p className="mt-2 text-center text-xs text-white/50">💡 להורים: אפשר להוסיף תמונות שחקנים במסך ההורים 🔒</p>}
      </footer>
    </div>
  )
}
