import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from '@/App'
import { AuthProvider } from '@/auth/AuthProvider'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

/*
  index.html carries landing-page meta tags for crawlers and link previews that
  never run JavaScript. From here on every page renders its own through <Seo>,
  so drop the static copies rather than end up with two descriptions.
*/
document.head.querySelectorAll('[data-seo-default]').forEach((tag) => tag.remove())

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
