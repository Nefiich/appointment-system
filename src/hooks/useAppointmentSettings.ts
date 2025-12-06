import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase';

const supabase = createBrowserClient();

export interface AppointmentSettings {
  businessStartTime: string;
  businessEndTime: string;
  timeSlotInterval: number;
  maxAppointmentsPerUser: number;
  bookingWindowDays: number;
  allowSundayBookings: boolean;
}

export interface Service {
  id: number;
  name: string;
  name_bs: string;
  duration_minutes: number;
  color: string;
  display_order: number;
  is_active: boolean;
}

export const useAppointmentSettings = () => {
  const [settings, setSettings] = useState<AppointmentSettings>({
    businessStartTime: '08:30',
    businessEndTime: '18:30',
    timeSlotInterval: 30,
    maxAppointmentsPerUser: 3,
    bookingWindowDays: 7,
    allowSundayBookings: false,
  });

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchServices();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('appointment_settings')
        .select('*');

      if (fetchError) {
        console.error('Error fetching settings:', fetchError);
        setError('Failed to load appointment settings');
        setLoading(false);
        return;
      }

      // Convert array of settings to object
      const settingsObj: any = {};
      data?.forEach((setting) => {
        switch (setting.setting_key) {
          case 'business_start_time':
            settingsObj.businessStartTime = setting.setting_value;
            break;
          case 'business_end_time':
            settingsObj.businessEndTime = setting.setting_value;
            break;
          case 'time_slot_interval':
            settingsObj.timeSlotInterval = parseInt(setting.setting_value, 10);
            break;
          case 'max_appointments_per_user':
            settingsObj.maxAppointmentsPerUser = parseInt(setting.setting_value, 10);
            break;
          case 'booking_window_days':
            settingsObj.bookingWindowDays = parseInt(setting.setting_value, 10);
            break;
          case 'allow_sunday_bookings':
            settingsObj.allowSundayBookings = setting.setting_value === 'true';
            break;
        }
      });

      setSettings({
        businessStartTime: settingsObj.businessStartTime || '08:30',
        businessEndTime: settingsObj.businessEndTime || '18:30',
        timeSlotInterval: settingsObj.timeSlotInterval || 30,
        maxAppointmentsPerUser: settingsObj.maxAppointmentsPerUser || 3,
        bookingWindowDays: settingsObj.bookingWindowDays || 7,
        allowSundayBookings: settingsObj.allowSundayBookings ?? false,
      });

      setLoading(false);
    } catch (err) {
      console.error('Error in fetchSettings:', err);
      setError('Failed to load settings');
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (fetchError) {
        console.error('Error fetching services:', fetchError);
        return;
      }

      setServices(data || []);
    } catch (err) {
      console.error('Error in fetchServices:', err);
    }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      const { error: updateError } = await supabase
        .from('appointment_settings')
        .update({ setting_value: value })
        .eq('setting_key', key);

      if (updateError) {
        console.error('Error updating setting:', updateError);
        throw updateError;
      }

      // Refresh settings
      await fetchSettings();
    } catch (err) {
      console.error('Error in updateSetting:', err);
      throw err;
    }
  };

  const getServiceById = (id: number | string | null): Service | undefined => {
    if (id === null || id === undefined) return undefined;
    const numId = typeof id === 'string' ? parseInt(id, 10) : id;
    return services.find((s) => s.id === numId);
  };

  const getServiceDuration = (id: number | string | null): number => {
    const service = getServiceById(id);
    return service?.duration_minutes || 30;
  };

  const getServiceName = (id: number | string | null): string => {
    const service = getServiceById(id);
    return service?.name_bs || 'Unknown service';
  };

  const getServiceColor = (id: number | string | null): string => {
    const service = getServiceById(id);
    return service?.color || 'blue';
  };

  return {
    settings,
    services,
    loading,
    error,
    updateSetting,
    getServiceById,
    getServiceDuration,
    getServiceName,
    getServiceColor,
    refreshSettings: fetchSettings,
    refreshServices: fetchServices,
  };
};
