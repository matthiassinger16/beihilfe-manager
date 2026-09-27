import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Bill, isOverdue } from '../bills/bill.model';
import { BillFilter, matchesFilter, matchesSearch, summarize } from '../bills/bill-summary';
import { BillsService, errorMessage } from '../bills/bills.service';
import { StatusBadge } from '../shared/status-badge';

@Component({
  selector: 'app-bill-list',
  imports: [CurrencyPipe, DatePipe, RouterLink, StatusBadge],
  templateUrl: './bill-list.html',
})
export class BillList {
  private readonly service = inject(BillsService);
  private readonly router = inject(Router);

  protected readonly bills = signal<Bill[] | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly filter = signal<BillFilter>('all');
  protected readonly search = signal('');

  protected readonly filters: { value: BillFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'to-submit', label: 'To send' },
    { value: 'pending', label: 'Awaiting reply' },
    { value: 'done', label: 'Done' },
  ];

  protected readonly summary = computed(() => summarize(this.bills() ?? []));
  protected readonly visibleBills = computed(() =>
    (this.bills() ?? []).filter(
      (bill) => matchesFilter(bill, this.filter()) && matchesSearch(bill, this.search()),
    ),
  );

  protected readonly isOverdue = isOverdue;

  constructor() {
    this.service.list().subscribe({
      next: (bills) => this.bills.set(bills),
      error: (err) => this.error.set(errorMessage(err)),
    });
  }

  protected open(bill: Bill): void {
    this.router.navigate(['/bills', bill.id]);
  }
}
