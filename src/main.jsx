import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import './index.css'

// Register service worker — auto-updates in background
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // New version available — show a subtle reload button
    const div = document.createElement('div')
    div.id = 'sw-update-banner'
    div.innerHTML = `
      <div style="
        position:fixed; top:0; left:0; right:0; z-index:99999;
        background:#3d1018; color:white;
        padding:12px 16px;
        display:flex; align-items:center; justify-content:space-between;
        font-family:Inter,Arial,sans-serif; font-size:13px;
        box-shadow:0 2px 12px rgba(0,0,0,0.3);
      ">
        <span>🔄 New version available!</span>
        <button onclick="document.getElementById('sw-update-banner').remove(); window.location.reload()" style="
          background:#be5a6a; color:white; border:none; padding:6px 14px;
          border-radius:6px; font-size:12px; font-weight:700; cursor:pointer;
        ">Update Now</button>
      </div>
    `
    document.body.prepend(div)
  },
  onOfflineReady() {
    console.log('✅ VLC App is ready to work offline!')
  },
  onRegistered(r) {
    // Check for updates every 60 minutes while app is open
    r && setInterval(() => r.update(), 60 * 60 * 1000)
  },
  onRegisterError(error) {
    console.error('SW registration error:', error)
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
