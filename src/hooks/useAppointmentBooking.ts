// Custom hook for booking appointments
import { useRef, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { findOverlappingAppointments } from '@/lib/appointment-conflicts';

const supabase = createBrowserClient();

export const useAppointmentBooking = (
    fetchAppointments,
    fetchUserAppointments,
    setError
) => {
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [isBooking, setIsBooking] = useState(false);
    // Synchronous lock: state updates are async, so a second click in the same
    // tick would still see isBooking === false. A ref flips immediately and
    // prevents duplicate inserts from rapid double-clicks.
    const isBookingRef = useRef(false);

    const handleBookAppointment = async (
        date,
        selectedTime,
        selectedService,
        name,
        phone
    ) => {
        console.log('[booking] handleBookAppointment called with:', {
            date,
            selectedTime,
            selectedService,
            selectedServiceType: typeof selectedService,
            name,
            phone,
        });

        if (!date || !selectedTime || selectedService === null) {
            console.warn('[booking] BLOCKED: missing required fields');
            setError('Molimo popunite sva obavezna polja');
            return false;
        }

        // Guard against concurrent/duplicate submissions
        if (isBookingRef.current) {
            return false;
        }
        isBookingRef.current = true;
        setIsBooking(true);

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
            console.log('[booking] session OK, userId:', userId);

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

            // Duration of the appointment being booked
            const serviceDuration = getServiceDuration(selectedService);
            console.log('[booking] computed times + duration:', {
                appointmentTimeLocal: appointmentTime.toString(),
                adjustedTimeISO: adjustedTime.toISOString(),
                serviceDuration,
            });

            // Check for overlapping appointments across the whole day, using
            // real interval math (start < otherEnd && end > otherStart) rather
            // than exact start-time equality — an appointment that starts
            // earlier and runs into this slot must also block it.
            // Day bounds are computed in the same "local-wall-clock-as-UTC"
            // space the rest of the app stores in.
            const dayStartLocal = new Date(date);
            dayStartLocal.setHours(0, 0, 0, 0);
            const dayStart = new Date(dayStartLocal);
            dayStart.setMinutes(dayStart.getMinutes() - dayStartLocal.getTimezoneOffset());

            const dayEndLocal = new Date(date);
            dayEndLocal.setHours(23, 59, 59, 999);
            const dayEnd = new Date(dayEndLocal);
            dayEnd.setMinutes(dayEnd.getMinutes() - dayEndLocal.getTimezoneOffset());

            const { data: sameDay, error: checkError } = await supabase
                .from('appointments')
                .select('id, appointment_time, service')
                .gte('appointment_time', dayStart.toISOString())
                .lte('appointment_time', dayEnd.toISOString());

            console.log('[booking] same-day query:', {
                dayStartISO: dayStart.toISOString(),
                dayEndISO: dayEnd.toISOString(),
                count: sameDay?.length ?? 0,
                sameDay,
                checkError,
            });

            if (checkError) {
                console.error('[booking] BLOCKED: same-day availability query failed:', checkError);
                setError('Neuspjela provjera dostupnosti termina. Molimo pokušajte ponovo.');
                return false;
            }

            const overlapping = findOverlappingAppointments(
                (sameDay || []).map((a) => ({
                    id: a.id,
                    appointment_time: a.appointment_time,
                    duration_minutes: getServiceDuration(a.service),
                })),
                adjustedTime.toISOString(),
                serviceDuration,
            );

            console.log('[booking] overlap pre-check:', {
                newStartISO: adjustedTime.toISOString(),
                newDuration: serviceDuration,
                existing: (sameDay || []).map((a) => ({
                    id: a.id,
                    appointment_time: a.appointment_time,
                    service: a.service,
                    duration: getServiceDuration(a.service),
                })),
                overlappingCount: overlapping.length,
                overlapping,
            });

            if (overlapping.length > 0) {
                console.warn('[booking] BLOCKED by app-side overlap pre-check', overlapping);
                setError('Ovaj termin više nije dostupan. Molimo odaberite drugo vrijeme.');
                return false;
            }

            // Insert the new appointment into Supabase with the adjusted time
            const insertPayload = {
                name: name,
                phone_number: phone,
                service: selectedService,
                appointment_time: adjustedTime.toISOString(),
                user_id: userId,
            };
            console.log('[booking] inserting appointment:', insertPayload);

            const { data, error } = await supabase
                .from('appointments')
                .insert([insertPayload])
                .select();

            if (error) {
                // Log every field individually — Supabase/Postgres error objects
                // often collapse to "{}" when logged whole.
                console.error('[booking] INSERT FAILED:', {
                    code: error.code,
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                });
                // 23P01 = Postgres exclusion_violation: the appointments_no_overlap
                // constraint rejected this insert because another booking landed in
                // the same slot between our check and insert (concurrency guard).
                if (error.code === '23P01') {
                    setError('Ovaj termin je upravo rezervisan. Molimo odaberite drugo vrijeme.');
                } else {
                    setError(`Greška prilikom kreiranja termina: ${error.message}`);
                }
                return false;
            }

            console.log('[booking] insert OK:', data);

            // Update user profile if not already set
            const { error: updateError } = await supabase.from('users').upsert({
                user_id: userId,
                name: name,
                phone_number: phone,
            }, {
                onConflict: 'user_id'
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
        } finally {
            isBookingRef.current = false;
            setIsBooking(false);
        }
    };

    return {
        showConfirmation,
        setShowConfirmation,
        handleBookAppointment,
        isBooking
    };
};