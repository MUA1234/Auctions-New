'use client';
import { type ReactNode } from 'react';
import { Card } from '@singha/ui';
import { useFlags } from '../../lib/use-flags';
import { type FeatureFlags } from '../../lib/flags';

/**
 * Client gate for a Singha Evolution surface. Keeps the route always resolvable (never a 404): when
 * the capability flag is OFF it renders a calm "not enabled" fallback instead of the surface. This
 * matches the V3 convention — the experience is flag-gated, the URL always works. Preview it with
 * `?evo=on`.
 */
export function EvoGate({
  flag,
  title,
  children,
}: {
  flag: keyof FeatureFlags;
  title?: string;
  children: ReactNode;
}) {
  const { flags, loading } = useFlags();
  if (loading) {
    return (
      <div className="container-page py-16">
        <div className="skeleton h-8 w-56 rounded" />
        <div className="skeleton mt-4 h-40 w-full rounded-2xl" />
      </div>
    );
  }
  if (!flags[flag]) {
    return (
      <div className="container-page py-16">
        <Card className="mx-auto max-w-lg py-12 text-center">
          <p className="eyebrow text-gold-300">Singha Evolution</p>
          <p className="mt-2 font-serif text-xl text-bone-200">
            {title ?? 'This surface is not enabled yet'}
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-bone-500">
            It is part of the Singha Evolution rollout and is currently switched off. It becomes
            available once the capability is enabled for your account.
          </p>
        </Card>
      </div>
    );
  }
  return <>{children}</>;
}
