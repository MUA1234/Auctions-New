import { type ReactNode } from 'react';
import { Card } from './Card';
import { cn } from '../lib/cn';

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Neutral empty/zero-state block on a `Card`. */
export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <Card className={cn('py-12 text-center', className)}>
      <p className="font-serif text-lg text-bone-200">{title}</p>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-bone-500">{description}</p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </Card>
  );
}
