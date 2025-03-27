'use client'

// This utility file handles timezone conversions for appointments

/**
 * Converts a local date to UTC for storage in Supabase
 * Adds the timezone offset to ensure the stored time matches the user's intended time
 *
 * @param {Date} localDate - The local date selected by the user
 * @returns {Date} - Date adjusted for storage in UTC
 */
export function localToUTC(localDate) {
  // Create a new date to avoid modifying the original
  const adjustedDate = new Date(localDate)

  // Get the local timezone offset in minutes (e.g., UTC+2 would be -120)
  const timezoneOffset = adjustedDate.getTimezoneOffset()

  // Subtract the timezone offset to compensate (adding minutes for negative offset)
  // This effectively preserves the local time when stored as UTC
  adjustedDate.setMinutes(adjustedDate.getMinutes() - timezoneOffset)

  return adjustedDate
}

/**
 * Converts a UTC date from Supabase to local time for display
 *
 * @param {string|Date} utcDate - UTC date from Supabase
 * @returns {Date} - Date adjusted for local display
 */
export function utcToLocal(utcDate) {
  // If the date is already a Date object, use it; otherwise create a new Date
  const dateObj = utcDate instanceof Date ? utcDate : new Date(utcDate)

  // The date constructor automatically handles the timezone conversion
  // from the UTC string to local time, so we don't need additional adjustment
  return dateObj
}

/**
 * Format a date as a string with time in 24-hour format
 *
 * @param {Date} date - The date to format
 * @returns {string} - Formatted date string
 */
export function formatDateTime(date) {
  return date.toLocaleString('bs', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * Example usage for saving an appointment
 *
 * @param {Date} selectedDate - The selected date
 * @param {string} selectedTime - The selected time (e.g. "11:00")
 * @returns {string} - ISO string ready for Supabase storage
 */
export function prepareAppointmentTimeForStorage(selectedDate, selectedTime) {
  // Create a new date object to avoid modifying the original
  const appointmentDateTime = new Date(selectedDate)

  // Parse the selected time
  const [hours, minutes] = selectedTime.split(':').map(Number)

  // Set the hours and minutes
  appointmentDateTime.setHours(hours, minutes, 0, 0)

  // Convert to UTC for storage
  const utcDateTime = localToUTC(appointmentDateTime)

  // Return as ISO string for Supabase
  return utcDateTime.toISOString()
}

/**
 * Example usage for displaying an appointment time from Supabase
 *
 * @param {string} storedDateTimeString - ISO date string from Supabase
 * @returns {Date} - Date object adjusted for local display
 */
export function getAppointmentTimeForDisplay(storedDateTimeString) {
  return utcToLocal(storedDateTimeString)
}

/**
 * Generate time slots for the time selection interface
 *
 * @param {number} startHour - Starting hour (e.g., 8 for 8:00 AM)
 * @param {number} endHour - Ending hour (e.g., 18 for 6:00 PM)
 * @param {number} intervalMinutes - Interval in minutes (e.g., 30 for half-hour slots)
 * @returns {Array} - Array of time slot objects with format { time: "HH:MM" }
 */
export function generateTimeSlots(
  startHour = 8,
  endHour = 18,
  intervalMinutes = 30,
) {
  const slots = []

  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      // Stop if we've reached the end hour and are trying to add minutes
      if (hour === endHour && minute > 0) break

      const formattedHour = hour.toString().padStart(2, '0')
      const formattedMinute = minute.toString().padStart(2, '0')
      slots.push({ time: `${formattedHour}:${formattedMinute}` })
    }
  }

  return slots
}

/**
 * Service durations in minutes
 */
export const SERVICE_DURATIONS = {
  0: 10, // Brijanje
  1: 10, // Šišanje do kože
  2: 15, // Šišanje
  3: 20, // Fade
  4: 15, // Brijanje glave
  5: 30, // Šišanje + Brijanje
  6: 30, // Fade + Brijanje
}

/**
 * Service names
 */
export const SERVICE_NAMES = {
  0: 'Brijanje',
  1: 'Šišanje do kože',
  2: 'Šišanje',
  3: 'Fade',
  4: 'Brijanje glave',
  5: 'Šišanje + Brijanje',
  6: 'Fade + Brijanje',
}

/**
 * Gets the duration of a service in minutes
 *
 * @param {string|number|null} serviceId - The ID of the service
 * @returns {number} - Duration in minutes
 */
export function getServiceDuration(serviceId) {
  if (serviceId === null || serviceId === undefined) return 30

  const id = typeof serviceId === 'string' ? parseInt(serviceId, 10) : serviceId
  return SERVICE_DURATIONS[id] || 30
}

/**
 * Gets the name of a service
 *
 * @param {string|number|null} serviceId - The ID of the service
 * @returns {string} - Service name
 */
export function getServiceName(serviceId) {
  if (serviceId === null || serviceId === undefined) return 'Unknown service'

  const id = typeof serviceId === 'string' ? parseInt(serviceId, 10) : serviceId
  return SERVICE_NAMES[id] || 'Unknown service'
}
