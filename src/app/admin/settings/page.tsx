'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useAppointmentSettings } from '@/hooks/useAppointmentSettings';

const supabase = createBrowserClient();

export default function SettingsPage() {
  const router = useRouter();
  const { settings, loading, error, updateSetting, refreshSettings } =
    useAppointmentSettings();

  const [formData, setFormData] = useState({
    businessStartTime: '08:30',
    businessEndTime: '18:30',
    timeSlotInterval: '30',
    maxAppointmentsPerUser: '3',
    bookingWindowDays: '7',
    allowSundayBookings: false,
  });

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session || !session.user.email) {
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  // Update form when settings load
  useEffect(() => {
    if (!loading && settings) {
      setFormData({
        businessStartTime: settings.businessStartTime,
        businessEndTime: settings.businessEndTime,
        timeSlotInterval: settings.timeSlotInterval.toString(),
        maxAppointmentsPerUser: settings.maxAppointmentsPerUser.toString(),
        bookingWindowDays: settings.bookingWindowDays.toString(),
        allowSundayBookings: settings.allowSundayBookings,
      });
    }
  }, [loading, settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage('');

    try {
      await updateSetting('business_start_time', formData.businessStartTime);
      await updateSetting('business_end_time', formData.businessEndTime);
      await updateSetting('time_slot_interval', formData.timeSlotInterval);
      await updateSetting('max_appointments_per_user', formData.maxAppointmentsPerUser);
      await updateSetting('booking_window_days', formData.bookingWindowDays);
      await updateSetting('allow_sunday_bookings', formData.allowSundayBookings.toString());

      setSuccessMessage('Postavke uspješno sačuvane!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Greška pri čuvanju postavki');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Učitavanje postavki...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-3xl font-bold">Postavke Sistema</h1>

      {error && (
        <div className="mb-4 rounded-md bg-red-100 p-4 text-red-800">
          <p>{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 rounded-md bg-green-100 p-4 text-green-800">
          <p>{successMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="p-6">
          <div className="space-y-6">
            {/* Business Hours */}
            <div>
              <h2 className="mb-4 text-xl font-semibold">Radno Vrijeme</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="businessStartTime">Početak radnog vremena</Label>
                  <Input
                    id="businessStartTime"
                    type="time"
                    value={formData.businessStartTime}
                    onChange={(e) =>
                      handleChange('businessStartTime', e.target.value)
                    }
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">Format: HH:MM</p>
                </div>
                <div>
                  <Label htmlFor="businessEndTime">Kraj radnog vremena</Label>
                  <Input
                    id="businessEndTime"
                    type="time"
                    value={formData.businessEndTime}
                    onChange={(e) =>
                      handleChange('businessEndTime', e.target.value)
                    }
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">Format: HH:MM</p>
                </div>
              </div>
            </div>

            {/* Time Slot Interval */}
            <div>
              <Label htmlFor="timeSlotInterval">Interval termina (minute)</Label>
              <Input
                id="timeSlotInterval"
                type="number"
                min="5"
                max="60"
                step="5"
                value={formData.timeSlotInterval}
                onChange={(e) => handleChange('timeSlotInterval', e.target.value)}
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Interval između dostupnih termina (preporučeno: 30 minuta)
              </p>
            </div>

            {/* Max Appointments */}
            <div>
              <Label htmlFor="maxAppointmentsPerUser">
                Maksimalan broj termina po korisniku
              </Label>
              <Input
                id="maxAppointmentsPerUser"
                type="number"
                min="1"
                max="10"
                value={formData.maxAppointmentsPerUser}
                onChange={(e) =>
                  handleChange('maxAppointmentsPerUser', e.target.value)
                }
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Maksimalan broj aktivnih termina po korisniku
              </p>
            </div>

            {/* Booking Window */}
            <div>
              <Label htmlFor="bookingWindowDays">
                Period rezervacije (dana unaprijed)
              </Label>
              <Input
                id="bookingWindowDays"
                type="number"
                min="1"
                max="90"
                value={formData.bookingWindowDays}
                onChange={(e) =>
                  handleChange('bookingWindowDays', e.target.value)
                }
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Koliko dana unaprijed korisnici mogu rezervisati termine
              </p>
            </div>

            {/* Sunday Bookings */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="allowSundayBookings" className="text-base">
                  Rad nedjeljom
                </Label>
                <p className="text-sm text-gray-500">
                  Omogući rezervacije termina nedjeljom
                </p>
              </div>
              <Switch
                id="allowSundayBookings"
                checked={formData.allowSundayBookings}
                onCheckedChange={(checked) =>
                  handleChange('allowSundayBookings', checked)
                }
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin')}
            >
              Otkaži
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Čuvanje...' : 'Sačuvaj'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
