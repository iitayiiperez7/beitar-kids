import type { ImageSource, Player } from './types'

/** Narrator spelling of the club name (niqqud keeps TTS from saying "bitar"). */
export const BEITAR_SPOKEN = 'בֵּיתָר ירושלים'

export const spokenFirst = (p: Player) => p.audioPronunciation.firstName || p.firstName
export const spokenLast = (p: Player) => p.audioPronunciation.lastName || p.lastName
export const spokenFull = (p: Player) => `${spokenFirst(p)} ${spokenLast(p)}`

/** Only verified photos are ever shown to the child. */
export function playablePhotos(p: Player): ImageSource[] {
  return p.imageSources.filter((s) => s.verified)
}

/** Keeps the derived fields (fullName, images, imageVerified) in sync. */
export function withDerived(p: Player): Player {
  const imageSources: ImageSource[] = p.imageSources ?? []
  return {
    ...p,
    fullName: `${p.firstName} ${p.lastName}`.trim(),
    images: imageSources.map((s) => s.url),
    imageVerified: imageSources.some((s) => s.verified),
  }
}
