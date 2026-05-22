'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Platform = 'android' | 'ios' | 'other';

const DISMISS_KEY = 'install-prompt-dismissed-until';
const DISMISS_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

function isAlreadyInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if ((window.navigator as any).standalone === true) return true; // iOS legacy
  return false;
}

function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'other';
  const ua = window.navigator.userAgent;
  if (/Android/i.test(ua)) return 'android';
  if (/iPad|iPhone|iPod/i.test(ua)) return 'ios';
  return 'other';
}

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<Platform>('other');
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isAlreadyInstalled()) return;

    const dismissedUntil = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
    if (Date.now() < dismissedUntil) return;

    const p = detectPlatform();
    setPlatform(p);

    // Android (and supporting Chromium browsers): wait for native event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredEvent(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS: no native API — show instruction card immediately
    if (p === 'ios') setShow(true);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!show) return null;

  const handleInstallAndroid = async () => {
    if (!deferredEvent) return;
    await deferredEvent.prompt();
    const choice = await deferredEvent.userChoice;
    setDeferredEvent(null);
    setShow(false);
    if (choice.outcome !== 'accepted') {
      // remember dismissal so we don't pester them on every visit
      localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DURATION_MS));
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DURATION_MS));
    setShow(false);
  };

  if (platform === 'ios') {
    return (
      <div className="relative mx-5 mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-4 pr-10">
        <button
          aria-label="Zatvori"
          onClick={handleDismiss}
          className="absolute right-2 top-2 rounded p-1 text-emerald-900 hover:bg-emerald-100"
        >
          <X className="h-4 w-4" />
        </button>
        <p className="mb-2 text-sm font-medium text-emerald-900">
          Dodajte aplikaciju na početni ekran
        </p>
        <p className="mb-3 text-sm text-emerald-900">
          Za brži pristup i podsjetnike pratite ove korake u Safariju:
        </p>
        <ol className="space-y-1 text-sm text-emerald-900">
          <li className="flex items-start gap-2">
            <span className="font-medium">1.</span>
            <span>
              Tapnite ikonu <Share className="inline h-4 w-4 align-text-bottom" /> u traci alata
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-medium">2.</span>
            <span>Odaberite <strong>Dodaj na početni ekran</strong></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-medium">3.</span>
            <span>Otvorite aplikaciju sa početnog ekrana</span>
          </li>
        </ol>
      </div>
    );
  }

  if (platform === 'android' && deferredEvent) {
    return (
      <div className="mx-5 mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-4">
        <p className="mb-3 text-sm text-emerald-900">
          Instalirajte aplikaciju za brži pristup i podsjetnike o terminima.
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleInstallAndroid}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Instaliraj
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="text-emerald-900 hover:bg-emerald-100 hover:text-emerald-900"
          >
            Ne sada
          </Button>
        </div>
      </div>
    );
  }

  // Desktop / unsupported browser — nothing to show
  return null;
}
