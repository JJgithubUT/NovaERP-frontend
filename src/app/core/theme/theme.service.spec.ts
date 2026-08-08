import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

/**
 * El forzado del tema claro en las pantallas de entrada tiene una condición que
 * es la que le da sentido: **no puede tocar la preferencia guardada**. Si la
 * sobrescribiera, pasar por el login le borraría el modo oscuro a quien lo tenía
 * elegido, y encima de forma silenciosa.
 */
describe('ThemeService · tema forzado en las pantallas de entrada', () => {
  let tema: ThemeService;
  let sistemaOscuro: boolean;
  const matchMediaOriginal = window.matchMedia;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    sistemaOscuro = false;

    // jsdom no implementa matchMedia, y el servicio consulta al SO en su
    // constructor. Se sustituye por lo mínimo que usa: `matches` y el listener
    // de cambios.
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: (media: string) => ({
        media,
        get matches() {
          return sistemaOscuro;
        },
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }),
    });

    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: matchMediaOriginal,
    });
  });

  /** El efecto que pinta la clase corre en cuanto se estabiliza el grafo. */
  function aplicar(): void {
    TestBed.tick();
  }

  it('deja el tema en claro aunque la preferencia sea oscura', () => {
    localStorage.setItem('novaerp.theme', 'dark');
    tema = TestBed.inject(ThemeService);
    aplicar();
    expect(tema.theme()).toBe('dark');

    tema.forzarClaro(true);
    aplicar();

    expect(tema.theme()).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('conserva la preferencia guardada mientras fuerza', () => {
    localStorage.setItem('novaerp.theme', 'dark');
    tema = TestBed.inject(ThemeService);

    tema.forzarClaro(true);
    aplicar();

    // Lo que el usuario eligió sigue intacto, en memoria y en el storage.
    expect(tema.preference()).toBe('dark');
    expect(localStorage.getItem('novaerp.theme')).toBe('dark');
  });

  it('devuelve el tema del usuario al liberarlo', () => {
    localStorage.setItem('novaerp.theme', 'dark');
    tema = TestBed.inject(ThemeService);

    tema.forzarClaro(true);
    aplicar();
    tema.forzarClaro(false);
    aplicar();

    expect(tema.theme()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('no altera nada si la preferencia ya era clara', () => {
    localStorage.setItem('novaerp.theme', 'light');
    tema = TestBed.inject(ThemeService);

    tema.forzarClaro(true);
    aplicar();
    expect(tema.theme()).toBe('light');

    tema.forzarClaro(false);
    aplicar();
    expect(tema.theme()).toBe('light');
  });

  it('también gana al tema del sistema cuando no hay preferencia', () => {
    // Sin clave guardada la preferencia es 'system'; con el SO en oscuro, el
    // login se pintaría oscuro sin este forzado.
    sistemaOscuro = true;
    tema = TestBed.inject(ThemeService);
    aplicar();
    expect(tema.theme()).toBe('dark');

    tema.forzarClaro(true);
    aplicar();

    expect(tema.theme()).toBe('light');
    expect(tema.preference()).toBe('system');
    expect(localStorage.getItem('novaerp.theme')).toBeNull();
  });

  it('el toggle sigue la preferencia, no lo que se ve forzado', () => {
    // Con el tema forzado a claro y la preferencia en oscuro, un toggle que
    // mirara la pantalla "cambiaría" a oscuro sin que nada se moviera.
    localStorage.setItem('novaerp.theme', 'dark');
    tema = TestBed.inject(ThemeService);
    tema.forzarClaro(true);
    aplicar();

    tema.toggle();

    expect(tema.preference()).toBe('light');
  });
});
