import { Component, computed, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { concatMap, from, last, map, Observable, of } from 'rxjs';
import { formatAmountInput, parseAmount, positiveAmount } from '../bills/amount';
import { Bill, BillRequest, today } from '../bills/bill.model';
import { BillsService, errorMessage } from '../bills/bills.service';
import { FilePicker } from '../shared/file-picker';
import { fileLabel } from '../shared/file-kind';

interface PendingFile {
  file: File;
  /** Object URL for an image preview, or null for PDFs and other files. */
  preview: string | null;
}

/** Creates a new bill, or edits one when routed with an `:id`. */
@Component({
  selector: 'app-bill-form',
  imports: [ReactiveFormsModule, RouterLink, FilePicker],
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

  /** Scans picked while creating a bill; uploaded once the bill is saved. */
  protected readonly pendingFiles = signal<PendingFile[]>([]);
  protected readonly fileLabel = fileLabel;

  protected readonly form = inject(NonNullableFormBuilder).group({
    doctor: ['', [Validators.required, Validators.maxLength(200)]],
    patient: ['', Validators.maxLength(200)],
    invoiceNumber: ['', Validators.maxLength(100)],
    invoiceDate: [today(), Validators.required],
    dueDate: [''],
    amount: ['', positiveAmount],
    description: ['', Validators.maxLength(2000)],
  });

  /** Doctors and patients from earlier bills, offered as suggestions. */
  private readonly allBills = toSignal(this.service.list(), { initialValue: [] as Bill[] });
  protected readonly doctors = computed(() => distinct(this.allBills().map((b) => b.doctor)));
  protected readonly patients = computed(() => distinct(this.allBills().map((b) => b.patient)));

  constructor() {
    inject(DestroyRef).onDestroy(() => this.pendingFiles().forEach(revokePreview));

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
            amount: formatAmountInput(bill.amount),
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

  protected addFiles(files: File[]): void {
    const added = files.map((file) => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }));
    this.pendingFiles.update((list) => [...list, ...added]);
  }

  protected removeFile(pending: PendingFile): void {
    revokePreview(pending);
    this.pendingFiles.update((list) => list.filter((p) => p !== pending));
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
      amount: parseAmount(value.amount)!,
      description: value.description || null,
    };
    const id = this.billId();
    this.saving.set(true);
    this.error.set(null);
    (id === null ? this.service.create(request) : this.service.update(id, request)).subscribe({
      next: (bill) => this.uploadPendingFiles(bill),
      error: (err) => {
        this.error.set(errorMessage(err));
        this.saving.set(false);
      },
    });
  }

  private uploadPendingFiles(bill: Bill): void {
    const files = this.pendingFiles().map((p) => p.file);
    const uploads: Observable<unknown> = files.length
      ? from(files).pipe(
          concatMap((file) => this.service.uploadAttachment(bill.id, file)),
          last(),
          map(() => undefined),
        )
      : of(undefined);
    uploads.subscribe({
      next: () => this.router.navigate(['/bills', bill.id]),
      // The bill itself is saved; send the user there so they can retry the upload.
      error: () =>
        this.router.navigate(['/bills', bill.id], { queryParams: { uploadFailed: true } }),
    });
  }
}

function revokePreview(pending: PendingFile): void {
  if (pending.preview) URL.revokeObjectURL(pending.preview);
}

function distinct(values: (string | null)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b));
}
