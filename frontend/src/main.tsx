import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import './index.css'
import { amplifyConfig } from './auth.ts'
import App from './App.tsx'

if (amplifyConfig) {
  Amplify.configure(amplifyConfig)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
