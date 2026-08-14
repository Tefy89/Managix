import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({ selector: 'app-navigation-placeholder', standalone: true, template: `
  <section class="placeholder-page"><p>Preparación de navegación</p><h1>{{ title }}</h1><div>Esta vista es un placeholder de desarrollo. La funcionalidad se implementará en su módulo correspondiente.</div></section>`,
  styles: [`.placeholder-page { max-width: 900px; } p { color: var(--color-naranja); font-weight: 700; text-transform: uppercase; font-size: 12px; letter-spacing: .08em; } h1 { margin: 8px 0 24px; color: var(--color-azul); } div { padding: 24px; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: white; color: var(--color-text-secondary); }`],
})
export class NavigationPlaceholderComponent {
  readonly title = inject(ActivatedRoute).snapshot.data['title'] as string;
}

