import { Injectable, computed, effect, signal } from '@angular/core';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'novaerp.theme';

/**
 * Tema claro/oscuro. Las plantillas asumen la estrategia de clase
 * (`darkMode: "class"`), que es también la única que permite un toggle manual.
 *
 * Hay tres preferencias, no dos: 'system' no es lo mismo que elegir 'light'
 * cuando el SO está en claro. Si el usuario no ha decidido, seguimos al SO en
 * vivo — incluido el cambio automático al anochecer.
 *
 * El primer pintado NO lo hace este servicio: lo hace un script inline en
 * `index.html`, que corre antes de que Angular arranque. Si esperáramos al
 * bootstrap, un usuario en modo oscuro vería un flashazo blanco en cada carga.
 * Este servicio toma el relevo después y mantiene la clase sincronizada.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _preference = signal<ThemePreference>(leerPreferencia());

  /** Lo que el usuario eligió, incluido 'system'. */
  readonly preference = this._preference.asReadonly();

  /** Lo que el SO pide ahora mismo. Se actualiza solo si el SO cambia. */
  private readonly systemPrefersDark = signal(consultarSistema());

  /** El tema realmente aplicado, ya resuelto. */
  readonly theme = computed<ResolvedTheme>(() => {
    const preference = this._preference();
    if (preference !== 'system') return preference;
    return this.systemPrefersDark() ? 'dark' : 'light';
  });

  readonly isDark = computed(() => this.theme() === 'dark');

  constructor() {
    this.escucharSistema();

    effect(() => {
      const theme = this.theme();
      document.documentElement.classList.toggle('dark', theme === 'dark');
      // Le dice al navegador de qué color pintar los scrollbars y los
      // controles nativos; sin esto quedan claros sobre un fondo oscuro.
      document.documentElement.style.colorScheme = theme;
    });
  }

  set(preference: ThemePreference): void {
    this._preference.set(preference);

    if (preference === 'system') {
      // Quitar la clave es lo que hace que 'system' sea el default de verdad,
      // y no un valor más que haya que interpretar al leer.
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, preference);
    }
  }

  /** Alterna entre claro y oscuro partiendo de lo que se ve ahora. */
  toggle(): void {
    this.set(this.isDark() ? 'light' : 'dark');
  }

  private escucharSistema(): void {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    query.addEventListener('change', (event) => this.systemPrefersDark.set(event.matches));
  }
}

function leerPreferencia(): ThemePreference {
  const guardada = localStorage.getItem(STORAGE_KEY);
  return guardada === 'light' || guardada === 'dark' ? guardada : 'system';
}

function consultarSistema(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
