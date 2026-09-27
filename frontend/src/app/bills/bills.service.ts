import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Bill, BillRequest, ClaimUpdate, Payer } from './bill.model';

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
}

/** Extracts a human-readable message from a failed API call. */
export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'The server is not reachable.';
    const detail = error.error?.detail;
    if (typeof detail === 'string' && detail) return detail;
    return `Request failed (${error.status} ${error.statusText}).`;
  }
  return 'Something went wrong.';
}
