'use client'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { ArrowLeft, Check, X } from 'lucide-react'

interface ConfirmationProps {
  date: Date | undefined
  time: { time: string }
  service: any
  onConfirm: () => void
  onCancel: () => void
  onBack: () => void
}

export function Confirmation({
  date,
  time,
  service,
  onConfirm,
  onCancel,
  onBack,
}: ConfirmationProps) {
  console.log('SSS: ', service)
  return (
    <div className="mx-auto max-w-md p-6">
      <div className="mb-6 flex items-center">
        <Button variant="ghost" size="icon" onClick={onBack} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Potvrdite rezervaciju</h1>
      </div>

      <div className="mb-8 rounded-lg border p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Detalji rezervacije</h2>

        <div className="mb-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Datum:</span>
            <span className="font-medium">
              {date ? format(date, 'dd.MM.yyyy') : 'Nije izabrano'}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Vrijme:</span>
            <span className="font-medium">{time.time || 'Nije izabrano'}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Usluga:</span>
            <span className="font-medium">
              {service ? service : 'Nije izabrano'}
            </span>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Da li su ovi podaci tačni?
        </div>
      </div>

      <div className="flex gap-4">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          <X className="mr-2 h-4 w-4" />
          Otkaži
        </Button>
        <Button className="flex-1" onClick={onConfirm}>
          <Check className="mr-2 h-4 w-4" />
          Potvrdi
        </Button>
      </div>
    </div>
  )
}
