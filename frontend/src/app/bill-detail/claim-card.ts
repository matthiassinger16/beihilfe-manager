import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, input, linkedSignal, output } from '@angular/core';
import { Claim, ClaimUpdate, today } from '../bills/bill.model';
import { StatusBadge } from '../shared/status-badge';

/** Shows where a bill stands with one payer and offers the next status transitions. */
@Component({
  selector: 'app-claim-card',
  imports: [CurrencyPipe, DatePipe, StatusBadge],
  template: `
    <section class="card track">
      <header class="track__header">
        <h2>{{ title() }}</h2>
        <app-status-badge [status]="claim().status" />
      </header>

      @switch (claim().status) {
        @case ('NOT_SUBMITTED') {
          <p class="muted">Not sent to {{ title() }} yet.</p>
          <div class="track__form">
            <label>
              Sent on
              <input type="date" [value]="date()" (input)="date.set($any($event.target).value)" />
            </label>
            <button
              type="button"
              class="button button--primary"
              [disabled]="busy()"
              (click)="submit()"
            >
              Mark as sent
            </button>
          </div>
        }
        @case ('SUBMITTED') {
          <p>Sent on {{ claim().submittedOn | date: 'mediumDate' }}.</p>
          <div class="track__form">
            <label>
              Decision on
              <input type="date" [value]="date()" (input)="date.set($any($event.target).value)" />
            </label>
            <label>
              Amount received
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="optional"
                [value]="amount() ?? ''"
                (input)="amount.set(parseAmount($any($event.target).value))"
              />
            </label>
            <div class="button-row">
              <button
                type="button"
                class="button button--success"
                [disabled]="busy()"
                (click)="decide('RECEIVED')"
              >
                Received
              </button>
              <button
                type="button"
                class="button button--danger"
                [disabled]="busy()"
                (click)="decide('DENIED')"
              >
                Denied
              </button>
            </div>
          </div>
          <button
            type="button"
            class="link-button"
            [disabled]="busy()"
            (click)="changed.emit({ status: 'NOT_SUBMITTED' })"
          >
            Undo: mark as not sent
          </button>
        }
        @default {
          <p>
            @if (claim().status === 'RECEIVED') {
              Received
              @if (claim().reimbursedAmount !== null) {
                <strong>{{ claim().reimbursedAmount | currency }}</strong>
              }
            } @else {
              Denied
            }
            on {{ claim().decidedOn | date: 'mediumDate' }}.
          </p>
          <p class="muted">Sent on {{ claim().submittedOn | date: 'mediumDate' }}.</p>
          <button type="button" class="link-button" [disabled]="busy()" (click)="reopen()">
            Undo: back to “sent”
          </button>
        }
      }
    </section>
  `,
})
export class ClaimCard {
  readonly title = input.required<string>();
  readonly claim = input.required<Claim>();
  readonly busy = input(false);
  readonly changed = output<ClaimUpdate>();

  // Reset the inputs whenever the claim changes (e.g. after a successful update).
  protected readonly date = linkedSignal({ source: this.claim, computation: () => today() });
  protected readonly amount = linkedSignal<Claim, number | null>({
    source: this.claim,
    computation: () => null,
  });

  protected submit(): void {
    this.changed.emit({ status: 'SUBMITTED', date: this.date() || null });
  }

  protected decide(status: 'RECEIVED' | 'DENIED'): void {
    this.changed.emit({
      status,
      date: this.date() || null,
      reimbursedAmount: status === 'RECEIVED' ? this.amount() : null,
    });
  }

  protected reopen(): void {
    this.changed.emit({ status: 'SUBMITTED', date: this.claim().submittedOn });
  }

  protected parseAmount(value: string): number | null {
    const amount = Number.parseFloat(value);
    return Number.isFinite(amount) ? amount : null;
  }
}
