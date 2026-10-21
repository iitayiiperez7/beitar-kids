// Short synthesized sound effects (no audio files to license or download).

import { settingsStore } from '../store/settings'

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  const s = settingsStore.get()
  if (s.sfxMuted || s.narrationMuted) return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** Call from a tap so later effects are allowed to play. */
export function unlockAudio() {
  audio()
}

function tone(freq: number, at: number, dur: number, type: OscillatorType = 'triangle', volume = 0.18) {
  const c = audio()
  if (!c) return
  const t = c.currentTime + at
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(gain).connect(c.destination)
  osc.start(t)
  osc.stop(t + dur + 0.05)
}

function noise(at: number, dur: number, filterFreq: number, q: number, volume: number, attack = 0.08) {
  const c = audio()
  if (!c) return
  const t = c.currentTime + at
  const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buffer
  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = filterFreq
  filter.Q.value = q
  const gain = c.createGain()
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(volume, t + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(filter).connect(gain).connect(c.destination)
  src.start(t)
}

export const sfx = {
  correct() {
    ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.08, 0.22))
  },
  /** Gentle, never scary. */
  tryAgain() {
    tone(392, 0, 0.16, 'sine', 0.12)
    tone(330, 0.14, 0.22, 'sine', 0.12)
  },
  star() {
    ;[1318.5, 1568, 2093, 2637].forEach((f, i) => tone(f, i * 0.07, 0.3, 'sine', 0.1))
  },
  flip() {
    noise(0, 0.07, 2400, 1.2, 0.12, 0.005)
  },
  /** Short stadium crowd cheer. */
  cheer() {
    noise(0, 1.8, 700, 0.6, 0.22, 0.25)
    noise(0.1, 1.5, 1600, 0.9, 0.12, 0.3)
    tone(2800, 0.2, 0.25, 'sine', 0.05)
    tone(2900, 0.5, 0.35, 'sine', 0.05)
  },
  medal() {
    ;[523.25, 659.25, 783.99].forEach((f, i) => tone(f, i * 0.12, 0.2, 'square', 0.07))
    tone(1046.5, 0.38, 0.6, 'square', 0.08)
  },
}
