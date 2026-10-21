// Shared kid-facing controls: top bar, captions, microphone, answer buttons.

import type { ReactNode } from 'react'
import { replay, say, stopAll, useCaption } from '../speech/narrator'
import { updateSettings, useSettings } from '../store/settings'

export function IconButton({ label, onClick, children, className = '' }: { label: string; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`grid size-12 shrink-0 place-items-center rounded-full bg-white/10 text-2xl transition active:scale-90 ${className}`}
    >
      {children}
    </button>
  )
}

export function QuietToggle() {
  const { narrationMuted } = useSettings()
  return (
    <IconButton
      label={narrationMuted ? 'הפעל קול' : 'מצב שקט'}
      onClick={() => {
        if (!narrationMuted) stopAll()
        updateSettings({ narrationMuted: !narrationMuted })
      }}
    >
      {narrationMuted ? '🔇' : '🔊'}
    </IconButton>
  )
}

export function TopBar({ title, onHome, step, total, points }: { title: string; onHome: () => void; step?: number; total?: number; points?: number }) {
  return (
    <header className="flex items-center gap-3">
      <IconButton label="הביתה" onClick={onHome}>
        🏠
      </IconButton>
      <div className="min-w-0 flex-1 text-center">
        <div className="truncate text-lg font-bold text-beitar">{title}</div>
        {total ? (
          <div className="mt-1 flex justify-center gap-1.5" aria-label={`שאלה ${(step ?? 0) + 1} מתוך ${total}`}>
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={`h-2 rounded-full transition-all ${i < (step ?? 0) ? 'w-2 bg-beitar' : i === step ? 'w-5 bg-white' : 'w-2 bg-white/20'}`} />
            ))}
          </div>
        ) : null}
      </div>
      {points !== undefined && (
        <div className="rounded-full bg-white/10 px-3 py-1.5 text-base font-bold tabular-nums">🏆 {points}</div>
      )}
      <QuietToggle />
    </header>
  )
}

/** Subtitles for everything the narrator says; tap to hear it again. */
export function Caption() {
  const { text, speaking } = useCaption()
  return (
    <button
      type="button"
      onClick={replay}
      aria-label="השמע שוב"
      className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-white/10 bg-black/55 px-4 py-2.5 text-right backdrop-blur transition active:scale-[0.98]"
    >
      <span className={`text-2xl ${speaking ? 'animate-pulse' : 'opacity-70'}`}>🔊</span>
      <span className="flex-1 text-lg leading-snug font-medium text-beitar" aria-live="polite">
        {text}
      </span>
    </button>
  )
}

export function MicButton({ listening, onPress, size = 'lg' }: { listening: boolean; onPress: () => void; size?: 'lg' | 'sm' }) {
  const big = size === 'lg'
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={onPress}
        aria-label={listening ? 'מקשיב' : 'לחץ ודבר'}
        className={`grid place-items-center rounded-full font-bold shadow-lg transition active:scale-90 ${big ? 'size-24 text-5xl sm:size-28' : 'size-16 text-3xl'} ${
          listening ? 'animate-ring bg-white text-ink' : 'bg-beitar text-ink shadow-[0_6px_0_#a8850a]'
        }`}
      >
        {listening ? '👂' : '🎤'}
      </button>
      <span className={`text-sm font-medium ${listening ? 'text-white' : 'text-white/70'}`}>{listening ? 'אני מקשיב...' : 'לחץ ותגיד'}</span>
    </div>
  )
}

type OptionState = 'idle' | 'eliminated' | 'hint' | 'correct'

/** A tap answer. The small speaker reads it aloud for kids who can't read yet. */
export function AnswerButton({
  label,
  spoken,
  state,
  onChoose,
  leading,
  big = false,
}: {
  label: string
  spoken: string
  state: OptionState
  onChoose: () => void
  leading?: ReactNode
  big?: boolean
}) {
  const styles: Record<OptionState, string> = {
    idle: 'bg-white text-ink shadow-[0_5px_0_#bdbdbd]',
    eliminated: 'bg-white/15 text-white/40 animate-shake',
    hint: 'bg-white text-ink animate-glow ring-4 ring-beitar',
    correct: 'bg-good text-ink ring-4 ring-white animate-pop',
  }
  return (
    <div className={`flex items-stretch overflow-hidden rounded-2xl transition ${styles[state]}`}>
      <button
        type="button"
        disabled={state === 'eliminated'}
        onClick={onChoose}
        className={`flex flex-1 items-center gap-3 px-4 text-right font-bold active:scale-[0.98] ${big ? 'min-h-20 text-4xl justify-center' : 'min-h-16 text-2xl'}`}
      >
        {leading}
        <span className="min-w-0 flex-1 leading-tight">{label}</span>
      </button>
      <button
        type="button"
        aria-label={`השמע: ${label}`}
        onClick={() => say(spoken, { remember: false })}
        className="grid w-14 shrink-0 place-items-center border-r border-black/10 text-xl active:scale-90"
      >
        🔈
      </button>
    </div>
  )
}

export type { OptionState }
