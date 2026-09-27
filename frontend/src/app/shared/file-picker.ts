import { Component, input, output } from '@angular/core';

/** Buttons to take a photo with the camera (touch devices only) or pick images / PDFs. */
@Component({
  selector: 'app-file-picker',
  template: `
    <div class="button-row">
      <label class="button button--primary touch-only" [class.disabled]="disabled()">
        Take photo
        <input
          type="file"
          accept="image/*"
          capture="environment"
          class="visually-hidden"
          [disabled]="disabled()"
          (change)="onChange($event)"
        />
      </label>
      <label class="button" [class.disabled]="disabled()">
        Add photo or PDF
        <input
          type="file"
          accept="image/*,application/pdf"
          multiple
          class="visually-hidden"
          [disabled]="disabled()"
          (change)="onChange($event)"
        />
      </label>
    </div>
  `,
})
export class FilePicker {
  readonly disabled = input(false);
  readonly picked = output<File[]>();

  protected onChange(event: Event): void {
    const element = event.target as HTMLInputElement;
    const files = Array.from(element.files ?? []);
    element.value = ''; // allow picking the same file again
    if (files.length) this.picked.emit(files);
  }
}
