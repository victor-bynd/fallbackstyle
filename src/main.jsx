import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { UIProvider } from './shared/context/UIContext'
import { FontManagementProvider } from './shared/context/FontManagementContext'
import { LanguageMappingProvider } from './shared/context/LanguageMappingContext'
import { TypographyProvider } from './shared/context/TypographyContext'
import { PersistenceProvider } from './shared/context/PersistenceContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <UIProvider>
        {/* Context architecture: UI → FontManagement → LanguageMapping → Typography → Persistence */}
        <FontManagementProvider>
          <LanguageMappingProvider>
            <TypographyProvider>
              <PersistenceProvider>
                  <App />
              </PersistenceProvider>
            </TypographyProvider>
          </LanguageMappingProvider>
        </FontManagementProvider>
      </UIProvider>
    </BrowserRouter>
  </StrictMode>,
)
