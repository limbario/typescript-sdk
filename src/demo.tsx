import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RemoteControl } from './components/remote-control'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RemoteControl url="http://localhost:8080" token="1234567890" />
  </StrictMode>,
)
