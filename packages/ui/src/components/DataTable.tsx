import { type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { ScrollX } from './ScrollX';

export type ColumnAlign = 'left' | 'right' | 'center';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  align?: ColumnAlign;
  className?: string;
}

export interface DataTableProps<T> {
  columns: ReadonlyArray<Column<T>>;
  rows: readonly T[];
  rowKey: (row: T, index: number) => string;
  empty?: ReactNode;
  className?: string;
  minWidth?: number;
}

function alignClass(a?: ColumnAlign): string {
  return a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';
}

/** Simple columnar table that scrolls horizontally inside its own container (never the page). */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  className,
  minWidth = 520,
}: DataTableProps<T>) {
  return (
    <ScrollX className={className}>
      <table className="w-full border-collapse text-sm" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-white/10">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  'px-3 py-2 text-xs font-semibold uppercase tracking-wide text-bone-500',
                  alignClass(c.align),
                  c.className,
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-bone-500">
                {empty ?? 'Nothing to show.'}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                className="border-b border-white/[0.04] hover:bg-white/[0.02]"
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn('px-3 py-2.5 text-bone-200', alignClass(c.align), c.className)}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </ScrollX>
  );
}
