import { Bill, Claim, isOverdue } from './bill.model';

export type BillFilter = 'all' | 'unpaid' | 'to-submit' | 'pending' | 'done';

export interface ClaimSummary {
  toSubmitCount: number;
  pendingCount: number;
  pendingAmount: number;
}

export interface BillSummary {
  unpaidCount: number;
  unpaidAmount: number;
  overdueCount: number;
  insurance: ClaimSummary;
  beihilfe: ClaimSummary;
  reimbursedAmount: number;
}

const isOpen = (claim: Claim) => claim.status === 'NOT_SUBMITTED' || claim.status === 'SUBMITTED';

function summarizeClaims(bills: Bill[], pick: (bill: Bill) => Claim): ClaimSummary {
  const pending = bills.filter((b) => pick(b).status === 'SUBMITTED');
  return {
    toSubmitCount: bills.filter((b) => pick(b).status === 'NOT_SUBMITTED').length,
    pendingCount: pending.length,
    pendingAmount: sum(pending.map((b) => b.amount)),
  };
}

export function summarize(bills: Bill[]): BillSummary {
  const unpaid = bills.filter((b) => !b.paidOn);
  return {
    unpaidCount: unpaid.length,
    unpaidAmount: sum(unpaid.map((b) => b.amount)),
    overdueCount: unpaid.filter((b) => isOverdue(b)).length,
    insurance: summarizeClaims(bills, (b) => b.insurance),
    beihilfe: summarizeClaims(bills, (b) => b.beihilfe),
    reimbursedAmount: sum(bills.map((b) => reimbursed(b))),
  };
}

/** Total received so far from insurance and Beihilfe for one bill. */
export function reimbursed(bill: Bill): number {
  return (bill.insurance.reimbursedAmount ?? 0) + (bill.beihilfe.reimbursedAmount ?? 0);
}

export function matchesFilter(bill: Bill, filter: BillFilter): boolean {
  const claims = [bill.insurance, bill.beihilfe];
  switch (filter) {
    case 'all':
      return true;
    case 'unpaid':
      return !bill.paidOn;
    case 'to-submit':
      return claims.some((c) => c.status === 'NOT_SUBMITTED');
    case 'pending':
      return claims.some((c) => c.status === 'SUBMITTED');
    case 'done':
      return !!bill.paidOn && !claims.some(isOpen);
  }
}

export function matchesSearch(bill: Bill, search: string): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return [bill.doctor, bill.patient, bill.invoiceNumber, bill.description].some((value) =>
    value?.toLowerCase().includes(term),
  );
}

// Sum in cents to avoid floating point drift on currency amounts.
function sum(values: number[]): number {
  return values.reduce((total, value) => total + Math.round(value * 100), 0) / 100;
}
