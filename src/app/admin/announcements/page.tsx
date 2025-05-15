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
import { X, CalendarIcon, Save, Trash } from 'lucide-react'
import { Toaster } from '@/components/ui/toaster'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/hooks/use-toast'
import { createBrowserClient } from '@/lib/supabase'
import { Textarea } from '@/components/ui/textarea'
import { format } from 'date-fns'

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [description, setDescription] = useState('')
  const [isClient, setIsClient] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentAnnouncementId, setCurrentAnnouncementId] = useState<number | null>(null)

  const supabase = createBrowserClient()

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('start_date', { ascending: true })

      if (error) {
        throw error
      }
      
      setAnnouncements(data || [])
    } catch (err) {
      console.error('Error fetching announcements:', err)
      toast({
        title: 'Error',
        description: 'Failed to load announcements',
        variant: 'destructive',
      })
    }
  }

  // Initialize after component mounts to avoid hydration issues
  useEffect(() => {
    setIsClient(true)
    fetchAnnouncements()
  }, [])

  const resetForm = () => {
    setStartDate(undefined)
    setEndDate(undefined)
    setDescription('')
    setIsEditing(false)
    setCurrentAnnouncementId(null)
  }

  const handleSave = async () => {
    if (!startDate || !endDate || !description.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      })
      return
    }

    if (startDate > endDate) {
      toast({
        title: 'Date Error',
        description: 'End date must be after start date',
        variant: 'destructive',
      })
      return
    }

    try {
      if (isEditing && currentAnnouncementId) {
        // Update existing announcement
        const { error } = await supabase
          .from('announcements')
          .update({
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            description: description.trim()
          })
          .eq('id', currentAnnouncementId)

        if (error) throw error
        
        toast({
          title: 'Success',
          description: 'Announcement updated successfully',
        })
      } else {
        // Create new announcement
        const { error } = await supabase
          .from('announcements')
          .insert([
            {
              start_date: startDate.toISOString(),
              end_date: endDate.toISOString(),
              description: description.trim()
            }
          ])

        if (error) throw error
        
        toast({
          title: 'Success',
          description: 'Announcement created successfully',
        })
      }

      // Refresh announcements list and reset form
      await fetchAnnouncements()
      resetForm()
    } catch (err) {
      console.error('Error saving announcement:', err)
      toast({
        title: 'Error',
        description: 'Failed to save announcement',
        variant: 'destructive',
      })
    }
  }

  const handleEdit = (announcement) => {
    setStartDate(new Date(announcement.start_date))
    setEndDate(new Date(announcement.end_date))
    setDescription(announcement.description)
    setIsEditing(true)
    setCurrentAnnouncementId(announcement.id)
  }

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Announcement deleted successfully',
      })
      
      await fetchAnnouncements()
      
      // If we're editing the announcement that was just deleted, reset the form
      if (currentAnnouncementId === id) {
        resetForm()
      }
    } catch (err) {
      console.error('Error deleting announcement:', err)
      toast({
        title: 'Error',
        description: 'Failed to delete announcement',
        variant: 'destructive',
      })
    }
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
            Upravljanje obavještenjima
          </h1>
          <p className="text-muted-foreground">
            Kreirajte i upravljajte obavještenjima koja će biti prikazana korisnicima
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <Card className="shadow-md">
            <CardHeader className="bg-muted/50 pb-4">
              <div className="flex items-center">
                <CalendarIcon className="mr-2 h-5 w-5 text-primary" />
                <CardTitle>
                  {isEditing ? 'Uredi obavještenje' : 'Novo obavještenje'}
                </CardTitle>
              </div>
              <CardDescription>
                Odaberite period i unesite tekst obavještenja
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div>
                <h3 className="mb-2 font-medium">Datum početka (Od)</h3>
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  className="rounded-md border"
                />
              </div>
              
              <div>
                <h3 className="mb-2 font-medium">Datum završetka (Do)</h3>
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  className="rounded-md border"
                />
              </div>
              
              <div>
                <h3 className="mb-2 font-medium">Tekst obavještenja</h3>
                <Textarea
                  placeholder="Unesite tekst obavještenja..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </CardContent>
            <Separator />
            <CardFooter className="flex justify-between pt-4">
              <Button variant="outline" onClick={resetForm}>
                {isEditing ? 'Odustani' : 'Očisti'}
              </Button>
              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" />
                {isEditing ? 'Ažuriraj' : 'Sačuvaj'}
              </Button>
            </CardFooter>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="bg-muted/50 pb-4">
              <CardTitle>Postojeća obavještenja</CardTitle>
              <CardDescription>
                {announcements.length === 0
                  ? 'Nema obavještenja'
                  : `${announcements.length} obavještenja`}
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-[500px] overflow-y-auto pt-6">
              {announcements.length > 0 ? (
                <div className="space-y-4">
                  {announcements.map((announcement) => (
                    <div 
                      key={announcement.id} 
                      className="rounded-lg border p-4 hover:border-primary/50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex gap-2">
                          <Badge variant="outline" className="bg-primary/10">
                            {format(new Date(announcement.start_date), 'dd.MM.yyyy')}
                          </Badge>
                          <span className="text-muted-foreground">-</span>
                          <Badge variant="outline" className="bg-primary/10">
                            {format(new Date(announcement.end_date), 'dd.MM.yyyy')}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEdit(announcement)}
                            className="h-8 w-8 p-0"
                          >
                            <CalendarIcon className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDelete(announcement.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm">{announcement.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-40 flex-col items-center justify-center text-center">
                  <p className="mb-2 text-muted-foreground">
                    Nema obavještenja
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Kreirajte novo obavještenje pomoću forme
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Toaster />
    </div>
  )
}