import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { Bill, BillRequest, today } from '../bills/bill.model';
import { BillsService, errorMessage } from '../bills/bills.service';

/** Creates a new bill, or edits one when routed with an `:id`. */
@Component({
  selector: 'app-bill-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './bill-form.html',
})
export class BillForm {
  private readonly service = inject(BillsService);
  private readonly router = inject(Router);

  /** Bound from the `:id` route parameter; absent when creating a bill. */
  readonly id = input<string>();
  protected readonly billId = computed(() => {
    const id = this.id();
    return id ? Number(id) : null;
  });

  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly loaded = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    doctor: ['', [Validators.required, Validators.maxLength(200)]],
    patient: ['', Validators.maxLength(200)],
    invoiceNumber: ['', Validators.maxLength(100)],
    invoiceDate: [today(), Validators.required],
    dueDate: [''],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    description: ['', Validators.maxLength(2000)],
  });

  /** Doctors and patients from earlier bills, offered as suggestions. */
  private readonly allBills = toSignal(this.service.list(), { initialValue: [] as Bill[] });
  protected readonly doctors = computed(() => distinct(this.allBills().map((b) => b.doctor)));
  protected readonly patients = computed(() => distinct(this.allBills().map((b) => b.patient)));

  constructor() {
    effect(() => {
      const id = this.billId();
      if (id === null) {
        this.loaded.set(true);
        return;
      }
      this.service.get(id).subscribe({
        next: (bill) => {
          this.form.setValue({
            doctor: bill.doctor,
            patient: bill.patient ?? '',
            invoiceNumber: bill.invoiceNumber ?? '',
            invoiceDate: bill.invoiceDate,
            dueDate: bill.dueDate ?? '',
            amount: bill.amount,
            description: bill.description ?? '',
          });
          this.loaded.set(true);
        },
        error: (err) => this.error.set(errorMessage(err)),
      });
    });
  }

  protected invalid(control: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[control];
    return c.invalid && (c.touched || c.dirty);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const request: BillRequest = {
      doctor: value.doctor,
      patient: value.patient || null,
      invoiceNumber: value.invoiceNumber || null,
      invoiceDate: value.invoiceDate,
      dueDate: value.dueDate || null,
      amount: value.amount!,
      description: value.description || null,
    };
    const id = this.billId();
    this.saving.set(true);
    this.error.set(null);
    (id === null ? this.service.create(request) : this.service.update(id, request)).subscribe({
      next: (bill) => this.router.navigate(['/bills', bill.id]),
      error: (err) => {
        this.error.set(errorMessage(err));
        this.saving.set(false);
      },
    });
  }
}

function distinct(values: (string | null)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b));
}
