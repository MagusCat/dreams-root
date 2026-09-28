import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import { SessionProvider } from './app/SessionProvider'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionProvider>
      <App />
    </SessionProvider>
  </StrictMode>,
)
