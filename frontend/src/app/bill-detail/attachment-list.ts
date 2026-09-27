import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { concatMap, from } from 'rxjs';
import { Attachment } from '../bills/bill.model';
import { BillsService, errorMessage } from '../bills/bills.service';
import { FilePicker } from '../shared/file-picker';
import { fileLabel, isPreviewableImage } from '../shared/file-kind';

/** Scans and photos of one bill, with upload and delete. */
@Component({
  selector: 'app-attachment-list',
  imports: [FilePicker],
  template: `
    <section class="card attachments">
      <header class="track__header">
        <h2>Scans &amp; photos</h2>
      </header>

      @if (error(); as message) {
        <p class="alert alert--error" role="alert">{{ message }}</p>
      }

      @if (attachments(); as list) {
        @if (list.length) {
          <div class="attachment-grid">
            @for (attachment of list; track attachment.id) {
              <figure class="attachment">
                <a
                  class="attachment__preview"
                  [href]="attachment.url"
                  target="_blank"
                  rel="noopener"
                  [attr.aria-label]="'Open ' + attachment.filename"
                >
                  @if (isPreviewableImage(attachment.contentType)) {
                    <img [src]="attachment.url" alt="" loading="lazy" />
                  } @else {
                    <span class="attachment__label">{{
                      fileLabel(attachment.filename, attachment.contentType)
                    }}</span>
                  }
                </a>
                <figcaption>
                  <span class="attachment__name" [title]="attachment.filename">{{
                    attachment.filename
                  }}</span>
                  <button
                    type="button"
                    class="icon-button"
                    [attr.aria-label]="'Delete ' + attachment.filename"
                    [disabled]="busy()"
                    (click)="remove(attachment)"
                  >
                    ✕
                  </button>
                </figcaption>
              </figure>
            }
          </div>
        } @else {
          <p class="muted">No scans or photos yet.</p>
        }
      }

      @if (uploading()) {
        <p class="muted">Uploading…</p>
      }
      <app-file-picker [disabled]="busy()" (picked)="upload($event)" />
    </section>
  `,
})
export class AttachmentList {
  private readonly service = inject(BillsService);

  readonly billId = input.required<number>();

  protected readonly attachments = signal<Attachment[] | null>(null);
  protected readonly uploading = signal(false);
  protected readonly deleting = signal(false);
  protected readonly busy = computed(() => this.uploading() || this.deleting());
  protected readonly error = signal<string | null>(null);

  protected readonly isPreviewableImage = isPreviewableImage;
  protected readonly fileLabel = fileLabel;

  constructor() {
    effect(() => {
      this.service.listAttachments(this.billId()).subscribe({
        next: (list) => this.attachments.set(list),
        error: (err) => this.error.set(errorMessage(err)),
      });
    });
  }

  protected upload(files: File[]): void {
    this.uploading.set(true);
    this.error.set(null);
    from(files)
      .pipe(concatMap((file) => this.service.uploadAttachment(this.billId(), file)))
      .subscribe({
        next: (attachment) => this.attachments.update((list) => [...(list ?? []), attachment]),
        error: (err) => {
          this.error.set(errorMessage(err));
          this.uploading.set(false);
        },
        complete: () => this.uploading.set(false),
      });
  }

  protected remove(attachment: Attachment): void {
    if (!confirm(`Delete ${attachment.filename}?`)) return;
    this.deleting.set(true);
    this.error.set(null);
    this.service.deleteAttachment(attachment.id).subscribe({
      next: () => {
        this.attachments.update((list) => list?.filter((a) => a.id !== attachment.id) ?? null);
        this.deleting.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.deleting.set(false);
      },
    });
  }
}
