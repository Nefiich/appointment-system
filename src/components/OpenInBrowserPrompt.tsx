'use client'

import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  detectInAppBrowser,
  getExternalBrowserUrl,
  type InAppPlatform,
} from '@/lib/in-app-browser'

// Per-tab flags. sessionStorage can throw in locked-down webviews, so every
// access is guarded and failure just means "flag not set".
const DISMISS_KEY = 'in-app-browser-prompt-dismissed'
const AUTO_REDIRECT_KEY = 'in-app-browser-auto-redirected'

const readFlag = (key: string) => {
  try {
    return sessionStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

const setFlag = (key: string) => {
  try {
    sessionStorage.setItem(key, '1')
  } catch {
    // ignore
  }
}

const openExternally = (platform: InAppPlatform) => {
  const target = getExternalBrowserUrl(window.location.href, platform)
  if (target) window.location.href = target
}

// Covers the page when it is opened inside the Instagram/Facebook in-app
// browser, where the customer is not logged in, and sends them to their real
// browser where their session (and appointments) live.
export function OpenInBrowserPrompt() {
  const [platform, setPlatform] = useState<InAppPlatform | null>(null)

  useEffect(() => {
    const info = detectInAppBrowser(window.navigator.userAgent)
    if (!info.isInApp || readFlag(DISMISS_KEY)) return

    setPlatform(info.platform)

    // Android hands the page to Chrome without a tap. Only try once per tab so
    // a failed intent (e.g. Chrome not installed) can't loop.
    if (info.platform === 'android' && !readFlag(AUTO_REDIRECT_KEY)) {
      setFlag(AUTO_REDIRECT_KEY)
      openExternally('android')
    }
  }, [])

  if (!platform) return null

  const handleContinueHere = () => {
    setFlag(DISMISS_KEY)
    setPlatform(null)
  }

  const menuIcon = platform === 'android' ? '⋮' : '•••'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-sm space-y-5 text-center">
        <ExternalLink className="mx-auto h-10 w-10 text-emerald-500" />
        <h2 className="text-xl font-semibold">
          Otvorite stranicu u pregledniku
        </h2>
        <p className="text-sm text-muted-foreground">
          Link ste otvorili unutar Instagrama ili Facebooka. Tu niste
          prijavljeni, pa ne vidite svoje termine.
        </p>

        {platform !== 'other' && (
          <Button
            className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => openExternally(platform)}
          >
            {platform === 'ios' ? 'Otvori u Safariju' : 'Otvori u Chromeu'}
          </Button>
        )}

        <p className="text-sm text-muted-foreground">
          {platform === 'other' ? 'Tapnite' : 'Ako se ništa ne desi, tapnite'}{' '}
          <strong className="text-foreground">{menuIcon}</strong> u gornjem
          desnom uglu i odaberite otvaranje u vanjskom pregledniku.
        </p>

        <button
          type="button"
          onClick={handleContinueHere}
          className="text-xs text-muted-foreground underline underline-offset-4"
        >
          Nastavi ovdje
        </button>
      </div>
    </div>
  )
}
