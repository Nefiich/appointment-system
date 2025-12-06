# Service Management Guide

## Overview

The service management system allows you to dynamically create, edit, delete, and hide barbershop services (like Fade, Šišanje, Brijanje, etc.) without touching any code.

## Accessing Service Management

1. Log in as **admin** (with email/password)
2. Click **"Usluge"** in the sidebar
3. You'll see a table of all services

## Features

### 1. View All Services

The table shows:
- **#** - Order number (how services appear to users)
- **Naziv (Bosanski)** - Service name in Bosnian (shown to users)
- **Naziv (English)** - English name (for internal use)
- **Trajanje** - Duration in minutes
- **Boja** - Color used in admin calendar
- **Status** - Active/Inactive toggle
- **Akcije** - Action buttons (reorder, edit, delete)

### 2. Add New Service

Click the **"Nova Usluga"** button and fill in:

- **Naziv (Bosanski)** - Required, shown to users (e.g., "Šišanje")
- **Naziv (English)** - Optional, for reference (e.g., "Haircut")
- **Trajanje (minute)** - Required, 5-180 minutes, in 5-minute increments
- **Boja (za kalendar)** - Required, choose from 8 colors for calendar display
- **Aktivna usluga** - Toggle on/off (only active services show to users)

Click **"Dodaj"** to save.

### 3. Edit Existing Service

1. Click the **pencil icon** (✏️) next to any service
2. Modify the fields
3. Click **"Sačuvaj"** to save changes

**Note:** You can change everything including duration. Existing appointments keep their original duration.

### 4. Hide/Show Services

Toggle the **switch** in the Status column:
- **ON (Aktivna)** - Service appears to users when booking
- **OFF (Neaktivna)** - Service hidden from users, but existing appointments remain

**Use case:** Temporarily remove a service without deleting historical data.

### 5. Reorder Services

Use the **↑** and **↓** buttons to change the order services appear to users:
- Services are shown in the order from top to bottom
- This affects both user booking page and admin calendar

### 6. Delete Service

Click the **trash icon** (🗑️) to delete a service.

**Important:** You can only delete services that:
- Have NO existing appointments in the system
- If appointments exist, you must **hide** the service instead

## How It Works

### For Users (Booking Page)

- Only **active** services appear in the service selection grid
- Services show with their duration and Bosnian name
- Services appear in the order you set (via ↑↓ buttons)
- If you hide a service, it immediately disappears from booking

### For Admins (Calendar)

- All appointments display with their service color
- Service names show as Bosnian names
- Both active and inactive services show in existing appointments
- Calendar respects service durations for time slot calculations

## Default Services

After running the SQL migration, you'll have these 7 default services:

| ID | Name BS | Duration | Color |
|----|---------|----------|-------|
| 0 | Brijanje | 10 min | Blue |
| 1 | Šišanje do kože | 10 min | Green |
| 2 | Šišanje | 15 min | Red |
| 3 | Fade | 20 min | Yellow |
| 4 | Brijanje glave | 15 min | Purple |
| 5 | Šišanje + Brijanje | 30 min | Orange |
| 6 | Fade + Brijanje | 30 min | Teal |

You can modify or delete any of these (if no appointments exist).

## Common Tasks

### Add a New 25-Minute Service

1. Click "Nova Usluga"
2. Fill in:
   - Naziv (Bosanski): "Precizno Šišanje"
   - Naziv (English): "Precision Haircut"
   - Trajanje: 25 minutes
   - Boja: Choose any color
   - Aktivna: ON
3. Click "Dodaj"

### Temporarily Hide a Service

1. Find the service in the table
2. Toggle the switch to OFF
3. Service immediately hidden from users
4. Toggle back to ON to restore

### Change Service Duration

1. Click pencil icon on the service
2. Change "Trajanje (minute)" field
3. Click "Sačuvaj"
4. **Important:** This only affects NEW appointments. Existing appointments keep their original duration.

### Rename a Service

1. Click pencil icon
2. Change "Naziv (Bosanski)" field
3. Click "Sačuvaj"
4. Name updates everywhere immediately

## Colors Available

Choose from 8 calendar colors:
- **Plava (Blue)** - Light blue background
- **Zelena (Green)** - Light green background
- **Crvena (Red)** - Light red background
- **Žuta (Yellow)** - Light yellow background
- **Ljubičasta (Purple)** - Light purple background
- **Narandžasta (Orange)** - Light orange background
- **Tirkizna (Teal)** - Light teal background
- **Siva (Gray)** - Light gray background

Colors help distinguish different appointment types on the admin calendar.

## Best Practices

1. **Don't delete services with appointments** - Hide them instead
2. **Use clear Bosnian names** - This is what users see
3. **Set realistic durations** - Include buffer time if needed
4. **Use different colors** - Makes calendar easier to read
5. **Order by frequency** - Put most popular services first

## Troubleshooting

### Service doesn't appear on booking page
- Check that "Aktivna usluga" toggle is ON
- Refresh the booking page
- Check browser console for errors

### Can't delete a service
- Service has existing appointments in the database
- Solution: Hide it instead (toggle OFF)
- Or: Manually delete all appointments for that service first (not recommended)

### Changes not reflecting immediately
- Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
- Check browser console for errors
- Verify you saved the changes (clicked "Sačuvaj" or "Dodaj")

## Database Information

Services are stored in the `services` table with:
- Automatic timestamp tracking (created_at, updated_at)
- Row Level Security (RLS) - only admins can modify
- All users can read active services

Changes to services are immediate and affect all users in real-time.
