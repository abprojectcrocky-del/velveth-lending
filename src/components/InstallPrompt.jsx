import { useEffect, useState } from 'react'

/**
 * InstallPrompt
 * Shows a native-style "Add to Home Screen" banner on Android Chrome
 * and a manual instruction banner on iOS Safari.
 * Auto-hides after 15 seconds or when dismissed/installed.
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showAndroid, setShowAndroid]       = useState(false)
  const [showIOS, setShowIOS]               = useState(false)
  const [installed, setInstalled]           = useState(false)

  useEffect(() => {
    // Don't show if already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (window.navigator.standalone === true) return // iOS standalone
    if (localStorage.getItem('pwa-dismissed')) return

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isInSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

    if (isIOS && isInSafari) {
      // Show iOS manual instruction after 2s
      const t = setTimeout(() => setShowIOS(true), 2000)
      return () => clearTimeout(t)
    }

    // Android / Chrome: wait for beforeinstallprompt event
    function handler(e) {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowAndroid(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Detect successful install
    window.addEventListener('appinstalled', () => {
      setInstalled(true)
      setShowAndroid(false)
      setDeferredPrompt(null)
      setTimeout(() => setInstalled(false), 3000)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss(key) {
    setShowAndroid(false)
    setShowIOS(false)
    localStorage.setItem('pwa-dismissed', '1')
  }

  async function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowAndroid(false)
      setDeferredPrompt(null)
    }
  }

  // ── Styles ──────────────────────────────────────────────────
  const banner = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    background: 'white',
    borderTop: '1px solid #fbc5cc',
    padding: '16px',
    boxShadow: '0 -4px 24px rgba(61,16,24,0.18)',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    fontFamily: 'Inter, Arial, sans-serif',
    animation: 'slideUpBanner 0.35s ease',
  }

  const iconBox = {
    width: '52px',
    height: '52px',
    borderRadius: '12px',
    background: '#3d1018',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  }

  const installBtn = {
    background: '#be5a6a',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '9px 18px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
  }

  const closeBtn = {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#aaa',
    padding: '4px',
    flexShrink: 0,
  }

  // ── Installed toast ──────────────────────────────────────────
  if (installed) {
    return (
      <div style={{ ...banner, background: '#dcfce7', borderTop: '1px solid #86efac', padding: '14px 20px', justifyContent: 'center', gap: '10px' }}>
        <span style={{ fontSize: '20px' }}>🎉</span>
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#16a34a' }}>App installed successfully!</span>
      </div>
    )
  }

  // ── Android Chrome banner ────────────────────────────────────
  if (showAndroid) {
    return (
      <>
        <style>{`@keyframes slideUpBanner { from { transform: translateY(100%); opacity:0 } to { transform: translateY(0); opacity:1 } }`}</style>
        <div style={banner}>
          <div style={iconBox}>
            <img src="/pwa-192x192.png" alt="VLC" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#2d1018', marginBottom: '2px' }}>
              Install Velveth Lending
            </div>
            <div style={{ fontSize: '12px', color: '#888', lineHeight: 1.4 }}>
              Add to your home screen for faster access — works offline too!
            </div>
          </div>
          <button onClick={handleInstall} style={installBtn}>Install</button>
          <button onClick={dismiss} style={closeBtn}>✕</button>
        </div>
      </>
    )
  }

  // ── iOS Safari instruction banner ────────────────────────────
  if (showIOS) {
    return (
      <>
        <style>{`@keyframes slideUpBanner { from { transform: translateY(100%); opacity:0 } to { transform: translateY(0); opacity:1 } }`}</style>
        <div style={{ ...banner, flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
            <div style={iconBox}>
              <img src="/pwa-192x192.png" alt="VLC" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#2d1018' }}>Install VLC App</div>
              <div style={{ fontSize: '12px', color: '#888' }}>Add to your iPhone home screen</div>
            </div>
            <button onClick={dismiss} style={closeBtn}>✕</button>
          </div>
          {/* Step-by-step iOS instructions */}
          <div style={{ background: '#fff5f6', border: '1px solid #fbc5cc', borderRadius: '10px', padding: '12px 14px', width: '100%' }}>
            <div style={{ fontSize: '12px', color: '#5a3540', lineHeight: 1.9 }}>
              <div style={{ marginBottom: '4px', fontWeight: 600, color: '#be5a6a', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                How to install on iOS:
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: '#be5a6a', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>1</span>
                Tap the <strong style={{ color: '#007aff' }}>Share</strong> button <span style={{ fontSize: '15px' }}>⎙</span> at the bottom of your browser
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span style={{ background: '#be5a6a', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>2</span>
                Scroll down and tap <strong>"Add to Home Screen"</strong> <span style={{ fontSize: '14px' }}>➕</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span style={{ background: '#be5a6a', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>3</span>
                Tap <strong>"Add"</strong> in the top-right corner
              </div>
            </div>
          </div>
          {/* Arrow pointing to share button on iOS */}
          <div style={{ textAlign: 'center', width: '100%', fontSize: '12px', color: '#be5a6a', fontWeight: 600 }}>
            ↓ Tap Share button below ↓
          </div>
        </div>
      </>
    )
  }

  return null
}
