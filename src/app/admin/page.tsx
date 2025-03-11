'use client'

import React from 'react'

import { useState } from 'react'
import { addDays, format, startOfWeek, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'
import SelectableGrid from '@/components/SelectableGrid'
import { ScrollablePills } from '@/components/ScrollablePills'

// Sample appointment data
const appointments = [
  {
    id: 1,
    title: 'John Smith',
    description: '(555) 123-4567',
    startTime: new Date(2025, 2, 11, 9, 0),
    endTime: new Date(2025, 2, 11, 9, 30),
    color: 'red',
  },
  {
    id: 2,
    title: 'Sarah Johnson',
    description: '(555) 234-5678',
    startTime: new Date(2025, 2, 11, 10, 30),
    endTime: new Date(2025, 2, 11, 11, 0),
    color: 'blue',
  },
  {
    id: 3,
    title: 'Michael Brown',
    description: '(555) 345-6789',
    startTime: new Date(2025, 2, 11, 11, 0),
    endTime: new Date(2025, 2, 11, 11, 30),
    color: 'green',
  },
  {
    id: 4,
    title: 'Emily Davis',
    description: '(555) 456-7890',
    startTime: new Date(2025, 2, 11, 13, 30),
    endTime: new Date(2025, 2, 11, 14, 0),
    color: 'yellow',
  },
  {
    id: 5,
    title: 'David Wilson',
    description: '(555) 567-8901',
    startTime: new Date(2025, 2, 12, 15, 0),
    endTime: new Date(2025, 2, 12, 15, 30),
    color: 'red',
  },
  {
    id: 6,
    title: 'Jennifer Taylor',
    description: '(555) 678-9012',
    startTime: new Date(2025, 2, 12, 9, 30),
    endTime: new Date(2025, 2, 12, 10, 0),
    color: 'blue',
  },
  {
    id: 7,
    title: 'Dentist appointment',
    description: '(555) 789-0123',
    startTime: new Date(2025, 2, 13, 11, 0),
    endTime: new Date(2025, 2, 13, 12, 0),
    color: 'green',
  },
  {
    id: 8,
    title: 'Team meeting',
    description: 'Conference room B',
    startTime: new Date(2025, 2, 13, 14, 0),
    endTime: new Date(2025, 2, 13, 15, 0),
    color: 'red',
  },
  {
    id: 9,
    title: 'Yoga class',
    description: 'Downtown studio',
    startTime: new Date(2025, 2, 13, 16, 0),
    endTime: new Date(2025, 2, 13, 17, 0),
    color: 'blue',
  },
  {
    id: 10,
    title: 'Weekly Status',
    description: 'Project review',
    startTime: new Date(2025, 2, 14, 9, 0),
    endTime: new Date(2025, 2, 14, 10, 0),
    color: 'red',
  },
]

type ViewType = 'day' | 'week' | 'month' | 'year'

export default function CalendarDashboard() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [view, setView] = useState<ViewType>('week')

  // Generate the days of the week starting from today
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentDate, i))

  // Generate time slots from 8 AM to 6 PM
  const timeSlots = Array.from({ length: 11 }, (_, i) => i + 8)
  const [showModal, setShowModal] = useState(false)
  const [appointmentDate, setAppointmentDate] = useState<Date | undefined>(
    new Date(),
  )
  const [selectedTime, setSelectedTime] = useState(null)
  const [selectedService, setSelectedService] = useState(null)

  // Time slots for appointment selection
  const [appointmentTimeSlots, setAppointmentTimeSlots] = useState([
    { time: '8:00' },
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

  // Get appointments for a specific day and time
  const getAppointmentsForTimeSlot = (day: Date, hour: number) => {
    return appointments.filter((appointment) => {
      return (
        isSameDay(appointment.startTime, day) &&
        appointment.startTime.getHours() === hour
      )
    })
  }

  // Get the month and year for the header
  const dateRange = `${format(currentDate, 'MMM d')} - ${format(
    addDays(currentDate, 6),
    'MMM d, yyyy',
  )}`

  const handleAddAppointment = () => {
    // Here you would handle the actual appointment creation
    console.log('New appointment:', {
      date: appointmentDate,
      time: selectedTime,
      service: selectedService,
    })

    // Reset form and close modal
    setShowModal(false)
    setAppointmentDate(new Date())
    setSelectedTime(null)
    setSelectedService(null)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b p-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
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
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={navigateToNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-[auto_1fr]">
            {/* Time labels column */}
            <div className="pr-2 pt-16">
              {timeSlots.map((hour) => (
                <div key={hour} className="relative h-20 text-right">
                  <span className="text-sm text-muted-foreground">
                    {hour === 12
                      ? '12 PM'
                      : hour > 12
                        ? `${hour - 12} PM`
                        : `${hour} AM`}
                  </span>
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 border-l">
              {/* Day headers */}
              {weekDays.map((day, index) => {
                const isToday = isSameDay(day, new Date())
                return (
                  <div
                    key={index}
                    className="border-b border-r p-2 text-center"
                  >
                    <div className="mb-1 text-sm text-muted-foreground">
                      {format(day, 'EEE')}
                    </div>
                    <div
                      className={cn(
                        'mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                        isToday && 'bg-red-500 text-white',
                      )}
                    >
                      {format(day, 'd')}
                    </div>
                  </div>
                )
              })}

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
                        className="relative h-20 border-b border-r"
                      >
                        {/* Horizontal line for the hour */}
                        <div className="absolute left-0 right-0 top-0 border-t border-gray-100"></div>

                        {/* Appointments */}
                        {dayAppointments.map((appointment) => (
                          <div
                            key={appointment.id}
                            className={cn(
                              'absolute mx-1 rounded p-1 text-sm',
                              appointment.color === 'red' &&
                                'bg-red-100 text-red-800',
                              appointment.color === 'blue' &&
                                'bg-blue-100 text-blue-800',
                              appointment.color === 'green' &&
                                'bg-green-100 text-green-800',
                              appointment.color === 'yellow' &&
                                'bg-yellow-100 text-yellow-800',
                            )}
                            style={{
                              top: `${
                                (appointment.startTime.getMinutes() / 60) * 100
                              }%`,
                              height: `${
                                ((appointment.endTime.getTime() -
                                  appointment.startTime.getTime()) /
                                  (30 * 60 * 1000)) *
                                50
                              }%`,
                              width: 'calc(100% - 0.5rem)',
                              maxHeight: '100%',
                            }}
                          >
                            <div className="font-medium">
                              {appointment.title}
                            </div>
                            <div className="text-xs">
                              {appointment.description}
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
      </main>

      {/* Add Appointment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex justify-center bg-black bg-opacity-50 pt-20">
          <div className="w-full max-w-md rounded-lg bg-black p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Add New Appointment</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mb-4">
              <h3 className="mb-2 font-medium">1. Select Date:</h3>
              <Calendar
                mode="single"
                selected={appointmentDate}
                onSelect={setAppointmentDate}
                className=" w-full rounded-md border "
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

            <div className="mb-4">
              <h3 className="mb-2 font-medium">2. Select Service:</h3>
              <SelectableGrid
                onSelect={(item: number) => setSelectedService(item as any)}
              />
            </div>

            <div className="mb-4">
              <h3 className="mb-2 font-medium">3. Select Time:</h3>
              <ScrollablePills
                items={appointmentTimeSlots}
                onChange={(item) => setSelectedTime(item)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddAppointment}
                disabled={
                  !appointmentDate || !selectedTime || selectedService === null
                }
              >
                Add Appointment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
