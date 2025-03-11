'use client'
import React, { useState } from 'react'

const AppointmentScheduler = () => {
  const appointmentTypes = {
    a: 20,
    b: 25,
    c: 30,
  }

  const [appointments, setAppointments] = useState([])

  // Helper functions for time manipulation
  const parseTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}`
  }

  // Generate available slots based on existing appointments
  const getAvailableSlots = () => {
    const slots = []
    const endOfDay = parseTime('17:30')
    const startOfDay = parseTime('08:30')

    // Sort appointments by time
    const sortedAppointments = [...appointments].sort(
      (a, b) => parseTime(a.time) - parseTime(b.time),
    )

    if (sortedAppointments.length === 0) {
      // If no appointments, generate slots every 30 minutes
      let currentTime = startOfDay
      while (currentTime < endOfDay) {
        slots.push(formatTime(currentTime))
        currentTime += 30
      }
    } else {
      // Generate slots based on appointment end times
      let currentTime = startOfDay

      for (const appointment of sortedAppointments) {
        // Add slots until this appointment starts
        while (currentTime < parseTime(appointment.time)) {
          slots.push(formatTime(currentTime))
          currentTime += 30
        }
        // Move to the end of this appointment
        currentTime = parseTime(appointment.time) + appointment.duration
      }

      // Add remaining slots after last appointment
      while (currentTime < endOfDay) {
        slots.push(formatTime(currentTime))
        currentTime += 30
      }
    }

    return slots
  }

  // Check if a slot is available
  const isSlotAvailable = (slot, duration) => {
    const slotStart = parseTime(slot)
    const slotEnd = slotStart + duration

    if (slotEnd > parseTime('17:30')) return false

    return !appointments.some((appointment) => {
      const appointmentStart = parseTime(appointment.time)
      const appointmentEnd = appointmentStart + appointment.duration
      return slotStart < appointmentEnd && slotEnd > appointmentStart
    })
  }

  // Book an appointment
  const bookAppointment = (selectedTime, appointmentType) => {
    const duration = appointmentTypes[appointmentType]

    if (!isSlotAvailable(selectedTime, duration)) {
      return
    }

    setAppointments((prev) => {
      const newAppointments = [
        ...prev,
        {
          time: selectedTime,
          type: appointmentType,
          duration: duration,
          endTime: formatTime(parseTime(selectedTime) + duration),
        },
      ]
      return newAppointments.sort(
        (a, b) => parseTime(a.time) - parseTime(b.time),
      )
    })
  }

  const availableSlots = getAvailableSlots()

  return (
    <div className="p-4">
      <h2 className="mb-4 text-xl font-bold">Appointment Scheduler</h2>

      <div className="mb-4">
        <h3 className="mb-2 text-lg font-semibold">Available Slots</h3>
        <div className="grid grid-cols-4 gap-2">
          {availableSlots.map((slot) => (
            <div key={slot} className="flex gap-2 rounded border p-2">
              <span>{slot}</span>
              <div className="flex gap-1">
                {Object.entries(appointmentTypes).map(([type, duration]) => (
                  <button
                    key={type}
                    onClick={() => bookAppointment(slot, type)}
                    className={`rounded px-2 py-1 ${
                      isSlotAvailable(slot, duration)
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'cursor-not-allowed bg-gray-300'
                    }`}
                    disabled={!isSlotAvailable(slot, duration)}
                  >
                    Type {type.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-lg font-semibold">Booked Appointments</h3>
        <div className="space-y-2">
          {appointments.map((appointment, index) => (
            <div key={index} className="rounded border p-2">
              <p>Start: {appointment.time}</p>
              <p>End: {appointment.endTime}</p>
              <p>Type: {appointment.type.toUpperCase()}</p>
              <p>Duration: {appointment.duration} minutes</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AppointmentScheduler
