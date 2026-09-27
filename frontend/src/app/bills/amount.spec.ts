import { formatAmountInput, parseAmount } from './amount';

describe('parseAmount', () => {
  it('accepts German and English notation', () => {
    expect(parseAmount('184,62')).toBe(184.62);
    expect(parseAmount('1.234,5')).toBe(1234.5);
    expect(parseAmount('184.62')).toBe(184.62);
    expect(parseAmount(' 12 € ')).toBe(12);
    expect(parseAmount('0,00')).toBe(0);
  });

  it('rejects invalid input', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('-5')).toBeNull();
    expect(parseAmount('1,234')).toBeNull();
    expect(parseAmount(null)).toBeNull();
  });

  it('formats amounts for editing', () => {
    expect(formatAmountInput(184.6)).toBe('184,60');
  });
});
