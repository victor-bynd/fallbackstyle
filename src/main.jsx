import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TypoProvider } from './context/TypoContext'
import { UIProvider } from './context/UIContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UIProvider>
      <TypoProvider>
        <App />
      </TypoProvider>
    </UIProvider>
  </StrictMode>,
)
