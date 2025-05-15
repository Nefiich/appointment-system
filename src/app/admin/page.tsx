'use client'

import React, { useEffect } from 'react'
import { useState } from 'react'
import {
  addDays,
  addMonths,
  endOfDay,
  format,
  isSameDay,
  parseISO,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Search, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'
import SelectableGrid from '@/components/SelectableGrid'
import { ScrollablePills } from '@/components/ScrollablePills'
import { start } from 'repl'
import { toast } from '@/hooks/use-toast'
import { dayMap } from '@/lib/appointment-utils'
import { SidebarTrigger } from '@/components/ui/sidebar'

// Initialize Supabase client
const supabase = createBrowserClient()

// Define appointment type
type Appointment = {
  id: number
  title: string
  description: string
  startTime: Date
  endTime: Date
  color: string
  name?: string
  service?: string
  phone_number?: string
  user_id?: string
}

const bosnianWeekDays = [
  'Nedjelja', // 0
  'Ponedjeljak', // 1
  'Utorak', // 2
  'Srijeda', // 3
  'Četvrtak', // 4
  'Petak', // 5
  'Subota', // 6
]

type ViewType = 'day' | 'week' | 'month' | 'year'

export default function CalendarDashboard() {
  const notificationAudioRef = React.useRef<HTMLAudioElement>(null)

  const router = useRouter()
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [view, setView] = useState<ViewType>('week')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [authChecked, setAuthChecked] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null)
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false)

  const [blockedDates, setBlockedDates] = useState<Date[]>([])

  // Generate the days of the week starting from today
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentDate, i))

  // Generate time slots from 8 AM to 6 PM
  const timeSlots = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
  const [showModal, setShowModal] = useState(false)
  const [appointmentDate, setAppointmentDate] = useState<Date | undefined>(
    new Date(),
  )
  const [selectedTime, setSelectedTime] = useState(null)
  const [selectedService, setSelectedService] = useState(null)

  // Check authentication status on component mount and redirect if not authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error) {
        console.error('Auth error:', error)
        router.push('/login?message=Authentication error. Please log in again.')
        return
      }

      if (!session) {
        console.log('No session found, redirecting to login')
        router.push(
          '/login?message=You must be logged in to access the admin area',
        )
        return
      }

      // If we have a session, fetch appointments
      fetchAppointments()
    }

    checkAuth()
  }, [router])

  const fetchAppointments = async () => {
    setLoading(true)
    try {
      // First check if user is authenticated
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login?message=You must be logged in to view appointments')
        return
      }

      const today = new Date()
      const startDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        0,
        0,
        0,
      )

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .gte('appointment_time', startDate.toISOString())

      if (error) {
        console.error('Error fetching appointments:', error)
        return
      }

      // Transform the data to match our appointment structure
      const formattedAppointments = data.map((appointment) => {
        // Create Date objects from the ISO string
        const startTime = new Date(appointment.appointment_time)
        const endTime = new Date(startTime)
        endTime.setMinutes(
          endTime.getMinutes() + getServiceDuration(appointment.service),
        )

        return {
          id: appointment.id,
          title: appointment.name || 'Unnamed',
          description: appointment.phone_number || '',
          startTime: startTime,
          endTime: endTime,
          color: getColorForService(appointment.service),
          name: appointment.name,
          service: appointment.service,
          phone_number: appointment.phone_number,
          user_id: appointment.user_id,
        }
      })

      console.log('FA: ', formattedAppointments)

      setAppointments(formattedAppointments)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Set up realtime subscription
    const appointmentsSubscription = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'appointments',
        },
        (payload) => {
          console.log('Realtime update received:', payload)
          if (payload.eventType === 'INSERT') {
            // Create Date objects from the ISO string
            const startTime = new Date(payload.new.appointment_time)
            const endTime = new Date(startTime)
            endTime.setMinutes(
              endTime.getMinutes() + getServiceDuration(payload.new.service),
            )

            const formattedAppointment = {
              id: payload.new.id,
              title: payload.new.name || 'Unnamed',
              description: payload.new.phone_number || '',
              startTime: startTime,
              endTime: endTime,
              color: getColorForService(payload.new.service),
              name: payload.new.name,
              service: payload.new.service,
              phone_number: payload.new.phone_number,
              user_id: payload.new.user_id,
            }

            setAppointments((appointments) => [
              ...appointments,
              formattedAppointment,
            ])
          } else if (payload.eventType === 'DELETE') {
            const appointmentToBeCanceled = appointments.filter(
              (app) => app.id === payload.old.id,
            )
            console.log('APPCT: ', appointmentToBeCanceled)
            setAppointments((appointments) =>
              appointments.filter((app) => app.id !== payload.old.id),
            )
          }
        },
      )
      .subscribe()

    // Set up subscription for canceled_appointments
    const canceledAppointmentsSubscription = supabase
      .channel('canceled-appointments-change')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'canceled_appointments',
        },
        (payload) => {
          console.log('Canceled appointment update received:', payload)
          if (payload.eventType === 'INSERT') {
            const formatted = `${
              dayMap[format(parseISO(payload.new.appointment_time), 'EEEE')]
            }, ${format(
              parseISO(payload.new.appointment_time),
              "dd.MM 'u' HH:mm",
            )}`

            notificationAudioRef?.current?.play()
            toast({
              title: 'Termin Otkazan!',
              variant: 'destructive',
              duration: 10000,
              description: `${payload.new.name}, ${formatted}`,
            })
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(appointmentsSubscription)
      supabase.removeChannel(canceledAppointmentsSubscription)
    }
  }, [])

  // Add this debugging to the getAppointmentsForTimeSlot function
  const getAppointmentsForTimeSlot = (day: Date, hour: number) => {
    const filteredAppointments = appointments.filter((appointment) => {
      const sameDay = isSameDay(appointment.startTime, day)
      const sameHour = appointment.startTime.getHours() === hour

      return sameDay && sameHour
    })

    return filteredAppointments
  }

  // Refetch appointments when current date changes
  useEffect(() => {
    const checkSessionAndFetch = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session) {
        fetchAppointments()
        fetchBlockedDates()
      }
    }

    checkSessionAndFetch()
  }, [currentDate])

  const fetchBlockedDates = async () => {
    try {
      const { data, error } = await supabase
        .from('blocked_dates') // Assume you have a table named blocked_dates
        .select('date') // Select the date column

      if (error) {
        console.error('Error fetching blocked dates:', error)
        return
      }

      // Convert database dates to Date objects
      const parsedBlockedDates = data.map((item) => new Date(item.date))
      setBlockedDates(parsedBlockedDates)
    } catch (error) {
      console.error('Error in fetchBlockedDates:', error)
    }
  }

  // Helper function to assign colors based on service
  const getColorForService = (service: string | null) => {
    if (service === null || service === undefined) return 'blue'

    // Convert string to number if needed
    const serviceId =
      typeof service === 'string' ? parseInt(service, 10) : service

    // Map service IDs to colors based on service type
    const serviceColors: Record<number, string> = {
      0: 'blue', // Brijanje - 10min
      1: 'green', // Šišanje do kože - 10min
      2: 'red', // Šišanje - 15min
      3: 'yellow', // Fade - 20min
      4: 'purple', // Brijanje glave - 15min
      5: 'orange', // Šišanje + Brijanje - 30min
      6: 'teal', // Fade + Brijanje - 30min
    }

    return serviceColors[serviceId] || 'gray'
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

  // Time manipulation helpers
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

  // Calculate available time slots based on existing appointments for the selected date
  const calculateAvailableTimeSlots = (
    date: Date,
    existingAppointments: Appointment[],
  ) => {
    // Filter appointments for the selected date
    const appointmentsForDate = existingAppointments.filter((appointment) =>
      isSameDay(appointment.startTime, date),
    )

    const slots = []
    const endOfDay = parseTime('18:30')
    const startOfDay = parseTime('08:30')

    // Convert appointments to a format with time and duration
    const formattedAppointments = appointmentsForDate.map((appointment) => {
      const time = `${appointment.startTime
        .getHours()
        .toString()
        .padStart(2, '0')}:${appointment.startTime
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
      const time = `${appointment.startTime
        .getHours()
        .toString()
        .padStart(2, '0')}:${appointment.startTime
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

  const getAvailableTimeSlots = (appointmentDate: any) => {
    const appointmentsForDate = appointments.filter((appointment) =>
      isSameDay(appointment.startTime, appointmentDate),
    )

    // Calculate available time slots
    const availableSlots = calculateAvailableTimeSlots(
      appointmentDate,
      appointmentsForDate,
    )
    setAppointmentTimeSlots(availableSlots)
  }

  // Update time slots when date changes
  useEffect(() => {
    if (appointmentDate) {
      getAvailableTimeSlots(appointmentDate)
    }
  }, [appointmentDate, appointments])

  // Time slots for appointment selection
  const [appointmentTimeSlots, setAppointmentTimeSlots] = useState([
    { time: '8:30' },
    { time: '9:00' },
    { time: '9:30' },
    { time: '10:00' },
    { time: '10:30' },
    { time: '11:00' },
    { time: '11:30' },
    { time: '12:00' },
    { time: '12:30' },
    { time: '13:00' },
    { time: '13:30' },
    { time: '14:00' },
    { time: '14:30' },
    { time: '15:00' },
    { time: '15:30' },
    { time: '16:00' },
    { time: '16:30' },
    { time: '17:00' },
    { time: '17:30' },
    { time: '18:00' },
    { time: '18:30' },
  ])

  const navigateToPrevious = () => {
    if (view === 'day') {
      setCurrentDate(addDays(currentDate, -1))
    } else if (view === 'week') {
      setCurrentDate(addDays(currentDate, -7))
    }
  }

  const navigateToNext = () => {
    if (view === 'day') {
      setCurrentDate(addDays(currentDate, 1))
    } else if (view === 'week') {
      setCurrentDate(addDays(currentDate, 7))
    }
  }

  const navigateToToday = () => {
    setCurrentDate(new Date())
  }

  // Get the month and year for the header
  const dateRange = `${format(currentDate, 'MMM d')} - ${format(
    addDays(currentDate, 6),
    'MMM d, yyyy',
  )}`

  // Add this function to check if the user is authenticated before making requests
  const checkUserAuthenticated = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      router.push(
        '/login?message=Your session has expired. Please log in again.',
      )
      return false
    }
    return true
  }

  // Updates for the admin dashboard to fix timezone issues

  // 1. Update the handleAddAppointment function
  const handleAddAppointment = async () => {
    if (!appointmentDate || !selectedTime || selectedService === null) {
      return
    }

    // Check authentication first
    const isAuthenticated = await checkUserAuthenticated()
    if (!isAuthenticated) {
      setAuthError('Morate biti prijavljeni da biste dodali termin')
      return
    }

    // Parse the selected time
    const [hours, minutes] = (selectedTime as any).time.split(':').map(Number)

    // Create appointment time
    const appointmentTime = new Date(appointmentDate)
    appointmentTime.setHours(hours, minutes, 0, 0)

    // Adjust for timezone before storing
    const timezoneOffset = appointmentTime.getTimezoneOffset()
    const adjustedTime = new Date(appointmentTime)
    adjustedTime.setMinutes(adjustedTime.getMinutes() - timezoneOffset)

    const { data: selectedAppintment, error: selectedAppintmentError } =
      await supabase
        .from('appointments')
        .select('*')
        .eq('appointment_time', adjustedTime.toISOString())

    if (selectedAppintment.length > 0) {
      setAuthError('Termin već postoji!')
      setShowModal(false)
      fetchAppointments()

      const date = new Date()
      getAvailableTimeSlots(date)
      return
    }
    try {
      // Insert the new appointment into Supabase
      const { data, error } = await supabase
        .from('appointments')
        .insert([
          {
            name: name,
            phone_number: phone,
            service: selectedService,
            appointment_time: adjustedTime.toISOString(),
            // Add user_id to link appointment to the current user
            user_id: (await supabase.auth.getUser()).data.user?.id,
          },
        ])
        .select()

      if (error) {
        console.error('Greška prilikom dodavanja termina:', error)
        setAuthError(`Greška prilikom dodavanja termina: ${error.message}`)
        return
      }

      // Add the new appointment to the local state
      if (data && data.length > 0) {
        const endTime = new Date(appointmentTime)
        const serviceDuration = getServiceDuration(selectedService)
        endTime.setMinutes(endTime.getMinutes() + serviceDuration)

        const newAppointment = {
          id: data[0].id,
          title: name,
          description: phone,
          startTime: appointmentTime,
          endTime: endTime,
          color: getColorForService(selectedService),
          name: name,
          service: selectedService.toString(),
          phone_number: phone,
          user_id: data[0].user_id,
        }

        setAppointments([...appointments, newAppointment])
      }

      // Reset form and close modal
      setShowModal(false)
      setAppointmentDate(new Date())
      setSelectedTime(null)
      setSelectedService(null)
      setName('')
      setPhone('')
    } catch (error) {
      console.error('Error:', error)
      setAuthError('Došlo je do neočekivane greške')
    }
  }

  // Cancel appointment handler
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
        setAuthError('Neuspjelo otkazivanje termina. Molimo pokušajte ponovo.')
        return false
      }

      console.log('Appointment to cancel:', appointmentData)

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
            canceled_by_admin: true, // Add flag to indicate admin cancellation
          },
        ])

      if (insertError) {
        console.error('Error recording cancellation:', insertError)
        // Continue with deletion even if recording fails
      }

      console.log(
        'APPID for deletion:',
        appointmentId,
        'Type:',
        typeof appointmentId,
      )

      // Delete from appointments table with improved logging
      const { data: deleteData, error: deleteError } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId)
        .select() // Return the deleted rows to confirm deletion

      console.log('Deletion response:', { deleteData, deleteError })

      if (deleteError) {
        console.error('Error cancelling appointment:', deleteError)
        setAuthError('Neuspjelo otkazivanje termina. Molimo pokušajte ponovo.')
        return false
      }

      if (!deleteData || deleteData.length === 0) {
        console.warn('No rows were deleted, but no error was returned')

        return false
      }

      try {
        const appointmentDate = new Date(appointmentData.appointment_time)
        const formattedDate = appointmentDate.toLocaleDateString('bs')
        const formattedTime = appointmentDate.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })

        const response = await fetch('/api/send-sms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: appointmentData.phone_number,
            message: `Vaš termin za ${getServiceName(
              appointmentData.service,
            )} dana ${formattedDate} u ${formattedTime} je otkazan. Za više informacija kontaktirajte nas.`,
          }),
        })

        if (!response.ok) {
          console.error(
            'Failed to send SMS notification:',
            await response.text(),
          )
        } else {
          console.log('SMS notification sent successfully')
        }
      } catch (smsError) {
        console.error('Error sending SMS notification:', smsError)
        // Continue with deletion even if SMS fails
      }

      // Refresh appointments
      await fetchAppointments()
      return true
    } catch (error) {
      console.error('Error in cancelAppointment function:', error)
      setAuthError('Nešto je pošlo po zlu. Molimo pokušajte kasnije.')
      return false
    }
  }

  // Handle appointment cancellation confirm
  const handleCancelConfirm = async () => {
    if (!selectedAppointment) return

    try {
      const success = await cancelAppointment(selectedAppointment.id)

      if (success) {
        alert('Termin je uspješno otkazan')
        // Remove the appointment from the local state as well
        setAppointments(
          appointments.filter((app) => app.id !== selectedAppointment.id),
        )
      } else {
        alert('Neuspjelo otkazivanje termina. Molimo pokušajte ponovo.')
      }
    } catch (error) {
      console.error('Error in handleCancelConfirm:', error)
      alert('Došlo je do greške prilikom otkazivanja. Molimo pokušajte ponovo.')
    } finally {
      setShowCancelConfirmation(false)
      setShowAppointmentModal(false)
      setSelectedAppointment(null)
    }
  }

  // Get service name from service ID
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

  // Handle appointment click
  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setShowAppointmentModal(true)
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="border-b p-4">
        <audio
          ref={notificationAudioRef}
          src="/assets/sounds/notification.wav"
        />
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Button
              variant="default"
              className="mx-2 px-10"
              size="icon"
              onClick={() => setShowModal(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">{dateRange}</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={navigateToPrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={navigateToToday}>
              Danas
            </Button>
            <Button variant="outline" size="icon" onClick={navigateToNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4">
        {authError && (
          <div className="mb-4 rounded-md bg-red-100 p-4 text-red-800">
            <p>{authError}</p>
          </div>
        )}

        {loading ? (
          <div className="flex h-full items-center justify-center">
            <p>Učitavanje termina...</p>
          </div>
        ) : (
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-[auto_1fr]">
              {/* Time labels column */}
              <div className="pr-2 pt-16">
                {timeSlots.map((hour) => (
                  <div key={hour} className="relative h-32 text-right">
                    <span className="text-sm text-muted-foreground">
                      {hour === 12
                        ? '12:00 PM'
                        : hour === 12.5
                          ? '12:30 PM'
                          : hour > 12
                            ? `${Math.floor(hour - 12)}:${
                                hour % 1 === 0 ? '00' : '30'
                              } PM`
                            : `${Math.floor(hour)}:${
                                hour % 1 === 0 ? '00' : '30'
                              } AM`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 border-l">
                {/* Day headers */}
                {weekDays.map((day, i) => (
                  <div key={i} className="border-b border-r p-2 text-center">
                    <div className="font-semibold">{format(day, 'EEE')}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(day, 'd')}
                    </div>
                  </div>
                ))}

                {/* Time slots grid */}
                {timeSlots.map((hour) => (
                  <React.Fragment key={hour}>
                    {weekDays.map((day, dayIndex) => {
                      const dayAppointments = getAppointmentsForTimeSlot(
                        day,
                        hour,
                      )

                      return (
                        <div
                          key={`${hour}-${dayIndex}`}
                          className="relative h-32 border-b border-r"
                        >
                          {/* Horizontal line for the hour */}
                          <div className="absolute left-0 right-0 top-0 border-t border-gray-100"></div>

                          {/* Appointments */}
                          {dayAppointments.map((appointment) => (
                            <div
                              key={appointment.id}
                              className={cn(
                                'absolute mx-1 w-[calc(100%-0.5rem)] cursor-pointer overflow-hidden rounded p-1 text-sm transition-opacity hover:opacity-80',
                                appointment.color === 'red' &&
                                  'border border-red-200 bg-red-100 text-red-800',
                                appointment.color === 'blue' &&
                                  'border border-blue-200 bg-blue-100 text-blue-800',
                                appointment.color === 'green' &&
                                  'border border-green-200 bg-green-100 text-green-800',
                                appointment.color === 'yellow' &&
                                  'border border-yellow-200 bg-yellow-100 text-yellow-800',
                                appointment.color === 'purple' &&
                                  'border border-purple-200 bg-purple-100 text-purple-800',
                                appointment.color === 'orange' &&
                                  'border border-orange-200 bg-orange-100 text-orange-800',
                                appointment.color === 'teal' &&
                                  'border border-teal-200 bg-teal-100 text-teal-800',
                                appointment.color === 'gray' &&
                                  'border border-gray-200 bg-gray-100 text-gray-800',
                              )}
                              style={{
                                top: `${
                                  (appointment.startTime.getMinutes() / 60) *
                                  100
                                }%`,
                                width: 'calc(100% - 0.5rem)',
                                maxHeight: '100%',
                                height: `${
                                  (getServiceDuration(appointment.service) /
                                    60) *
                                  100
                                }%`,
                              }}
                              onClick={() =>
                                handleAppointmentClick(appointment)
                              }
                            >
                              <div className="truncate font-medium">
                                {appointment.name}
                              </div>

                              <div className="flex items-center text-xs">
                                <div className="mr-2 truncate">
                                  {getServiceName(appointment.service)}
                                </div>
                              </div>
                              <div className="flex items-center text-xs">
                                <span>
                                  {appointment.startTime
                                    .getHours()
                                    .toString()
                                    .padStart(2, '0')}
                                  :
                                  {appointment.startTime
                                    .getMinutes()
                                    .toString()
                                    .padStart(2, '0')}
                                </span>
                                <span className="mx-1">-</span>
                                <span>
                                  {appointment.endTime
                                    .getHours()
                                    .toString()
                                    .padStart(2, '0')}
                                  :
                                  {appointment.endTime
                                    .getMinutes()
                                    .toString()
                                    .padStart(2, '0')}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Appointment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex justify-center overflow-auto bg-black bg-opacity-50 p-4">
          <div className="my-8 h-fit w-full max-w-md rounded-lg bg-black p-6 pb-5 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Dodaj novi termin</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="pr-2">
              <div>
                <h3 className="mb-2 font-medium">1. Ime:</h3>
                <input
                  className="mb-6 w-full rounded-md border bg-inherit px-4 py-2"
                  name="name"
                  placeholder="Sinbad Mehic"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <h3 className="mb-2 font-medium">2. Broj telefona:</h3>
                <input
                  className="mb-6 w-full rounded-md border bg-inherit px-4 py-2"
                  name="phone"
                  placeholder="061 123 456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="mb-4">
                <h3 className="mb-2 font-medium">3. Odaberi datum:</h3>
                <Calendar
                  mode="single"
                  selected={appointmentDate}
                  onSelect={(date) => {
                    setAppointmentDate(date)
                    setSelectedTime(null)
                  }}
                  className="w-full rounded-md border"
                  disabled={(date) => {
                    const isPastDate = date < new Date()

                    const isFutureDate = date > addDays(new Date(), 30)

                    const isBlockedDate = blockedDates.some((blockedDate) =>
                      isSameDay(blockedDate, date),
                    )

                    return isPastDate || isFutureDate || isBlockedDate
                  }}
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
                  }}
                />
              </div>
            </div>

            <div className="mb-4">
              <h3 className="mb-2 font-medium">4. Odaberi uslugu:</h3>
              <SelectableGrid
                onSelect={(item: number) => setSelectedService(item as any)}
              />
            </div>

            <div className="mb-4">
              <h3 className="mb-2 font-medium">5. Izaberite vrijeme:</h3>
              <ScrollablePills
                items={appointmentTimeSlots.filter((slot) => {
                  // Only show slots that are available for the selected service duration
                  if (selectedService === null) return true

                  const serviceDuration = getServiceDuration(selectedService)
                  const appointmentsForDate = appointments.filter(
                    (appointment) =>
                      appointmentDate &&
                      isSameDay(appointment.startTime, appointmentDate),
                  )

                  return isSlotAvailable(
                    slot.time,
                    serviceDuration,
                    appointmentsForDate,
                  )
                })}
                onChange={(item) => setSelectedTime(item as any)}
              />
              {selectedService !== null &&
                appointmentTimeSlots.length > 0 &&
                appointmentTimeSlots.filter((slot) => {
                  const serviceDuration = getServiceDuration(selectedService)
                  const appointmentsForDate = appointments.filter(
                    (appointment) =>
                      appointmentDate &&
                      isSameDay(appointment.startTime, appointmentDate),
                  )
                  return isSlotAvailable(
                    slot.time,
                    serviceDuration,
                    appointmentsForDate,
                  )
                }).length === 0 && (
                  <p className="mt-2 text-sm text-red-500">
                    Nema dostupnih termina za ovu uslugu na odabrani datum.
                    Molimo odaberite drugi datum.
                  </p>
                )}
            </div>

            <div className="mt-4 flex justify-end gap-2 border-t pt-2">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Odustani
              </Button>
              <Button
                onClick={handleAddAppointment}
                disabled={
                  !appointmentDate || !selectedTime || selectedService === null
                }
              >
                Dodaj termin
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Appointment Modal */}
      {showAppointmentModal && selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-black">Detalji termina</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowAppointmentModal(false)
                  setSelectedAppointment(null)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mb-4 space-y-3">
              <div className="rounded-md bg-gray-50 p-3">
                <h3 className="text-sm font-medium text-gray-500">Klijent</h3>
                <p className="text-black">{selectedAppointment.name}</p>
              </div>

              <div className="rounded-md bg-gray-50 p-3">
                <h3 className="text-sm font-medium text-gray-500">
                  Broj telefona
                </h3>
                <p className="text-black">{selectedAppointment.phone_number}</p>
              </div>

              <div className="rounded-md bg-gray-50 p-3">
                <h3 className="text-sm font-medium text-gray-500">Usluga</h3>
                <p className="text-black">
                  {getServiceName(selectedAppointment.service)}
                </p>
              </div>

              <div className="rounded-md bg-gray-50 p-3">
                <h3 className="text-sm font-medium text-gray-500">Date</h3>
                <p className="text-black">
                  {format(selectedAppointment.startTime, 'dd.MM.yyyy')},{' '}
                  {bosnianWeekDays[selectedAppointment.startTime.getDay()]}
                </p>
              </div>

              <div className="rounded-md bg-gray-50 p-3">
                <h3 className="text-sm font-medium text-gray-500">Vrijeme</h3>
                <p className="text-black">
                  {selectedAppointment.startTime.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  -
                  {selectedAppointment.endTime.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAppointmentModal(false)
                  setSelectedAppointment(null)
                }}
              >
                Zatvori
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowCancelConfirmation(true)}
              >
                Otkaži termin
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      {showCancelConfirmation && selectedAppointment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-bold text-black">Otkaži termin</h2>
            <p className="mb-4 text-black">
              Jeste li sigurni da želite otkazati termin za{' '}
              {selectedAppointment.name} dana{' '}
              {selectedAppointment.startTime.toLocaleDateString('bs')} u{' '}
              {selectedAppointment.startTime.toLocaleTimeString([], {
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
                }}
              >
                Ne, zadrži
              </Button>
              <Button variant="destructive" onClick={handleCancelConfirm}>
                Da, Otkaži
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
