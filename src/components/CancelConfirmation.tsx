// Cancel confirmation dialog component
import React from 'react'
import { Button } from '@/components/ui/button'
import { getServiceName } from '@/hooks/useTimeSlots'

export const CancelConfirmation = ({
  userAppointments,
  appointmentToCancel,
  setShowCancelConfirmation,
  setAppointmentToCancel,
  handleCancelConfirm,
}) => {
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
