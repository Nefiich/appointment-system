import { renderHook, act } from '@testing-library/react'

// Shared insert spy so we can assert how many times a row was inserted
const insertMock = jest.fn(() => ({
  select: () => Promise.resolve({ data: [{ id: 1 }], error: null }),
}))

// Result returned by the same-day availability query. Tests mutate this to
// inject existing appointments that should (or should not) block a booking.
let sameDayResult: { data: unknown[]; error: unknown } = {
  data: [],
  error: null,
}

function makeBuilder() {
  const builder: any = {
    // same-day availability chain: .select().gte().lte() -> awaited
    select: jest.fn(() => builder),
    gte: jest.fn(() => builder),
    lte: jest.fn(() => builder),
    // users upsert
    upsert: jest.fn(() => Promise.resolve({ error: null })),
    // appointment insert
    insert: insertMock,
    // makes the builder awaitable for the availability SELECT chain
    then: (resolve: (v: unknown) => void) => resolve(sameDayResult),
  }
  return builder
}

jest.mock('@/lib/supabase', () => ({
  createBrowserClient: () => ({
    auth: {
      getSession: jest.fn(() =>
        Promise.resolve({
          data: { session: { user: { id: 'user-1' } } },
          error: null,
        }),
      ),
    },
    from: jest.fn(() => makeBuilder()),
  }),
}))

// Import after the mock is registered
import { useAppointmentBooking } from './useAppointmentBooking'

const BOOKING_DATE = new Date('2026-06-10T00:00:00')

// Reproduce the app's "local-wall-clock-as-UTC" storage transform so the
// existing appointments we inject live in the same coordinate space as the
// time the hook computes for the new booking.
function storedIso(hours: number, minutes: number) {
  const t = new Date(BOOKING_DATE)
  t.setHours(hours, minutes, 0, 0)
  const adjusted = new Date(t)
  adjusted.setMinutes(adjusted.getMinutes() - t.getTimezoneOffset())
  return adjusted.toISOString()
}

function setup() {
  const fetchAppointments = jest.fn()
  const fetchUserAppointments = jest.fn(() => Promise.resolve())
  const setError = jest.fn()
  const { result } = renderHook(() =>
    useAppointmentBooking(fetchAppointments, fetchUserAppointments, setError),
  )
  return { result, setError }
}

describe('useAppointmentBooking', () => {
  beforeEach(() => {
    insertMock.mockClear()
    sameDayResult = { data: [], error: null }
  })

  it('inserts only once when handleBookAppointment is invoked twice concurrently', async () => {
    const { result } = setup()

    await act(async () => {
      // Fire two clicks in the same tick, before the first await resolves
      const p1 = result.current.handleBookAppointment(
        BOOKING_DATE,
        { time: '09:00' },
        2,
        'Test',
        '061000000',
      )
      const p2 = result.current.handleBookAppointment(
        BOOKING_DATE,
        { time: '09:00' },
        2,
        'Test',
        '061000000',
      )
      await Promise.all([p1, p2])
    })

    expect(insertMock).toHaveBeenCalledTimes(1)
  })

  it('blocks a booking that partially overlaps an earlier appointment', async () => {
    // Existing 08:50 appointment, service 5 = 30 min -> 08:50–09:20.
    sameDayResult = {
      data: [{ id: 99, appointment_time: storedIso(8, 50), service: 5 }],
      error: null,
    }
    const { result, setError } = setup()

    let booked: boolean | undefined
    await act(async () => {
      // New booking 09:00, service 2 = 15 min -> 09:00–09:15, overlaps above.
      booked = await result.current.handleBookAppointment(
        BOOKING_DATE,
        { time: '09:00' },
        2,
        'Test',
        '061000000',
      )
    })

    expect(booked).toBe(false)
    expect(insertMock).not.toHaveBeenCalled()
    expect(setError).toHaveBeenCalledWith(
      'Ovaj termin više nije dostupan. Molimo odaberite drugo vrijeme.',
    )
  })

  it('allows a booking that abuts an existing appointment without overlapping', async () => {
    // Existing 08:30 appointment, service 2 = 15 min -> 08:30–08:45.
    sameDayResult = {
      data: [{ id: 99, appointment_time: storedIso(8, 30), service: 2 }],
      error: null,
    }
    const { result } = setup()

    let booked: boolean | undefined
    await act(async () => {
      // New booking 08:45, service 2 = 15 min -> 08:45–09:00. Abuts, no overlap.
      booked = await result.current.handleBookAppointment(
        BOOKING_DATE,
        { time: '08:45' },
        2,
        'Test',
        '061000000',
      )
    })

    expect(booked).toBe(true)
    expect(insertMock).toHaveBeenCalledTimes(1)
  })
})
