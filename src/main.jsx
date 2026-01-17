import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { TypoProvider } from './context/TypoContext'
import { UIProvider } from './context/UIContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <UIProvider>
        <TypoProvider>
          <App />
        </TypoProvider>
      </UIProvider>
    </BrowserRouter>
  </StrictMode>,
)
