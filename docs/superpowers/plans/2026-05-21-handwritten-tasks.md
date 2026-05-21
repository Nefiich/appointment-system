# Handwritten Tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the seven changes captured in `docs/superpowers/specs/2026-05-21-handwritten-tasks-design.md`.

**Architecture:** Most tasks are localised UI/text changes or one-row SQL migrations. The exception is Task 4a (Web Push reminders), which adds a service worker, VAPID-keyed push subscriptions, an authenticated subscribe/unsubscribe API, and a Supabase Edge Function triggered by `pg_cron` to send reminders 24h and 1h before each appointment.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Supabase (Postgres + Auth + Edge Functions + pg_cron), Web Push (VAPID), shadcn/ui + Tailwind, Jest + React Testing Library, `web-push` npm package.

**Ordering rationale:** Trivial migrations and text changes go first so they can ship as a quick first PR / commit batch. The medium admin-picker work goes next. Web Push (the only large piece) is broken into many sub-tasks and ordered last.

**Test discipline:** This codebase has minimal existing test coverage (only `src/components/ReactQueryExample.test.tsx`). Apply TDD where the change has real logic to test — date filtering, conflict detection, push subscription/unsubscription, the reminder sender. Skip TDD for pure text/wording changes; verify those by running the dev server. Each task notes which discipline applies.

---

## File Map

**New files**
- `supabase/migrations/20260521_0001_add_oblikovanje_brade.sql`
- `supabase/migrations/20260521_0002_schedule_delete_expired_announcements.sql`
- `supabase/migrations/20260521_0003_add_created_by_admin_flag.sql`
- `supabase/migrations/20260521_0004_add_push_subscriptions.sql`
- `supabase/migrations/20260521_0005_add_reminder_sent_flags.sql`
- `supabase/migrations/20260521_0006_schedule_send_reminders_cron.sql`
- `public/sw.js`
- `src/lib/push-client.ts`
- `src/lib/push-client.test.ts`
- `src/app/api/push/subscribe/route.ts`
- `src/app/api/push/unsubscribe/route.ts`
- `src/components/PushPermissionPrompt.tsx`
- `src/components/CalendarChoiceDialog.tsx`
- `supabase/functions/send-appointment-reminders/index.ts`

**Modified files**
- `src/app/rezervacije/page.tsx` (Tasks 1, 4a)
- `src/components/UserLoginSteps.tsx` (Task 2)
- `src/app/admin/page.tsx` (Tasks 3+6)
- `src/components/UserAppointments.tsx` (Task 4b)
- `package.json` (add `web-push`)
- `.env.local` (VAPID env vars — not committed; document in `README.md` or spec)

---

## Task 1: Add "Oblikovanje brade" service (Task #5 in spec)

**Files:**
- Create: `supabase/migrations/20260521_0001_add_oblikovanje_brade.sql`

**Discipline:** No automated test — verified by running the migration and seeing the row in `/admin/services`.

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260521_0001_add_oblikovanje_brade.sql

INSERT INTO services (name, name_bs, duration_minutes, color, display_order, is_active)
VALUES (
  'Beard styling',
  'Oblikovanje brade',
  15,
  'teal',
  (SELECT COALESCE(MAX(display_order), -1) + 1 FROM services),
  TRUE
)
ON CONFLICT DO NOTHING;
```

- [ ] **Step 2: Apply the migration**

Run against the Supabase project (either via `supabase db push` if Supabase CLI is linked, or paste into the Supabase SQL editor).

Expected: 1 row inserted, no errors.

- [ ] **Step 3: Verify in the app**

Run: `pnpm dev` and open `http://localhost:3000/admin/services`.
Expected: "Oblikovanje brade" appears in the table with duration 15 min, teal color, Active.

Also open `/rezervacije` and verify the new service appears in the service picker.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260521_0001_add_oblikovanje_brade.sql
git commit -m "feat: add Oblikovanje brade service (15 min)"
```

---

## Task 2: Auto-delete expired announcements (Task #7 in spec)

**Files:**
- Create: `supabase/migrations/20260521_0002_schedule_delete_expired_announcements.sql`

**Discipline:** No automated test — verified by inserting a backdated announcement and confirming the cron job runs.

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260521_0002_schedule_delete_expired_announcements.sql

-- pg_cron should already be enabled in Supabase. If not:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'delete-expired-announcements',
  '0 3 * * *',
  $$DELETE FROM announcements WHERE end_date < CURRENT_DATE$$
);
```

- [ ] **Step 2: Apply the migration**

Run in the Supabase SQL editor. Expected: one row returned (the cron job id).

- [ ] **Step 3: Manually verify by simulating**

In the SQL editor, run a dry-run to confirm the predicate works:

```sql
SELECT id, description, end_date
  FROM announcements
 WHERE end_date < CURRENT_DATE;
```

Expected: returns any past-dated announcements (likely none in a fresh DB). Then run the actual `DELETE` once to clean up any pre-existing expired rows:

```sql
DELETE FROM announcements WHERE end_date < CURRENT_DATE;
```

- [ ] **Step 4: Verify the cron job is registered**

```sql
SELECT jobname, schedule, command FROM cron.job WHERE jobname = 'delete-expired-announcements';
```

Expected: one row showing `0 3 * * *` and the DELETE statement.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260521_0002_schedule_delete_expired_announcements.sql
git commit -m "feat: auto-delete expired announcements daily at 03:00"
```

---

## Task 3: Hide announcement dates from customers (Task #1 in spec)

**Files:**
- Modify: `src/app/rezervacije/page.tsx` (lines ~57–74 fetchAnnouncements, ~305–324 announcement card)

**Discipline:** Light TDD — the date-filter is real logic. Wording change of the card is verified visually.

- [ ] **Step 1: Write the failing filter test**

Create `src/app/rezervacije/announcements.test.ts`:

```ts
import { filterActiveAnnouncements } from './announcements-utils';

describe('filterActiveAnnouncements', () => {
  const today = new Date('2026-05-21T12:00:00');

  it('includes an announcement whose range contains today', () => {
    expect(
      filterActiveAnnouncements(
        [{ id: 1, start_date: '2026-05-20', end_date: '2026-05-22', description: 'x' }],
        today,
      ),
    ).toHaveLength(1);
  });

  it('excludes announcements that ended yesterday', () => {
    expect(
      filterActiveAnnouncements(
        [{ id: 1, start_date: '2026-05-10', end_date: '2026-05-20', description: 'x' }],
        today,
      ),
    ).toHaveLength(0);
  });

  it('excludes announcements that start tomorrow', () => {
    expect(
      filterActiveAnnouncements(
        [{ id: 1, start_date: '2026-05-22', end_date: '2026-05-25', description: 'x' }],
        today,
      ),
    ).toHaveLength(0);
  });

  it('includes announcement on its start_date', () => {
    expect(
      filterActiveAnnouncements(
        [{ id: 1, start_date: '2026-05-21', end_date: '2026-05-25', description: 'x' }],
        today,
      ),
    ).toHaveLength(1);
  });

  it('includes announcement on its end_date', () => {
    expect(
      filterActiveAnnouncements(
        [{ id: 1, start_date: '2026-05-15', end_date: '2026-05-21', description: 'x' }],
        today,
      ),
    ).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm test src/app/rezervacije/announcements.test.ts`
Expected: FAIL — `filterActiveAnnouncements is not a function` / file not found.

- [ ] **Step 3: Implement `filterActiveAnnouncements`**

Create `src/app/rezervacije/announcements-utils.ts`:

```ts
export interface Announcement {
  id: number;
  start_date: string;
  end_date: string;
  description: string;
}

export function filterActiveAnnouncements(
  announcements: Announcement[],
  today: Date,
): Announcement[] {
  const dayStart = new Date(today);
  dayStart.setHours(0, 0, 0, 0);

  return announcements.filter((a) => {
    const start = new Date(a.start_date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(a.end_date);
    end.setHours(23, 59, 59, 999);
    return dayStart >= start && dayStart <= end;
  });
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm test src/app/rezervacije/announcements.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Wire the filter into the page**

Modify `src/app/rezervacije/page.tsx` `fetchAnnouncements` (lines ~57–74):

```ts
// Replace the existing fetchAnnouncements with:
const fetchAnnouncements = async () => {
  try {
    const { data, error } = await supabase.from('announcements').select('*');
    if (error) {
      console.error('Error fetching announcements:', error);
      return;
    }
    setAnnouncements(filterActiveAnnouncements(data || [], new Date()));
  } catch (err) {
    console.error('Error in fetchAnnouncements:', err);
  }
};
```

Add the import at the top:

```ts
import { filterActiveAnnouncements } from './announcements-utils';
```

- [ ] **Step 6: Remove the date badges from the customer card**

In `src/app/rezervacije/page.tsx` lines ~305–324, replace the announcement card body so the customer no longer sees the `dd.MM.yyyy - dd.MM.yyyy` range:

```tsx
{announcements.length > 0 && (
  <div className="mx-5 mb-6 rounded-md border border-amber-200 bg-amber-50 p-4">
    <h2 className="mb-2 font-semibold text-amber-800">
      Važna obavještenja
    </h2>
    <div className="space-y-3">
      {announcements.map((announcement) => (
        <div key={announcement.id} className="text-sm">
          <p className="text-gray-700">{announcement.description}</p>
        </div>
      ))}
    </div>
  </div>
)}
```

Also remove the now-unused `format` import if no other callsite uses it (keep it if other code in this file does).

- [ ] **Step 7: Manual verification**

Run: `pnpm dev` → open `/rezervacije`.

1. Insert two test announcements via `/admin/announcements`: one active (today inside range), one past (end_date < today).
2. Reload `/rezervacije` — only the active announcement appears, with no date badges.

- [ ] **Step 8: Commit**

```bash
git add src/app/rezervacije/announcements-utils.ts src/app/rezervacije/announcements.test.ts src/app/rezervacije/page.tsx
git commit -m "feat: hide announcement dates from customers, filter by active range"
```

---

## Task 4: Login prompt rewording (Task #2 in spec)

**Files:**
- Modify: `src/components/UserLoginSteps.tsx` (lines 392–395, 398–400, 425)

**Discipline:** No automated test — visual verification.

- [ ] **Step 1: Replace the step 3 alert text**

In `src/components/UserLoginSteps.tsx` find the block at lines 390–395:

```tsx
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertDescription>
    OVAJ KOD JE ZA UPOTREBU U BUDUĆNOSTI, ZAPAMTITE GA
  </AlertDescription>
</Alert>
```

Replace with:

```tsx
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertDescription>
    OVU LOZINKU ĆETE KORISTITI ZA SLJEDEĆE PRIJAVE — ZAPAMTITE JE
  </AlertDescription>
</Alert>
```

- [ ] **Step 2: Replace the step 3 label**

Find lines 396–401:

```tsx
<div className="space-y-2">
  <Label>
    Molimo vas kreirajte kod koji cete koristiti u budućnosti za
    prijave!
  </Label>
</div>
```

Replace with:

```tsx
<div className="space-y-2">
  <Label>
    Molimo vas kreirajte lozinku koju ćete koristiti za sljedeće prijave.
  </Label>
</div>
```

- [ ] **Step 3: Replace the step 4 label**

Find line 425:

```tsx
<Label>Unesite vaš kod koji ste prethodno sačuvali!</Label>
```

Replace with:

```tsx
<Label>Unesite svoju lozinku</Label>
```

- [ ] **Step 4: Manual verification**

Run: `pnpm dev` → open `/login`.

1. Enter a phone number for an existing user who has set their password → step 4 shows "Unesite svoju lozinku".
2. Enter a phone number for a new user, complete OTP, reach step 3 → alert and label both use "lozinka" wording.

- [ ] **Step 5: Commit**

```bash
git add src/components/UserLoginSteps.tsx
git commit -m "feat: use 'lozinka' wording in login PIN steps"
```

---

## Task 5: Admin free time picker + outside-hours booking (Tasks #3 and #6 in spec)

**Files:**
- Create: `supabase/migrations/20260521_0003_add_created_by_admin_flag.sql`
- Create: `src/lib/appointment-conflicts.ts`
- Create: `src/lib/appointment-conflicts.test.ts`
- Modify: `src/app/admin/page.tsx` (`handleAddAppointment` + the time picker UI inside the create-appointment modal)

**Discipline:** TDD for the conflict-detection helper. Manual verification for the picker UI.

- [ ] **Step 1: Create the migration**

```sql
-- supabase/migrations/20260521_0003_add_created_by_admin_flag.sql

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS created_by_admin BOOLEAN NOT NULL DEFAULT FALSE;
```

Apply via Supabase SQL editor.

- [ ] **Step 2: Write the conflict-detection test**

Create `src/lib/appointment-conflicts.test.ts`:

```ts
import { findOverlappingAppointments, Appointment } from './appointment-conflicts';

const make = (timeIso: string, duration: number, id = 1): Appointment => ({
  id,
  appointment_time: timeIso,
  duration_minutes: duration,
});

describe('findOverlappingAppointments', () => {
  it('finds an appointment whose range overlaps the new range', () => {
    const existing = [make('2026-05-21T09:00:00Z', 30)];
    const result = findOverlappingAppointments(existing, '2026-05-21T09:10:00Z', 15);
    expect(result).toHaveLength(1);
  });

  it('ignores non-overlapping appointments', () => {
    const existing = [make('2026-05-21T09:00:00Z', 30)];
    const result = findOverlappingAppointments(existing, '2026-05-21T09:30:00Z', 15);
    expect(result).toHaveLength(0);
  });

  it('treats back-to-back appointments as non-overlapping', () => {
    const existing = [make('2026-05-21T09:00:00Z', 30)];
    // existing ends at 09:30; new starts at exactly 09:30 -> no overlap
    const result = findOverlappingAppointments(existing, '2026-05-21T09:30:00Z', 15);
    expect(result).toHaveLength(0);
  });

  it('detects when the new appointment fully contains an existing one', () => {
    const existing = [make('2026-05-21T09:05:00Z', 10)];
    const result = findOverlappingAppointments(existing, '2026-05-21T09:00:00Z', 30);
    expect(result).toHaveLength(1);
  });

  it('detects when the new appointment is fully inside an existing one', () => {
    const existing = [make('2026-05-21T09:00:00Z', 60)];
    const result = findOverlappingAppointments(existing, '2026-05-21T09:20:00Z', 10);
    expect(result).toHaveLength(1);
  });

  it('excludes the appointment being edited when an ignoreId is given', () => {
    const existing = [make('2026-05-21T09:00:00Z', 30, 42)];
    const result = findOverlappingAppointments(
      existing,
      '2026-05-21T09:10:00Z',
      15,
      42,
    );
    expect(result).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test src/lib/appointment-conflicts.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the helper**

Create `src/lib/appointment-conflicts.ts`:

```ts
export interface Appointment {
  id: number;
  appointment_time: string;
  duration_minutes: number;
}

export function findOverlappingAppointments(
  existing: Appointment[],
  newStartIso: string,
  newDurationMinutes: number,
  ignoreId?: number,
): Appointment[] {
  const newStart = new Date(newStartIso).getTime();
  const newEnd = newStart + newDurationMinutes * 60_000;

  return existing.filter((a) => {
    if (ignoreId !== undefined && a.id === ignoreId) return false;
    const start = new Date(a.appointment_time).getTime();
    const end = start + a.duration_minutes * 60_000;
    return start < newEnd && end > newStart;
  });
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test src/lib/appointment-conflicts.test.ts`
Expected: PASS — 6 tests.

- [ ] **Step 6: Replace the admin modal's time picker**

In `src/app/admin/page.tsx`, locate the existing time-picker UI inside the create-appointment modal (search for `selectedTime` state and the slot list rendered from `useTimeSlots`). Replace the slot-list block with a free time input:

```tsx
{/* Free-form time picker for admin — supports 10-min increments and outside business hours */}
<div className="space-y-2">
  <label className="block text-sm font-medium">Vrijeme</label>
  <input
    type="time"
    step={600}
    value={customTime}
    onChange={(e) => setCustomTime(e.target.value)}
    className="w-full rounded-md border border-gray-300 px-3 py-2"
  />
  <p className="text-xs text-muted-foreground">
    Možete unijeti bilo koje vrijeme (uključujući van radnog vremena ili u 10-minutnim intervalima).
  </p>
</div>
```

Add the state declaration near the other modal state in the component:

```tsx
const [customTime, setCustomTime] = useState<string>('');
```

Reset it when the modal closes (alongside `setSelectedTime(null)` and the other resets in `handleAddAppointment`):

```tsx
setCustomTime('');
```

- [ ] **Step 7: Update `handleAddAppointment` to consume the free-form time**

Replace the existing time-parsing block (lines ~569–574) and conflict check (lines ~581–595) with:

```ts
// Validate the free-form time string
if (!customTime || !/^\d{2}:\d{2}$/.test(customTime)) {
  setAuthError('Unesite validno vrijeme u HH:MM formatu.');
  return;
}

const [hours, minutes] = customTime.split(':').map(Number);

// Create appointment time
const appointmentTime = new Date(appointmentDate);
appointmentTime.setHours(hours, minutes, 0, 0);

// Adjust for timezone before storing
const timezoneOffset = appointmentTime.getTimezoneOffset();
const adjustedTime = new Date(appointmentTime);
adjustedTime.setMinutes(adjustedTime.getMinutes() - timezoneOffset);

// Compute duration for the chosen service
const newDuration = getServiceDuration(selectedService);

// Fetch same-day appointments to check for overlap
const dayStart = new Date(appointmentDate);
dayStart.setHours(0, 0, 0, 0);
const dayEnd = new Date(appointmentDate);
dayEnd.setHours(23, 59, 59, 999);

const { data: sameDay, error: sameDayError } = await supabase
  .from('appointments')
  .select('id, appointment_time, service')
  .gte('appointment_time', dayStart.toISOString())
  .lte('appointment_time', dayEnd.toISOString());

if (sameDayError) {
  setAuthError(`Greška pri provjeri preklapanja: ${sameDayError.message}`);
  return;
}

const overlapping = findOverlappingAppointments(
  (sameDay || []).map((a) => ({
    id: a.id,
    appointment_time: a.appointment_time,
    duration_minutes: getServiceDuration(a.service),
  })),
  adjustedTime.toISOString(),
  newDuration,
);

if (overlapping.length > 0) {
  const confirmed = window.confirm(
    'Termin se preklapa s postojećim. Svejedno dodati?',
  );
  if (!confirmed) return;
}
```

Then update the `.insert([...])` to include `created_by_admin`:

```ts
const { data, error } = await supabase
  .from('appointments')
  .insert([
    {
      name: name,
      phone_number: phone,
      service: selectedService,
      appointment_time: adjustedTime.toISOString(),
      user_id: (await supabase.auth.getUser()).data.user?.id,
      created_by_admin: true,
    },
  ])
  .select();
```

Add the import at the top of `src/app/admin/page.tsx`:

```ts
import { findOverlappingAppointments } from '@/lib/appointment-conflicts';
```

- [ ] **Step 8: Run all tests**

Run: `pnpm test`
Expected: all existing tests + the 6 new conflict tests pass.

Run: `pnpm type-check`
Expected: no errors.

- [ ] **Step 9: Manual verification**

Run: `pnpm dev` and open `/admin`.

1. Open the create-appointment modal. Confirm a `<input type="time">` shows instead of a slot list.
2. Enter `07:00` (before business hours), pick a service, save → appointment lands at 07:00.
3. Enter `09:10`, pick a 15-min service, save → appointment lands at 09:10.
4. Try to add another appointment at `09:15` with a 15-min service → confirmation dialog appears warning about overlap; cancel to abort, OK to force-add.
5. Open `/rezervacije` as a customer and confirm the standard 30-min slots near 09:00 / 09:30 are correctly removed because of the overlapping admin appointment.

- [ ] **Step 10: Commit**

```bash
git add supabase/migrations/20260521_0003_add_created_by_admin_flag.sql \
        src/lib/appointment-conflicts.ts src/lib/appointment-conflicts.test.ts \
        src/app/admin/page.tsx
git commit -m "feat: free-form admin time picker with overlap detection and outside-hours support"
```

---

## Task 6: Simplified "Dodaj u kalendar" choice dialog (Task #4b in spec)

**Files:**
- Create: `src/components/CalendarChoiceDialog.tsx`
- Modify: `src/components/UserAppointments.tsx` (replace `handleAddToCalendar` UA-sniffing with the dialog)

**Discipline:** No automated test — the helper logic is unchanged; only the chooser is new. Verified by running the dev server and clicking each option.

- [ ] **Step 1: Create the dialog component**

Create `src/components/CalendarChoiceDialog.tsx`:

```tsx
'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface CalendarPayload {
  serviceName: string;
  description: string;
  startTime: Date;
  endTime: Date;
  filename: string;
  icsContent: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  payload: CalendarPayload | null;
}

function formatForGoogle(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function buildGoogleCalendarUrl(p: CalendarPayload): string {
  const dates = `${formatForGoogle(p.startTime)}/${formatForGoogle(p.endTime)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: p.serviceName,
    dates,
    details: p.description,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function downloadIcs(p: CalendarPayload) {
  const blob = new Blob([p.icsContent], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = p.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function CalendarChoiceDialog({ open, onClose, payload }: Props) {
  if (!payload) return null;

  const handleGoogle = () => {
    window.open(buildGoogleCalendarUrl(payload), '_blank');
    onClose();
  };

  const handleApple = () => {
    downloadIcs(payload);
    onClose();
  };

  const handleOutlook = () => {
    downloadIcs(payload);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dodaj u kalendar</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button variant="outline" onClick={handleGoogle}>
            Google Calendar
          </Button>
          <Button variant="outline" onClick={handleApple}>
            Apple Calendar (iOS / macOS)
          </Button>
          <Button variant="outline" onClick={handleOutlook}>
            Outlook / drugo
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Otkaži
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

If the project's `Dialog` shadcn primitive is not yet installed, install it:

```bash
pnpm dlx shadcn@latest add dialog
```

- [ ] **Step 2: Replace `handleAddToCalendar` in `UserAppointments.tsx`**

Modify `src/components/UserAppointments.tsx`:

1. Add state for the dialog at the top of the component:

```tsx
import { CalendarChoiceDialog, CalendarPayload } from './CalendarChoiceDialog';
// ...
const [calendarPayload, setCalendarPayload] = useState<CalendarPayload | null>(null);
```

2. Replace the existing `handleAddToCalendar` with a builder that creates the payload and opens the dialog:

```tsx
const handleAddToCalendar = (appointment) => {
  const startTime = new Date(appointment.appointment_time);
  const endTime = new Date(startTime);
  const duration = (() => {
    const id =
      typeof appointment.service === 'string'
        ? parseInt(appointment.service, 10)
        : appointment.service;
    const durations = { 0: 10, 1: 10, 2: 15, 3: 20, 4: 15, 5: 30, 6: 30 };
    return durations[id] || 30;
  })();
  endTime.setMinutes(endTime.getMinutes() + duration);

  const serviceName = getServiceName(appointment.service.toString());
  const description = `Termin za ${serviceName}`;
  const icsContent = generateCalendarFile(appointment);
  const filename = `termin-${format(new Date(appointment.appointment_time), 'dd-MM-yyyy')}.ics`;

  setCalendarPayload({
    serviceName,
    description,
    startTime,
    endTime,
    filename,
    icsContent,
  });
};
```

(`generateCalendarFile` already exists in this file — keep it.)

3. Mount the dialog at the end of the component's return:

```tsx
<CalendarChoiceDialog
  open={calendarPayload !== null}
  onClose={() => setCalendarPayload(null)}
  payload={calendarPayload}
/>
```

4. Change the button label from `Dodaj u kalendar` to `Kalendar` and demote its visual weight (drop the `font-medium` to `font-normal`, keep the icon).

- [ ] **Step 3: Run type-check and tests**

Run: `pnpm type-check && pnpm test`
Expected: no errors, all existing tests pass.

- [ ] **Step 4: Manual verification**

Run: `pnpm dev` and open `/rezervacije` as a customer with at least one upcoming appointment.

1. Click "Kalendar" → dialog opens with 3 options.
2. Click "Google Calendar" → opens GCal in a new tab with pre-filled event.
3. Click "Apple Calendar" → downloads `.ics` file with correct event.
4. Click "Outlook / drugo" → downloads `.ics` file.
5. Click "Otkaži" → dialog closes.

- [ ] **Step 5: Commit**

```bash
git add src/components/CalendarChoiceDialog.tsx src/components/UserAppointments.tsx
git commit -m "feat: replace UA-sniffing calendar add with explicit choice dialog"
```

---

## Task 7: Web Push reminders (Task #4a in spec)

This is the largest task. Broken into 7 sub-tasks (A–G), each producing a working slice.

### Task 7A: Install `web-push` and add VAPID env scaffolding

**Files:**
- Modify: `package.json`
- Document in: `README.md` or `.env.example`

- [ ] **Step 1: Install `web-push`**

```bash
pnpm add web-push
pnpm add -D @types/web-push
```

- [ ] **Step 2: Generate VAPID keys**

```bash
npx web-push generate-vapid-keys
```

Save the output. You'll get a `publicKey` and `privateKey`.

- [ ] **Step 3: Add the env vars to `.env.local`** (not committed)

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<publicKey from step 2>
VAPID_PRIVATE_KEY=<privateKey from step 2>
VAPID_SUBJECT=mailto:emin.nefic@gmail.com
```

- [ ] **Step 4: Document the new env vars**

Update `CLAUDE.md`'s "Environment Variables" section to include the three new vars. Do NOT commit actual key values.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml CLAUDE.md
git commit -m "chore: add web-push dependency and document VAPID env vars"
```

### Task 7B: `push_subscriptions` table migration

**Files:**
- Create: `supabase/migrations/20260521_0004_add_push_subscriptions.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260521_0004_add_push_subscriptions.sql

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own subscriptions"
  ON push_subscriptions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON push_subscriptions TO authenticated;
GRANT USAGE ON SEQUENCE push_subscriptions_id_seq TO authenticated;
```

- [ ] **Step 2: Apply via Supabase SQL editor**

Expected: table created, RLS enabled, policy exists.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260521_0004_add_push_subscriptions.sql
git commit -m "feat: add push_subscriptions table with RLS"
```

### Task 7C: Reminder bookkeeping migration + reschedule trigger

**Files:**
- Create: `supabase/migrations/20260521_0005_add_reminder_sent_flags.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260521_0005_add_reminder_sent_flags.sql

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS reminder_sent_24h BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_sent_1h  BOOLEAN NOT NULL DEFAULT FALSE;

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

DROP TRIGGER IF EXISTS appointments_reset_reminder_flags ON appointments;

CREATE TRIGGER appointments_reset_reminder_flags
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION reset_reminder_flags_on_reschedule();
```

- [ ] **Step 2: Apply via Supabase SQL editor**

- [ ] **Step 3: Test the trigger manually**

```sql
-- Pick any test appointment id
UPDATE appointments SET reminder_sent_24h = TRUE, reminder_sent_1h = TRUE WHERE id = <id>;
SELECT reminder_sent_24h, reminder_sent_1h FROM appointments WHERE id = <id>;
-- Both should be true

UPDATE appointments SET appointment_time = appointment_time + INTERVAL '1 hour' WHERE id = <id>;
SELECT reminder_sent_24h, reminder_sent_1h FROM appointments WHERE id = <id>;
-- Both should now be false (trigger reset them)

-- restore original time
UPDATE appointments SET appointment_time = appointment_time - INTERVAL '1 hour' WHERE id = <id>;
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260521_0005_add_reminder_sent_flags.sql
git commit -m "feat: add reminder_sent flags and reschedule-reset trigger"
```

### Task 7D: Service worker + client-side subscription helper

**Files:**
- Create: `public/sw.js`
- Create: `src/lib/push-client.ts`
- Create: `src/lib/push-client.test.ts`

- [ ] **Step 1: Write the service worker**

Create `public/sw.js`:

```js
self.addEventListener('push', (event) => {
  let payload = { title: 'Podsjetnik za termin', body: '', url: '/rezervacije' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (err) {
    // payload defaults
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/ico.png',
      badge: '/ico.png',
      data: { url: payload.url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/rezervacije';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.includes(targetUrl) && 'focus' in w) return w.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    }),
  );
});
```

- [ ] **Step 2: Write the client helper test**

Create `src/lib/push-client.test.ts`:

```ts
import { urlBase64ToUint8Array } from './push-client';

describe('urlBase64ToUint8Array', () => {
  it('decodes a known VAPID-style base64url string to a Uint8Array', () => {
    const result = urlBase64ToUint8Array('BNbXq7-l-_2KhSjt-K7m9w');
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles strings that need padding', () => {
    expect(() => urlBase64ToUint8Array('abc')).not.toThrow();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test src/lib/push-client.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Write the client helper**

Create `src/lib/push-client.ts`:

```ts
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  return navigator.serviceWorker.register('/sw.js');
}

export async function subscribeUserToPush(
  vapidPublicKey: string,
): Promise<PushSubscription | null> {
  const reg = await registerServiceWorker();
  if (!reg) return null;

  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;

  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription.toJSON()),
  });
  if (!res.ok) {
    await subscription.unsubscribe();
    throw new Error(`Subscribe failed: ${res.status}`);
  }
  return subscription;
}

export async function unsubscribeUserFromPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const subscription = await reg.pushManager.getSubscription();
  if (!subscription) return;

  await fetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  await subscription.unsubscribe();
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test src/lib/push-client.test.ts`
Expected: PASS — 2 tests.

- [ ] **Step 6: Commit**

```bash
git add public/sw.js src/lib/push-client.ts src/lib/push-client.test.ts
git commit -m "feat: add service worker and push client helpers"
```

### Task 7E: Subscribe/unsubscribe API routes

**Files:**
- Create: `src/app/api/push/subscribe/route.ts`
- Create: `src/app/api/push/unsubscribe/route.ts`

- [ ] **Step 1: Write the subscribe route**

Create `src/app/api/push/subscribe/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/utils/supabase/server';

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const endpoint = body.endpoint as string | undefined;
  const keys = body.keys as { p256dh?: string; auth?: string } | undefined;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription payload' }, { status: 400 });
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      { onConflict: 'endpoint' },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Write the unsubscribe route**

Create `src/app/api/push/unsubscribe/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/utils/supabase/server';

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { endpoint } = await request.json();
  if (!endpoint) {
    return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm type-check`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/push
git commit -m "feat: add /api/push/subscribe and /api/push/unsubscribe routes"
```

### Task 7F: `PushPermissionPrompt` component + wire into `/rezervacije`

**Files:**
- Create: `src/components/PushPermissionPrompt.tsx`
- Modify: `src/app/rezervacije/page.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/PushPermissionPrompt.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { subscribeUserToPush } from '@/lib/push-client';

const DISMISS_KEY = 'push-prompt-dismissed-until';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface Props {
  hasUpcomingAppointment: boolean;
}

export function PushPermissionPrompt({ hasUpcomingAppointment }: Props) {
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!hasUpcomingAppointment) return;
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'default') return;

    const dismissedUntil = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
    if (Date.now() < dismissedUntil) return;

    setShow(true);
  }, [hasUpcomingAppointment]);

  if (!show) return null;

  const handleEnable = async () => {
    setSubmitting(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setShow(false);
        return;
      }
      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapid) throw new Error('VAPID public key not configured');
      await subscribeUserToPush(vapid);
      setShow(false);
    } catch (err) {
      console.error('Failed to enable push:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DURATION_MS));
    setShow(false);
  };

  return (
    <div className="mx-5 mb-4 rounded-md border border-indigo-200 bg-indigo-50 p-4">
      <p className="mb-3 text-sm text-indigo-900">
        Želite li primati podsjetnike za termin? Poslat ćemo vam notifikaciju 1 dan i 1 sat prije termina.
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleEnable} disabled={submitting}>
          {submitting ? 'Učitavanje...' : 'Da, omogući'}
        </Button>
        <Button size="sm" variant="ghost" onClick={handleDismiss} disabled={submitting}>
          Ne sada
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `/rezervacije`**

Modify `src/app/rezervacije/page.tsx`. Add the import:

```ts
import { PushPermissionPrompt } from '@/components/PushPermissionPrompt';
```

And render it just above `<UserAppointments ...>` (around line 327):

```tsx
<PushPermissionPrompt hasUpcomingAppointment={userAppointments.length > 0} />

<UserAppointments
  userAppointments={userAppointments}
  setAppointmentToCancel={setAppointmentToCancel}
  setShowCancelConfirmation={setShowCancelConfirmation}
/>
```

- [ ] **Step 3: Type-check and run dev server**

Run: `pnpm type-check && pnpm dev`

- [ ] **Step 4: Manual verification**

1. Log in as a customer with at least one upcoming appointment.
2. Visit `/rezervacije` in a private/incognito window (so Notification.permission is `default`).
3. The push prompt appears.
4. Click "Da, omogući" → browser permission prompt → grant. Check the Network tab — `POST /api/push/subscribe` returns 200.
5. Reload — the prompt no longer appears (`Notification.permission === 'granted'`).
6. In a fresh incognito session, click "Ne sada" — the prompt hides and stays hidden for 7 days (verifiable via localStorage).

- [ ] **Step 5: Commit**

```bash
git add src/components/PushPermissionPrompt.tsx src/app/rezervacije/page.tsx
git commit -m "feat: add soft web-push permission prompt for customers with upcoming appointments"
```

### Task 7G: Supabase Edge Function `send-appointment-reminders` + cron schedule

**Files:**
- Create: `supabase/functions/send-appointment-reminders/index.ts`
- Create: `supabase/migrations/20260521_0006_schedule_send_reminders_cron.sql`

- [ ] **Step 1: Scaffold the function**

```bash
supabase functions new send-appointment-reminders
```

(If Supabase CLI isn't linked: create the directory and file manually at the path above.)

- [ ] **Step 2: Write the function**

Replace the generated content with:

```ts
// supabase/functions/send-appointment-reminders/index.ts

import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC = Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

interface ServiceRow {
  id: number;
  name_bs: string;
  duration_minutes: number;
}

interface AppointmentRow {
  id: number;
  user_id: string;
  service: number;
  appointment_time: string;
  reminder_sent_24h: boolean;
  reminder_sent_1h: boolean;
}

interface SubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

const SERVICE_FALLBACK_NAMES: Record<number, string> = {
  0: 'Brijanje', 1: 'Šišanje do kože', 2: 'Šišanje', 3: 'Fade',
  4: 'Brijanje glave', 5: 'Šišanje + Brijanje', 6: 'Fade + Brijanje',
};

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const now = new Date();
  const windowsToCheck: Array<{
    flag: 'reminder_sent_24h' | 'reminder_sent_1h';
    startOffsetMin: number;
    endOffsetMin: number;
    title: string;
  }> = [
    { flag: 'reminder_sent_24h', startOffsetMin: 24 * 60 - 5, endOffsetMin: 24 * 60 + 5, title: 'Podsjetnik za termin sutra' },
    { flag: 'reminder_sent_1h',  startOffsetMin: 55,           endOffsetMin: 65,           title: 'Vaš termin je za 1 sat' },
  ];

  const { data: services } = await supabase.from('services').select('id, name_bs, duration_minutes');
  const serviceMap = new Map<number, ServiceRow>((services || []).map((s) => [s.id, s]));

  const results: Array<{ window: string; appointmentId: number; status: string }> = [];

  for (const w of windowsToCheck) {
    const windowStart = new Date(now.getTime() + w.startOffsetMin * 60_000).toISOString();
    const windowEnd   = new Date(now.getTime() + w.endOffsetMin   * 60_000).toISOString();

    const { data: appts, error } = await supabase
      .from('appointments')
      .select('id, user_id, service, appointment_time, reminder_sent_24h, reminder_sent_1h')
      .eq(w.flag, false)
      .gte('appointment_time', windowStart)
      .lte('appointment_time', windowEnd);

    if (error) {
      console.error(`Query failed for ${w.flag}:`, error);
      continue;
    }

    for (const a of (appts || []) as AppointmentRow[]) {
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', a.user_id);

      if (!subs || subs.length === 0) {
        // No subscription — still mark as sent so we don't keep retrying
        await supabase.from('appointments').update({ [w.flag]: true }).eq('id', a.id);
        results.push({ window: w.flag, appointmentId: a.id, status: 'no-subscription' });
        continue;
      }

      const serviceName =
        serviceMap.get(a.service)?.name_bs ?? SERVICE_FALLBACK_NAMES[a.service] ?? 'Termin';
      const start = new Date(a.appointment_time);
      const hh = start.getUTCHours().toString().padStart(2, '0');
      const mm = start.getUTCMinutes().toString().padStart(2, '0');
      const payload = JSON.stringify({
        title: w.title,
        body: `${serviceName} u ${hh}:${mm}`,
        url: '/rezervacije',
      });

      let anyDelivered = false;
      for (const s of subs as SubscriptionRow[]) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          );
          anyDelivered = true;
        } catch (err: any) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            // Subscription gone — clean it up
            await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
          } else {
            console.error('Push send failed:', err);
          }
        }
      }

      if (anyDelivered) {
        await supabase.from('appointments').update({ [w.flag]: true }).eq('id', a.id);
      }
      results.push({
        window: w.flag,
        appointmentId: a.id,
        status: anyDelivered ? 'sent' : 'all-failed',
      });
    }
  }

  return new Response(JSON.stringify({ checkedAt: now.toISOString(), results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 3: Set Edge Function secrets**

```bash
supabase secrets set NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public>
supabase secrets set VAPID_PRIVATE_KEY=<private>
supabase secrets set VAPID_SUBJECT=mailto:emin.nefic@gmail.com
```

(`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-provided in Edge Functions.)

- [ ] **Step 4: Deploy the function**

```bash
supabase functions deploy send-appointment-reminders --no-verify-jwt
```

`--no-verify-jwt` is correct here because pg_cron's `net.http_post` calls it server-to-server; we'll authorize via the service role token in the header.

- [ ] **Step 5: Manually invoke once to confirm it works**

```bash
curl -X POST https://<project>.supabase.co/functions/v1/send-appointment-reminders \
  -H "Authorization: Bearer <service-role-key>"
```

Expected: 200 with a JSON body like `{ "checkedAt": "...", "results": [...] }`. Even if `results` is empty (no appointments in window), no errors.

- [ ] **Step 6: Schedule the cron job**

Create `supabase/migrations/20260521_0006_schedule_send_reminders_cron.sql`:

```sql
-- supabase/migrations/20260521_0006_schedule_send_reminders_cron.sql

-- Requires pg_cron and pg_net extensions, both enabled by default in Supabase.

-- Store the service-role key as a Postgres setting so the cron job can read it.
-- (Run this once manually in the SQL editor BEFORE applying this migration, replacing the placeholder:)
--   ALTER DATABASE postgres SET app.settings.service_role_key = '<service-role-key>';
--   ALTER DATABASE postgres SET app.settings.functions_url = 'https://<project>.supabase.co/functions/v1';

SELECT cron.schedule(
  'send-appointment-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.functions_url') || '/send-appointment-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    )
  ) AS request_id;
  $$
);
```

- [ ] **Step 7: Set the two postgres settings before applying the migration**

In Supabase SQL editor:

```sql
ALTER DATABASE postgres SET app.settings.service_role_key = '<service-role-key>';
ALTER DATABASE postgres SET app.settings.functions_url = 'https://<project>.supabase.co/functions/v1';
```

Then apply the migration.

- [ ] **Step 8: Verify cron job is registered**

```sql
SELECT jobname, schedule, command FROM cron.job WHERE jobname = 'send-appointment-reminders';
```

Expected: one row, schedule `*/5 * * * *`.

- [ ] **Step 9: End-to-end manual test**

1. Insert a test appointment ~62 minutes in the future for the logged-in test user.
2. As that user, ensure push is enabled (Task 7F).
3. Wait up to 5 minutes for the cron tick.
4. Confirm a system notification appears: title "Vaš termin je za 1 sat".
5. Click it — verify it focuses/opens `/rezervacije`.
6. Re-check `appointments` row: `reminder_sent_1h = true`.

- [ ] **Step 10: Commit**

```bash
git add supabase/functions/send-appointment-reminders supabase/migrations/20260521_0006_schedule_send_reminders_cron.sql
git commit -m "feat: send-appointment-reminders Edge Function + pg_cron schedule"
```

---

## Final verification

- [ ] Run full test suite: `pnpm test`. All tests pass.
- [ ] Run type check: `pnpm type-check`. No errors.
- [ ] Run lint: `pnpm lint`. No new errors.
- [ ] Run dev server and re-verify each task's manual check in one session.
- [ ] Confirm in Supabase:
  - `services` contains "Oblikovanje brade" (15 min, teal, active).
  - `appointments` has `created_by_admin`, `reminder_sent_24h`, `reminder_sent_1h` columns.
  - `push_subscriptions` table exists with RLS.
  - `cron.job` has both `delete-expired-announcements` and `send-appointment-reminders` registered.
  - Edge Function `send-appointment-reminders` is deployed and reachable.

---

## Self-review notes

- Every task references concrete files, line numbers (where applicable), and contains the full code to write — no "implement similar to above" placeholders.
- Type signatures match across tasks (e.g. `Appointment.duration_minutes` in `appointment-conflicts.ts` is consumed in `src/app/admin/page.tsx` via the same name).
- Migration filenames are sequenced (`20260521_0001` … `_0006`) so they apply in the intended order.
- The reschedule-reset trigger (Task 7C) ensures Task 7G's logic doesn't strand reminders when an appointment is moved.
- Spec coverage: all 7 spec sections (Tasks 1, 2, 3+6, 4a, 4b, 5, 7) are covered by Tasks 1–7 of this plan.
