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

  /**
   * Las pantallas de entrada (login, activación) van siempre en claro: ahí
   * todavía no se sabe quién está delante, y la preferencia del navegador es la
   * de la última persona que lo usó. Lo gobierna `provideTemaDeEntrada`.
   */
  private readonly _forzarClaro = signal(false);

  /** El tema que corresponde a la preferencia, sin contar el forzado. */
  private readonly temaPreferido = computed<ResolvedTheme>(() => {
    const preference = this._preference();
    if (preference !== 'system') return preference;
    return this.systemPrefersDark() ? 'dark' : 'light';
  });

  /** El tema realmente aplicado, ya resuelto. */
  readonly theme = computed<ResolvedTheme>(() =>
    this._forzarClaro() ? 'light' : this.temaPreferido(),
  );

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

  /**
   * Alterna entre claro y oscuro partiendo de lo que se ve ahora.
   *
   * Se apoya en la preferencia y no en `isDark()`: con el tema forzado a claro,
   * `isDark()` sería `false` aunque la preferencia sea oscura, y el toggle
   * "cambiaría" a oscuro sin que nada se moviera en pantalla. Hoy no es
   * alcanzable —el toggle vive en el shell y ahí no se fuerza nada— pero dejarlo
   * dependiendo de un estado transitorio es una trampa para más adelante.
   */
  toggle(): void {
    this.set(this.temaPreferido() === 'dark' ? 'light' : 'dark');
  }

  /**
   * Fuerza el tema claro sin tocar la preferencia guardada. Al liberarlo, el
   * usuario recupera exactamente lo que tenía.
   */
  forzarClaro(activo: boolean): void {
    this._forzarClaro.set(activo);
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
