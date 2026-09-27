import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Bills · Beihilfe Manager',
    loadComponent: () => import('./bill-list/bill-list').then((m) => m.BillList),
  },
  {
    path: 'bills/new',
    title: 'New bill · Beihilfe Manager',
    loadComponent: () => import('./bill-form/bill-form').then((m) => m.BillForm),
  },
  {
    path: 'bills/:id/edit',
    title: 'Edit bill · Beihilfe Manager',
    loadComponent: () => import('./bill-form/bill-form').then((m) => m.BillForm),
  },
  {
    path: 'bills/:id',
    title: 'Bill · Beihilfe Manager',
    loadComponent: () => import('./bill-detail/bill-detail').then((m) => m.BillDetail),
  },
  { path: '**', redirectTo: '' },
];
