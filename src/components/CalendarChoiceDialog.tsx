'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export interface CalendarPayload {
  serviceName: string
  description: string
  startTime: Date
  endTime: Date
  filename: string
  icsContent: string
}

interface Props {
  open: boolean
  onClose: () => void
  payload: CalendarPayload | null
}

function formatForGoogle(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function buildGoogleCalendarUrl(p: CalendarPayload): string {
  const dates = `${formatForGoogle(p.startTime)}/${formatForGoogle(p.endTime)}`
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: p.serviceName,
    dates,
    details: p.description,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function downloadIcs(p: CalendarPayload) {
  const blob = new Blob([p.icsContent], { type: 'text/calendar' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = p.filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function CalendarChoiceDialog({ open, onClose, payload }: Props) {
  if (!payload) return null

  const handleGoogle = () => {
    window.open(buildGoogleCalendarUrl(payload), '_blank')
    onClose()
  }

  const handleApple = () => {
    downloadIcs(payload)
    onClose()
  }

  const handleOutlook = () => {
    downloadIcs(payload)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dodaj u kalendar</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button variant="outline" onClick={handleGoogle}>
            Google Calendar
          </Button>
          <Button variant="outline" onClick={handleApple}>
            Apple Calendar (iOS / macOS)
          </Button>
          <Button variant="outline" onClick={handleOutlook}>
            Outlook / drugo
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Otkaži
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
