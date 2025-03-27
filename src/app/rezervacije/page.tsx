'use client'
import { ScrollablePills } from '@/components/ScrollablePills'
import SelectableGrid from '@/components/SelectableGrid'
import { SideBar } from '@/components/SideBar'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { Confirmation } from '@/components/Confirmation'
import { addDays, format, isSameDay, isAfter, isBefore, getDay } from 'date-fns'
import { createBrowserClient } from '@/lib/supabase'

// Initialize Supabase client
const supabase = createBrowserClient()

// Type definitions to match admin panel
type Appointment = {
  id: number
  name: string
  phone_number: string
  service: string
  appointment_time: Date
}

type UserProfile = {
  id: string
  name: string
  phone_number: string
}

export default function UserDashboard() {
  // Set the minimum booking date - either April 2, 2025 or today, whichever is later
  const minBookingDate = new Date(2025, 3, 2) // April 2, 2025
  const today = new Date()

  // If today is after April 2, 2025, use today as the start date
  const startDate = isAfter(today, minBookingDate) ? today : minBookingDate

  // Calculate end date (7 days from start date)
  const endDate = addDays(startDate, 7)

  // Set default month to April if current month is March
  const defaultMonth = today.getMonth() === 2 ? new Date(today.getFullYear(), 3) : today

  const [date, setDate] = useState<Date | undefined>(startDate)
  const [selectedTime, setSelectedTime] = useState(null)
  const [selectedService, setSelectedService] = useState(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [timeSlots, setTimeSlots] = useState([
    { time: '9:00' },
    { time: '9:30' },
    { time: '10:00' },
    { time: '10:30' },
    { time: '11:00' },
    { time: '11:30' },
    { time: '12:00' },
    { time: '12:30' },
  ])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [userAppointments, setUserAppointments] = useState<Appointment[]>([])
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false)
  const [appointmentToCancel, setAppointmentToCancel] = useState<number | null>(
    null,
  )
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [user, setUser] = useState<UserProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch appointments from Supabase
  // Replace the fetchAppointments function with this updated version

  // Fetch appointments from Supabase
  const fetchAppointments = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('appointments').select('*')

      if (error) {
        console.error('Error fetching appointments:', error)
        setError('Failed to load available time slots. Please try again.')
        return
      }

      // Transform the data to match our appointment structure
      const formattedAppointments = data.map((appointment) => {
        // Create a new Date object from the ISO string
        // Date constructor automatically converts UTC to local time zone
        const appointmentTime = new Date(appointment.appointment_time)

        console.log('Appointment from DB:', appointment.appointment_time)
        console.log(
          'Converted to local time:',
          appointmentTime.toLocaleString(),
        )

        return {
          id: appointment.id,
          name: appointment.name || 'Unnamed',
          phone_number: appointment.phone_number || '',
          service: appointment.service,
          appointment_time: appointmentTime,
        }
      })

      setAppointments(formattedAppointments)
    } catch (error) {
      console.error('Error:', error)
      setError('Nešto je pošlo po zlu. Molimo pokušajte kasnije.')
    } finally {
      setLoading(false)
    }
  }

  // The same approach should be used for fetchUserAppointments
  const fetchUserAppointments = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', userId)
        .gte('appointment_time', new Date().toISOString())
        .order('appointment_time', { ascending: true })
        .limit(3)

      if (error) {
        console.error('Error fetching user appointments:', error)
        setError('Failed to load your appointments. Please try again.')
        return
      }

      // Transform the data to match our appointment structure
      const formattedAppointments = data.map((appointment) => {
        // Create a new Date object from the ISO string
        // Date constructor automatically converts UTC to local time zone
        const appointmentTime = new Date(appointment.appointment_time)

        return {
          id: appointment.id,
          name: appointment.name || 'Unnamed',
          phone_number: appointment.phone_number || '',
          service: appointment.service,
          appointment_time: appointmentTime,
        }
      })

      setUserAppointments(formattedAppointments)
    } catch (error) {
      console.error('Error:', error)
      setError('Nešto je pošlo po zlu. Molimo pokušajte kasnije.')
    }
  }

  // Cancel appointment
  const cancelAppointment = async (appointmentId: number) => {
    try {
      // First, get the appointment details before deleting
      const { data: appointmentData, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single()

      if (fetchError) {
        console.error('Error fetching appointment details:', fetchError)
        setError('Neuspjelo otkazivanje termina. Molimo pokušajte ponovo.')
        return false
      }

      // Insert into canceled_appointments table
      const { error: insertError } = await supabase
        .from('canceled_appointments')
        .insert([
          {
            original_id: appointmentData.id,
            name: appointmentData.name,
            phone_number: appointmentData.phone_number,
            service: appointmentData.service,
            appointment_time: appointmentData.appointment_time,
            user_id: appointmentData.user_id,
          },
        ])

      if (insertError) {
        console.error('Error recording cancellation:', insertError)
        // Continue with deletion even if recording fails
      }

      // Delete from appointments table
      const { data: deleteData, error: deleteError } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId)
        .select()

      console.log('Delete response:', deleteData, deleteError)

      if (deleteError) {
        console.error('Error cancelling appointment:', deleteError)
        setError('Neuspjelo otkazivanje termina. Molimo pokušajte ponovo.')
        return false
      }

      // Refresh appointments
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        await fetchUserAppointments(session.user.id)
        await fetchAppointments()
      }

      return true
    } catch (error) {
      console.error('Error:', error)
      setError('Nešto je pošlo po zlu. Molimo pokušajte kasnije.')
      return false
    }
  }

  // Handle cancel confirmation
  const handleCancelConfirm = async () => {
    if (appointmentToCancel === null) return

    try {
      console.log(
        'Starting cancellation process for appointment ID:',
        appointmentToCancel,
      )
      const success = await cancelAppointment(appointmentToCancel)

      if (success) {
        alert('Termin je uspješno otkazan')
        // Remove the cancelled appointment from local state
        setUserAppointments(
          userAppointments.filter((app) => app.id !== appointmentToCancel),
        )
      } else {
        alert('Neuspjelo otkazivanje termina. Molimo pokušajte ponovo.')
      }
    } catch (error) {
      console.error('Error in handleCancelConfirm:', error)
      alert('Došlo je do greške prilikom otkazivanja. Molimo pokušajte ponovo.')
    } finally {
      setShowCancelConfirmation(false)
      setAppointmentToCancel(null)
    }
  }

  // Check authentication and fetch user profile data
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('Session error:', sessionError)
          setError('Authentication error. Please try refreshing the page.')
          return
        }

        if (!session) {
          console.log('No active session')
          return
        }

        // Get user ID from the session
        const userId = session.user.id

        // Fetch user profile from the users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, name, phone_number')
          .eq('user_id', userId)
          .single()

        if (userError) {
          console.error('Error fetching user profile:', userError)
          // Don't set error here, as the user might not have a profile yet
        } else if (userData) {
          setUser(userData)
          setName(userData.name || '')
          setPhone(userData.phone_number || '')
        }

        // Fetch user's appointments
        await fetchUserAppointments(userId)

        // Fetch all appointments regardless of user profile status
        fetchAppointments()
      } catch (error) {
        console.error('Auth check error:', error)
        setError('Failed to load user profile. Please try again.')
      }
    }

    checkAuth()
  }, [])

  // Helper functions for time slot calculation
  const parseTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}`
  }

  // Get service duration in minutes
  const getServiceDuration = (serviceId: string | number | null) => {
    if (serviceId === null || serviceId === undefined) return 30

    const id =
      typeof serviceId === 'string' ? parseInt(serviceId, 10) : serviceId

    const serviceDurations: Record<number, number> = {
      0: 10, // Brijanje
      1: 10, // Šišanje do kože
      2: 15, // Šišanje
      3: 20, // Fade
      4: 15, // Brijanje glave
      5: 30, // Šišanje + Brijanje
      6: 30, // Fade + Brijanje
    }

    return serviceDurations[id] || 30
  }

  // Calculate available time slots based on existing appointments for the selected date
  const calculateAvailableTimeSlots = (
    date: Date,
    existingAppointments: Appointment[],
  ) => {
    // Filter appointments for the selected date
    const appointmentsForDate = existingAppointments.filter((appointment) =>
      isSameDay(appointment.appointment_time, date),
    )

    const slots = []
    const businessStart = parseTime('08:30')
    const businessEnd = parseTime('18:30')
    let startOfDay = businessStart
    let endOfDay = businessEnd

    // Get current date and time
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()

    // If selected date is today, adjust start time to current time (rounded to next 30 min interval)
    if (isSameDay(date, now)) {
      let startMinutes = currentHour * 60 + currentMinute
      // Round up to the next 30-minute interval
      startMinutes = Math.ceil(startMinutes / 30) * 30

      // Ensure start time is within business hours
      startOfDay = Math.max(startMinutes, businessStart)
    }
    // For a date exactly 7 days in the future, limit end time
    else if (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate() + 7
    ) {
      let cutoffMinutes = currentHour * 60 + currentMinute + 30 // Current time + 30 min
      // Round up to the next 30-minute interval
      cutoffMinutes = Math.ceil(cutoffMinutes / 30) * 30

      // Ensure we're still showing slots within business hours
      endOfDay = Math.min(cutoffMinutes, businessEnd)
    }

    // Convert appointments to a format with time and duration
    const formattedAppointments = appointmentsForDate.map((appointment) => {
      const time = `${appointment.appointment_time
        .getHours()
        .toString()
        .padStart(2, '0')}:${appointment.appointment_time
        .getMinutes()
        .toString()
        .padStart(2, '0')}`

      // Get duration from service ID
      const duration = getServiceDuration(appointment.service)

      return {
        time,
        duration,
      }
    })

    // Sort appointments by time
    const sortedAppointments = [...formattedAppointments].sort(
      (a, b) => parseTime(a.time) - parseTime(b.time),
    )

    if (sortedAppointments.length === 0) {
      // If no appointments, generate slots every 30 minutes
      let currentTime = startOfDay
      while (currentTime < endOfDay) {
        slots.push({ time: formatTime(currentTime) })
        currentTime += 30
      }
    } else {
      // Generate slots based on appointment end times
      let currentTime = startOfDay

      for (const appointment of sortedAppointments) {
        // Add slots until this appointment starts
        while (currentTime < parseTime(appointment.time)) {
          slots.push({ time: formatTime(currentTime) })
          currentTime += 30
        }
        // Move to the end of this appointment
        currentTime = parseTime(appointment.time) + appointment.duration
      }

      // Add remaining slots after last appointment
      while (currentTime < endOfDay) {
        slots.push({ time: formatTime(currentTime) })
        currentTime += 30
      }
    }

    return slots
  }

  // Check if a slot is available for a specific duration
  const isSlotAvailable = (
    slot: string,
    duration: number,
    existingAppointments: Appointment[],
  ) => {
    const slotStart = parseTime(slot)
    const slotEnd = slotStart + duration

    if (slotEnd > parseTime('18:30')) return false

    // Convert appointments to a format with time and duration
    const formattedAppointments = existingAppointments.map((appointment) => {
      const time = `${appointment.appointment_time
        .getHours()
        .toString()
        .padStart(2, '0')}:${appointment.appointment_time
        .getMinutes()
        .toString()
        .padStart(2, '0')}`

      // Get duration from service ID
      const duration = getServiceDuration(appointment.service)

      return {
        time,
        duration,
      }
    })

    return !formattedAppointments.some((appointment) => {
      const appointmentStart = parseTime(appointment.time)
      const appointmentEnd = appointmentStart + appointment.duration
      return slotStart < appointmentEnd && slotEnd > appointmentStart
    })
  }

  // Update time slots when date or service changes
  useEffect(() => {
    if (date) {
      // Filter appointments for the selected date
      const appointmentsForDate = appointments.filter((appointment) =>
        isSameDay(appointment.appointment_time, date),
      )

      // Calculate available time slots
      const availableSlots = calculateAvailableTimeSlots(
        date,
        appointmentsForDate,
      )

      // If a service is selected, filter to only show slots that can fit the service
      if (selectedService !== null) {
        const serviceDuration = getServiceDuration(selectedService)
        const filteredSlots = availableSlots.filter((slot) =>
          isSlotAvailable(slot.time, serviceDuration, appointmentsForDate),
        )
        setTimeSlots(filteredSlots)
      } else {
        setTimeSlots(availableSlots)
      }

      // Reset selected time when date or service changes
      setSelectedTime(null)
    }
  }, [date, selectedService, appointments])

  // Handle reservation submission
  const handleReservationSubmit = () => {
    if (!name || !phone) {
      setError('Molimo unesite vaše ime i broj telefona')
      return
    }

    setShowConfirmation(true)
  }

  // Handle form field changes
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value)
  }

  // Custom date filter function to disable Sundays and dates outside the booking window
  const disabledDays = (date: Date) => {
    // Check if it's Sunday (0 = Sunday, 1 = Monday, etc.)
    return (
      getDay(date) === 0 ||
      // Before start date (April 2nd or today, whichever is later)
      isBefore(date, startDate) ||
      // After end date (current start date + 7 days)
      isAfter(date, endDate) ||
      // The user already has 3 appointments
      userAppointments.length >= 3
    )
  }

  // Handle confirmation
  // Inside handleConfirm function in UserDashboard.js
  // Replace the appointment creation section with this code

  const handleConfirm = async () => {
    if (!date || !selectedTime || selectedService === null) {
      setError('Please complete all required fields')
      return
    }

    try {
      // Get current user ID from session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session) {
        console.error('Session error:', sessionError)
        setError('Authentication error. Please sign in to book an appointment.')
        return
      }

      const userId = session.user.id

      // Parse the selected time
      const [hours, minutes] = (selectedTime as any).time.split(':').map(Number)

      // Create appointment time
      const appointmentTime = new Date(date)
      appointmentTime.setHours(hours, minutes, 0, 0)

      // Adjust for timezone before storing
      // This compensates for the timezone difference by adding the offset
      const timezoneOffset = appointmentTime.getTimezoneOffset()
      const adjustedTime = new Date(appointmentTime)
      adjustedTime.setMinutes(adjustedTime.getMinutes() - timezoneOffset)

      console.log('Local time selected:', appointmentTime.toLocaleString())
      console.log('Adjusted time for storage:', adjustedTime.toISOString())

      // Insert the new appointment into Supabase with the adjusted time
      const { data, error } = await supabase
        .from('appointments')
        .insert([
          {
            name: name,
            phone_number: phone,
            service: selectedService,
            appointment_time: adjustedTime.toISOString(),
            user_id: userId,
          },
        ])
        .select()

      if (error) {
        console.error('Greška prilikom dodavanja termina:', error)
        setError(`Error creating appointment: ${error.message}`)
        return
      }

      // Update user profile if not already set
      if (!user || !user.name || !user.phone_number) {
        const { error: updateError } = await supabase.from('users').upsert({
          user_id: userId,
          name: name,
          phone_number: phone,
        })

        if (updateError) {
          console.error('Error updating user profile:', updateError)
          // Continue anyway as the appointment was created successfully
        }
      }

      // Show success message
      alert('Rezervacija uspješno potvrđena!')

      // Reset form and close confirmation
      setShowConfirmation(false)
      setDate(startDate)
      setSelectedTime(null)
      setSelectedService(null)

      // Refresh appointments
      fetchAppointments()

      // Also refresh user appointments
      await fetchUserAppointments(userId)
    } catch (error) {
      console.error('Error:', error)
      setError('Došlo je do neočekivane greške')
    }
  }

  const handleCancel = () => {
    setShowConfirmation(false)
  }

  // Helper function to get service name
  const getServiceName = (serviceId: string | null) => {
    if (serviceId === null || serviceId === undefined) return 'Unknown service'

    const id =
      typeof serviceId === 'string' ? parseInt(serviceId, 10) : serviceId

    const serviceNames: Record<number, string> = {
      0: 'Brijanje',
      1: 'Šišanje do kože',
      2: 'Šišanje',
      3: 'Fade',
      4: 'Brijanje glave',
      5: 'Šišanje + Brijanje',
      6: 'Fade + Brijanje',
    }

    return serviceNames[id] || 'Unknown service'
  }

  if (showConfirmation) {
    return (
      <div>
        <SideBar />
        <Confirmation
          date={date}
          time={selectedTime}
          name={name}
          phone={phone}
          service={
            selectedService !== null
              ? getServiceName(selectedService.toString())
              : ''
          }
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          onBack={() => setShowConfirmation(false)}
        />
      </div>
    )
  }

  return (
    <div>
      <SideBar />
      <h1 className="mb-4 ml-5 mt-2 text-2xl font-bold">Rezervišite termin</h1>

      {/* Error display */}
      {error && (
        <div className="mx-5 mb-4 rounded-md bg-red-100 p-4 text-red-800">
          <p>{error}</p>
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="mx-5 mb-4 rounded-md bg-blue-100 p-4 text-blue-800">
          <p>Učitavanje dostupnih termina...</p>
        </div>
      )}

      {/* User appointments */}
      {userAppointments &&
        renderUserAppointments(
          userAppointments,
          getServiceName,
          setAppointmentToCancel,
          setShowCancelConfirmation,
        )}

      {/* Cancel confirmation dialog */}
      {showCancelConfirmation &&
        renderCancelConfirmation(
          userAppointments,
          appointmentToCancel,
          getServiceName,
          setShowCancelConfirmation,
          setAppointmentToCancel,
          handleCancelConfirm,
        )}

      <div className="mx-5 mt-5">
        <h2 className="mb-2 text-lg font-bold">1. Izaberite datum: </h2>
        <div className="flex h-full w-full items-center justify-center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            disabled={disabledDays}
            defaultMonth={defaultMonth} // Set the default month
            className="w-full rounded-md border"
            classNames={{
              months:
                'flex w-full flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 flex-1',
              month: 'space-y-4 w-full flex flex-col',
              table: 'w-full h-full border-collapse space-y-1',
              head_row: '',
              row: 'w-full mt-2',
              cell: cn(
                'relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected].day-range-end)]:rounded-r-md',
              ),
              day: (props) =>
                cn(
                  'h-9 w-9 p-0 font-normal aria-selected:opacity-100',
                  getDay(props.date) === 0 && 'text-red-500', // Sunday text in red
                ),
            }}
            footer={
              <div className="mt-3 text-center text-sm text-gray-500">
                Rezervacija moguća za period {format(startDate, 'dd.MM.')} -{' '}
                {format(endDate, 'dd.MM.yyyy')}
                <br />
                Nedjelja je neradni dan
              </div>
            }
          />
        </div>
      </div>

      <div className="mx-5 mt-5">
        <h2 className="mb-2 text-lg font-bold">2. Izaberite vrstu usluge: </h2>
        <div className="flex h-full w-full items-center justify-center">
          <SelectableGrid onSelect={(item) => setSelectedService(item)} />
        </div>
      </div>

      <div className="mx-5 mt-5">
        <h2 className="mb-2 text-lg font-bold">3. Izaberite termin: </h2>
        <div className="flex h-full w-full items-center justify-center">
          {timeSlots.length > 0 ? (
            <ScrollablePills
              items={timeSlots}
              onChange={(item) => {
                setSelectedTime(item)
              }}
            />
          ) : (
            <p className="py-4 text-center text-gray-500">
              Nema dostupnih termina za izabrani datum i uslugu. Molimo
              izaberite drugi datum.
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 flex w-full items-center justify-center">
        <Button
          className="mx-5 w-full"
          onClick={handleReservationSubmit}
          disabled={
            !date ||
            !selectedTime ||
            selectedService === null ||
            !name ||
            !phone ||
            userAppointments.length >= 3
          }
        >
          Rezerviši termin
        </Button>
      </div>

      {userAppointments.length >= 3 && (
        <p className="mx-5 mt-2 text-center text-sm text-red-600">
          Dostigli ste maksimum od 3 termina. Molimo otkažite postojeći termin
          da biste rezervisali novi.
        </p>
      )}
    </div>
  )
}

// Render cancel confirmation dialog
const renderCancelConfirmation = (
  userAppointments,
  appointmentToCancel,
  getServiceName,
  setShowCancelConfirmation,
  setAppointmentToCancel,
  handleCancelConfirm,
) => {
  const appointment = userAppointments.find(
    (app) => app.id === appointmentToCancel,
  )
  if (!appointment) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-bold text-black">Otkaži termin</h2>
        <p className="mb-4 text-black">
          Jeste li sigurni da želite otkazati vaš termin za{' '}
          {getServiceName(appointment.service.toString())} dana{' '}
          {appointment.appointment_time.toLocaleDateString()} u{' '}
          {appointment.appointment_time.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
          ?
        </p>
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => {
              setShowCancelConfirmation(false)
              setAppointmentToCancel(null)
            }}
          >
            Ne, zadrži ga
          </Button>
          <Button variant="destructive" onClick={handleCancelConfirm}>
            Da, otkaži
          </Button>
        </div>
      </div>
    </div>
  )
}

// Render user appointments
// Replace the renderUserAppointments function with this updated version

const renderUserAppointments = (
  userAppointments,
  getServiceName,
  setAppointmentToCancel,
  setShowCancelConfirmation,
) => {
  if (userAppointments.length === 0) return null

  return (
    <div className="mx-5 mb-6 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-bold text-indigo-800">
        Vaši predstojeći termini
      </h2>
      <div className="grid gap-3">
        {userAppointments.map((appointment) => (
          <div
            key={appointment.id}
            className="group flex flex-col rounded-lg bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {getServiceName(appointment.service.toString())}
                </p>
                <p className="text-sm text-gray-600">
                  {appointment.appointment_time.toLocaleDateString('bs')} u{' '}
                  {appointment.appointment_time.toLocaleTimeString('bs', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}
                </p>
              </div>
            </div>
            <button
              className="mt-3 flex items-center justify-center rounded-md border border-transparent bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:mt-0"
              onClick={() => {
                setAppointmentToCancel(appointment.id)
                setShowCancelConfirmation(true)
              }}
            >
              <svg
                className="mr-1.5 h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
              Otkaži
            </button>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-md bg-blue-50 p-3">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              Možete imati najviše tri predstojeća termina.
              {userAppointments.length >= 3 && (
                <span className="mt-1 block font-semibold">
                  Dostigli ste maksimalni broj termina. Molimo otkažite
                  postojeći termin kako biste rezervisali novi.
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
