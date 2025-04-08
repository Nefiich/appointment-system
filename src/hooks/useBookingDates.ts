// Custom hook for managing booking dates
import { useState } from 'react';
import { isAfter, isBefore, addDays, getDay } from 'date-fns';

export const useBookingDates = (userAppointments) => {
    // Set the minimum booking date - either April 2, 2025 or today, whichever is later
    const minBookingDate = new Date(2025, 3, 2); // April 2, 2025
    const today = new Date();

    // If today is after April 2, 2025, use today as the start date
    const startDate = isAfter(today, minBookingDate) ? today : minBookingDate;

    // Calculate end date (7 days from start date)
    const endDate = addDays(startDate, 7);

    // Set default month to April if current month is March
    const defaultMonth =
        today.getMonth() === 2 ? new Date(today.getFullYear(), 3) : today;

    const [date, setDate] = useState(startDate);

    // Custom date filter function to disable Sundays and dates outside the booking window
    const disabledDays = (date) => {
        // Check if it's Sunday (0 = Sunday, 1 = Monday, etc.)
        return (
            getDay(date) === 0 ||
            // Before start date (April 2nd or today, whichever is later)
            isBefore(date, startDate) ||
            // After end date (current start date + 7 days)
            isAfter(date, endDate) ||
            // The user already has 3 appointments
            userAppointments.length >= 3
        );
    };

    return {
        date,
        setDate,
        startDate,
        endDate,
        defaultMonth,
        disabledDays
    };
};