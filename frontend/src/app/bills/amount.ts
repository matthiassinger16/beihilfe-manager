import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Parses an amount typed the German way ("1.234,56", "12,5") or with a decimal point ("12.50").
 * Returns null for anything that is not a non-negative amount with at most two decimals.
 */
export function parseAmount(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  let value = String(input).replace(/[\s€]/g, '');
  if (value.includes(',')) value = value.replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
  return Number(value);
}

/** Formats an amount for an input field, e.g. 184.6 → "184,60". */
export function formatAmountInput(amount: number): string {
  return amount.toFixed(2).replace('.', ',');
}

/** Form validator for a required amount greater than zero. */
export function positiveAmount(control: AbstractControl<string>): ValidationErrors | null {
  const amount = parseAmount(control.value);
  return amount === null || amount <= 0 ? { amount: true } : null;
}
