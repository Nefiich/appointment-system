import { Clock, Phone, User } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Appointment {
  id: number
  name: string
  phone: string
  time: string
  date: Date
}

interface AppointmentListProps {
  appointments: Appointment[]
}

export function AppointmentList({ appointments }: AppointmentListProps) {
  return (
    <div>
      {appointments.length === 0 ? (
        <div className="flex h-[200px] w-full items-center justify-center rounded-md border border-dashed">
          <div className="text-center">
            <h3 className="text-lg font-medium">
              No appointments for this day
            </h3>
            <p className="text-sm text-muted-foreground">
              Select another date to view appointments.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {appointments.map((appointment) => (
            <AppointmentCard key={appointment.id} appointment={appointment} />
          ))}
        </div>
      )}
    </div>
  )
}

function AppointmentCard({ appointment }: { appointment: Appointment }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{appointment.time}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{appointment.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{appointment.phone}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{appointment.time}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
