import { useEffect, useState, type ReactNode } from 'react'
import { playablePhotos } from '../data/names'
import type { Player } from '../data/types'
import { useImageUrl } from '../store/images'

/** The back of a yellow shirt: stands in until a parent adds a verified photo. */
export function JerseyArt({ number, name, className = '' }: { number?: number | null; name?: string; className?: string }) {
  const label = number ?? (name ? null : '?')
  return (
    <svg viewBox="0 0 200 220" className={className} role="img" aria-label={[name, number].filter(Boolean).join(' ')}>
      <path
        d="M62 14 L138 14 L188 46 L168 92 L148 82 L148 206 Q100 214 52 206 L52 82 L32 92 L12 46 Z"
        fill="#F7CB23"
        stroke="#171717"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <path d="M74 14 Q100 38 126 14" fill="none" stroke="#171717" strokeWidth="9" strokeLinecap="round" />
      <path d="M186 50 L170 88 M14 50 L30 88" stroke="#171717" strokeWidth="10" strokeLinecap="round" />
      {name && (
        <text x="100" y="74" textAnchor="middle" direction="rtl" fontSize={name.length > 7 ? 19 : 24} fontWeight="800" fill="#171717" fontFamily="Rubik, sans-serif">
          {name}
        </text>
      )}
      {label !== null && (
        <text x="100" y={name ? 172 : 160} textAnchor="middle" fontSize={String(label).length > 1 ? 68 : 96} fontWeight="900" fill="#171717" fontFamily="Rubik, sans-serif">
          {label}
        </text>
      )}
    </svg>
  )
}

/** Fills the remaining height and fits a box of the given aspect ratio (w/h) inside it. */
export function Fit({ ratio = 0.8, children }: { ratio?: number; children: ReactNode }) {
  return (
    <div className="grid min-h-0 w-full flex-1 place-items-center [container-type:size]">
      <div style={{ width: `min(100cqw, ${ratio * 100}cqh)`, aspectRatio: String(ratio) }}>{children}</div>
    </div>
  )
}

interface PhotoProps {
  player: Player
  imageIndex?: number
  /** For the placeholder shirt: show the number / last name on it. */
  showNumber?: boolean
  showName?: boolean
  className?: string
  onClick?: () => void
}

export function PlayerPhoto({ player, imageIndex = 0, showNumber = true, showName = false, className = '', onClick }: PhotoProps) {
  const photos = playablePhotos(player)
  const photo = photos.length ? photos[imageIndex % photos.length] : null
  const src = useImageUrl(photo?.url)
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-[1.75rem] bg-linear-to-b from-[#2e2e2e] to-[#141414] ring-4 ring-beitar shadow-[0_0_40px_rgba(247,203,35,0.22)] ${className}`}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={player.fullName}
          draggable={false}
          onError={() => setFailed(true)}
          style={{
            objectPosition: photo?.objectPosition ?? '50% 15%',
            transform: photo?.zoom ? `scale(${photo.zoom})` : undefined,
            transformOrigin: photo?.objectPosition,
          }}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center p-[9%]">
          <JerseyArt number={showNumber ? player.jerseyNumber : null} name={showName ? player.lastName : undefined} className="h-full w-full drop-shadow-[0_8px_18px_rgba(0,0,0,0.5)]" />
        </div>
      )}
    </div>
  )
}
