import { Bill, Claim, ClaimStatus } from './bill.model';
import { matchesFilter, matchesSearch, reimbursed, summarize } from './bill-summary';

function claim(status: ClaimStatus, reimbursedAmount: number | null = null): Claim {
  return { status, submittedOn: null, decidedOn: null, reimbursedAmount };
}

function bill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: 1,
    doctor: 'Dr. Müller',
    patient: 'Anna',
    invoiceNumber: 'R-1',
    invoiceDate: '2026-09-01',
    dueDate: null,
    amount: 100,
    description: null,
    paidOn: null,
    insurance: claim('NOT_SUBMITTED'),
    beihilfe: claim('NOT_SUBMITTED'),
    createdAt: '2026-09-01T10:00:00Z',
    ...overrides,
  };
}

describe('bill summary', () => {
  it('sums unpaid, pending and reimbursed amounts', () => {
    const summary = summarize([
      bill({ amount: 10.1 }),
      bill({ amount: 20.2, dueDate: '2000-01-01' }),
      bill({
        amount: 50,
        paidOn: '2026-09-02',
        insurance: claim('SUBMITTED'),
        beihilfe: claim('RECEIVED', 25.5),
      }),
      bill({
        amount: 40,
        paidOn: '2026-09-02',
        insurance: claim('RECEIVED', 12.3),
        beihilfe: claim('SUBMITTED'),
      }),
    ]);

    expect(summary.unpaidCount).toBe(2);
    expect(summary.unpaidAmount).toBe(30.3);
    expect(summary.overdueCount).toBe(1);
    expect(summary.insurance).toEqual({ toSubmitCount: 2, pendingCount: 1, pendingAmount: 50 });
    expect(summary.beihilfe).toEqual({ toSubmitCount: 2, pendingCount: 1, pendingAmount: 40 });
    expect(summary.reimbursedAmount).toBe(37.8);
  });

  it('adds up reimbursements of a single bill', () => {
    expect(reimbursed(bill({ insurance: claim('RECEIVED', 60), beihilfe: claim('DENIED') }))).toBe(
      60,
    );
  });

  it('filters by state', () => {
    const open = bill();
    const pending = bill({
      paidOn: '2026-09-02',
      insurance: claim('SUBMITTED'),
      beihilfe: claim('RECEIVED', 5),
    });
    const done = bill({
      paidOn: '2026-09-02',
      insurance: claim('DENIED'),
      beihilfe: claim('RECEIVED', 5),
    });

    expect([open, pending, done].map((b) => matchesFilter(b, 'unpaid'))).toEqual([
      true,
      false,
      false,
    ]);
    expect([open, pending, done].map((b) => matchesFilter(b, 'to-submit'))).toEqual([
      true,
      false,
      false,
    ]);
    expect([open, pending, done].map((b) => matchesFilter(b, 'pending'))).toEqual([
      false,
      true,
      false,
    ]);
    expect([open, pending, done].map((b) => matchesFilter(b, 'done'))).toEqual([
      false,
      false,
      true,
    ]);
  });

  it('searches doctor, patient and invoice number case-insensitively', () => {
    const b = bill();
    expect(matchesSearch(b, 'müll')).toBe(true);
    expect(matchesSearch(b, 'ANNA')).toBe(true);
    expect(matchesSearch(b, 'r-1')).toBe(true);
    expect(matchesSearch(b, 'schmidt')).toBe(false);
    expect(matchesSearch(b, '  ')).toBe(true);
  });
});
