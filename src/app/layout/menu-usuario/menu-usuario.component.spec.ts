import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { MeResponse } from '../../api/models';
import { AuthStore } from '../../core/auth/auth.store';
import { ThemeService } from '../../core/theme/theme.service';
import { MenuUsuarioComponent } from './menu-usuario.component';

const ME: MeResponse = {
  usuario: {
    id: 'usuario-1',
    nombre_completo: 'Ana Torres Ruiz',
    correo: 'ana@acme.com',
    estado: 'activo',
    mfa_enrolado: true,
    ultimo_acceso: null,
  },
  tenant: {
    id: 'tenant-1',
    slug: 'acme',
    razon_social: 'ACME',
    estado: 'activo',
    plan: 'BUSINESS',
  },
  roles: ['Vendedor'],
  es_admin: false,
  permisos: [],
  modulos: [],
};

function tokenFalso(): string {
  const b64 = (obj: object) => btoa(JSON.stringify(obj)).replace(/=+$/, '');
  return `${b64({ alg: 'HS256' })}.${b64({
    sub: 'usuario-1',
    tid: 'acme',
    exp: Math.floor(Date.now() / 1000) + 3600,
  })}.firma`;
}

/**
 * El menú de la cuenta de la barra superior.
 *
 * Lo que se fija aquí es sobre todo el comportamiento del panel, que es donde
 * este tipo de componente se rompe: que cierre al navegar y al pulsar fuera, que
 * **no** cierre al cambiar el tema, y que Escape devuelva el foco al avatar. Sin
 * esa última parte, quien navega por teclado se queda sin punto de partida.
 */
describe('MenuUsuarioComponent', () => {
  let fixture: ComponentFixture<MenuUsuarioComponent>;
  let tema: ThemeService;
  let sistemaOscuro: boolean;
  const matchMediaOriginal = window.matchMedia;

  beforeEach(() => {
    localStorage.clear();
    sistemaOscuro = false;

    // jsdom no implementa matchMedia y ThemeService consulta al SO al construirse.
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

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        // Pulsar un `routerLink` navega de verdad: sin una ruta que encaje, el
        // router lanza NG04002 y el test se cae por el camino equivocado.
        provideRouter([{ path: '**', children: [] }]),
      ],
    });

    const store = TestBed.inject(AuthStore);
    store.setSession(tokenFalso());
    store.setMe(ME);
    tema = TestBed.inject(ThemeService);

    fixture = TestBed.createComponent(MenuUsuarioComponent);
    fixture.detectChanges();
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

  const raiz = () => fixture.nativeElement as HTMLElement;
  const disparador = () => raiz().querySelector('button[aria-haspopup="menu"]')!;
  const panel = () => raiz().querySelector('[role="menu"]');
  const entradas = () => [...raiz().querySelectorAll<HTMLElement>('[role^="menuitem"]')];

  /**
   * Texto de una entrada sin el del icono. El icon font funciona por ligaduras,
   * así que `<app-icon name="badge">` aporta literalmente «badge» al
   * `textContent` y compararlo en crudo mediría el nombre del icono.
   */
  function etiqueta(entrada: HTMLElement): string {
    const clon = entrada.cloneNode(true) as HTMLElement;
    clon.querySelectorAll('app-icon').forEach((icono) => icono.remove());
    return (clon.textContent ?? '').replace(/\s+/g, ' ').trim();
  }

  async function abrir(): Promise<void> {
    (disparador() as HTMLButtonElement).click();
    await fixture.whenStable();
  }

  it('arranca cerrado', () => {
    expect(panel()).toBeNull();
    expect(disparador().getAttribute('aria-expanded')).toBe('false');
  });

  it('muestra las iniciales del nombre, primera y última palabra', () => {
    expect(etiqueta(disparador() as HTMLElement)).toContain('AR');
  });

  it('abre el panel al pulsar el avatar', async () => {
    await abrir();

    expect(panel()).not.toBeNull();
    expect(disparador().getAttribute('aria-expanded')).toBe('true');
  });

  it('lleva quién eres en la cabecera del panel', async () => {
    await abrir();

    expect(panel()!.textContent).toContain('Ana Torres Ruiz');
    expect(panel()!.textContent).toContain('ana@acme.com');
  });

  it('tiene exactamente las tres opciones pedidas', async () => {
    await abrir();

    expect(entradas().map(etiqueta)).toEqual(['Mi cuenta', 'Mis sesiones', 'Modo oscuro']);
  });

  it('apunta a las rutas de cuenta del tenant del token', async () => {
    await abrir();
    const enlaces = raiz().querySelectorAll<HTMLAnchorElement>('a[role="menuitem"]');

    expect(enlaces[0]!.getAttribute('href')).toBe('/acme/cuenta/perfil');
    expect(enlaces[1]!.getAttribute('href')).toBe('/acme/cuenta/sesiones');
  });

  it('mueve el foco a la primera entrada al abrir', async () => {
    await abrir();

    expect(document.activeElement).toBe(entradas()[0]);
  });

  it('cierra al pulsar un enlace, porque la pantalla cambia debajo', async () => {
    await abrir();

    entradas()[0]!.click();
    await fixture.whenStable();

    expect(panel()).toBeNull();
  });

  it('alterna el tema y deja el panel abierto', async () => {
    await abrir();
    expect(tema.isDark()).toBe(false);

    const interruptor = entradas()[2]!;
    expect(interruptor.getAttribute('aria-checked')).toBe('false');

    interruptor.click();
    await fixture.whenStable();

    expect(tema.isDark()).toBe(true);
    // Cambiar el tema se aprecia en el sitio y a menudo se quiere deshacer:
    // cerrar obligaría a reabrir el menú para volver atrás.
    expect(panel()).not.toBeNull();
    expect(entradas()[2]!.getAttribute('aria-checked')).toBe('true');
  });

  it('el tema alternado persiste como preferencia del usuario', async () => {
    await abrir();
    entradas()[2]!.click();
    await fixture.whenStable();

    expect(localStorage.getItem('novaerp.theme')).toBe('dark');
  });

  it('cierra con Escape y devuelve el foco al avatar', async () => {
    await abrir();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();

    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(disparador());
  });

  it('cierra al pulsar fuera', async () => {
    await abrir();

    document.body.click();
    await fixture.whenStable();

    expect(panel()).toBeNull();
  });

  it('no se cierra al pulsar dentro del panel', async () => {
    await abrir();

    panel()!
      .querySelector('p')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(panel()).not.toBeNull();
  });

  it('recorre las entradas con las flechas, en ciclo', async () => {
    await abrir();
    const items = entradas();

    const abajo = () =>
      panel()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

    abajo();
    expect(document.activeElement).toBe(items[1]);
    abajo();
    expect(document.activeElement).toBe(items[2]);
    // Desde la última vuelve a la primera.
    abajo();
    expect(document.activeElement).toBe(items[0]);

    panel()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(document.activeElement).toBe(items[2]);
  });
});
