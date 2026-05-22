import React, { useState } from 'react'
import { useAppointmentSettings } from '@/hooks/useAppointmentSettings'

interface SelectableItemProps {
  title: string
  content: string
  isSelected: boolean
  onClick: () => void
  isInactive?: boolean
}

const SelectableItem = ({
  title,
  content,
  isSelected,
  onClick,
  isInactive = false,
}: SelectableItemProps) => {
  return (
    <div className="my-3 w-1/2">
      <div
        className={`mx-2 cursor-pointer rounded-lg border p-2 transition-colors duration-200 ${
          isSelected ? 'bg-white text-gray-800' : 'bg-gray-950 text-white'
        } ${isInactive ? 'opacity-60' : ''}`}
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <p className="text-lg">{title}</p>
          {isInactive && (
            <span className="ml-2 rounded bg-yellow-500/20 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-yellow-300">
              Neaktivna
            </span>
          )}
        </div>
        <p>{content}</p>
      </div>
    </div>
  )
}

interface SelectableGridProps {
  onSelect: (index: number) => void
  /**
   * When true, also display services marked `is_active=false` (rendered with
   * a "Neaktivna" badge and dimmed). Used by the admin "Add appointment" modal
   * so the admin can still book a service that's hidden from customers.
   */
  includeInactive?: boolean
}

const SelectableGrid = ({
  onSelect = () => {},
  includeInactive = false,
}: SelectableGridProps) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const { services, loading } = useAppointmentSettings()

  const visibleServices = includeInactive
    ? services
    : services.filter((s) => s.is_active)

  if (loading) {
    return (
      <div className="flex w-full items-center justify-center py-8">
        <p className="text-gray-500">Učitavanje usluga...</p>
      </div>
    )
  }

  if (visibleServices.length === 0) {
    return (
      <div className="flex w-full items-center justify-center py-8">
        <p className="text-gray-500">Nema dostupnih usluga</p>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-wrap">
      {visibleServices.map((service, index) => (
        <SelectableItem
          key={service.id}
          title={`${service.duration_minutes}min`}
          content={service.name_bs}
          isSelected={selectedIndex === index}
          isInactive={!service.is_active}
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
