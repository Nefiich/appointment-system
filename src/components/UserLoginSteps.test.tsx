import { act, fireEvent, render, screen } from '@testing-library/react'

const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

// The returning-user lookup on step 1 finds a user with a PIN, which sends the
// form straight to step 4 (PIN entry).
const signInWithPassword = jest.fn()
jest.mock('@/lib/supabase', () => ({
  createBrowserClient: () => ({
    auth: { signInWithPassword },
    from: () => ({
      select: () => ({
        eq: () =>
          Promise.resolve({
            data: [{ custom_password_set: true }],
            error: null,
          }),
      }),
    }),
  }),
}))

import UserLoginSteps from './UserLoginSteps'

const goToPinStep = async () => {
  fireEvent.change(screen.getByLabelText('Unesite vaše ime'), {
    target: { value: 'Test Korisnik' },
  })
  fireEvent.change(screen.getByLabelText('Unesite vaš broj telefona'), {
    target: { value: '61123123' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Dalje' }))
  await screen.findByText('Unesite svoju lozinku')
}

const enterPinAndSubmit = async (pin: string) => {
  const boxes = screen.getAllByRole('textbox')
  pin
    .split('')
    .forEach((digit, i) =>
      fireEvent.change(boxes[i], { target: { value: digit } }),
    )
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Dalje' }))
  })
}

beforeEach(() => {
  jest.useFakeTimers()
  push.mockClear()
  signInWithPassword.mockReset()
})

afterEach(() => {
  jest.useRealTimers()
})

describe('UserLoginSteps PIN login', () => {
  it('shows an error and stays on the PIN step when the PIN is wrong', async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: {
        status: 400,
        message: 'Invalid login credentials',
      },
    })
    render(<UserLoginSteps />)
    await goToPinStep()

    await enterPinAndSubmit('000000')
    act(() => {
      jest.runAllTimers()
    })

    expect(signInWithPassword).toHaveBeenCalledWith({
      phone: '+38761123123',
      password: '000000',
    })
    expect(
      screen.getByText('Pogrešna lozinka. Pokušajte ponovo.'),
    ).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
    // The button is usable again for another attempt.
    expect(screen.getByRole('button', { name: 'Dalje' })).toBeEnabled()
  })

  it('redirects to the booking page when the PIN is correct', async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: { id: 'u1' }, session: { access_token: 't' } },
      error: null,
    })
    render(<UserLoginSteps />)
    await goToPinStep()

    await enterPinAndSubmit('123456')
    act(() => {
      jest.runAllTimers()
    })

    expect(push).toHaveBeenCalledWith('/rezervacije/')
  })
})
