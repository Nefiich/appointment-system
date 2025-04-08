// Custom hook for booking appointments
import { useState } from 'react';
import { createBrowserClient } from '@/lib/supabase';

const supabase = createBrowserClient();

export const useAppointmentBooking = (
    fetchAppointments,
    fetchUserAppointments,
    setError
) => {
    const [showConfirmation, setShowConfirmation] = useState(false);

    const handleBookAppointment = async (
        date,
        selectedTime,
        selectedService,
        name,
        phone
    ) => {
        if (!date || !selectedTime || selectedService === null) {
            setError('Molimo popunite sva obavezna polja');
            return false;
        }

        try {
            // Get current user ID from session
            const {
                data: { session },
                error: sessionError,
            } = await supabase.auth.getSession();

            if (sessionError || !session) {
                console.error('Session error:', sessionError);
                setError('Greška pri autentifikaciji. Molimo prijavite se da biste rezervisali termin.');
                return false;
            }

            const userId = session.user.id;

            // Parse the selected time
            const [hours, minutes] = selectedTime.time.split(':').map(Number);

            // Create appointment time
            const appointmentTime = new Date(date);
            appointmentTime.setHours(hours, minutes, 0, 0);

            // Adjust for timezone before storing
            // This compensates for the timezone difference by adding the offset
            const timezoneOffset = appointmentTime.getTimezoneOffset();
            const adjustedTime = new Date(appointmentTime);
            adjustedTime.setMinutes(adjustedTime.getMinutes() - timezoneOffset);

            console.log('Local time selected:', appointmentTime.toLocaleString());
            console.log('Adjusted time for storage:', adjustedTime.toISOString());

            // Get the service duration
            const getServiceDuration = (serviceId) => {
                if (serviceId === null || serviceId === undefined) return 30;

                const id = typeof serviceId === 'string' ? parseInt(serviceId, 10) : serviceId;

                const serviceDurations = {
                    0: 10, // Brijanje
                    1: 10, // Šišanje do kože
                    2: 15, // Šišanje
                    3: 20, // Fade
                    4: 15, // Brijanje glave
                    5: 30, // Šišanje + Brijanje
                    6: 30, // Fade + Brijanje
                };

                return serviceDurations[id] || 30;
            };

            // Calculate the end time of the proposed appointment
            const serviceDuration = getServiceDuration(selectedService);
            const endTime = new Date(adjustedTime);
            endTime.setMinutes(endTime.getMinutes() + serviceDuration);

            // Check for any overlapping appointments
            const { data: existingAppointments, error: checkError } = await supabase
                .from('appointments')
                .select('*')
                .or(`appointment_time.gte.${adjustedTime.toISOString()},appointment_time.lt.${endTime.toISOString()}`)
                .eq('appointment_time', adjustedTime.toISOString());

            if (checkError) {
                console.error('Error checking appointment availability:', checkError);
                setError('Neuspjela provjera dostupnosti termina. Molimo pokušajte ponovo.');
                return false;
            }

            // If we found any appointments at this exact time, the slot is not available
            if (existingAppointments && existingAppointments.length > 0) {
                setError('Ovaj termin više nije dostupan. Molimo odaberite drugo vrijeme.');
                return false;
            }

            // Insert the new appointment into Supabase with the adjusted time
            const { data, error } = await supabase
                .from('appointments')
                .insert([
                    {
                        name: name,
                        phone_number: phone,
                        service: selectedService,
                        appointment_time: adjustedTime.toISOString(),
                        user_id: userId,
                    },
                ])
                .select();

            if (error) {
                console.error('Greška prilikom dodavanja termina:', error);
                setError(`Greška prilikom kreiranja termina: ${error.message}`);
                return false;
            }

            // Update user profile if not already set
            const { error: updateError } = await supabase.from('users').upsert({
                name: name,
                phone_number: phone,
            });

            if (updateError) {
                console.error('Greška prilikom ažuriranja korisničkog profila:', updateError);
                // Continue anyway as the appointment was created successfully
            }

            // Refresh appointments
            fetchAppointments();

            // Also refresh user appointments
            await fetchUserAppointments(userId);

            return true;
        } catch (error) {
            console.error('Error:', error);
            setError('Došlo je do neočekivane greške. Molimo pokušajte ponovo.');
            return false;
        }
    };

    return {
        showConfirmation,
        setShowConfirmation,
        handleBookAppointment
    };
};