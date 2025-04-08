// Time selection component
import React from 'react'
import { ScrollablePills } from '@/components/ScrollablePills'

export const TimeSelection = ({ timeSlots, onTimeSelect }) => {
  return (
    <div className="mx-5 mt-5">
      <h2 className="mb-2 text-lg font-bold">3. Izaberite termin: </h2>
      <div className="flex h-full w-full items-center justify-center">
        {timeSlots.length > 0 ? (
          <ScrollablePills items={timeSlots} onChange={onTimeSelect} />
        ) : (
          <p className="py-4 text-center text-gray-500">
            Nema dostupnih termina za izabrani datum i uslugu. Molimo izaberite
            drugi datum.
          </p>
        )}
      </div>
    </div>
  )
}
