'use client';
import { Select, TextInput } from '@singha/ui';
import { CURRENCIES } from '../../lib/format';

const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c.code, label: c.code }));

/**
 * Controlled amount + currency composite. The amount is a major-unit string the parent parses to
 * minor units at submit (`parseMoneyToMinor`); the currency is the BINDING transaction currency for
 * this input — distinct from the viewer's display-currency preference (D5).
 */
export function CurrencyAmountInput({
  amount,
  currency,
  onAmountChange,
  onCurrencyChange,
  invalid,
  id,
  placeholder = '0',
}: {
  amount: string;
  currency: string;
  onAmountChange: (v: string) => void;
  onCurrencyChange: (v: string) => void;
  invalid?: boolean;
  id?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex gap-2">
      <Select
        options={CURRENCY_OPTIONS}
        value={currency}
        onChange={(e) => onCurrencyChange(e.target.value)}
        className="max-w-[6.5rem]"
        aria-label="Currency"
      />
      <TextInput
        id={id}
        inputMode="decimal"
        className="tabular"
        placeholder={placeholder}
        value={amount}
        invalid={invalid}
        onChange={(e) => onAmountChange(e.target.value.replace(/[^\d.,]/g, ''))}
        aria-label="Amount"
      />
    </div>
  );
}
