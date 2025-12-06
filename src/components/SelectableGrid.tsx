import React, { useState } from 'react'
import { useAppointmentSettings } from '@/hooks/useAppointmentSettings'

const SelectableItem = ({ title, content, isSelected, onClick }) => {
  return (
    <div className="my-3 w-1/2">
      <div
        className={`mx-2 cursor-pointer rounded-lg border p-2 transition-colors duration-200 ${
          isSelected ? 'bg-white text-gray-800' : 'bg-gray-950 text-white'
        }`}
        onClick={onClick}
      >
        <p className="text-lg">{title}</p>
        <p>{content}</p>
      </div>
    </div>
  )
}

interface SelectableGridProps {
  onSelect: (index: number) => void
}

const SelectableGrid = ({ onSelect = () => {} }: SelectableGridProps) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const { services, loading } = useAppointmentSettings()

  // Only show active services
  const activeServices = services.filter((s) => s.is_active)

  if (loading) {
    return (
      <div className="flex w-full items-center justify-center py-8">
        <p className="text-gray-500">Učitavanje usluga...</p>
      </div>
    )
  }

  if (activeServices.length === 0) {
    return (
      <div className="flex w-full items-center justify-center py-8">
        <p className="text-gray-500">Nema dostupnih usluga</p>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-wrap">
      {activeServices.map((service, index) => (
        <SelectableItem
          key={service.id}
          title={`${service.duration_minutes}min`}
          content={service.name_bs}
          isSelected={selectedIndex === index}
          onClick={() => {
            setSelectedIndex(index === selectedIndex ? null : index)
            onSelect(service.id)
          }}
        />
      ))}
    </div>
  )
}

export default SelectableGrid
