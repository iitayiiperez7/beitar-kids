// Parent flow for adding photos one player at a time, made for a phone:
// open the player's page → long-press the photo → "Copy" → back here → paste → confirm.
// Photos are kept on this device only.

import { useEffect, useState } from 'react'
import type { Player } from '../data/types'
import { sortedActive } from '../engine/pool'
import { saveLocalImage } from '../store/images'
import { updatePlayer, useRoster } from '../store/roster'
import { PlayerPhoto } from '../ui/PlayerPhoto'

interface Pending {
  blob: Blob
  url: string
  via: string
}

function searchUrl(p: Player): string {
  return p.officialUrl ?? `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${p.fullName} בית״ר ירושלים`)}`
}

const btn = 'flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-4 text-lg font-bold active:scale-[0.98]'

export function PhotoWizard() {
  const roster = useRoster()
  const players = sortedActive(roster)
  const missing = players.filter((p) => !p.imageVerified)
  const [onlyMissing, setOnlyMissing] = useState(missing.length > 0)
  const list = onlyMissing ? missing : players
  const [index, setIndex] = useState(0)
  const player = list.length ? list[Math.min(index, list.length - 1)] : null
  const [pending, setPending] = useState<Pending | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const take = (blob: Blob, via: string) => {
    setError('')
    setPending((old) => {
      if (old) URL.revokeObjectURL(old.url)
      return { blob, url: URL.createObjectURL(blob), via }
    })
  }

  // Desktop: Cmd/Ctrl+V anywhere on the page.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'))
      if (file) {
        e.preventDefault()
        take(file, 'הדבקה')
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])

  async function pasteFromClipboard() {
    setError('')
    try {
      for (const item of await navigator.clipboard.read()) {
        const type = item.types.find((t) => t.startsWith('image/'))
        if (type) return take(await item.getType(type), 'הדבקה')
      }
      setError('אין תמונה בהעתקה. באתר: לחיצה ארוכה על התמונה ← "העתק", ואז חוזרים לכאן.')
    } catch {
      setError('הדפדפן לא אפשר להדביק. אפשר במקום זה לשמור את התמונה ל"תמונות" ולבחור אותה מהגלריה.')
    }
  }

  async function save() {
    if (!pending || !player) return
    setBusy(true)
    try {
      const url = await saveLocalImage(pending.blob)
      updatePlayer(player.id, {
        imageSources: [...player.imageSources, { url, source: `נוסף ע״י הורה (${pending.via})`, verified: true, addedAt: new Date().toISOString() }],
      })
      URL.revokeObjectURL(pending.url)
      setPending(null)
      // In "missing only" the saved player leaves the list, so the same index is already the next one.
      if (!onlyMissing) setIndex((i) => Math.min(i + 1, list.length - 1))
    } finally {
      setBusy(false)
    }
  }

  const go = (delta: number) => {
    setPending(null)
    setError('')
    setIndex((i) => (list.length ? (Math.min(i, list.length - 1) + delta + list.length) % list.length : 0))
  }

  const done = players.length - missing.length
  return (
    <>
      <section className="mb-4 rounded-2xl bg-coal p-4">
        <h2 className="text-lg font-black text-beitar">📷 הוספת תמונות שחקנים</h2>
        <div className="mt-2 flex items-center gap-3">
          <span className="shrink-0 text-sm font-bold">
            {done} מתוך {players.length} עם תמונה
          </span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-beitar transition-all" style={{ width: `${players.length ? (100 * done) / players.length : 0}%` }} />
          </div>
        </div>
        <ol className="mt-3 list-inside list-decimal space-y-1 text-sm text-white/80">
          <li>פותחים את עמוד השחקן (הכפתור הצהוב).</li>
          <li>לחיצה ארוכה על התמונה ← "העתק" (או "שמירה בתמונות").</li>
          <li>חוזרים לכאן ← "הדבקת תמונה" (או "בחירה מהגלריה") ← מאשרים.</li>
        </ol>
        <p className="mt-2 text-xs text-white/50">התמונות נשמרות רק במכשיר הזה, לשימוש פרטי בבית, ולא עולות לשום מקום.</p>
        <div className="mt-3 flex gap-2 text-sm">
          {[
            [true, `בלי תמונה (${missing.length})`],
            [false, `כל השחקנים (${players.length})`],
          ].map(([value, label]) => (
            <button
              key={String(value)}
              type="button"
              onClick={() => {
                setOnlyMissing(value as boolean)
                setIndex(0)
                setPending(null)
              }}
              className={`rounded-lg px-3 py-1.5 font-bold ${onlyMissing === value ? 'bg-beitar text-ink' : 'bg-white/10'}`}
            >
              {label as string}
            </button>
          ))}
        </div>
      </section>

      {!player ? (
        <section className="rounded-2xl bg-coal p-6 text-center text-xl font-bold">🎉 לכל השחקנים יש תמונה!</section>
      ) : (
        <section className="rounded-2xl bg-coal p-4">
          <div className="mb-3 flex items-center justify-between text-sm">
            <button type="button" onClick={() => go(-1)} className="rounded-lg bg-white/10 px-3 py-1.5 font-bold">
              → הקודם
            </button>
            <span className="text-white/60">
              {Math.min(index, list.length - 1) + 1} / {list.length}
            </span>
            <button type="button" onClick={() => go(1)} className="rounded-lg bg-white/10 px-3 py-1.5 font-bold">
              הבא ←
            </button>
          </div>

          <div className="mb-4 flex items-center gap-4">
            <PlayerPhoto player={player} className="h-24 w-20 shrink-0 rounded-2xl! ring-2!" />
            <div>
              <div className="text-3xl font-black">{player.fullName}</div>
              <div className="text-xl font-bold text-beitar">#{player.jerseyNumber ?? '?'}</div>
              {player.imageSources.length > 0 && <div className="text-xs text-white/50">יש כבר {player.imageSources.length} תמונות</div>}
            </div>
          </div>

          {pending ? (
            <div className="grid gap-3">
              <img src={pending.url} alt="" className="mx-auto max-h-80 rounded-2xl bg-black/40 object-contain" />
              <button type="button" disabled={busy} onClick={save} className={`${btn} bg-good text-ink disabled:opacity-50`}>
                ✓ זה {player.fullName} במדי בית״ר — שמירה
              </button>
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(pending.url)
                  setPending(null)
                }}
                className={`${btn} bg-white/10`}
              >
                ✗ לא, תמונה אחרת
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              <a href={searchUrl(player)} target="_blank" rel="noreferrer" className={`${btn} bg-beitar text-ink`}>
                1. {player.officialUrl ? 'פתיחת העמוד באתר המועדון' : 'חיפוש תמונה שלו'} ↗
              </a>
              {'clipboard' in navigator && 'read' in navigator.clipboard && (
                <button type="button" onClick={pasteFromClipboard} className={`${btn} bg-white text-ink`}>
                  2. 📋 הדבקת תמונה שהעתקתם
                </button>
              )}
              <label className={`${btn} cursor-pointer bg-white/10`}>
                📷 בחירה מהגלריה
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) take(file, 'גלריה')
                    e.target.value = ''
                  }}
                />
              </label>
              <button type="button" onClick={() => go(1)} className="text-sm text-white/60 underline">
                דלג לשחקן הבא
              </button>
            </div>
          )}
          {error && <p className="mt-3 rounded-xl bg-red-500/20 p-3 text-sm">{error}</p>}
        </section>
      )}
    </>
  )
}
