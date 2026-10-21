// Provider interfaces, so Web Speech can later be swapped for a cloud STT/TTS.

import type { SpeechAlternative } from '../engine/matching'

/** One narrated sentence: what the voice says, and the caption shown (defaults to `say`). */
export interface Line {
  say: string
  show?: string
}

export interface SpeakOptions {
  rate: number
  pitch: number
  voiceURI: string | null
}

export interface TTSProvider {
  isSupported(): boolean
  hebrewVoices(): SpeechSynthesisVoice[]
  /** Resolves when done; `false` means the engine never actually started talking. */
  speak(text: string, opts: SpeakOptions): Promise<boolean>
  cancel(): void
}

export type ListenResult =
  | { status: 'ok'; alternatives: SpeechAlternative[] }
  | { status: 'no-speech' | 'aborted' }
  | { status: 'not-allowed' | 'no-microphone' | 'unsupported' | 'network' | 'error'; message?: string }

export interface STTProvider {
  isSupported(): boolean
  /** Starts listening once (never continuous). Must be called from a user tap. */
  listen(opts?: { lang?: string; timeoutMs?: number }): Promise<ListenResult>
  abort(): void
}
