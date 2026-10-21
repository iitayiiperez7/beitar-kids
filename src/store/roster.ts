// The squad = built-in verified seed + the parent's edits and additions.
// Edits are stored as patches so seed updates in new app versions still flow in.

import { SEED_PLAYERS } from '../data/players'
import { withDerived } from '../data/names'
import type { Player } from '../data/types'
import { createStore, useStore } from './createStore'

interface RosterOverrides {
  edits: Record<string, Partial<Player>>
  added: Player[]
}

export const rosterStore = createStore<RosterOverrides>({ edits: {}, added: [] }, 'beitar.roster.v1')

function merge(o: RosterOverrides): Player[] {
  return [...SEED_PLAYERS, ...o.added].map((p) => withDerived(o.edits[p.id] ? { ...p, ...o.edits[p.id] } : p))
}

let cache: { o: RosterOverrides; roster: Player[] } | null = null
export function getRoster(): Player[] {
  const o = rosterStore.get()
  if (cache?.o !== o) cache = { o, roster: merge(o) }
  return cache.roster
}

export function useRoster(): Player[] {
  useStore(rosterStore)
  return getRoster()
}

export function isSeedPlayer(id: string): boolean {
  return SEED_PLAYERS.some((p) => p.id === id)
}

export function updatePlayer(id: string, patch: Partial<Player>) {
  rosterStore.set((o) => ({ ...o, edits: { ...o.edits, [id]: { ...o.edits[id], ...patch } } }))
}

export function addPlayer(firstName: string, lastName: string): string {
  const id = `custom-${Date.now().toString(36)}`
  const player: Player = withDerived({
    id,
    firstName,
    lastName,
    fullName: '',
    aliases: [],
    firstNameAliases: [],
    lastNameAliases: [],
    jerseyNumber: null,
    position: 'unknown',
    images: [],
    imageSources: [],
    imageVerified: false,
    active: false,
    learningPriority: 50,
    audioPronunciation: {},
    dataVerified: false,
    lastVerifiedAt: null,
    verificationNote: 'נוסף ידנית ע״י הורה',
  })
  rosterStore.set((o) => ({ ...o, added: [...o.added, player] }))
  return id
}

/** Seed players can only be deactivated; added players are removed. */
export function removePlayer(id: string) {
  if (isSeedPlayer(id)) return updatePlayer(id, { active: false })
  rosterStore.set((o) => {
    const edits = { ...o.edits }
    delete edits[id]
    return { edits, added: o.added.filter((p) => p.id !== id) }
  })
}

export function resetRosterEdits() {
  rosterStore.set({ edits: {}, added: [] })
}
