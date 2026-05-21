// supabase/functions/send-appointment-reminders/index.ts
//
// Sends Web Push reminders for upcoming appointments at two intervals:
// - ~24h before the appointment
// - ~1h before the appointment
//
// Intended to be invoked every 5 minutes by a pg_cron job (see migration
// 20260521_0006_schedule_send_reminders_cron.sql).
//
// =============================================================================
// TIMEZONE CONVENTION (IMPORTANT)
// =============================================================================
// Appointment times in the `appointments` table are stored using the
// "local-wall-clock-as-UTC" convention (see project CLAUDE.md). That means an
// appointment at 14:00 local time on 2026-05-22 is stored as
// `2026-05-22T14:00:00Z` — the UTC fields of the stored timestamp are actually
// the local wall-clock values.
//
// Deno's `new Date()` is real UTC. To compare it against stored
// appointment_time values (which use the local-wall-clock-as-UTC convention),
// we must shift `now` by the project timezone offset so both sides of the
// comparison live in the same coordinate frame.
//
// LOCAL_TIMEZONE_OFFSET_MIN is currently hardcoded to +120 (Europe/Sarajevo,
// CEST, UTC+2). This is a known limitation:
//   - During winter the project's local time is CET (UTC+1, i.e. +60). Reminders
//     will fire at the wrong wall-clock time after the DST changeover until
//     this constant is updated.
//   - TODO: replace with a TZ-aware computation (e.g. via Intl APIs or a tz
//     library) before the next DST transition.
// =============================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC = Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

// Europe/Sarajevo offset in minutes. Hardcoded to CEST (UTC+2).
// FIXME: handle CET (UTC+1) in winter — see header comment.
const LOCAL_TIMEZONE_OFFSET_MIN = 120;

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
  0: 'Brijanje',
  1: 'Šišanje do kože',
  2: 'Šišanje',
  3: 'Fade',
  4: 'Brijanje glave',
  5: 'Šišanje + Brijanje',
  6: 'Fade + Brijanje',
  7: 'Oblikovanje brade',
};

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const now = new Date();
  // Shift `now` into the same local-wall-clock-as-UTC coordinate frame the
  // stored appointment_time values use, so windowStart/windowEnd can be
  // compared directly against them.
  const nowWallClockMs = now.getTime() + LOCAL_TIMEZONE_OFFSET_MIN * 60_000;

  const windowsToCheck: Array<{
    flag: 'reminder_sent_24h' | 'reminder_sent_1h';
    startOffsetMin: number;
    endOffsetMin: number;
    title: string;
  }> = [
    {
      flag: 'reminder_sent_24h',
      startOffsetMin: 24 * 60 - 5,
      endOffsetMin: 24 * 60 + 5,
      title: 'Podsjetnik za termin sutra',
    },
    {
      flag: 'reminder_sent_1h',
      startOffsetMin: 55,
      endOffsetMin: 65,
      title: 'Vaš termin je za 1 sat',
    },
  ];

  const { data: services } = await supabase
    .from('services')
    .select('id, name_bs, duration_minutes');
  const serviceMap = new Map<number, ServiceRow>(
    (services || []).map((s) => [s.id, s]),
  );

  const results: Array<{ window: string; appointmentId: number; status: string }> = [];

  for (const w of windowsToCheck) {
    const windowStart = new Date(nowWallClockMs + w.startOffsetMin * 60_000).toISOString();
    const windowEnd = new Date(nowWallClockMs + w.endOffsetMin * 60_000).toISOString();

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
      // The stored timestamp uses local-wall-clock-as-UTC, so the UTC fields
      // are the local wall-clock values.
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
