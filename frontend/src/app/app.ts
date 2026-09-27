import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  template: `
    <header class="app-header">
      <div class="container app-header__inner">
        <a routerLink="/" class="brand">Beihilfe Manager</a>
        <a routerLink="/bills/new" class="button button--primary">+ New bill</a>
      </div>
    </header>
    <main class="container">
      <router-outlet />
    </main>
  `,
})
export class App {}
