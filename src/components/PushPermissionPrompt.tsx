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
