import React, { useState } from 'react'

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

  const items = [
    { title: '15min', content: 'Šišanje' },
    { title: '20min', content: 'Fade' },
    { title: '30min', content: 'Šišanje + Brijanje' },
    { title: '30min', content: 'Fade + Brijanje' },
  ]

  return (
    <div className="flex w-full flex-wrap">
      {items.map((item, index) => (
        <SelectableItem
          key={index}
          title={item.title}
          content={item.content}
          isSelected={selectedIndex === index}
          onClick={() => {
            setSelectedIndex(index === selectedIndex ? null : index)
            onSelect(index)
          }}
        />
      ))}
    </div>
  )
}

export default SelectableGrid
