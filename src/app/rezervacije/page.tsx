'use client'
import { useState, useEffect } from 'react'
import { SideBar } from '@/components/SideBar'
import { Button } from '@/components/ui/button'
import { Confirmation } from '@/components/Confirmation'
import { createBrowserClient } from '@/lib/supabase'

// Import custom hooks
import { useAppointments } from '@/hooks/useAppointments'
import { useAuth } from '@/hooks/useAuth'
import { useTimeSlots, getServiceName } from '@/hooks/useTimeSlots'
import { useBookingDates } from '@/hooks/useBookingDates'
import { useAppointmentBooking } from '@/hooks/useAppointmentBooking'

// Import custom components
import { UserAppointments } from '@/components/UserAppointments'
import { CancelConfirmation } from '@/components/CancelConfirmation'
import { DateSelection } from '@/components/DateSelection'
import { ServiceSelection } from '@/components/ServiceSelection'
import { TimeSelection } from '@/components/TimeSelection'

// Initialize Supabase client
const supabase = createBrowserClient()

export default function UserDashboard() {
  // State for appointment cancellation
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false)
  const [appointmentToCancel, setAppointmentToCancel] = useState(null)
  const [selectedService, setSelectedService] = useState(null)

  // Initialize custom hooks
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
    useBookingDates(userAppointments)

  const { timeSlots, selectedTime, setSelectedTime } = useTimeSlots(
    date,
    selectedService,
    appointments,
  )

  const { showConfirmation, setShowConfirmation, handleBookAppointment } =
    useAppointmentBooking(fetchAppointments, fetchUserAppointments, setError)

  // Load all appointments on component mount
  useEffect(() => {
    const getData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        await fetchUserAppointments(session.user.id)
        await fetchAppointments()
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

    setShowConfirmation(true)
  }

  // Handle form field changes
  const handleNameChange = (e) => {
    setName(e.target.value)
  }

  const handlePhoneChange = (e) => {
    setPhone(e.target.value)
  }

  // Handle confirmation
  const handleConfirm = async () => {
    // First, check if the time slot is still available
    try {
      // Parse the selected time
      const [hours, minutes] = selectedTime.time.split(':').map(Number)

      // Create appointment time
      const appointmentTime = new Date(date)
      appointmentTime.setHours(hours, minutes, 0, 0)

      // Adjust for timezone before storing
      const timezoneOffset = appointmentTime.getTimezoneOffset()
      const adjustedTime = new Date(appointmentTime)
      adjustedTime.setMinutes(adjustedTime.getMinutes() - timezoneOffset)

      // Calculate the end time based on service duration
      const getServiceDuration = (serviceId) => {
        if (serviceId === null || serviceId === undefined) return 30

        const id =
          typeof serviceId === 'string' ? parseInt(serviceId, 10) : serviceId

        const serviceDurations = {
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

      const serviceDuration = getServiceDuration(selectedService)
      const endTime = new Date(adjustedTime)
      endTime.setMinutes(endTime.getMinutes() + serviceDuration)

      // Check for any overlapping appointments
      const { data: existingAppointments, error: checkError } = await supabase
        .from('appointments')
        .select('*')
        .eq('appointment_time', adjustedTime.toISOString())

      console.log(
        'Existing app: ',
        existingAppointments,
        adjustedTime.toISOString(),
      )

      // If we found any appointments that would overlap, the slot is not available
      if (existingAppointments && existingAppointments.length > 0) {
        setError(
          'Ovo vrijeme nije vise dostupno. Molimo odaberite drugo vrijeme.',
        )
        setShowConfirmation(false)
        return false
      }

      // If we get here, the slot is still available, proceed with booking
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
        startDate={startDate}
        endDate={endDate}
        defaultMonth={defaultMonth}
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
