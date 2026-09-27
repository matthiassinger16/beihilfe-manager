export type ClaimStatus = 'NOT_SUBMITTED' | 'SUBMITTED' | 'RECEIVED' | 'DENIED';

/** The two parties a bill is claimed from. Values match the API path segments. */
export type Payer = 'insurance' | 'beihilfe';

export interface Claim {
  status: ClaimStatus;
  submittedOn: string | null;
  decidedOn: string | null;
  reimbursedAmount: number | null;
}

export interface Bill {
  id: number;
  doctor: string;
  patient: string | null;
  invoiceNumber: string | null;
  invoiceDate: string;
  dueDate: string | null;
  amount: number;
  description: string | null;
  paidOn: string | null;
  insurance: Claim;
  beihilfe: Claim;
  attachmentCount: number;
  createdAt: string;
}

/** A scan or photo of a bill. */
export interface Attachment {
  id: number;
  billId: number;
  filename: string;
  contentType: string;
  size: number;
  createdAt: string;
  url: string;
}

export interface BillRequest {
  doctor: string;
  patient: string | null;
  invoiceNumber: string | null;
  invoiceDate: string;
  dueDate: string | null;
  amount: number;
  description: string | null;
}

export interface ClaimUpdate {
  status: ClaimStatus;
  date?: string | null;
  reimbursedAmount?: number | null;
}

/** Today's date as an ISO string (yyyy-MM-dd) in local time. */
export function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function isOverdue(bill: Bill, on: string = today()): boolean {
  return !bill.paidOn && !!bill.dueDate && bill.dueDate < on;
}
