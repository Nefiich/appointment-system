import { render, screen, userEvent } from '@/test/test-utils'
import { OpenInBrowserPrompt } from './OpenInBrowserPrompt'

const UA = {
  instagramIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 323.0.3.27.83 (iPhone14,5; iOS 17_4; en_US; en; scale=3.00; 1170x2532; 571229345)',
  instagramAndroid:
    'Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/122.0.6261.105 Mobile Safari/537.36 Instagram 321.0.0.39.106 Android (34/14; 480dpi; 1080x2340; samsung; SM-S918B; dm3q; qcom; en_US; 572390000)',
  safariIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
}

const PAGE = 'https://sinbadbarbershop.com/?fbclid=abc'
const originalLocation = window.location

const setUserAgent = (ua: string) =>
  jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(ua)

beforeEach(() => {
  sessionStorage.clear()
  // jsdom cannot navigate, so swap location for a plain object we can inspect.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { href: PAGE },
  })
})

afterEach(() => {
  jest.restoreAllMocks()
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: originalLocation,
  })
})

describe('OpenInBrowserPrompt', () => {
  it('renders nothing in a regular browser', () => {
    setUserAgent(UA.safariIos)
    const { container } = render(<OpenInBrowserPrompt />)
    expect(container).toBeEmptyDOMElement()
    expect(window.location.href).toBe(PAGE)
  })

  it('covers the page in Instagram on iOS and opens Safari on tap', async () => {
    setUserAgent(UA.instagramIos)
    render(<OpenInBrowserPrompt />)

    expect(
      await screen.findByText('Otvorite stranicu u pregledniku'),
    ).toBeInTheDocument()
    // iOS needs a tap; nothing happens automatically.
    expect(window.location.href).toBe(PAGE)

    await userEvent.click(
      screen.getByRole('button', { name: 'Otvori u Safariju' }),
    )
    expect(window.location.href).toBe(
      'x-safari-https://sinbadbarbershop.com/?fbclid=abc',
    )
  })

  it('auto-opens Chrome on Android only once per tab', async () => {
    setUserAgent(UA.instagramAndroid)
    const intent =
      'intent://sinbadbarbershop.com/?fbclid=abc#Intent;scheme=https;package=com.android.chrome;end'

    const first = render(<OpenInBrowserPrompt />)
    expect(await screen.findByText('Otvori u Chromeu')).toBeInTheDocument()
    expect(window.location.href).toBe(intent)
    first.unmount()

    window.location.href = PAGE
    render(<OpenInBrowserPrompt />)
    expect(await screen.findByText('Otvori u Chromeu')).toBeInTheDocument()
    expect(window.location.href).toBe(PAGE)
  })

  it('stays hidden for the rest of the tab after "Nastavi ovdje"', async () => {
    setUserAgent(UA.instagramIos)
    const first = render(<OpenInBrowserPrompt />)

    await userEvent.click(await screen.findByText('Nastavi ovdje'))
    expect(
      screen.queryByText('Otvorite stranicu u pregledniku'),
    ).not.toBeInTheDocument()
    first.unmount()

    const { container } = render(<OpenInBrowserPrompt />)
    expect(container).toBeEmptyDOMElement()
  })
})
