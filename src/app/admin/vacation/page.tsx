'use client'

import { useState, useEffect } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X, CalendarIcon, Save } from 'lucide-react'
import { Toaster } from '@/components/ui/toaster'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/hooks/use-toast'
import { createBrowserClient } from '@/lib/supabase'

export default function DateSelectionPage() {
  const [dataBaseDates, setDataBaseDates] = useState<any[]>([])
  const [selectedDates, setSelectedDates] = useState<any[]>([])
  const [selectedDatesForCalendar, setSelectedDatesForCalendar] = useState<
    Date[]
  >([])
  const [isClient, setIsClient] = useState(false)

  const supabase = createBrowserClient()

  const fetchBlockedDates = async () => {
    const today = new Date()
    const formatted = today.toISOString().split('T')[0]
    try {
      const { data, error } = await supabase
        .from('blocked_dates')
        .select('*')
        .gte('date', formatted)

      if (data === null) {
        throw error
      }
      setSelectedDates(data)
      setDataBaseDates(data)
      const dateObjects = data.map((dateObject) => new Date(dateObject.date))
      setSelectedDatesForCalendar(dateObjects)
      console.log('DATA: ', data, error)
    } catch (err) {
      console.log('ERR: ', err)
    }
  }

  // Initialize dates after component mounts to avoid hydration issues
  useEffect(() => {
    setIsClient(true)
    fetchBlockedDates()
  }, [])

  const handleDateSelect = (date: [Date] | undefined) => {
    if (!date) return

    // Check if date is already selected by comparing date strings
    const dateString = date[date.length - 1].toDateString()

    const isSelected = selectedDates.some(
      (d) => new Date(d.date).toDateString() === dateString,
    )

    const nextDay = new Date(new Date(dateString).getTime() + 86400000) // 86400000 ms = 1 day
      .toISOString()
      .split('T')[0]

    if (isSelected) {
      // Remove date if already selected
      setSelectedDates(
        selectedDates.filter(
          (d) => new Date(d.date).toDateString() !== dateString,
        ),
      )
    } else {
      const newDate = {
        date: nextDay,
        reason: 'Godišnji',
        created_at: new Date(),
      }
      setSelectedDatesForCalendar(date)
      setSelectedDates((dates) => [...dates, newDate])
    }
  }

  const removeDate = async (dateToRemove: Date) => {
    console.log('DEL: ', dateToRemove)
    const { data, error } = await supabase
      .from('blocked_dates')
      .delete()
      .eq('date', dateToRemove.date)

    setSelectedDates((dates) =>
      dates.filter((date) => date.date !== dateToRemove.date),
    )

    setSelectedDatesForCalendar((dates) =>
      dates.filter((date) => date !== date),
    )
  }

  const saveDates = async () => {
    const normalizeDate = (date: string | Date) =>
      typeof date === 'string'
        ? date.slice(0, 10)
        : date.toISOString().split('T')[0]

    // Normalize both arrays with consistent date strings
    const normalizedDB = dataBaseDates.map((item) => ({
      ...item,
      date: normalizeDate(item.date),
    }))

    const normalizedSelected = selectedDates.map((item) => ({
      ...item,
      date: normalizeDate(item.date),
    }))

    // Collect dates that exist in both arrays
    const dbDatesSet = new Set(normalizedDB.map((item) => item.date))
    const selectedDatesSet = new Set(
      normalizedSelected.map((item) => item.date),
    )

    const duplicates = new Set(
      [...dbDatesSet].filter((date) => selectedDatesSet.has(date)),
    )

    // Filter out duplicates from both arrays
    const uniqueDB = normalizedDB.filter((item) => !duplicates.has(item.date))
    const uniqueSelected = normalizedSelected.filter(
      (item) => !duplicates.has(item.date),
    )

    // Combine the filtered (clean) lists
    const uniqueDates = [...uniqueDB, ...uniqueSelected]

    const { data, error } = await supabase
      .from('blocked_dates')
      .insert(uniqueDates)

    console.log('DATA: ', data, error)

    toast({
      title: 'Datumi uspješno sačuvani',
      description: `Izabrali ste ${uniqueSelected.length} neradnih dana`,
      duration: 3000,
    })
  }

  // Group dates by month for better organization
  const groupedByMonth: Record<string, Date[]> = {}

  // Only process dates if we have any
  if (selectedDates.length > 0) {
    selectedDates.forEach((date) => {
      const usableDate = new Date(date.date)
      try {
        // Use simple string format for grouping
        const monthYear = `${usableDate.getFullYear()}-${usableDate.getMonth()}`

        if (!groupedByMonth[monthYear]) {
          groupedByMonth[monthYear] = []
        }

        groupedByMonth[monthYear].push(date)
      } catch (error) {
        console.error('Error processing date:', date, error)
      }
    })
  }

  // Don't render until client-side to avoid hydration issues
  if (!isClient) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold">
            Kalendar za dane Godišnjeg
          </h1>
          <p className="text-muted-foreground">
            Izaberite datume koji nece biti dostupni na platformi
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <Card className="shadow-md">
            <CardHeader className="bg-muted/50 pb-4">
              <div className="flex items-center">
                <CalendarIcon className="mr-2 h-5 w-5 text-primary" />
                <CardTitle>Izaberi datume</CardTitle>
              </div>
              <CardDescription>Kliknite na datume ispod</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Calendar
                mode="multiple"
                selected={selectedDatesForCalendar}
                onSelect={handleDateSelect}
                className="mx-auto rounded-md border"
                classNames={{
                  day_selected:
                    'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
                  day_today: 'bg-accent text-accent-foreground',
                }}
              />
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="bg-muted/50 pb-4">
              <CardTitle>Dani godišnjeg koji su već izabrani</CardTitle>
              <CardDescription>
                {selectedDates.length === 0
                  ? 'No dates selected'
                  : `${selectedDates.length} days selected`}
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-[400px] overflow-y-auto pt-6">
              {selectedDates.length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(groupedByMonth)
                    .sort(([a], [b]) => a.localeCompare(b)) // Simple string comparison for sorting
                    .map(([monthYearKey, dates]) => {
                      const sampleDate = new Date(dates[0]?.date)
                      const monthYearDisplay = new Intl.DateTimeFormat(
                        'en-US',
                        {
                          month: 'long',
                          year: 'numeric',
                        },
                      ).format(sampleDate)

                      return (
                        <div key={monthYearKey}>
                          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                            {monthYearDisplay}
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {dates.map((date) => (
                              <Badge
                                key={new Date(date.date).toISOString()}
                                variant="outline"
                                className="flex items-center gap-1 border-primary/20 bg-background px-3 py-1.5 transition-colors hover:border-primary/40"
                              >
                                {new Intl.DateTimeFormat('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                }).format(new Date(date.date))}
                                <button
                                  onClick={() => removeDate(date)}
                                  className="ml-1 rounded-full p-0.5 transition-colors hover:bg-muted"
                                  aria-label={`Remove ${new Date(date.date).toDateString()}`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                </div>
              ) : (
                <div className="flex h-40 flex-col items-center justify-center text-center">
                  <p className="mb-2 text-muted-foreground">
                    Nema izabranih dana
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Kliknite na kalendar da izaberete dane
                  </p>
                </div>
              )}
            </CardContent>
            <Separator />
            <CardFooter className="flex justify-between pt-4">
              <Button
                onClick={saveDates}
                disabled={selectedDates.length === 0}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Sacuvaj
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
      <Toaster />
    </div>
  )
}
