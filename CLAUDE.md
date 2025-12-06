# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 14 appointment booking system for a barbershop, built with Supabase for backend/auth, TypeScript, and Tailwind CSS. The system supports both admin and customer-facing interfaces with real-time appointment updates.

## Development Commands

```bash
# Development
pnpm dev              # Start dev server at http://localhost:3000

# Building
pnpm build            # Create production build
pnpm start            # Start production server

# Code Quality
pnpm lint             # Run ESLint
pnpm format           # Format code with Prettier
pnpm format-check     # Check formatting without modifying
pnpm type-check       # Run TypeScript compiler checks

# Testing
pnpm test             # Run Jest tests
pnpm test:ci          # Run tests in CI mode

# Analysis
pnpm analyze          # Build and open bundle analyzer
```

## Architecture

### Authentication System

The app uses a dual authentication model via Supabase:
- **Admin users**: Authenticate with email/password (standard Supabase auth)
- **Customer users**: Authenticate with phone number + PIN (custom implementation)

Middleware (`src/middleware.ts`) handles routing:
- Users with email → redirected to `/admin`
- Users without email (phone-only) → redirected to `/rezervacije`
- Unauthenticated users → redirected to `/` or `/login`

### Supabase Client Architecture

**Critical**: There are THREE different Supabase client creators, each for a specific context:

1. **`createBrowserClient()`** - For client components (`src/lib/supabase.ts`)
2. **`createClient()`** - For server components (`src/lib/utils/supabase/server.ts`)
3. **`createMiddlewareClient()`** - For middleware (`src/lib/supabase.ts`)

Always use the correct client for the context. Never use browser client in server components or vice versa.

### Timezone Handling

**Important**: This system has complex timezone handling because Supabase stores dates in UTC but the app displays/accepts local time (Europe/Sarajevo timezone assumed).

When working with appointments:
- **Storing**: Use `localToUTC()` from `src/lib/appointment-utils.ts` to convert local time to UTC before saving
- **Displaying**: Use `utcToLocal()` to convert UTC from database to local time
- **Helper**: Use `prepareAppointmentTimeForStorage()` for complete appointment time preparation

Never store or query appointment times without timezone conversion. The pattern is:
```typescript
const timezoneOffset = appointmentTime.getTimezoneOffset();
const adjustedTime = new Date(appointmentTime);
adjustedTime.setMinutes(adjustedTime.getMinutes() - timezoneOffset);
// Store: adjustedTime.toISOString()
```

### Database Schema

Key tables:
- `appointments` - Active appointments with user_id, name, phone_number, service, appointment_time
- `canceled_appointments` - History of canceled appointments
- `users` - User profiles (name, phone_number)
- `blocked_dates` - Vacation/blocked dates (prevents booking)
- `announcements` - Admin announcements shown to customers

Real-time subscriptions are active on `appointments` and `canceled_appointments` tables in the admin dashboard.

### Service System

Services are stored as integers (0-6):
- 0: Brijanje (10min)
- 1: Šišanje do kože (10min)
- 2: Šišanje (15min)
- 3: Fade (20min)
- 4: Brijanje glave (15min)
- 5: Šišanje + Brijanje (30min)
- 6: Fade + Brijanje (30min)

Use `getServiceDuration()` and `getServiceName()` from `src/lib/appointment-utils.ts`.

### Route Structure

```
/                         → Landing page (redirects if authenticated)
/login                    → Login page (phone PIN or email/password)
/rezervacije             → Customer booking interface
/admin                   → Admin calendar dashboard (week view)
/admin/users             → User management
/admin/vacation          → Manage blocked dates
/admin/announcements     → Manage announcements
```

### State Management

- React Query (TanStack Query v5) for server state
- Local state with React hooks
- Custom hooks in `src/hooks/`:
  - `useAppointments` - Fetch and manage appointments
  - `useAuth` - Handle user authentication state
  - `useTimeSlots` - Generate available time slots
  - `useBookingDates` - Handle date selection with blocked dates
  - `useAppointmentBooking` - Handle booking flow

### Notifications

- Admin receives toast notifications when users cancel appointments (real-time via Supabase subscriptions)
- SMS notifications via Twilio when admin cancels appointments
- Audio notification plays on cancellation (`/assets/sounds/notification.wav`)

## Testing

- Jest with SWC for fast compilation
- React Testing Library for component tests
- MSW (Mock Service Worker) v2 for API mocking (configured in `src/mocks/`)
- Test files use `.test.tsx` or `.test.ts` extension
- Test utilities in `src/test/test-utils.tsx`

## Styling

- Tailwind CSS with custom configuration in `tailwind.config.js`
- shadcn/ui components in `src/components/ui/`
- Use `cn()` utility from `src/lib/utils.ts` for conditional classes
- Dark mode support via `next-themes`

## Path Aliases

Use `@/` prefix for imports:
```typescript
import { Button } from '@/components/ui/button'
import { createBrowserClient } from '@/lib/supabase'
```

## Pre-commit Hooks

Husky + lint-staged runs on commit:
- ESLint with auto-fix
- Prettier formatting

Files are automatically formatted before commit.

## Important Constraints

- **Maximum appointments per user**: 3 active appointments
- **Booking window**: 30 days from today
- **Operating hours**: 8:30 AM - 6:30 PM (configurable in admin code)
- **Time slots**: 30-minute intervals
- Users cannot book on blocked dates (vacations)

## Common Pitfalls

1. **Timezone bugs**: Always use the timezone utility functions. Direct Date manipulation will cause appointment time mismatches.

2. **Supabase client confusion**: Using browser client in server components or server client in browser will cause hydration errors and auth issues.

3. **Real-time subscription cleanup**: Always return cleanup function in useEffect when subscribing to Supabase channels.

4. **Service ID type**: Services can be string or number - always normalize with `typeof service === 'string' ? parseInt(service, 10) : service`.

5. **Appointment overlap**: When creating appointments, check for overlaps by querying exact appointment_time (after timezone adjustment) and validate service duration doesn't overlap with next appointment.

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_TWILIO_ACCOUNT_SID=
NEXT_PUBLIC_TWILIO_AUTH_TOKEN=
NEXT_PUBLIC_TWILIO_PHONE_NUMBER=
SUPABASE_SERVICE_ROLE_KEY=        # For admin operations
```

## Language

The UI is in Bosnian (bs locale). Day names map: `dayMap` in `src/lib/appointment-utils.ts`.
