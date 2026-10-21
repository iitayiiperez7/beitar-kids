// Web Speech API implementations. Support varies a lot between browsers, so
// every call degrades gracefully: TTS falls back to captions only, STT
// reports why it could not listen and the game switches to tap answers.

import type { SpeechAlternative } from '../engine/matching'
import type { ListenResult, SpeakOptions, STTProvider, TTSProvider } from './types'

export class WebSpeechTTS implements TTSProvider {
  private voices: SpeechSynthesisVoice[] = []
  /** Holding a reference keeps Chrome from garbage-collecting it and losing `end`. */
  private current: SpeechSynthesisUtterance | null = null
  private lastCancel = 0

  constructor() {
    if (!this.isSupported()) return
    const load = () => (this.voices = window.speechSynthesis.getVoices())
    load()
    window.speechSynthesis.addEventListener?.('voiceschanged', load)
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
  }

  hebrewVoices(): SpeechSynthesisVoice[] {
    if (!this.voices.length && this.isSupported()) this.voices = window.speechSynthesis.getVoices()
    return this.voices.filter((v) => /^(he|iw)([-_]|$)/i.test(v.lang))
  }

  private pickVoice(voiceURI: string | null): SpeechSynthesisVoice | undefined {
    const he = this.hebrewVoices()
    return (
      he.find((v) => v.voiceURI === voiceURI) ??
      he.find((v) => /carmit|כרמית/i.test(v.name)) ??
      he.find((v) => /google/i.test(v.name)) ??
      he[0]
    )
  }

  speak(text: string, opts: SpeakOptions): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.isSupported()) return resolve(false)
      const synth = window.speechSynthesis
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'he-IL'
      const voice = this.pickVoice(opts.voiceURI)
      if (voice) u.voice = voice
      u.rate = opts.rate
      u.pitch = opts.pitch
      this.current = u
      let started = false
      let done = false
      // Some engines never fire `end`; don't let the game hang on them.
      const fallback = window.setTimeout(() => finish(), 2500 + (text.length * 120) / opts.rate)
      const finish = () => {
        if (done) return
        done = true
        window.clearTimeout(fallback)
        if (this.current === u) this.current = null
        resolve(started)
      }
      u.onstart = () => (started = true)
      u.onend = finish
      u.onerror = finish
      // Safari silently drops an utterance queued right after cancel(), so wait a moment.
      // With nothing cancelled (e.g. the very first tap) it speaks immediately, inside the gesture.
      const sinceCancel = Date.now() - this.lastCancel
      const start = () => {
        if (done) return
        synth.speak(u)
        if (synth.paused) synth.resume()
      }
      if (sinceCancel < 200) window.setTimeout(start, 200 - sinceCancel)
      else start()
    })
  }

  cancel(): void {
    if (!this.isSupported()) return
    const synth = window.speechSynthesis
    if (synth.speaking || synth.pending) {
      synth.cancel()
      this.lastCancel = Date.now()
    }
  }
}

// Minimal typing for the (still prefixed in most browsers) recognition API.
interface RecognitionAlternative {
  transcript: string
  confidence: number
}
interface RecognitionEvent {
  results: ArrayLike<ArrayLike<RecognitionAlternative> & { isFinal: boolean }>
}
interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((e: RecognitionEvent) => void) | null
  onerror: ((e: { error: string; message?: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
type RecognitionCtor = new () => Recognition

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

const ERROR_MAP: Record<string, ListenResult['status']> = {
  'not-allowed': 'not-allowed',
  'service-not-allowed': 'not-allowed',
  'no-speech': 'no-speech',
  'audio-capture': 'no-microphone',
  network: 'network',
  aborted: 'aborted',
  'language-not-supported': 'unsupported',
}

export class WebSpeechSTT implements STTProvider {
  private active: Recognition | null = null

  isSupported(): boolean {
    return recognitionCtor() !== null
  }

  listen({ lang = 'he-IL', timeoutMs = 7000 } = {}): Promise<ListenResult> {
    const Ctor = recognitionCtor()
    if (!Ctor) return Promise.resolve({ status: 'unsupported' })
    this.abort()

    return new Promise((resolve) => {
      const rec = new Ctor()
      this.active = rec
      rec.lang = lang
      rec.continuous = false
      rec.interimResults = false
      rec.maxAlternatives = 5

      let settled = false
      const finish = (r: ListenResult) => {
        if (settled) return
        settled = true
        window.clearTimeout(timer)
        if (this.active === rec) this.active = null
        resolve(r)
      }
      // Stop listening after a while; `stop()` still delivers what was heard.
      const timer = window.setTimeout(() => {
        try {
          rec.stop()
        } catch {
          /* already stopped */
        }
        window.setTimeout(() => finish({ status: 'no-speech' }), 1500)
      }, timeoutMs)

      rec.onresult = (e) => {
        const last = e.results[e.results.length - 1]
        const alternatives: SpeechAlternative[] = []
        for (let i = 0; i < last.length; i++) {
          alternatives.push({ transcript: last[i].transcript.trim(), confidence: last[i].confidence || 0 })
        }
        finish({ status: 'ok', alternatives })
      }
      rec.onerror = (e) => {
        const status = ERROR_MAP[e.error] ?? 'error'
        finish({ status, message: e.message || e.error } as ListenResult)
      }
      rec.onend = () => finish({ status: 'no-speech' })

      try {
        rec.start()
      } catch (err) {
        finish({ status: 'error', message: String(err) })
      }
    })
  }

  abort(): void {
    const rec = this.active
    this.active = null
    try {
      rec?.abort()
    } catch {
      /* ignore */
    }
  }
}
