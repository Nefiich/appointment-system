// Custom hook for time slot management
import { useState, useEffect } from 'react';
import { isSameDay } from 'date-fns';
import { getServiceDuration } from '@/lib/appointment-utils';

interface Appointment {
    appointment_time: Date;
    service: string | number;
}

interface TimeSlot {
    time: string;
}

export const useTimeSlots = (
    date: Date | null,
    selectedService: string | number | null,
    appointments: Appointment[],
    businessStartTime = '08:30',
    businessEndTime = '18:30',
    timeSlotInterval = 30
) => {
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);

    // Helper functions for time slot calculation
    const parseTime = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const formatTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins
            .toString()
            .padStart(2, '0')}`;
    };

    // Calculate available time slots based on existing appointments for the selected date
    const calculateAvailableTimeSlots = (date: Date, existingAppointments: Appointment[]) => {
        // Filter appointments for the selected date
        const appointmentsForDate = existingAppointments.filter((appointment) =>
            isSameDay(appointment.appointment_time, date),
        );

        const slots = [];
        const businessStart = parseTime(businessStartTime);
        const businessEnd = parseTime(businessEndTime);
        let startOfDay = businessStart;
        let endOfDay = businessEnd;

        // Get current date and time
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        // If selected date is today, adjust start time to current time (rounded to next interval)
        if (isSameDay(date, now)) {
            let startMinutes = currentHour * 60 + currentMinute;
            // Round up to the next interval
            startMinutes = Math.ceil(startMinutes / timeSlotInterval) * timeSlotInterval;

            // Ensure start time is within business hours
            startOfDay = Math.max(startMinutes, businessStart);
        }
        // For a date exactly 7 days in the future, limit end time
        else if (
            date.getFullYear() === now.getFullYear() &&
            date.getMonth() === now.getMonth() &&
            date.getDate() === now.getDate() + 7
        ) {
            let cutoffMinutes = currentHour * 60 + currentMinute + timeSlotInterval; // Current time + interval
            // Round up to the next interval
            cutoffMinutes = Math.ceil(cutoffMinutes / timeSlotInterval) * timeSlotInterval;

            // Ensure we're still showing slots within business hours
            endOfDay = Math.min(cutoffMinutes, businessEnd);
        }

        // Convert appointments to a format with time and duration
        const formattedAppointments = appointmentsForDate.map((appointment) => {
            const time = `${appointment.appointment_time
                .getHours()
                .toString()
                .padStart(2, '0')}:${appointment.appointment_time
                    .getMinutes()
                    .toString()
                    .padStart(2, '0')}`;

            // Get duration from service ID
            const duration = getServiceDuration(appointment.service);

            return {
                time,
                duration,
            };
        });

        // Sort appointments by time
        const sortedAppointments = [...formattedAppointments].sort(
            (a, b) => parseTime(a.time) - parseTime(b.time),
        );

        if (sortedAppointments.length === 0) {
            // If no appointments, generate slots every interval
            let currentTime = startOfDay;
            while (currentTime < endOfDay) {
                slots.push({ time: formatTime(currentTime) });
                currentTime += timeSlotInterval;
            }
        } else {
            // Generate slots based on appointment end times
            let currentTime = startOfDay;

            for (const appointment of sortedAppointments) {
                // Add slots until this appointment starts
                while (currentTime < parseTime(appointment.time)) {
                    slots.push({ time: formatTime(currentTime) });
                    currentTime += timeSlotInterval;
                }
                // Move to the end of this appointment
                currentTime = parseTime(appointment.time) + appointment.duration;
            }

            // Add remaining slots after last appointment
            while (currentTime < endOfDay) {
                slots.push({ time: formatTime(currentTime) });
                currentTime += timeSlotInterval;
            }
        }

        return slots;
    };

    // Check if a slot is available for a specific duration
    const isSlotAvailable = (slot: string, duration: number, existingAppointments: Appointment[]) => {
        const slotStart = parseTime(slot);
        const slotEnd = slotStart + duration;

        if (slotEnd > parseTime(businessEndTime)) return false;

        // Convert appointments to a format with time and duration
        const formattedAppointments = existingAppointments.map((appointment: Appointment) => {
            const time = `${appointment.appointment_time
                .getHours()
                .toString()
                .padStart(2, '0')}:${appointment.appointment_time
                    .getMinutes()
                    .toString()
                    .padStart(2, '0')}`;

            // Get duration from service ID
            const duration = getServiceDuration(appointment.service);

            return {
                time,
                duration,
            };
        });

        // Check if the proposed slot overlaps with any existing appointment
        return !formattedAppointments.some((appointment) => {
            const appointmentStart = parseTime(appointment.time);
            const appointmentEnd = appointmentStart + appointment.duration;

            // Check for any overlap between the new slot and existing appointment
            return (slotStart < appointmentEnd && slotEnd > appointmentStart);
        });
    };

    // NEW FUNCTION: Verify slot availability in real-time before booking
    const verifySlotAvailability = async (supabase: any, date: Date, timeSlot: TimeSlot, serviceId: string | number | null) => {
        try {
            // Format the date and time for the query
            const appointmentTime = new Date(date);
            const [hours, minutes] = timeSlot.time.split(':').map(Number);
            appointmentTime.setHours(hours, minutes, 0, 0);
            
            // Adjust for timezone before querying
            const timezoneOffset = appointmentTime.getTimezoneOffset();
            const adjustedTime = new Date(appointmentTime);
            adjustedTime.setMinutes(adjustedTime.getMinutes() - timezoneOffset);
            
            // Get the service duration
            const serviceDuration = getServiceDuration(serviceId);
            
            // Calculate the end time of the proposed appointment
            const endTime = new Date(adjustedTime);
            endTime.setMinutes(endTime.getMinutes() + serviceDuration);
            
            // Query for any appointments that would overlap with this time slot
            const { data, error } = await supabase
                .from('appointments')
                .select('*')
                .gte('appointment_time', adjustedTime.toISOString())
                .lt('appointment_time', endTime.toISOString());
                
            if (error) {
                console.error('Error verifying slot availability:', error);
                return false;
            }
            
            // If we found any appointments in this time range, the slot is not available
            return data.length === 0;
        } catch (error) {
            console.error('Error in verifySlotAvailability:', error);
            return false;
        }
    };

    // Update time slots when date or service changes
    useEffect(() => {
        if (date) {
            // Filter appointments for the selected date
            const appointmentsForDate = appointments.filter((appointment) =>
                isSameDay(appointment.appointment_time, date),
            );

            // Calculate available time slots
            const availableSlots = calculateAvailableTimeSlots(
                date,
                appointmentsForDate,
            );

            // If a service is selected, filter to only show slots that can fit the service
            if (selectedService !== null) {
                const serviceDuration = getServiceDuration(selectedService);
                const filteredSlots = availableSlots.filter((slot) =>
                    isSlotAvailable(slot.time, serviceDuration, appointmentsForDate),
                );
                setTimeSlots(filteredSlots);
            } else {
                setTimeSlots(availableSlots);
            }

            // Reset selected time when date or service changes
            setSelectedTime(null);
        }
    }, [date, selectedService, appointments]);

    return {
        timeSlots,
        selectedTime,
        setSelectedTime,
        getServiceDuration,
        verifySlotAvailability // Export the new function
    };
};

export { getServiceName } from '@/lib/appointment-utils';