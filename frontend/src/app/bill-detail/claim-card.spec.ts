import { TestBed } from '@angular/core/testing';
import { Claim, ClaimUpdate } from '../bills/bill.model';
import { ClaimCard } from './claim-card';

describe('ClaimCard', () => {
  async function render(claim: Claim) {
    const fixture = TestBed.createComponent(ClaimCard);
    fixture.componentRef.setInput('title', 'Beihilfe');
    fixture.componentRef.setInput('claim', claim);
    const emitted: ClaimUpdate[] = [];
    fixture.componentInstance.changed.subscribe((update) => emitted.push(update));
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const button = (label: string) =>
      [...element.querySelectorAll('button')].find((b) => b.textContent?.includes(label))!;
    return { element, emitted, button };
  }

  it('offers to mark an unsent claim as sent', async () => {
    const { element, emitted, button } = await render({
      status: 'NOT_SUBMITTED',
      submittedOn: null,
      decidedOn: null,
      reimbursedAmount: null,
    });

    const date = element.querySelector<HTMLInputElement>('input[type=date]')!;
    date.value = '2026-09-03';
    date.dispatchEvent(new Event('input'));
    button('Mark as sent').click();

    expect(emitted).toEqual([{ status: 'SUBMITTED', date: '2026-09-03' }]);
  });

  it('records a reimbursement with the received amount', async () => {
    const { element, emitted, button } = await render({
      status: 'SUBMITTED',
      submittedOn: '2026-09-03',
      decidedOn: null,
      reimbursedAmount: null,
    });

    const [date, amount] = element.querySelectorAll('input');
    date.value = '2026-09-20';
    date.dispatchEvent(new Event('input'));
    amount.value = '42,50';
    amount.dispatchEvent(new Event('input'));
    button('Received').click();

    expect(emitted).toEqual([{ status: 'RECEIVED', date: '2026-09-20', reimbursedAmount: 42.5 }]);
  });

  it('can move a decided claim back to sent', async () => {
    const { element, emitted, button } = await render({
      status: 'DENIED',
      submittedOn: '2026-09-03',
      decidedOn: '2026-09-20',
      reimbursedAmount: null,
    });

    expect(element.textContent).toContain('Denied');
    button('back to').click();

    expect(emitted).toEqual([{ status: 'SUBMITTED', date: '2026-09-03' }]);
  });
});
