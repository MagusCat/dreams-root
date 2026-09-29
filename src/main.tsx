import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import { SessionProvider } from './app/SessionProvider'
import { installDevConsole } from './lib/devTools'
import './index.css'

installDevConsole()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionProvider>
      <App />
    </SessionProvider>
  </StrictMode>,
)
