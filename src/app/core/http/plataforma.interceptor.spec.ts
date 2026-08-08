import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../config/api.config';
import { AuthStore } from '../auth/auth.store';
import { PlataformaStore } from '../plataforma/plataforma.store';
import { authInterceptor } from './auth.interceptor';
import { plataformaInterceptor } from './plataforma.interceptor';

const BASE = 'http://api.test';

const b64 = (obj: object) => btoa(JSON.stringify(obj)).replace(/=+$/, '');
const exp = () => Math.floor(Date.now() / 1000) + 3600;

/** Token de tenant: lleva `tid` y no lleva `typ`. */
function tokenTenant(): string {
  return `${b64({ alg: 'HS256' })}.${b64({ sub: 'usuario-1', tid: 'acme', exp: exp() })}.firma`;
}

/** Token de plataforma: lleva `typ: 'sysadmin'` y `jti`, y **no** lleva `tid`. */
function tokenPlataforma(): string {
  return `${b64({ alg: 'HS256' })}.${b64({
    sub: 'sysadmin-1',
    typ: 'sysadmin',
    jti: 'jti-1',
    exp: exp(),
  })}.firma`;
}

/**
 * El aislamiento de las dos superficies en el cliente.
 *
 * No es una precaución teórica: el backend rechaza con 401 un token de tenant en
 * `/api/admin/*` y uno de plataforma en `/api/core/*`, así que cruzarlos rompe la
 * pantalla — y además filtra la credencial de una superficie a endpoints que no
 * son suyos. Un navegador con las dos sesiones abiertas a la vez es el caso
 * normal para quien administra la plataforma y además tiene su propio tenant.
 *
 * Estas pruebas fijan el reparto. Si alguien vuelve a poner un único
 * interceptor que inyecte "el token" en todo `/api/`, aquí se cae.
 */
describe('reparto de Bearer entre superficies', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let tenant: AuthStore;
  let plataforma: PlataformaStore;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, plataformaInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: BASE },
      ],
    });

    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    tenant = TestBed.inject(AuthStore);
    plataforma = TestBed.inject(PlataformaStore);

    // Las dos sesiones abiertas al mismo tiempo, que es el escenario que importa.
    tenant.setSession(tokenTenant());
    plataforma.setToken(tokenPlataforma());
  });

  afterEach(() => {
    backend.verify();
    localStorage.clear();
  });

  function autorizacionDe(url: string): string | null {
    http.get(url).subscribe({ next: () => undefined, error: () => undefined });
    const peticion = backend.expectOne(url);
    const cabecera = peticion.request.headers.get('Authorization');
    peticion.flush({});
    return cabecera;
  }

  it('manda el token de plataforma a /api/admin/', () => {
    expect(autorizacionDe(`${BASE}/api/admin/tenants/`)).toBe(`Bearer ${tokenPlataforma()}`);
  });

  it('no manda el token de tenant a /api/admin/', () => {
    const cabecera = autorizacionDe(`${BASE}/api/admin/tenants/`);

    expect(cabecera).not.toBe(`Bearer ${tokenTenant()}`);
  });

  it('manda el token de tenant a /api/core/', () => {
    expect(autorizacionDe(`${BASE}/api/core/usuarios/`)).toBe(`Bearer ${tokenTenant()}`);
  });

  it('no manda el token de plataforma a /api/core/', () => {
    const cabecera = autorizacionDe(`${BASE}/api/core/usuarios/`);

    expect(cabecera).not.toBe(`Bearer ${tokenPlataforma()}`);
  });

  it('no manda ningún token al login de plataforma', () => {
    // Todavía no hay sesión que acreditar, y mandar la del tenant sería filtrarla.
    expect(autorizacionDe(`${BASE}/api/admin/login/`)).toBeNull();
  });

  it('no manda ningún token al canje del enlace de alta', () => {
    // Lo autoriza el token de un solo uso del enlace, no un JWT. Quien lo usa
    // puede tener una sesión abierta en este navegador que no es la suya.
    expect(autorizacionDe(`${BASE}/api/auth/activar-tenant/`)).toBeNull();
  });

  it('no manda ningún token a otro origen', () => {
    expect(autorizacionDe('https://cdn.ajeno.test/logo.png')).toBeNull();
  });
});
