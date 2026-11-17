// Instagram and Facebook open links in their own embedded browser. That
// browser has a cookie jar and localStorage that are completely separate from
// Safari/Chrome, so a customer who logged in from their normal browser arrives
// here with no Supabase session and appears to have lost their appointments.
// These helpers detect that situation and build a URL that hands the current
// page off to the system browser.

export type InAppPlatform = 'ios' | 'android' | 'other'

export interface InAppBrowserInfo {
  isInApp: boolean
  platform: InAppPlatform
}

// "Instagram" for IG; FBAN/FBAV (iOS) and FB_IAB (Android) for Facebook and
// Messenger.
const IN_APP_UA = /Instagram|FBAN|FBAV|FB_IAB/i

export function detectInAppBrowser(userAgent: string): InAppBrowserInfo {
  const platform: InAppPlatform = /Android/i.test(userAgent)
    ? 'android'
    : /iPhone|iPad|iPod/i.test(userAgent)
      ? 'ios'
      : 'other'

  return { isInApp: IN_APP_UA.test(userAgent), platform }
}

export function getExternalBrowserUrl(
  href: string,
  platform: InAppPlatform,
): string | null {
  const url = new URL(href)
  const scheme = url.protocol.replace(':', '')
  // The fragment is dropped: on Android "#" starts the intent parameters.
  const rest = `${url.host}${url.pathname}${url.search}`

  if (platform === 'android') {
    return `intent://${rest}#Intent;scheme=${scheme};package=com.android.chrome;end`
  }
  if (platform === 'ios') {
    // Supported since iOS 17; opens the URL in Safari.
    return `x-safari-${scheme}://${rest}`
  }
  return null
}
