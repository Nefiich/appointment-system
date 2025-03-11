'use client'

import * as React from 'react'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ScrollablePillsProps {
  items: any[]
  onChange?: (selectedItem: string) => void
}

export function ScrollablePills({ items, onChange }: ScrollablePillsProps) {
  const [selectedItem, setSelectedItem] = React.useState<string | null>(null)

  const handlePillClick = (item: string) => {
    setSelectedItem(item)
    onChange?.(item)
  }

  return (
    <ScrollArea className="w-full whitespace-nowrap rounded-md border">
      <div className="flex w-max space-x-4 p-4">
        {items.map((item, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            className={cn(
              'rounded-full',
              selectedItem === item &&
                'bg-primary text-primary-foreground hover:bg-primary/90',
            )}
            onClick={() => handlePillClick(item)}
          >
            {item.time}
          </Button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
