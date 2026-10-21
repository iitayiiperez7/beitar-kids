// Parent area (behind a grown-up question): roster, photos, practice
// selection, learning statistics and settings.

import { useEffect, useState, type ReactNode } from 'react'
import { spokenFull } from '../data/names'
import { SQUAD_SEASON } from '../data/players'
import { POSITION_LABEL, type ImageSource, type Player, type Position } from '../data/types'
import { STAGE_COUNT, sortedActive } from '../engine/pool'
import { STATUS_LABEL, statusOf, type LearnStatus } from '../engine/srs'
import { say, stt, tts } from '../speech/narrator'
import type { ListenResult } from '../speech/types'
import { deleteLocalImage, saveLocalImage, useImageUrl } from '../store/images'
import { learnedCount, resetProgress, setStage, useProgress } from '../store/progress'
import { addPlayer, isSeedPlayer, removePlayer, resetRosterEdits, updatePlayer, useRoster } from '../store/roster'
import { updateSettings, useSettings } from '../store/settings'
import { installApp, useCanInstall } from '../pwa'
import { JerseyArt } from '../ui/PlayerPhoto'
import { PhotoWizard } from './PhotoWizard'

const GATE_KEY = 'beitar.parent.unlocked'

export function Parent({ onExit }: { onExit: () => void }) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(GATE_KEY) === '1')
  const roster = useRoster()
  const [tab, setTab] = useState<'photos' | 'players' | 'progress' | 'settings'>(() =>
    roster.some((p) => p.active && !p.imageVerified) ? 'photos' : 'players',
  )

  if (!unlocked) {
    return (
      <Gate
        onPass={() => {
          sessionStorage.setItem(GATE_KEY, '1')
          setUnlocked(true)
        }}
        onExit={onExit}
      />
    )
  }

  return (
    <div className="h-dvh overflow-y-auto bg-ink">
      <div className="safe-pad mx-auto max-w-3xl pb-16">
        <header className="sticky top-0 z-10 -mx-4 flex items-center gap-3 bg-ink/95 px-4 py-3 backdrop-blur">
          <button type="button" onClick={onExit} className="rounded-full bg-beitar px-4 py-2 font-bold text-ink">
            → חזרה למשחק
          </button>
          <h1 className="flex-1 text-xl font-black">מסך הורים</h1>
        </header>
        <nav className="mb-4 flex gap-2">
          {(
            [
              ['photos', '📷 תמונות'],
              ['players', 'שחקנים'],
              ['progress', 'התקדמות'],
              ['settings', 'הגדרות'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex-1 rounded-xl px-2 py-2.5 text-sm font-bold sm:text-base ${tab === id ? 'bg-beitar text-ink' : 'bg-white/10'}`}
            >
              {label}
            </button>
          ))}
        </nav>
        {tab === 'photos' && <PhotoWizard />}
        {tab === 'players' && <PlayersTab />}
        {tab === 'progress' && <ProgressTab />}
        {tab === 'settings' && <SettingsTab />}
      </div>
    </div>
  )
}

function Gate({ onPass, onExit }: { onPass: () => void; onExit: () => void }) {
  const [[a, b]] = useState(() => [6 + Math.floor(Math.random() * 4), 6 + Math.floor(Math.random() * 4)])
  const [value, setValue] = useState('')
  const [wrong, setWrong] = useState(false)
  return (
    <div className="stadium safe-pad flex h-dvh flex-col items-center justify-center gap-4 text-center">
      <div className="text-5xl">🔒</div>
      <h1 className="text-2xl font-black">כניסה להורים</h1>
      <p className="text-white/80">כדי להמשיך, ענו על השאלה:</p>
      <form
        className="flex flex-col items-center gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (Number(value) === a * b) onPass()
          else {
            setWrong(true)
            setValue('')
          }
        }}
      >
        <label className="text-3xl font-bold" dir="ltr">
          {a} × {b} ={' '}
          <input
            autoFocus
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
            className="w-24 rounded-xl bg-white px-3 py-2 text-center text-ink"
            aria-label="תשובה"
          />
        </label>
        {wrong && <p className="text-red-300">לא נכון, נסו שוב</p>}
        <button type="submit" className="rounded-xl bg-beitar px-8 py-3 text-xl font-bold text-ink">
          כניסה
        </button>
      </form>
      <button type="button" onClick={onExit} className="mt-4 text-white/60 underline">
        חזרה למשחק
      </button>
    </div>
  )
}

function Card({ title, children, actions }: { title?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="mb-4 rounded-2xl bg-coal p-4">
      {(title || actions) && (
        <div className="mb-3 flex items-center gap-3">
          {title && <h2 className="flex-1 text-lg font-black text-beitar">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}

const input = 'w-full rounded-lg bg-white/10 px-3 py-2 text-white placeholder:text-white/40 focus:outline-2 focus:outline-beitar'
const smallBtn = 'rounded-lg bg-white/10 px-3 py-1.5 text-sm font-bold active:scale-95'

const STATUS_COLOR: Record<LearnStatus, string> = {
  new: 'bg-white/15 text-white',
  practicing: 'bg-orange-400/80 text-ink',
  almost: 'bg-sky-300 text-ink',
  mastered: 'bg-good text-ink',
}

function Thumb({ player }: { player: Player }) {
  const first = player.imageSources.find((s) => s.verified) ?? player.imageSources[0]
  const src = useImageUrl(first?.url)
  return (
    <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-white/5">
      {src ? <img src={src} alt="" className="h-full w-full object-cover object-top" /> : <JerseyArt number={player.jerseyNumber} className="h-full w-full p-1" />}
    </div>
  )
}

// ---------------------------------------------------------------- players

function PlayersTab() {
  const roster = useRoster()
  const settings = useSettings()
  const progress = useProgress()
  const [editing, setEditing] = useState<string | null>(null)
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')

  const active = sortedActive(roster)
  const inactive = roster.filter((p) => !p.active)
  const missingPhotos = active.filter((p) => !p.imageVerified).length
  const unverified = roster.filter((p) => !p.dataVerified).length
  const editingPlayer = roster.find((p) => p.id === editing)

  const togglePractice = (id: string) => {
    const set = new Set(settings.customPool)
    if (set.has(id)) set.delete(id)
    else set.add(id)
    updateSettings({ customPool: [...set], poolMode: set.size ? 'custom' : settings.poolMode === 'custom' ? 'stage' : settings.poolMode })
  }

  return (
    <>
      <Card title={`סגל ${SQUAD_SEASON}`}>
        <ul className="space-y-1 text-sm text-white/80">
          <li>
            ✅ {active.length} שחקנים פעילים · {inactive.length} לא פעילים
          </li>
          <li>📷 {active.length - missingPhotos} עם תמונה מאומתת · {missingPhotos} עדיין בלי תמונה (מוצגת חולצה עם מספר)</li>
          {unverified > 0 && <li>⚠️ {unverified} שחקנים שנתוניהם לא אומתו (כבויים כברירת מחדל)</li>}
          <li>🎯 לתרגול נבחרו: {settings.customPool.length || 'אין'} {settings.poolMode === 'custom' && '(פעיל עכשיו במשחק)'}</li>
        </ul>
        <p className="mt-3 rounded-xl bg-white/5 p-3 text-xs leading-relaxed text-white/60">
          הסגל אומת ב-21/10/2026 מול אתר המועדון וטפסי המשחק של ההתאחדות. התמונות באתר המועדון מוגנות בזכויות יוצרים, ולכן האפליקציה לא מעתיקה אותן. אפשר
          להעלות כאן תמונות שיש לכם רשות להשתמש בהן (למשל צילומים שלכם מהמגרש) — הן נשמרות רק במכשיר הזה. רק תמונה שסימנתם כמאומתת מוצגת לילד.
        </p>
      </Card>

      <Card title="הוספת שחקן">
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!first.trim() || !last.trim()) return
            const id = addPlayer(first.trim(), last.trim())
            setFirst('')
            setLast('')
            setEditing(id)
          }}
        >
          <input className={`${input} min-w-32 flex-1`} placeholder="שם פרטי" value={first} onChange={(e) => setFirst(e.target.value)} />
          <input className={`${input} min-w-32 flex-1`} placeholder="שם משפחה" value={last} onChange={(e) => setLast(e.target.value)} />
          <button type="submit" className="rounded-lg bg-beitar px-4 py-2 font-bold text-ink">
            הוספה
          </button>
        </form>
      </Card>

      {[
        ['שחקנים פעילים', active],
        ['לא פעילים', inactive],
      ].map(([title, list]) =>
        (list as Player[]).length ? (
          <Card key={title as string} title={title as string}>
            <ul className="divide-y divide-white/5">
              {(list as Player[]).map((p) => {
                const status = statusOf(progress.players[p.id])
                return (
                  <li key={p.id} className="flex items-center gap-3 py-2.5">
                    <Thumb player={p} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 font-bold">
                        <span>{p.fullName}</span>
                        <span className="text-beitar">#{p.jerseyNumber ?? '?'}</span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-1.5 text-xs">
                        <span className="text-white/60">{POSITION_LABEL[p.position]}</span>
                        <span className={`rounded px-1.5 ${STATUS_COLOR[status]}`}>{STATUS_LABEL[status]}</span>
                        {!p.dataVerified && <span className="rounded bg-red-400/80 px-1.5 text-ink">לא מאומת</span>}
                        {!p.imageVerified && <span className="rounded bg-white/10 px-1.5">אין תמונה</span>}
                      </div>
                    </div>
                    <label className="flex flex-col items-center text-[11px] text-white/70">
                      <input type="checkbox" checked={settings.customPool.includes(p.id)} onChange={() => togglePractice(p.id)} className="size-5 accent-[#F7CB23]" />
                      לתרגול
                    </label>
                    <label className="flex flex-col items-center text-[11px] text-white/70">
                      <input type="checkbox" checked={p.active} onChange={(e) => updatePlayer(p.id, { active: e.target.checked })} className="size-5 accent-[#F7CB23]" />
                      פעיל
                    </label>
                    <button type="button" className={smallBtn} onClick={() => setEditing(p.id)}>
                      עריכה
                    </button>
                  </li>
                )
              })}
            </ul>
          </Card>
        ) : null,
      )}

      {editingPlayer && <PlayerEditor player={editingPlayer} onClose={() => setEditing(null)} />}
    </>
  )
}

/** Comma-separated list input that commits on blur (so typing a comma isn't eaten). */
function ListField({ label, values, onCommit }: { label: string; values: string[]; onCommit: (v: string[]) => void }) {
  const [text, setText] = useState(values.join(', '))
  return (
    <Field label={label}>
      <input
        className={input}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() =>
          onCommit(
            text
              .split(/[,،]/)
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
      />
    </Field>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-white/60">{label}</span>
      {children}
    </label>
  )
}

function PlayerEditor({ player, onClose }: { player: Player; onClose: () => void }) {
  const set = (patch: Partial<Player>) => updatePlayer(player.id, patch)
  const setSources = (imageSources: ImageSource[]) => set({ imageSources })

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-3 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-auto max-w-2xl rounded-2xl bg-graphite p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-3">
          <Thumb player={player} />
          <h2 className="flex-1 text-xl font-black">{player.fullName}</h2>
          <button type="button" onClick={onClose} className="rounded-full bg-beitar px-4 py-2 font-bold text-ink">
            סגירה ✓
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="שם פרטי">
            <input className={input} value={player.firstName} onChange={(e) => set({ firstName: e.target.value })} />
          </Field>
          <Field label="שם משפחה">
            <input className={input} value={player.lastName} onChange={(e) => set({ lastName: e.target.value })} />
          </Field>
          <Field label="מספר חולצה">
            <input
              className={input}
              inputMode="numeric"
              value={player.jerseyNumber ?? ''}
              onChange={(e) => {
                const n = parseInt(e.target.value.replace(/\D/g, ''), 10)
                set({ jerseyNumber: Number.isFinite(n) ? Math.min(n, 99) : null })
              }}
            />
          </Field>
          <Field label="תפקיד">
            <select className={input} value={player.position} onChange={(e) => set({ position: e.target.value as Position })}>
              {Object.entries(POSITION_LABEL).map(([k, v]) => (
                <option key={k} value={k} className="text-ink">
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="סדר לימוד (1 = ראשון)">
            <input
              className={input}
              inputMode="numeric"
              value={player.learningPriority}
              onChange={(e) => set({ learningPriority: Number(e.target.value.replace(/\D/g, '')) || 1 })}
            />
          </Field>
          <Field label="סטטוס">
            <div className="flex gap-3 pt-2 text-sm">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={player.active} onChange={(e) => set({ active: e.target.checked })} className="size-4 accent-[#F7CB23]" /> פעיל
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={player.dataVerified}
                  onChange={(e) => set({ dataVerified: e.target.checked, lastVerifiedAt: e.target.checked ? new Date().toISOString().slice(0, 10) : null })}
                  className="size-4 accent-[#F7CB23]"
                />{' '}
                נתונים מאומתים
              </label>
            </div>
          </Field>
        </div>

        <h3 className="mt-5 mb-2 font-black text-beitar">זיהוי דיבור והגייה</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <ListField label="כינויים לשם פרטי (מופרדים בפסיק)" values={player.firstNameAliases} onCommit={(v) => set({ firstNameAliases: v })} />
          <ListField label="כינויים לשם משפחה" values={player.lastNameAliases} onCommit={(v) => set({ lastNameAliases: v })} />
          <ListField label="כינויים לשם המלא" values={player.aliases} onCommit={(v) => set({ aliases: v })} />
          <div />
          <Field label="הגיית הקריין – שם פרטי (אפשר עם ניקוד)">
            <input
              className={input}
              value={player.audioPronunciation.firstName ?? ''}
              placeholder={player.firstName}
              onChange={(e) => set({ audioPronunciation: { ...player.audioPronunciation, firstName: e.target.value || undefined } })}
            />
          </Field>
          <Field label="הגיית הקריין – שם משפחה">
            <input
              className={input}
              value={player.audioPronunciation.lastName ?? ''}
              placeholder={player.lastName}
              onChange={(e) => set({ audioPronunciation: { ...player.audioPronunciation, lastName: e.target.value || undefined } })}
            />
          </Field>
        </div>
        <button type="button" className={`${smallBtn} mt-2`} onClick={() => say({ say: spokenFull(player), show: player.fullName })}>
          🔊 בדיקת הגייה
        </button>

        <h3 className="mt-5 mb-2 font-black text-beitar">תמונות ({player.imageSources.length})</h3>
        <PhotoList player={player} onChange={setSources} />
        <AddPhoto player={player} onAdd={(s) => setSources([...player.imageSources, ...s])} />

        <h3 className="mt-5 mb-2 font-black text-beitar">אימות</h3>
        <p className="text-sm text-white/70">{player.verificationNote ?? '—'}</p>
        <p className="text-sm text-white/50">אומת לאחרונה: {player.lastVerifiedAt ?? 'לא אומת'}</p>
        {player.officialUrl && (
          <a href={player.officialUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm text-beitar underline">
            עמוד השחקן באתר המועדון ↗
          </a>
        )}
        {!isSeedPlayer(player.id) && (
          <button
            type="button"
            className="mt-4 block rounded-lg bg-red-500/80 px-4 py-2 font-bold"
            onClick={() => {
              if (confirm(`למחוק את ${player.fullName}?`)) {
                player.imageSources.forEach((s) => void deleteLocalImage(s.url))
                removePlayer(player.id)
                onClose()
              }
            }}
          >
            מחיקת שחקן
          </button>
        )}
      </div>
    </div>
  )
}

function PhotoList({ player, onChange }: { player: Player; onChange: (s: ImageSource[]) => void }) {
  if (!player.imageSources.length) {
    return <p className="mb-3 rounded-xl bg-white/5 p-3 text-sm text-white/60">אין עדיין תמונות. במשחק מוצגת חולצה צהובה עם המספר שלו.</p>
  }
  const update = (i: number, patch: Partial<ImageSource>) => onChange(player.imageSources.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  return (
    <ul className="mb-3 grid gap-3 sm:grid-cols-2">
      {player.imageSources.map((s, i) => (
        <PhotoItem
          key={s.url + i}
          source={s}
          onUpdate={(patch) => update(i, patch)}
          onRemove={() => {
            void deleteLocalImage(s.url)
            onChange(player.imageSources.filter((_, j) => j !== i))
          }}
        />
      ))}
    </ul>
  )
}

function PhotoItem({ source, onUpdate, onRemove }: { source: ImageSource; onUpdate: (p: Partial<ImageSource>) => void; onRemove: () => void }) {
  const src = useImageUrl(source.url)
  return (
    <li className={`flex gap-3 rounded-xl p-2 ${source.verified ? 'bg-white/5' : 'bg-red-500/10 ring-1 ring-red-400/50'}`}>
      <div className="h-28 w-22 shrink-0 overflow-hidden rounded-lg bg-black">{src && <img src={src} alt="" className="h-full w-full object-cover object-top" />}</div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm">
        <input className={`${input} py-1`} value={source.source} placeholder="מקור" onChange={(e) => onUpdate({ source: e.target.value })} />
        <input className={`${input} py-1`} type="date" value={source.date ?? ''} onChange={(e) => onUpdate({ date: e.target.value || undefined })} />
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={source.verified} onChange={(e) => onUpdate({ verified: e.target.checked })} className="size-4 accent-[#F7CB23]" />
          מאומתת (מוצגת לילד)
        </label>
        <button type="button" onClick={onRemove} className="self-start text-red-300 underline">
          הסרה
        </button>
      </div>
    </li>
  )
}

function AddPhoto({ player, onAdd }: { player: Player; onAdd: (s: ImageSource[]) => void }) {
  const [files, setFiles] = useState<File[]>([])
  const [url, setUrl] = useState('')
  const [source, setSource] = useState('')
  const [date, setDate] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [fileKey, setFileKey] = useState(0)
  const ready = confirmed && (files.length > 0 || /^https?:\/\//.test(url.trim())) && !busy

  async function submit() {
    setBusy(true)
    try {
      const now = new Date().toISOString()
      const meta = { source: source.trim() || (files.length ? 'העלאה מקומית' : new URL(url).hostname), date: date || undefined, verified: true, addedAt: now }
      const added: ImageSource[] = []
      for (const f of files) added.push({ ...meta, url: await saveLocalImage(f) })
      if (url.trim()) added.push({ ...meta, url: url.trim() })
      onAdd(added)
      setFiles([])
      setFileKey((k) => k + 1)
      setUrl('')
      setConfirmed(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-white/20 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="תמונות מהמכשיר">
          <input key={fileKey} type="file" accept="image/*" multiple onChange={(e) => setFiles([...(e.target.files ?? [])])} className="block w-full text-sm file:me-2 file:rounded-lg file:border-0 file:bg-beitar file:px-3 file:py-1.5 file:font-bold file:text-ink" />
        </Field>
        <Field label="או קישור לתמונה (https)">
          <input className={input} dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
        </Field>
        <Field label="מקור / צלם">
          <input className={input} value={source} onChange={(e) => setSource(e.target.value)} placeholder="למשל: צילום שלי, משחק בטדי" />
        </Field>
        <Field label="תאריך התמונה">
          <input className={input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <label className="mt-3 flex items-start gap-2 text-sm">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[#F7CB23]" />
        <span>
          אני מאשר/ת שזו תמונה של <b>{player.fullName}</b> במדי בית״ר ירושלים, ושיש לי רשות להשתמש בה.
        </span>
      </label>
      <button type="button" disabled={!ready} onClick={submit} className="mt-3 rounded-lg bg-beitar px-4 py-2 font-bold text-ink disabled:opacity-40">
        {busy ? 'שומר...' : 'הוספת תמונה'}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------- progress

function ProgressTab() {
  const roster = useRoster()
  const progress = useProgress()
  const active = sortedActive(roster)
  const fmt = (t: number) => (t ? new Date(t).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' }) : '—')

  return (
    <>
      <Card title="סיכום">
        <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          {[
            ['🏆 נקודות', progress.points],
            ['⭐ כוכבים', progress.stars],
            ['🏅 מדליות', progress.medals],
            ['📚 נלמדו', `${learnedCount(roster, progress)}/${active.length}`],
            ['🔥 רצף שיא', progress.bestStreak],
            ['🎮 סבבים', progress.rounds],
          ].map(([k, v]) => (
            <div key={k as string} className="rounded-xl bg-white/5 p-2">
              <div className="text-xs text-white/60">{k}</div>
              <div className="text-xl font-black">{v}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span>שלב נוכחי:</span>
          {Array.from({ length: STAGE_COUNT }, (_, i) => i + 1).map((s) => (
            <button key={s} type="button" onClick={() => setStage(s)} className={`rounded-lg px-3 py-1 font-bold ${progress.stage === s ? 'bg-beitar text-ink' : 'bg-white/10'}`}>
              {s}
            </button>
          ))}
          <span className="text-white/50">(1: 5 שחקנים · 2: 10 · 3: 20 · 4: כולם)</span>
        </div>
      </Card>

      <Card
        title="לפי שחקן"
        actions={
          <button
            type="button"
            className="rounded-lg bg-red-500/80 px-3 py-1.5 text-sm font-bold"
            onClick={() => confirm('לאפס את כל ההתקדמות, הנקודות והכוכבים?') && resetProgress()}
          >
            איפוס התקדמות
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-white/60">
              <tr className="text-right">
                <th className="py-1">שחקן</th>
                <th>מצב</th>
                <th>✓</th>
                <th>✗</th>
                <th>נראה לאחרונה</th>
              </tr>
            </thead>
            <tbody>
              {active.map((p) => {
                const pr = progress.players[p.id]
                const status = statusOf(pr)
                return (
                  <tr key={p.id} className="border-t border-white/5">
                    <td className="py-1.5 font-bold">
                      {p.fullName} <span className="text-beitar">#{p.jerseyNumber ?? '?'}</span>
                    </td>
                    <td>
                      <span className={`rounded px-1.5 text-xs ${STATUS_COLOR[status]}`}>{STATUS_LABEL[status]}</span>
                    </td>
                    <td className="tabular-nums">{pr?.correct ?? 0}</td>
                    <td className="tabular-nums">{pr?.wrong ?? 0}</td>
                    <td className="text-xs text-white/60">{fmt(pr?.lastSeen ?? 0)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

// ---------------------------------------------------------------- settings

function PhotoCredits() {
  const credited = useRoster().flatMap((p) => p.imageSources.filter((src) => src.pageUrl).map((src) => ({ p, src })))
  if (!credited.length) return null
  return (
    <Card title="קרדיט לתמונות">
      <ul className="space-y-1 text-xs text-white/70" dir="ltr">
        {credited.map(({ p, src }) => (
          <li key={src.url}>
            <a href={src.pageUrl} target="_blank" rel="noreferrer" className="underline">
              {p.fullName}
            </a>{' '}
            — {src.source}, {src.license}
            {src.date ? `, ${src.date}` : ''}
          </li>
        ))}
      </ul>
    </Card>
  )
}

function SettingsTab() {
  const s = useSettings()
  const canInstall = useCanInstall()
  const [voices, setVoices] = useState(() => tts.hebrewVoices())
  const [micTest, setMicTest] = useState<ListenResult | 'listening' | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setVoices(tts.hebrewVoices()), 600)
    return () => clearTimeout(t)
  }, [])

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

  return (
    <>
      <Card title="מי מתרגל">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['stage', 'לפי שלבים (מומלץ)'],
              ['all', 'כל השחקנים'],
              ['custom', `השחקנים שבחרתי (${s.customPool.length})`],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              disabled={mode === 'custom' && !s.customPool.length}
              onClick={() => updateSettings({ poolMode: mode })}
              className={`rounded-lg px-3 py-2 font-bold disabled:opacity-40 ${s.poolMode === mode ? 'bg-beitar text-ink' : 'bg-white/10'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-white/50">בוחרים שחקנים לתרגול בלשונית "שחקנים" (תיבת "לתרגול").</p>
        <Field label="שאלות בכל סבב">
          <div className="flex gap-2">
            {[5, 8, 10, 12].map((n) => (
              <button key={n} type="button" onClick={() => updateSettings({ roundLength: n })} className={`rounded-lg px-4 py-1.5 font-bold ${s.roundLength === n ? 'bg-beitar text-ink' : 'bg-white/10'}`}>
                {n}
              </button>
            ))}
          </div>
        </Field>
      </Card>

      <Card title="קריינות וצלילים">
        {!tts.isSupported() ? (
          <p className="text-red-300">הדפדפן הזה לא תומך בהקראה. הכתוביות יוצגו על המסך.</p>
        ) : !voices.length ? (
          <p className="text-sm text-orange-300">לא נמצא קול עברי במכשיר. ייתכן שההקראה תישמע במבטא זר — באייפון: הגדרות ← נגישות ← תוכן מוקרא ← קולות ← עברית.</p>
        ) : (
          <Field label="קול קריין">
            <select className={input} value={s.voiceURI ?? ''} onChange={(e) => updateSettings({ voiceURI: e.target.value || null })}>
              <option value="" className="text-ink">
                אוטומטי
              </option>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI} className="text-ink">
                  {v.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label={`מהירות דיבור: ${s.rate.toFixed(2)}`}>
            <input type="range" min={0.6} max={1.2} step={0.05} value={s.rate} onChange={(e) => updateSettings({ rate: Number(e.target.value) })} className="w-full accent-[#F7CB23]" />
          </Field>
          <Field label={`גובה קול: ${s.pitch.toFixed(2)}`}>
            <input type="range" min={0.8} max={1.4} step={0.05} value={s.pitch} onChange={(e) => updateSettings({ pitch: Number(e.target.value) })} className="w-full accent-[#F7CB23]" />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <Toggle checked={!s.narrationMuted} onChange={(v) => updateSettings({ narrationMuted: !v })} label="קריינות" />
          <Toggle checked={!s.sfxMuted} onChange={(v) => updateSettings({ sfxMuted: !v })} label="אפקטים וקהל" />
          <button type="button" className={smallBtn} onClick={() => say({ say: 'זה ירדן שׁוּעָה! המספר שלו הוא שבע!', show: 'זה ירדן שועה! המספר שלו הוא 7!' })}>
            🔊 בדיקת קול
          </button>
        </div>
      </Card>

      <Card title="זיהוי דיבור">
        <Toggle checked={s.sttEnabled} onChange={(v) => updateSettings({ sttEnabled: v })} label="לאפשר תשובות בקול" />
        <p className="mt-2 text-sm text-white/70">
          {stt.isSupported()
            ? 'הדפדפן תומך בזיהוי דיבור. ההרשאה למיקרופון מתבקשת רק כשהילד לוחץ על 🎤.'
            : 'הדפדפן הזה לא תומך בזיהוי דיבור — המשחק יציג תשובות לבחירה בלחיצה. (נתמך בכרום, באדג׳ ובספארי באייפון.)'}
        </p>
        {stt.isSupported() && (
          <div className="mt-2">
            <button
              type="button"
              className={smallBtn}
              onClick={async () => {
                setMicTest('listening')
                setMicTest(await stt.listen())
              }}
            >
              🎤 בדיקת מיקרופון (אמרו "ירדן שועה")
            </button>
            {micTest === 'listening' && <span className="ms-2 animate-pulse text-sm">מקשיב...</span>}
            {micTest && micTest !== 'listening' && (
              <div className="mt-2 rounded-lg bg-white/5 p-2 text-sm">
                {micTest.status === 'ok' ? (
                  <ul>
                    {micTest.alternatives.map((a, i) => (
                      <li key={i}>
                        "{a.transcript}" — ביטחון {a.confidence ? `${Math.round(a.confidence * 100)}%` : 'לא דווח'}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span>
                    תוצאה: {micTest.status}
                    {micTest.status === 'not-allowed' && ' — הגישה למיקרופון חסומה. אפשר לאשר אותה בהגדרות האתר בדפדפן.'}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
        <p className="mt-3 rounded-xl bg-white/5 p-3 text-xs leading-relaxed text-white/60">
          פרטיות: האפליקציה לא מקליטה ולא שומרת קול. לא מאזינים ברקע — רק אחרי לחיצה על המיקרופון, לכמה שניות. שימו לב: את הזיהוי עצמו מבצע הדפדפן, ובכרום הקול
          נשלח לעיבוד בשרתי Google. כל ההתקדמות והתמונות נשמרות רק במכשיר הזה.
        </p>
      </Card>

      <Card title="התקנה כאפליקציה">
        {canInstall ? (
          <button type="button" onClick={installApp} className="rounded-lg bg-beitar px-4 py-2 font-bold text-ink">
            📲 התקנה במכשיר
          </button>
        ) : (
          <p className="text-sm text-white/70">
            {isIOS ? 'באייפון/אייפד: בספארי לוחצים על כפתור השיתוף ⬆️ ואז "הוסף למסך הבית".' : 'בתפריט הדפדפן בוחרים "התקנת אפליקציה" או "הוספה למסך הבית".'}
          </p>
        )}
      </Card>

      <PhotoCredits />

      <Card title="איפוס">
        <button
          type="button"
          className="rounded-lg bg-red-500/80 px-4 py-2 font-bold"
          onClick={() => confirm('לבטל את כל העריכות ברשימת השחקנים ולחזור לסגל המאומת? (תמונות שהועלו יוסרו מהרשימה)') && resetRosterEdits()}
        >
          החזרת הסגל לברירת המחדל
        </button>
      </Card>
    </>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 rounded-full transition ${checked ? 'bg-beitar' : 'bg-white/20'}`}
      >
        <span className={`absolute top-1 size-5 rounded-full bg-white transition-all ${checked ? 'right-1' : 'right-6'}`} />
      </button>
      {label}
    </label>
  )
}
