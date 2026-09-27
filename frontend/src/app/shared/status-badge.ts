import { Component, computed, input } from '@angular/core';
import { ClaimStatus } from '../bills/bill.model';

export type BadgeStatus = ClaimStatus | 'PAID' | 'UNPAID' | 'OVERDUE';

const BADGES: Record<BadgeStatus, { label: string; tone: string }> = {
  NOT_SUBMITTED: { label: 'Not sent', tone: 'neutral' },
  SUBMITTED: { label: 'Sent', tone: 'info' },
  RECEIVED: { label: 'Received', tone: 'success' },
  DENIED: { label: 'Denied', tone: 'danger' },
  PAID: { label: 'Paid', tone: 'success' },
  UNPAID: { label: 'Unpaid', tone: 'warning' },
  OVERDUE: { label: 'Overdue', tone: 'danger' },
};

@Component({
  selector: 'app-status-badge',
  template: `<span class="badge badge--{{ badge().tone }}">{{ badge().label }}</span>`,
})
export class StatusBadge {
  readonly status = input.required<BadgeStatus>();
  protected readonly badge = computed(() => BADGES[this.status()]);
}
