'use client';
import { Select, TextInput } from '@singha/ui';
import { UNIT_OPTIONS } from '../../lib/units';

/**
 * Controlled quantity + unit composite (E2/E3 — commodity/bulk quantities). Quantity is a decimal
 * string (never a float in the wire payload; parent forwards it verbatim). The parent owns state.
 */
export function QuantityUnitInput({
  quantity,
  unit,
  onQuantityChange,
  onUnitChange,
  invalid,
  id,
}: {
  quantity: string;
  unit: string;
  onQuantityChange: (v: string) => void;
  onUnitChange: (v: string) => void;
  invalid?: boolean;
  id?: string;
}) {
  return (
    <div className="flex gap-2">
      <TextInput
        id={id}
        inputMode="decimal"
        className="tabular"
        placeholder="0"
        value={quantity}
        invalid={invalid}
        onChange={(e) => onQuantityChange(e.target.value.replace(/[^\d.]/g, ''))}
        aria-label="Quantity"
      />
      <Select
        options={UNIT_OPTIONS}
        placeholder="unit"
        value={unit}
        onChange={(e) => onUnitChange(e.target.value)}
        className="max-w-[10rem]"
        aria-label="Unit"
      />
    </div>
  );
}
