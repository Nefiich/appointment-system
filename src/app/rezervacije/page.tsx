'use client'
import { useState, useEffect } from 'react'
import { SideBar } from '@/components/SideBar'
import { Button } from '@/components/ui/button'
import { Confirmation } from '@/components/Confirmation'
import { createBrowserClient } from '@/lib/supabase'
import { isSameDay } from 'date-fns'
import { getServiceName } from '@/lib/appointment-utils'
import { filterActiveAnnouncements } from './announcements-utils'

// Import custom hooks
import { useAppointments } from '@/hooks/useAppointments'
import { useAuth } from '@/hooks/useAuth'
import { useTimeSlots } from '@/hooks/useTimeSlots'
import { useBookingDates } from '@/hooks/useBookingDates'
import { useAppointmentBooking } from '@/hooks/useAppointmentBooking'
import { useAppointmentSettings } from '@/hooks/useAppointmentSettings'

// Import custom components
import { UserAppointments } from '@/components/UserAppointments'
import { PushPermissionPrompt } from '@/components/PushPermissionPrompt'
import { InstallPrompt } from '@/components/InstallPrompt'
import { CancelConfirmation } from '@/components/CancelConfirmation'
import { DateSelection } from '@/components/DateSelection'
import { ServiceSelection } from '@/components/ServiceSelection'
import { TimeSelection } from '@/components/TimeSelection'

// Initialize Supabase client
const supabase = createBrowserClient()

export default function UserDashboard() {
  // State for appointment cancellation
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false)
  const [appointmentToCancel, setAppointmentToCancel] = useState<number | null>(null)
  const [selectedService, setSelectedService] = useState<string | number | null>(null)

  const [blockedDates, setBlockedDates] = useState<Date[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])

  // Fetch blocked dates from Supabase
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

  // Fetch announcements from Supabase
  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase.from('announcements').select('*')

      if (error) {
        console.error('Error fetching announcements:', error)
        return
      }

      setAnnouncements(filterActiveAnnouncements(data || [], new Date()))
    } catch (err) {
      console.error('Error in fetchAnnouncements:', err)
    }
  }

  // Initialize custom hooks
  const { settings, services, getServiceName: getDynamicServiceName } = useAppointmentSettings()

  const {
    appointments,
    userAppointments,
    loading,
    error,
    setError,
    fetchAppointments,
    fetchUserAppointments,
    cancelAppointment,
    setUserAppointments,
  } = useAppointments()

  const { user, name, setName, phone, setPhone } = useAuth()

  const { date, setDate, startDate, endDate, defaultMonth, disabledDays } =
    useBookingDates(
      userAppointments,
      blockedDates,
      settings.bookingWindowDays,
      settings.maxAppointmentsPerUser,
      settings.allowSundayBookings
    )

  const { timeSlots, selectedTime, setSelectedTime } = useTimeSlots(
    date,
    selectedService,
    appointments,
    settings.businessStartTime,
    settings.businessEndTime,
    settings.timeSlotInterval
  )

  const {
    showConfirmation,
    setShowConfirmation,
    handleBookAppointment,
    isBooking,
  } = useAppointmentBooking(fetchAppointments, fetchUserAppointments, setError)

  // Load all appointments on component mount
  useEffect(() => {
    const getData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        await fetchUserAppointments(session.user.id)
        await fetchAppointments()
        await fetchBlockedDates()
        await fetchAnnouncements()
      }
    }
    getData()
  }, [user?.id])

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

  // Handle reservation submission
  const handleReservationSubmit = () => {
    if (!name || !phone) {
      setError('Molimo unesite vaše ime i broj telefona')
      return
    }

    if (!selectedTime || selectedService === null) {
      setError('Molimo izaberite uslugu i vrijeme')
      return
    }

    // Check if selected date is a vacation day
    if (blockedDates.some((blocked: Date) => isSameDay(blocked, date))) {
      setError('Izabrani datum je godišnji odmor!')
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

  // Handle confirmation
  const handleConfirm = async () => {
    try {
      if (!selectedTime) return

      // The overlap/availability check (proper interval math) and the atomic
      // DB constraint both live in handleBookAppointment — it is the single
      // authoritative write path. On failure it sets the error message.
      const success = await handleBookAppointment(
        date,
        selectedTime,
        selectedService,
        name,
        phone,
      )

      if (success) {
        // Show success message
        alert('Rezervacija uspješno potvrđena!')

        // Reset form and close confirmation
        setShowConfirmation(false)
        setDate(startDate)
        setSelectedTime(null)
        setSelectedService(null)
      } else {
        // Close the confirmation so the error (rendered on the page) is visible.
        setShowConfirmation(false)
      }
    } catch (error) {
      console.error('Error during appointment confirmation:', error)
      setError(
        'Došlo je do greške prilikom potvrde termina. Molimo pokušajte ponovo.',
      )
      setShowConfirmation(false)
    }
  }
  const handleCancel = () => {
    setShowConfirmation(false)
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
          isSubmitting={isBooking}
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

      {/* Announcements for today */}
      {announcements.length > 0 && (
        <div className="mx-5 mb-6 rounded-md border border-amber-200 bg-amber-50 p-4">
          <h2 className="mb-2 font-semibold text-amber-800">
            Važna obavještenja
          </h2>
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="text-sm">
                <p className="text-gray-700">{announcement.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Install + push prompts */}
      <InstallPrompt />
      <PushPermissionPrompt hasUpcomingAppointment={userAppointments.length > 0} />

      <UserAppointments
        userAppointments={userAppointments}
        setAppointmentToCancel={setAppointmentToCancel}
        setShowCancelConfirmation={setShowCancelConfirmation}
      />

      {/* Cancel confirmation dialog */}
      {showCancelConfirmation && (
        <CancelConfirmation
          userAppointments={userAppointments}
          appointmentToCancel={appointmentToCancel}
          setShowCancelConfirmation={setShowCancelConfirmation}
          setAppointmentToCancel={setAppointmentToCancel}
          handleCancelConfirm={handleCancelConfirm}
        />
      )}

      {/* Date Selection */}
      <DateSelection
        date={date}
        setDate={setDate}
        disabledDays={disabledDays}
        blockedDates={blockedDates}
        startDate={startDate}
        endDate={endDate}
        defaultMonth={defaultMonth}
        allowSundayBookings={settings.allowSundayBookings}
      />

      {/* Service Selection */}
      <ServiceSelection onServiceSelect={setSelectedService} />

      {/* Time Selection */}
      <TimeSelection timeSlots={timeSlots} onTimeSelect={setSelectedTime} />

      {/* Submit button */}
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
