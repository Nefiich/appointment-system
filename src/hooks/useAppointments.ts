// Custom hook for appointments functionality
import { useState, useEffect } from 'react';
import { isSameDay } from 'date-fns';
import { createBrowserClient } from '@/lib/supabase';

const supabase = createBrowserClient();

export const useAppointments = () => {
    const [appointments, setAppointments] = useState([]);
    const [userAppointments, setUserAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch appointments from Supabase
    const fetchAppointments = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('appointments').select('*');

            if (error) {
                console.error('Error fetching appointments:', error);
                setError('Failed to load available time slots. Please try again.');
                return;
            }

            // Transform the data to match our appointment structure
            const formattedAppointments = data.map((appointment) => {
                // Create a new Date object from the ISO string
                // Date constructor automatically converts UTC to local time zone
                const appointmentTime = new Date(appointment.appointment_time);

                console.log('Appointment from DB:', appointment.appointment_time);
                console.log(
                    'Converted to local time:',
                    appointmentTime.toLocaleString(),
                );

                return {
                    id: appointment.id,
                    name: appointment.name || 'Unnamed',
                    phone_number: appointment.phone_number || '',
                    service: appointment.service,
                    appointment_time: appointmentTime,
                };
            });

            setAppointments(formattedAppointments);
        } catch (error) {
            console.error('Error:', error);
            setError('Nešto je pošlo po zlu. Molimo pokušajte kasnije.');
        } finally {
            setLoading(false);
        }
    };

    // Fetch user appointments
    const fetchUserAppointments = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('appointments')
                .select('*')
                .eq('user_id', userId)
                .gte('appointment_time', new Date().toISOString())
                .order('appointment_time', { ascending: true })
                .limit(3);

            if (error) {
                console.error('Error fetching user appointments:', error);
                setError('Failed to load your appointments. Please try again.');
                return;
            }

            // Transform the data to match our appointment structure
            const formattedAppointments = data.map((appointment) => {
                const appointmentTime = new Date(appointment.appointment_time);

                return {
                    id: appointment.id,
                    name: appointment.name || 'Unnamed',
                    phone_number: appointment.phone_number || '',
                    service: appointment.service,
                    appointment_time: appointmentTime,
                };
            });

            setUserAppointments(formattedAppointments);
        } catch (error) {
            console.error('Error:', error);
            setError('Nešto je pošlo po zlu. Molimo pokušajte kasnije.');
        }
    };

    // Cancel appointment
    const cancelAppointment = async (appointmentId) => {
        try {
            // First, get the appointment details before deleting
            const { data: appointmentData, error: fetchError } = await supabase
                .from('appointments')
                .select('*')
                .eq('id', appointmentId)
                .single();

            if (fetchError) {
                console.error('Error fetching appointment details:', fetchError);
                setError('Neuspjelo otkazivanje termina. Molimo pokušajte ponovo.');
                return false;
            }

            // Insert into canceled_appointments table
            const { error: insertError } = await supabase
                .from('canceled_appointments')
                .insert([
                    {
                        original_id: appointmentData.id,
                        name: appointmentData.name,
                        phone_number: appointmentData.phone_number,
                        service: appointmentData.service,
                        appointment_time: appointmentData.appointment_time,
                        user_id: appointmentData.user_id,
                    },
                ]);

            if (insertError) {
                console.error('Error recording cancellation:', insertError);
                // Continue with deletion even if recording fails
            }

            // Delete from appointments table
            const { data: deleteData, error: deleteError } = await supabase
                .from('appointments')
                .delete()
                .eq('id', appointmentId)
                .select();

            console.log('Delete response:', deleteData, deleteError);

            if (deleteError) {
                console.error('Error cancelling appointment:', deleteError);
                setError('Neuspjelo otkazivanje termina. Molimo pokušajte ponovo.');
                return false;
            }

            // Refresh appointments
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (session) {
                await fetchUserAppointments(session.user.id);
                await fetchAppointments();
            }

            return true;
        } catch (error) {
            console.error('Error:', error);
            setError('Nešto je pošlo po zlu. Molimo pokušajte kasnije.');
            return false;
        }
    };

    // Get appointments for a specific date
    const getAppointmentsForDate = (date) => {
        return appointments.filter((appointment) =>
            isSameDay(appointment.appointment_time, date)
        );
    };

    return {
        appointments,
        userAppointments,
        loading,
        error,
        setError,
        fetchAppointments,
        fetchUserAppointments,
        cancelAppointment,
        getAppointmentsForDate,
        setUserAppointments
    };
};