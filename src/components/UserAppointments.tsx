// User Appointments component
import React, { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { getServiceName } from '@/hooks/useTimeSlots'
import { format } from 'date-fns'

export const UserAppointments = ({
  userAppointments,
  setAppointmentToCancel,
  setShowCancelConfirmation,
}) => {
  if (userAppointments.length === 0) return null
  const bosnianWeekDays = [
    'Nedjelja', // 0
    'Ponedjeljak', // 1
    'Utorak', // 2
    'Srijeda', // 3
    'Četvrtak', // 4
    'Petak', // 5
    'Subota', // 6
  ]

  // Function to generate calendar file content
  const generateCalendarFile = (appointment) => {
    const startTime = new Date(appointment.appointment_time)

    // Calculate end time based on service duration
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

    const endTime = new Date(startTime)
    endTime.setMinutes(
      endTime.getMinutes() + getServiceDuration(appointment.service),
    )

    // Format dates for iCalendar
    const formatDateForCalendar = (date) => {
      return (
        date.toISOString().replace(/-/g, '').replace(/:/g, '').split('.')[0] +
        'Z'
      )
    }

    const startDateFormatted = formatDateForCalendar(startTime)
    const endDateFormatted = formatDateForCalendar(endTime)

    // Create iCalendar content
    const calendarContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `SUMMARY:${getServiceName(appointment.service.toString())}`,
      `DTSTART:${startDateFormatted}`,
      `DTEND:${endDateFormatted}`,
      `DESCRIPTION:Termin za ${getServiceName(appointment.service.toString())}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:Podsjetnik za termin sutra',
      'TRIGGER:-P1D',
      'END:VALARM',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:Podsjetnik za termin za 1 sat',
      'TRIGGER:-PT1H',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n')

    return calendarContent
  }

  // Function to handle adding to calendar
  const handleAddToCalendar = (appointment) => {
    const startTime = new Date(appointment.appointment_time)

    // Calculate end time based on service duration
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

    const endTime = new Date(startTime)
    endTime.setMinutes(
      endTime.getMinutes() + getServiceDuration(appointment.service),
    )

    const serviceName = getServiceName(appointment.service.toString())
    const description = `Termin za ${serviceName}`

    // Device detection
    const isAndroid = /Android/i.test(navigator.userAgent)
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    const isMobile = isAndroid || isIOS

    console.log('ISANDROID: ', isAndroid)
    if (isAndroid) {
      // For Android devices, use direct calendar links
      const formatDateForGoogle = (date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      }

      const startFormatted = formatDateForGoogle(startTime)
      const endFormatted = formatDateForGoogle(endTime)

      // Google Calendar URL - works on most Android devices
      const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(serviceName)}&dates=${startFormatted}/${endFormatted}&details=${encodeURIComponent(description)}`

      // Try to open Google Calendar app or web version
      window.location.href = googleCalendarUrl

      // Fallback: try generic calendar intent after a short delay
      setTimeout(() => {
        const calendarIntent = `intent://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(serviceName)}&dates=${startFormatted}/${endFormatted}&details=${encodeURIComponent(description)}#Intent;scheme=https;package=com.google.android.calendar;end`
        window.location.href = calendarIntent
      }, 1000)
    } else {
      // For iPhone/iPad and desktop, use .ics download
      const calendarContent = generateCalendarFile(appointment)
      const blob = new Blob([calendarContent], { type: 'text/calendar' })
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = `termin-${format(new Date(appointment.appointment_time), 'dd-MM-yyyy')}.ics`

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
  }

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
                  {format(appointment.appointment_time, 'dd.MM.yyyy')}
                  {', '}
                  {
                    bosnianWeekDays[appointment.appointment_time.getDay()]
                  } u{' '}
                  {appointment.appointment_time.toLocaleTimeString('bs', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}
                </p>
              </div>
            </div>
            <div className="mt-3 flex space-x-2 sm:mt-0">
              <button
                className="flex items-center justify-center rounded-md border border-transparent bg-white px-4 py-2 text-sm font-medium text-green-600 transition-colors hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                onClick={() => handleAddToCalendar(appointment)}
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
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                  <line x1="12" y1="14" x2="12" y2="18"></line>
                  <line x1="10" y1="16" x2="14" y2="16"></line>
                </svg>
                Dodaj u kalendar
              </button>
              <button
                className="flex items-center justify-center rounded-md border border-transparent bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
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
