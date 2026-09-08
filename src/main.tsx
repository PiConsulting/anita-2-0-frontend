import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { initializeTelemetry, trackException } from './services/telemetry.ts'

initializeTelemetry()

window.addEventListener('error', (event) => {
  trackException(event.error ?? event.message, {
    source: 'window.error',
    filename: event.filename,
    line: event.lineno,
    column: event.colno,
  })
})

window.addEventListener('unhandledrejection', (event) => {
  trackException(event.reason, {
    source: 'window.unhandledrejection',
  })
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
