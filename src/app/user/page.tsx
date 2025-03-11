'use client'
import { ScrollablePills } from '@/components/ScrollablePills'
import SelectableGrid from '@/components/SelectableGrid'
import { SideBar } from '@/components/SideBar'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { Confirmation } from '@/components/Confirmation'

export default function UserDashboard() {
  const [date, setDate] = useState<Date | undefined>(new Date())
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

  useEffect(() => {
    console.log('DD: ', date, selectedTime, selectedService)
  }, [date, selectedTime, selectedService])

  const handleReservationSubmit = () => {
    setShowConfirmation(true)
  }

  const handleConfirm = () => {
    // Here you would handle the actual reservation submission to your backend
    alert('Rezervacija uspešno potvrđena!')
    // Reset form or redirect to confirmation page
    setShowConfirmation(false)
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
          service={selectedService}
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
      <h1 className="mb-4 ml-5 mt-2 text-2xl font-bold">Rezervisite termin</h1>
      <div className="mx-5 mt-5">
        <h2 className="mb-2 text-lg font-bold">1. Izaberite datum: </h2>
        <div className="flex h-full w-full items-center justify-center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
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
          <ScrollablePills
            items={timeSlots}
            onChange={(item) => {
              setSelectedTime(item)
            }}
          />
        </div>
      </div>

      <div className="mt-5 flex w-full items-center justify-center">
        <Button
          className="mx-5 w-full"
          onClick={handleReservationSubmit}
          disabled={!date || !selectedTime || selectedService === null}
        >
          Rezervisi termin
        </Button>
      </div>
    </div>
  )
}
