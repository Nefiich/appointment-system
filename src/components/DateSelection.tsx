// Date selection component
import React from 'react'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { format, getDay } from 'date-fns'

export const DateSelection = ({
  date,
  setDate,
  disabledDays,
  startDate,
  endDate,
  defaultMonth,
}) => {
  return (
    <div className="mx-5 mt-5">
      <h2 className="mb-2 text-lg font-bold">1. Izaberite datum: </h2>
      <div className="flex h-full w-full items-center justify-center">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          disabled={disabledDays}
          defaultMonth={defaultMonth}
          className="w-full rounded-md border"
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
            day: (props) =>
              cn(
                'h-9 w-9 p-0 font-normal aria-selected:opacity-100',
                getDay(props.date) === 0 && 'text-red-500', // Sunday text in red
              ),
          }}
          footer={
            <div className="mt-3 text-center text-sm text-gray-500">
              Rezervacija moguća za period {format(startDate, 'dd.MM.')} -{' '}
              {format(endDate, 'dd.MM.yyyy')}
              <br />
              Nedjelja je neradni dan
            </div>
          }
        />
      </div>
    </div>
  )
}
