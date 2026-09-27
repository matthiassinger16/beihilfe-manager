import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { from, Observable, switchMap } from 'rxjs';
import { shrinkImage } from '../shared/shrink-image';
import { Attachment, Bill, BillRequest, ClaimUpdate, Payer } from './bill.model';

@Injectable({ providedIn: 'root' })
export class BillsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/bills';

  list(): Observable<Bill[]> {
    return this.http.get<Bill[]>(this.baseUrl);
  }

  get(id: number): Observable<Bill> {
    return this.http.get<Bill>(`${this.baseUrl}/${id}`);
  }

  create(request: BillRequest): Observable<Bill> {
    return this.http.post<Bill>(this.baseUrl, request);
  }

  update(id: number, request: BillRequest): Observable<Bill> {
    return this.http.put<Bill>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  setPayment(id: number, paidOn: string | null): Observable<Bill> {
    return this.http.put<Bill>(`${this.baseUrl}/${id}/payment`, { paidOn });
  }

  updateClaim(id: number, payer: Payer, update: ClaimUpdate): Observable<Bill> {
    return this.http.put<Bill>(`${this.baseUrl}/${id}/${payer}`, update);
  }

  listAttachments(billId: number): Observable<Attachment[]> {
    return this.http.get<Attachment[]>(`${this.baseUrl}/${billId}/attachments`);
  }

  /** Uploads a scan or photo; large photos are scaled down first to save space on the server. */
  uploadAttachment(billId: number, file: File): Observable<Attachment> {
    return from(shrinkImage(file)).pipe(
      switchMap((upload) => {
        const body = new FormData();
        body.append('file', upload, upload.name);
        return this.http.post<Attachment>(`${this.baseUrl}/${billId}/attachments`, body);
      }),
    );
  }

  deleteAttachment(id: number): Observable<void> {
    return this.http.delete<void>(`/api/attachments/${id}`);
  }
}

/** Extracts a human-readable message from a failed API call. */
export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'The server is not reachable.';
    if (error.status === 413) return 'The file is too large (max. 25 MB).';
    const detail = error.error?.detail;
    if (typeof detail === 'string' && detail) return detail;
    return `Request failed (${error.status} ${error.statusText}).`;
  }
  return 'Something went wrong.';
}
