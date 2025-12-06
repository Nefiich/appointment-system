# Dynamic Appointment Settings - Setup Guide

This guide explains how to set up and use the new dynamic appointment settings system.

## Step 1: Run the SQL Migration in Supabase

1. Go to your Supabase project dashboard
2. Navigate to the **SQL Editor**
3. Open the file `supabase-migration.sql` in this repository
4. Copy all the SQL code
5. Paste it into the Supabase SQL Editor
6. Click **Run** to execute the migration

This will create:
- `appointment_settings` table - stores configurable system settings
- `services` table - stores barbershop services with durations and colors
- Row Level Security (RLS) policies
- Default settings and services

## Step 2: Verify Tables Were Created

In Supabase, go to **Table Editor** and verify you see:
- `appointment_settings` - should have 5 rows with default settings
- `services` - should have 7 rows with your barbershop services

## Step 3: Access Settings Page

1. Log in as an admin (with email/password)
2. Click **Postavke** (Settings) in the sidebar
3. You'll see a form with the following configurable options:

### Available Settings:

1. **Početak radnog vremena** (Business Start Time)
   - Default: 08:30
   - Format: HH:MM
   - When your shop opens

2. **Kraj radnog vremena** (Business End Time)
   - Default: 18:30
   - Format: HH:MM
   - When your shop closes

3. **Interval termina** (Time Slot Interval)
   - Default: 30 minutes
   - Range: 5-60 minutes
   - How often time slots appear (e.g., 8:30, 9:00, 9:30...)

4. **Maksimalan broj termina po korisniku** (Max Appointments Per User)
   - Default: 3
   - Range: 1-10
   - How many active appointments a user can have

5. **Period rezervacije** (Booking Window Days)
   - Default: 7 days
   - Range: 1-90 days
   - How far in advance users can book

## How It Works

### Frontend Integration

The system uses the `useAppointmentSettings` hook to fetch dynamic settings:

```typescript
const { settings, services, getServiceName, getServiceDuration } = useAppointmentSettings();

// Access settings
settings.businessStartTime    // "08:30"
settings.businessEndTime       // "18:30"
settings.timeSlotInterval      // 30
settings.maxAppointmentsPerUser // 3
settings.bookingWindowDays     // 7

// Access services
services // Array of all active services
getServiceName(0)      // "Brijanje"
getServiceDuration(0)  // 10 minutes
```

### What's Dynamic Now:

1. **Business Hours**: Time slots are generated based on `businessStartTime` and `businessEndTime`
2. **Max Appointments**: Users can't book more than `maxAppointmentsPerUser` active appointments
3. **Booking Window**: Users can only book `bookingWindowDays` days in advance
4. **Services**: All services are loaded from the database (ready for future admin management)

### What Components Use These Settings:

- `/rezervacije` (User booking page) - Uses all settings
- `/admin` (Admin calendar) - Can be updated to use business hours
- `useBookingDates` hook - Uses `bookingWindowDays` and `maxAppointmentsPerUser`
- `useTimeSlots` hook - Uses `businessStartTime` and `businessEndTime`

## Future Enhancements (Not Yet Implemented)

You can extend this system to:

1. **Service Management Page**
   - Add/edit/delete services from admin panel
   - Change service durations, names, colors
   - Reorder services

2. **Working Days**
   - Add a setting to configure which days are working days
   - Currently hardcoded to exclude Sundays

3. **Multiple Time Slot Intervals**
   - Different intervals for different times of day
   - E.g., 15-minute slots in the morning, 30-minute in afternoon

4. **Pricing**
   - Add price field to services table
   - Display prices to users

## Troubleshooting

### Settings Not Loading
- Check browser console for errors
- Verify RLS policies in Supabase allow authenticated users to SELECT
- Check that settings exist in `appointment_settings` table

### Can't Update Settings
- Ensure you're logged in as admin (with email)
- RLS policies only allow users with email to UPDATE
- Phone-authenticated users can't modify settings

### Services Not Showing
- Verify services exist in `services` table
- Check that `is_active` is `true`
- Look at browser console for fetch errors

## Database Schema Reference

### appointment_settings
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| setting_key | VARCHAR(100) | Unique setting identifier |
| setting_value | TEXT | Setting value (stored as string) |
| description | TEXT | Human-readable description |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### services
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key / service ID |
| name | VARCHAR(100) | English name |
| name_bs | VARCHAR(100) | Bosnian name |
| duration_minutes | INTEGER | Service duration |
| color | VARCHAR(50) | Color for calendar display |
| display_order | INTEGER | Sort order |
| is_active | BOOLEAN | Whether service is available |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

## Notes

- All times are stored and displayed in local timezone
- Settings changes take effect immediately for all users
- No page refresh required after updating settings
- The settings page is only accessible to admin users (with email)
