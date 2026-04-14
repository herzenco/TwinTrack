import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const root = document.getElementById('root')!;

try {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (err) {
  root.innerHTML = `
    <div style="color: white; padding: 2rem; font-family: monospace;">
      <h1>App failed to load</h1>
      <pre>${err instanceof Error ? err.message : String(err)}</pre>
    </div>
  `;
}
