// Service selection component
import React from 'react'
import SelectableGrid from '@/components/SelectableGrid'

export const ServiceSelection = ({ onServiceSelect }) => {
  return (
    <div className="mx-5 mt-5">
      <h2 className="mb-2 text-lg font-bold">2. Izaberite vrstu usluge: </h2>
      <div className="flex h-full w-full items-center justify-center">
        <SelectableGrid onSelect={onServiceSelect} />
      </div>
    </div>
  )
}
