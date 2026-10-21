import '@fontsource/rubik/hebrew-400.css'
import '@fontsource/rubik/latin-400.css'
import '@fontsource/rubik/hebrew-500.css'
import '@fontsource/rubik/latin-500.css'
import '@fontsource/rubik/hebrew-700.css'
import '@fontsource/rubik/latin-700.css'
import '@fontsource/rubik/hebrew-900.css'
import '@fontsource/rubik/latin-900.css'
import './index.css'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(<App />)
