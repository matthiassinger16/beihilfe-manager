import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, numberAttribute, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { Bill, ClaimUpdate, isOverdue, Payer, today } from '../bills/bill.model';
import { reimbursed } from '../bills/bill-summary';
import { BillsService, errorMessage } from '../bills/bills.service';
import { StatusBadge } from '../shared/status-badge';
import { ClaimCard } from './claim-card';

@Component({
  selector: 'app-bill-detail',
  imports: [CurrencyPipe, DatePipe, RouterLink, StatusBadge, ClaimCard],
  templateUrl: './bill-detail.html',
})
export class BillDetail {
  private readonly service = inject(BillsService);
  private readonly router = inject(Router);

  /** Bound from the `:id` route parameter. */
  readonly id = input.required({ transform: numberAttribute });

  protected readonly bill = signal<Bill | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly paidOn = signal(today());

  protected readonly overdue = computed(() => {
    const bill = this.bill();
    return !!bill && isOverdue(bill);
  });
  /** Both insurance and Beihilfe have decided, so the own share is final. */
  protected readonly settled = computed(() => {
    const bill = this.bill();
    const decided = (status: string) => status === 'RECEIVED' || status === 'DENIED';
    return !!bill && decided(bill.insurance.status) && decided(bill.beihilfe.status);
  });
  protected readonly reimbursed = computed(() => {
    const bill = this.bill();
    return bill ? reimbursed(bill) : 0;
  });

  constructor() {
    effect(() => {
      const id = this.id();
      this.bill.set(null);
      this.service.get(id).subscribe({
        next: (bill) => this.bill.set(bill),
        error: (err) => this.error.set(errorMessage(err)),
      });
    });
  }

  protected markPaid(): void {
    this.run(this.service.setPayment(this.id(), this.paidOn() || today()));
  }

  protected markUnpaid(): void {
    this.run(this.service.setPayment(this.id(), null));
  }

  protected updateClaim(payer: Payer, update: ClaimUpdate): void {
    this.run(this.service.updateClaim(this.id(), payer, update));
  }

  protected remove(): void {
    const bill = this.bill();
    if (!bill || !confirm(`Delete the bill from ${bill.doctor}? This cannot be undone.`)) return;
    this.busy.set(true);
    this.service.delete(bill.id).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        this.error.set(errorMessage(err));
        this.busy.set(false);
      },
    });
  }

  private run(request: Observable<Bill>): void {
    this.busy.set(true);
    this.error.set(null);
    request.subscribe({
      next: (bill) => {
        this.bill.set(bill);
        this.busy.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.busy.set(false);
      },
    });
  }
}
