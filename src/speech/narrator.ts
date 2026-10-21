// The narrator: speaks lines one after another, mirrors them as captions,
// and can replay the last thing said. In quiet mode it shows captions only.

import { createStore, useStore } from '../store/createStore'
import { settingsStore } from '../store/settings'
import type { Line } from './types'
import { WebSpeechSTT, WebSpeechTTS } from './webSpeech'

export const tts = new WebSpeechTTS()
export const stt = new WebSpeechSTT()

interface CaptionState {
  text: string
  speaking: boolean
  /** The speech engine didn't start talking last time (muted device, speech not unlocked, no voice). */
  silent: boolean
}
export const captionStore = createStore<CaptionState>({ text: '', speaking: false, silent: false })
export const useCaption = () => useStore(captionStore)

const NIQQUD = /[֑-ֽֿ-ׇ]/g
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

let token = 0
let lastLines: Line[] = []
/** Lines in a row the engine accepted but never started speaking. */
let silentStreak = 0

function toLines(input: string | Line | Line[]): Line[] {
  if (typeof input === 'string') return [{ say: input }]
  return Array.isArray(input) ? input : [input]
}

/**
 * Speaks the lines in order; a newer call interrupts an older one.
 * The first utterance starts synchronously, so calling this from a tap
 * also unlocks speech on iOS.
 */
export async function say(input: string | Line | Line[], { remember = true } = {}): Promise<void> {
  const lines = toLines(input)
  const mine = ++token
  tts.cancel()
  if (remember) lastLines = lines
  for (const line of lines) {
    if (mine !== token) return
    captionStore.set((c) => ({ ...c, text: line.show ?? line.say.replace(NIQQUD, ''), speaking: true }))
    const s = settingsStore.get()
    if (s.narrationMuted || !tts.isSupported()) await wait(700 + line.say.length * 45)
    else {
      const started = await tts.speak(line.say, { rate: s.rate, pitch: s.pitch, voiceURI: s.voiceURI })
      if (mine === token) {
        silentStreak = started ? 0 : silentStreak + 1
        captionStore.set((c) => ({ ...c, silent: silentStreak >= 2 }))
      }
    }
  }
  if (mine === token) captionStore.set((c) => ({ ...c, speaking: false }))
}

export function replay() {
  if (lastLines.length) void say(lastLines)
}

/** Silences narration and any open microphone (used when leaving a screen). */
export function stopAll() {
  token++
  tts.cancel()
  stt.abort()
  captionStore.set((c) => ({ ...c, text: '', speaking: false }))
}

/** Stops talking (e.g. before opening the microphone) but keeps the caption. */
export function hush() {
  token++
  tts.cancel()
  captionStore.set((c) => ({ ...c, speaking: false }))
}
