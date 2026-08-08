import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { QueryClient } from '@tanstack/angular-query-experimental';
import { API_BASE_URL } from '../config/api.config';
import { authInterceptor } from '../http/auth.interceptor';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';

const BASE = 'http://api.test';
const URL_LOGOUT = `${BASE}/api/auth/logout/`;

/** Token con firma de mentira: `decodeJwt` no la verifica, solo lee el payload. */
function tokenFalso(): string {
  const payload = {
    sub: 'usuario-1',
    tid: 'acme',
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  const b64 = (obj: object) => btoa(JSON.stringify(obj)).replace(/=+$/, '');
  return `${b64({ alg: 'HS256' })}.${b64(payload)}.firma`;
}

/**
 * El cierre de sesión tiene dos mitades con garantías distintas: la revocación
 * en el servidor (RF-17) es best-effort, la limpieza local es obligatoria.
 * Estas pruebas fijan justo esa asimetría, que es lo que se rompe si alguien
 * "simplifica" el método más adelante.
 */
describe('AuthService.logout', () => {
  let auth: AuthService;
  let store: AuthStore;
  let backend: HttpTestingController;
  let navegar: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    navegar = vi.fn().mockResolvedValue(true);

    TestBed.configureTestingModule({
      providers: [
        // Con `authInterceptor`: sin él el Bearer no viaja y la prueba del
        // orden (revocar antes de limpiar) no probaría nada.
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: BASE },
        { provide: Router, useValue: { navigateByUrl: navegar } },
        { provide: QueryClient, useValue: { clear: vi.fn() } },
      ],
    });

    auth = TestBed.inject(AuthService);
    store = TestBed.inject(AuthStore);
    backend = TestBed.inject(HttpTestingController);

    store.setSession(tokenFalso());
  });

  afterEach(() => {
    backend.verify();
    localStorage.clear();
  });

  it('revoca la sesión en el servidor cuando sale el usuario', async () => {
    const promesa = auth.logout();

    const peticion = backend.expectOne(URL_LOGOUT);
    expect(peticion.request.method).toBe('POST');
    peticion.flush({ detail: 'Sesion cerrada.' });

    await promesa;

    expect(store.token()).toBeNull();
    expect(navegar).toHaveBeenCalledWith('/login', { replaceUrl: true });
  });

  it('manda el Bearer todavía vigente: si limpiara antes, el backend no sabría qué revocar', async () => {
    const tokenAntes = store.token();
    const promesa = auth.logout();

    const peticion = backend.expectOne(URL_LOGOUT);
    expect(peticion.request.headers.get('Authorization')).toBe(`Bearer ${tokenAntes}`);
    peticion.flush({});

    await promesa;
    expect(store.token()).toBeNull();
  });

  it('no revoca cuando el disparador es un 401: esa sesión ya está muerta', async () => {
    await auth.logout({ revocar: false });

    // El `backend.verify()` del afterEach falla si se hubiera emitido alguna.
    backend.expectNone(URL_LOGOUT);
    expect(store.token()).toBeNull();
  });

  it('cierra igual aunque la revocación falle: dejar al usuario dentro sería peor', async () => {
    const promesa = auth.logout();

    backend
      .expectOne(URL_LOGOUT)
      .flush({ detail: 'Boom' }, { status: 500, statusText: 'Server Error' });

    await expect(promesa).resolves.toBeUndefined();
    expect(store.token()).toBeNull();
    expect(navegar).toHaveBeenCalled();
  });

  it('cierra igual sin red', async () => {
    const promesa = auth.logout();

    backend.expectOne(URL_LOGOUT).error(new ProgressEvent('error'));

    await promesa;
    expect(store.token()).toBeNull();
  });

  it('sin token no hay nada que revocar', async () => {
    store.clear();

    await auth.logout();

    backend.expectNone(URL_LOGOUT);
  });
});
