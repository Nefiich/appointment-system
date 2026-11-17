import { detectInAppBrowser, getExternalBrowserUrl } from './in-app-browser'

const UA = {
  instagramIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 323.0.3.27.83 (iPhone14,5; iOS 17_4; en_US; en; scale=3.00; 1170x2532; 571229345)',
  instagramAndroid:
    'Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/122.0.6261.105 Mobile Safari/537.36 Instagram 321.0.0.39.106 Android (34/14; 480dpi; 1080x2340; samsung; SM-S918B; dm3q; qcom; en_US; 572390000)',
  facebookIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/455.0.0.36.104;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/17.4;FBSS/3;FBID/phone;FBLC/en_US;FBOP/5]',
  facebookAndroid:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP1A.240305.019; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/122.0.6261.105 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/455.0.0.36.104;]',
  safariIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
  chromeDesktop:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
}

describe('detectInAppBrowser', () => {
  it('detects Instagram on iOS', () => {
    expect(detectInAppBrowser(UA.instagramIos)).toEqual({
      isInApp: true,
      platform: 'ios',
    })
  })

  it('detects Instagram on Android', () => {
    expect(detectInAppBrowser(UA.instagramAndroid)).toEqual({
      isInApp: true,
      platform: 'android',
    })
  })

  it('detects the Facebook in-app browser on iOS and Android', () => {
    expect(detectInAppBrowser(UA.facebookIos)).toEqual({
      isInApp: true,
      platform: 'ios',
    })
    expect(detectInAppBrowser(UA.facebookAndroid)).toEqual({
      isInApp: true,
      platform: 'android',
    })
  })

  it('does not flag regular mobile and desktop browsers', () => {
    expect(detectInAppBrowser(UA.safariIos).isInApp).toBe(false)
    expect(detectInAppBrowser(UA.chromeAndroid).isInApp).toBe(false)
    expect(detectInAppBrowser(UA.chromeDesktop).isInApp).toBe(false)
  })

  it('handles an empty user agent', () => {
    expect(detectInAppBrowser('')).toEqual({
      isInApp: false,
      platform: 'other',
    })
  })
})

describe('getExternalBrowserUrl', () => {
  const href =
    'https://sinbadbarbershop.com/?fbclid=PAY2xjawJTfNFleHRuA2FlbQIxMQABpl9O1YYS7tiZuCdaO19QcBXhPTqioP4D08P0JImpNNEjGWel3tFFRx_bZA_aem_KRdJ5Vw8ccDicgdl27ujLg'

  it('builds a Chrome intent URL on Android, preserving path and query', () => {
    expect(getExternalBrowserUrl(href, 'android')).toBe(
      'intent://sinbadbarbershop.com/?fbclid=PAY2xjawJTfNFleHRuA2FlbQIxMQABpl9O1YYS7tiZuCdaO19QcBXhPTqioP4D08P0JImpNNEjGWel3tFFRx_bZA_aem_KRdJ5Vw8ccDicgdl27ujLg#Intent;scheme=https;package=com.android.chrome;end',
    )
  })

  it('builds an x-safari URL on iOS, preserving path and query', () => {
    expect(
      getExternalBrowserUrl(
        'https://sinbadbarbershop.com/rezervacije?a=1',
        'ios',
      ),
    ).toBe('x-safari-https://sinbadbarbershop.com/rezervacije?a=1')
  })

  it('drops the URL fragment so it cannot break the intent syntax', () => {
    expect(
      getExternalBrowserUrl(
        'https://sinbadbarbershop.com/rezervacije#top',
        'android',
      ),
    ).toBe(
      'intent://sinbadbarbershop.com/rezervacije#Intent;scheme=https;package=com.android.chrome;end',
    )
  })

  it('keeps the original scheme (http on localhost)', () => {
    expect(getExternalBrowserUrl('http://localhost:3000/', 'ios')).toBe(
      'x-safari-http://localhost:3000/',
    )
    expect(getExternalBrowserUrl('http://localhost:3000/', 'android')).toBe(
      'intent://localhost:3000/#Intent;scheme=http;package=com.android.chrome;end',
    )
  })

  it('returns null when there is no known escape for the platform', () => {
    expect(getExternalBrowserUrl(href, 'other')).toBeNull()
  })
})
