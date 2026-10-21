export type Position = 'goalkeeper' | 'defender' | 'midfielder' | 'winger' | 'forward' | 'unknown'

export const POSITION_LABEL: Record<Position, string> = {
  goalkeeper: 'שוער',
  defender: 'שחקן הגנה',
  midfielder: 'קשר',
  winger: 'שחקן כנף',
  forward: 'שחקן התקפה',
  unknown: 'שחקן',
}

export const POSITION_ICON: Record<Position, string> = {
  goalkeeper: '🧤',
  defender: '🛡️',
  midfielder: '🎯',
  winger: '💨',
  forward: '⚡',
  unknown: '⚽',
}

export interface ImageSource {
  /** http(s) URL, or "idb:<key>" for a photo the parent uploaded on this device. */
  url: string
  /** Where the photo came from (site, photographer, "העלאה מקומית"). */
  source: string
  /** When the photo was taken or published (ISO date), if known. */
  date?: string
  /** Permission note, e.g. "לשימוש פרטי בבית". */
  license?: string
  /** A parent confirmed this is the right player, in a Beitar kit. Only verified photos reach the game. */
  verified: boolean
  addedAt: string
}

export interface Player {
  id: string
  firstName: string
  lastName: string
  fullName: string
  /** Other accepted spellings of the full name (recognizer output, nicknames). */
  aliases: string[]
  firstNameAliases: string[]
  lastNameAliases: string[]
  jerseyNumber: number | null
  position: Position
  /** Photo URLs; imageSources[i] describes images[i]. */
  images: string[]
  imageSources: ImageSource[]
  /** At least one photo has been verified. */
  imageVerified: boolean
  active: boolean
  /** 1 = learn first. */
  learningPriority: number
  /** Spelling tuned for the narrator (may include niqqud). */
  audioPronunciation: { firstName?: string; lastName?: string }
  /** Name + number + squad membership checked against an official source. */
  dataVerified: boolean
  lastVerifiedAt: string | null
  verificationNote?: string
  officialUrl?: string
}
