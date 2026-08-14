'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@singha/ui';
import {
  type NotificationChannel,
  type NotificationPreferencesView,
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { SoundControls } from './SoundControls';

const CHANNEL_LABEL: Record<NotificationChannel, string> = {
  in_app: 'In-app',
  push: 'Push',
  email: 'Email',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
};

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2">
      <span>
        <span className="text-sm text-bone-200">{label}</span>
        {hint && <span className="block text-xs text-bone-500">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-emerald-500/80' : 'bg-white/10'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`}
        />
      </button>
    </label>
  );
}

/**
 * Notification preference centre (pack doc 05). Mandatory/transactional messages are
 * always delivered and are intentionally not togglable here; these controls govern
 * ENGAGEMENT (marketing/nudge) delivery only — channels, consent, quiet hours and the
 * daily cap — plus the sound/haptics language. Saves are per-field PUTs to the
 * authoritative engagement API; the server owns the policy.
 */
export function NotificationPreferences() {
  const { token, loading: authLoading } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPreferencesView | null>(null);
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving' | 'error'>('loading');

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setStatus('idle');
      return;
    }
    fetchNotificationPreferences(token)
      .then((p) => {
        setPrefs(p);
        setStatus('idle');
      })
      .catch(() => setStatus('error'));
  }, [token, authLoading]);

  const save = useCallback(
    async (patch: Parameters<typeof updateNotificationPreferences>[0]) => {
      if (!token) return;
      setStatus('saving');
      try {
        const next = await updateNotificationPreferences(patch, token);
        setPrefs(next);
        setStatus('idle');
      } catch {
        setStatus('error');
      }
    },
    [token],
  );

  if (status === 'loading') {
    return <p className="py-8 text-center text-bone-500">Loading your preferences…</p>;
  }
  if (status === 'error' && !prefs) {
    return <p className="py-8 text-center text-bone-500">Couldn&rsquo;t load your preferences.</p>;
  }
  if (!prefs) return null;

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="font-serif text-lg font-semibold text-bone">Engagement notifications</h2>
        <p className="mt-1 text-sm text-bone-500">
          Transactional messages (outbid resolved, you won, payment due) are always sent. These
          settings control optional nudges like &ldquo;ending soon&rdquo;.
        </p>
        <div className="mt-4 border-t border-white/[0.06] pt-2">
          <Toggle
            label="Send me engagement notifications"
            hint="Turn off to receive only essential, transactional messages."
            checked={prefs.engagementOptIn}
            onChange={(v) => save({ engagementOptIn: v })}
          />
        </div>
      </Card>

      <Card>
        <h2 className="font-serif text-lg font-semibold text-bone">Channels</h2>
        <div className="mt-3 divide-y divide-white/[0.06]">
          {(Object.keys(CHANNEL_LABEL) as NotificationChannel[]).map((ch) => (
            <Toggle
              key={ch}
              label={CHANNEL_LABEL[ch]}
              checked={prefs.channels[ch]}
              onChange={(v) => save({ channels: { [ch]: v } })}
            />
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-serif text-lg font-semibold text-bone">Quiet hours &amp; frequency</h2>
        <div className="mt-3 space-y-4">
          <Toggle
            label="Quiet hours"
            hint={
              prefs.quietHours
                ? `No engagement messages ${prefs.quietHours.start}–${prefs.quietHours.end}`
                : 'Off — messages may arrive any time'
            }
            checked={!!prefs.quietHours}
            onChange={(v) => save({ quietHours: v ? { start: '22:00', end: '07:00' } : null })}
          />
          {prefs.quietHours && (
            <div className="flex items-center gap-3 text-sm">
              <label className="text-bone-400">
                From{' '}
                <input
                  type="time"
                  aria-label="Quiet hours start"
                  value={prefs.quietHours.start}
                  onChange={(e) =>
                    save({ quietHours: { start: e.target.value, end: prefs.quietHours!.end } })
                  }
                  className="rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-bone"
                />
              </label>
              <label className="text-bone-400">
                to{' '}
                <input
                  type="time"
                  aria-label="Quiet hours end"
                  value={prefs.quietHours.end}
                  onChange={(e) =>
                    save({ quietHours: { start: prefs.quietHours!.start, end: e.target.value } })
                  }
                  className="rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-bone"
                />
              </label>
            </div>
          )}
          <label className="block text-sm">
            <span className="text-bone-200">Daily limit</span>
            <span className="block text-xs text-bone-500">
              Most engagement messages per day (0 = no limit).
            </span>
            <input
              type="number"
              min={0}
              max={50}
              aria-label="Daily engagement limit"
              value={prefs.frequencyCapPerDay}
              onChange={(e) =>
                save({ frequencyCapPerDay: Math.max(0, Number(e.target.value) || 0) })
              }
              className="mt-1 w-24 rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-bone"
            />
          </label>
        </div>
      </Card>

      <Card>
        <h2 className="font-serif text-lg font-semibold text-bone">Sound &amp; haptics</h2>
        <p className="mt-1 text-sm text-bone-500">
          Premium auction cues — a soft gavel, a lead chime, an outbid alert. Never intrusive.
        </p>
        <div className="mt-3">
          <SoundControls />
        </div>
      </Card>

      <p aria-live="polite" className="text-center text-xs text-bone-600">
        {status === 'saving'
          ? 'Saving…'
          : status === 'error'
            ? 'Couldn’t save — try again.'
            : 'Saved automatically.'}
      </p>
    </div>
  );
}
