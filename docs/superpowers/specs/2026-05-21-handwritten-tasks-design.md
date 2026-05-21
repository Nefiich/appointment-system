# Handwritten Tasks — Design Spec

**Date:** 2026-05-21
**Source:** Handwritten note (Bosnian) listing 5 tasks + 2 follow-up requests during brainstorming.

## Overview

Seven discrete changes across the appointment booking system. Most are small UI/text tweaks; the largest piece is task 4a (Web Push reminders), which adds new infrastructure (service worker, VAPID keys, a subscriptions table, API routes, and a Supabase scheduled job).

| # | Task | Scope |
|---|---|---|
| 1 | Hide announcement dates from customers + filter by date | Small |
| 2 | Login prompt: "Unesite svoju lozinku" + align step 3 wording | Small |
| 3+6 | Free time picker for admin (10-min granularity + outside hours) | Medium |
| 4a | Web Push reminders (primary reminder channel) | Large |
| 4b | Simplified "Dodaj u kalendar" (explicit choice dialog) | Small |
| 5 | New service "Oblikovanje brade" (15 min, teal) | Trivial |
| 7 | Auto-delete expired announcements via `pg_cron` | Trivial |

---

## Task 1 — Hide announcement dates from customers

**Files**
- `src/app/rezervacije/page.tsx`

**Changes**
1. Remove the date badges from the customer-facing announcement card (lines 305–324). Customers see only the announcement text — no `dd.MM.yyyy - dd.MM.yyyy` ranges.
2. Wire up the unused `today` variable in `fetchAnnouncements` (lines 58–74) so the customer page only fetches announcements where `today` is between `start_date` and `end_date` (inclusive). This makes the date range — which is still set by the admin internally — actually drive visibility.

**Out of scope**
- Admin announcements page (`src/app/admin/announcements/page.tsx`) is **unchanged**. Admin still picks a start/end date when creating announcements.

---

## Task 2 — Login prompt rewording

**File**
- `src/components/UserLoginSteps.tsx`

**Changes**
1. **Step 4 prompt (line 425):** *"Unesite vaš kod koji ste prethodno sačuvali!"* → *"Unesite svoju lozinku"*.
2. **Step 3 alert (lines 392–395):** rewrite to use "lozinka" wording (e.g. *"OVU LOZINKU ĆETE KORISTITI ZA SLJEDEĆE PRIJAVE — ZAPAMTITE JE"*).
3. **Step 3 label (lines 398–400):** *"Molimo vas kreirajte kod koji ćete koristiti…"* → *"Molimo vas kreirajte lozinku koju ćete koristiti za sljedeće prijave"*.

**Rationale:** keeps the whole flow consistent — user creates a "lozinka" in step 3, then enters their "lozinka" in step 4.

---

## Tasks 3 & 6 — Free time picker for admin (10-min granularity + outside hours)

Combined into one change because both are about giving the admin more flexible appointment placement.

**Files**
- `src/app/admin/page.tsx` (appointment-creation modal, `handleAddAppointment` around lines 557–651)
- New migration: `supabase/migrations/<timestamp>-add-created-by-admin-flag.sql`

**Changes**

1. **Replace predefined slot picker with a free time input.** In the admin's appointment-creation modal, swap the `selectedTime` picker (which currently lists predefined slots from `useTimeSlots`) for a native `<input type="time" step="600">` (600 = 10 minutes), backed by a string state. Admin can type or pick any HH:MM — including outside business hours and on 10-minute increments.
2. **Conflict detection.** Keep the existing exact-time duplicate check (`appointment_time === adjustedTime`). Add an additional overlap check: query appointments whose `[appointment_time, appointment_time + duration)` overlaps with `[newTime, newTime + newDuration)`. If overlap exists, show a confirmation dialog ("Termin se preklapa s postojećim. Svejedno dodati?") — soft warning, not a hard block. Admin may intentionally double-book in edge cases.
3. **Customer-facing booking unchanged.** `/rezervacije` still uses `useTimeSlots` with `settings.businessStartTime` / `settings.businessEndTime` / `settings.timeSlotInterval`. The slot generator already filters out time slots that overlap with existing `appointments` — so admin's custom-time bookings naturally block neighbouring customer slots without any extra change.
4. **New column `created_by_admin BOOLEAN DEFAULT FALSE`** on `appointments`. Set to `true` when admin uses the custom-time picker. Used by the admin calendar to visually flag admin-placed/custom-time appointments (e.g. dashed border or small badge). RLS unchanged.

**Migration**
```sql
ALTER TABLE appointments ADD COLUMN created_by_admin BOOLEAN NOT NULL DEFAULT FALSE;
```

**Out of scope**
- No change to the customer-facing `useTimeSlots` hook or business hours settings.

---

## Task 4a — Web Push reminders (primary)

Replaces "Dodaj u kalendar" as the primary reminder channel. Customer grants browser notification permission once; the system pushes reminders 24 hours and 1 hour before each appointment.

### Architecture

```
Customer browser                  Next.js API              Supabase
─────────────────                 ───────────              ──────────
PushPermissionPrompt              /api/push/subscribe ──▶  push_subscriptions
       │                          /api/push/unsubscribe
       ▼
navigator.serviceWorker
  └─ /sw.js  ◀───────── push event ◀──────── Supabase Edge Function
                                              "send-appointment-reminders"
                                              (triggered by pg_cron every 5 min)
                                              reads appointments + push_subscriptions
                                              uses web-push to deliver
```

### Pieces

**1. Service worker** — new `public/sw.js`. Handles `push` event, calls `self.registration.showNotification(title, options)` with the payload sent by the Edge Function. Also handles `notificationclick` to focus `/rezervacije`.

**2. VAPID keys** — generated once with `npx web-push generate-vapid-keys` (committed setup notes in `docs/`). Public key in `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, private key in `VAPID_PRIVATE_KEY` (set in `.env.local` and as Supabase Edge Function secrets).

**3. Client subscription helper** — new `src/lib/push-client.ts` with `subscribeUserToPush()` and `unsubscribeUserFromPush()`. Handles service-worker registration, `pushManager.subscribe()` with VAPID public key, and POSTs the resulting subscription to `/api/push/subscribe`.

**4. Subscriptions table** — new migration:
```sql
CREATE TABLE push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own subscriptions"
  ON push_subscriptions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**5. Reminder bookkeeping** — new migration:
```sql
ALTER TABLE appointments
  ADD COLUMN reminder_sent_24h BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN reminder_sent_1h  BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION reset_reminder_flags_on_reschedule()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.appointment_time IS DISTINCT FROM OLD.appointment_time THEN
    NEW.reminder_sent_24h := FALSE;
    NEW.reminder_sent_1h  := FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointments_reset_reminder_flags
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION reset_reminder_flags_on_reschedule();
```
The booleans prevent duplicate sends when the cron tick misfires or overlaps. The trigger handles reschedule: if `appointment_time` changes, both flags reset so the new time gets its own reminders.

**6. API routes**
- `POST /api/push/subscribe` → upsert into `push_subscriptions` keyed by `endpoint`.
- `POST /api/push/unsubscribe` → delete by `endpoint`.

Both use the server Supabase client (`src/lib/utils/supabase/server.ts`) and require an authenticated session.

**7. Permission UX** — new component `src/components/PushPermissionPrompt.tsx`. Rendered on `/rezervacije` *only when* the user has ≥ 1 upcoming appointment **and** `Notification.permission === 'default'`. Shows a small card: *"Želite li primati podsjetnike za termin?"* with `Da, omogući` / `Ne sada` buttons. `Da` calls `subscribeUserToPush()`; `Ne sada` sets a `localStorage` flag to suppress for 7 days.

**8. Sender (Supabase Edge Function)** — new `supabase/functions/send-appointment-reminders/index.ts`. Logic:
1. Query `appointments` joined with `users` + `push_subscriptions` where:
   - 24h window: `reminder_sent_24h = false AND appointment_time BETWEEN now() + 23h55m AND now() + 24h05m`
   - 1h window: `reminder_sent_1h  = false AND appointment_time BETWEEN now() + 55m  AND now() + 65m`
2. For each, call `webpush.sendNotification(subscription, JSON.stringify({ title, body, url }))` using the `web-push` npm package (importable in Edge Functions via npm specifier).
3. On success, flip the appropriate `reminder_sent_*` flag. On `410 Gone`, delete the dead subscription.

**9. Cron trigger** — new migration:
```sql
SELECT cron.schedule(
  'send-appointment-reminders',
  '*/5 * * * *',
  $$SELECT net.http_post(
    url := 'https://<project>.supabase.co/functions/v1/send-appointment-reminders',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
  )$$
);
```
(Project URL and service role key wired in during deploy.)

### Reminder content

- **24h**: title *"Podsjetnik za termin sutra"*, body *"<Service> u <HH:MM>"*.
- **1h**: title *"Vaš termin je za 1 sat"*, body *"<Service> u <HH:MM>"*.
- Click action navigates to `/rezervacije`.

---

## Task 4b — Simplified "Dodaj u kalendar" (fallback)

**File**
- `src/components/UserAppointments.tsx` — replace `handleAddToCalendar` (lines 90–162).
- New: `src/components/CalendarChoiceDialog.tsx`.

**Change**
Replace the UA-sniffing (`/Android/i.test(navigator.userAgent)`, etc.) with an explicit choice dialog opened from the existing button. Three options:

1. **Google Calendar** — opens `https://calendar.google.com/calendar/render?action=TEMPLATE&...` in a new tab. Works on every device.
2. **Apple Calendar (iOS / macOS)** — downloads the existing `.ics` file. Safari opens it directly in Calendar.
3. **Outlook / drugo** — also downloads the `.ics` (Outlook web and desktop both consume `.ics`).

The button label changes from *"Dodaj u kalendar"* to just *"Kalendar"* and visually demotes (lighter weight) — push notifications are now the primary path.

`generateCalendarFile` and the Google-URL formatting helpers stay; we just stop guessing which one to invoke.

---

## Task 5 — Add "Oblikovanje brade" service (15 min, teal)

**File**
- New migration: `supabase/migrations/<timestamp>-add-oblikovanje-brade.sql`

**Migration**
```sql
INSERT INTO services (name, name_bs, duration_minutes, color, display_order, is_active)
VALUES (
  'Beard styling',
  'Oblikovanje brade',
  15,
  'teal',
  (SELECT COALESCE(MAX(display_order), -1) + 1 FROM services),
  TRUE
);
```

The `services` table is already dynamic and consumed by `useAppointmentSettings` (which `/rezervacije` and `/admin` both use), so this row will surface automatically with no client code changes.

---

## Task 7 — Auto-delete expired announcements

**File**
- New migration: `supabase/migrations/<timestamp>-auto-delete-expired-announcements.sql`

**Migration**
```sql
SELECT cron.schedule(
  'delete-expired-announcements',
  '0 3 * * *',
  $$DELETE FROM announcements WHERE end_date < CURRENT_DATE$$
);
```

Runs daily at 03:00 server time. Announcements remain available through the whole of their `end_date` and are cleaned up the following morning. Hard delete — no archive.

---

## Migration ordering

Order doesn't matter between most migrations, but for clarity the suggested order is:

1. `add-created-by-admin-flag.sql` (tasks 3+6)
2. `add-push-subscriptions.sql` (task 4a)
3. `add-reminder-sent-flags.sql` (task 4a)
4. `schedule-send-reminders-cron.sql` (task 4a — depends on Edge Function deploy)
5. `add-oblikovanje-brade.sql` (task 5)
6. `schedule-delete-expired-announcements.sql` (task 7)

Edge Function `send-appointment-reminders` must be deployed before migration 4 runs (otherwise the cron POSTs to a 404 every 5 minutes).

---

## Environment variables (new)

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<generated>
VAPID_PRIVATE_KEY=<generated>            # also as Supabase Edge Function secret
VAPID_SUBJECT=mailto:emin.nefic@gmail.com
```

## Out of scope (explicit)

- Customer-facing time slot interval, business hours, or service selection UX — all unchanged.
- Native mobile push (iOS/Android apps) — only Web Push.
- SMS reminder fallback when push permission is denied — not in this iteration.
- Reminder timing customization per user — fixed at 24h + 1h.
- Soft-delete / archive of expired announcements — hard delete.
- Audit log of admin-placed appointments — only the `created_by_admin` flag.
