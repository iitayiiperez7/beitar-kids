// Captures the browser's install prompt (Chrome/Edge/Android) for the parent screen.

import { createStore, useStore } from './store/createStore'

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
}

const promptStore = createStore<InstallPromptEvent | null>(null)

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    promptStore.set(e as InstallPromptEvent)
  })
  window.addEventListener('appinstalled', () => promptStore.set(null))
}

export const useCanInstall = () => useStore(promptStore) !== null

export async function installApp() {
  const e = promptStore.get()
  if (!e) return
  await e.prompt()
  promptStore.set(null)
}
