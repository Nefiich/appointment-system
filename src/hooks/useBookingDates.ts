// Custom hook for managing booking dates
import { useState } from 'react';
import { isAfter, isBefore, addDays, getDay, isSameDay } from 'date-fns';

export const useBookingDates = (
    userAppointments: any[],
    blockedDates: Date[] = [],
    bookingWindowDays = 7,
    maxAppointments = 3,
    allowSundayBookings = false
) => {
    // Set the minimum booking date - either April 2, 2025 or today, whichever is later
    const minBookingDate = new Date(2025, 3, 2); // April 2, 2025
    const today = new Date();

    // If today is after April 2, 2025, use today as the start date
    const startDate = isAfter(today, minBookingDate) ? today : minBookingDate;

    // Calculate end date based on dynamic booking window
    const endDate = addDays(startDate, bookingWindowDays);

    // Set default month to April if current month is March
    const defaultMonth =
        today.getMonth() === 2 ? new Date(today.getFullYear(), 3) : today;

    // Helper function to check if a date is blocked
    const isDateBlocked = (dateToCheck: Date) => {
        return (
            (!allowSundayBookings && getDay(dateToCheck) === 0) || // Sunday (only if not allowed)
            isBefore(dateToCheck, startDate) ||
            isAfter(dateToCheck, endDate) ||
            userAppointments.length >= maxAppointments ||
            blockedDates.some(blockedDate =>
                isSameDay(blockedDate, dateToCheck)
            )
        );
    };

    // Find the first available (non-blocked) date
    const getFirstAvailableDate = () => {
        let checkDate = new Date(startDate);
        const maxDaysToCheck = 30; // Safety limit to prevent infinite loop

        for (let i = 0; i < maxDaysToCheck; i++) {
            if (!isDateBlocked(checkDate)) {
                return checkDate;
            }
            checkDate = addDays(checkDate, 1);
        }

        // If no available date found, return startDate as fallback
        return startDate;
    };

    const [date, setDate] = useState(getFirstAvailableDate());

    // Custom date filter function to disable Sundays and dates outside the booking window
    const disabledDays = (date: Date) => {
        return isDateBlocked(date);
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