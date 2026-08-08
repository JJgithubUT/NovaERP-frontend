import { TestBed } from '@angular/core/testing';
import { PlataformaStore } from './plataforma.store';

const b64 = (obj: object) => btoa(JSON.stringify(obj)).replace(/=+$/, '');
const dentroDeUnaHora = () => Math.floor(Date.now() / 1000) + 3600;
const haceUnaHora = () => Math.floor(Date.now() / 1000) - 3600;

function token(payload: object): string {
  return `${b64({ alg: 'HS256' })}.${b64(payload)}.firma`;
}

const TOKEN_PLATAFORMA = token({
  sub: 'sysadmin-1',
  typ: 'sysadmin',
  jti: 'jti-1',
  exp: dentroDeUnaHora(),
});

/**
 * El store es lo que decide si el guard deja entrar al portal, así que su
 * criterio tiene que ser estrecho: solo un token con la marca de plataforma y
 * vigente. Lo demás se trata como "no hay sesión" y se manda al acceso, en vez
 * de dejar que la pantalla se monte y se caiga con el primer 401.
 */
describe('PlataformaStore', () => {
  let store: PlataformaStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(PlataformaStore);
  });

  afterEach(() => localStorage.clear());

  it('acepta un token de plataforma vigente', () => {
    store.setToken(TOKEN_PLATAFORMA);

    expect(store.autenticado()).toBe(true);
  });

  it('rechaza un token de tenant guardado en su llave', () => {
    // Sin comprobar `typ`, un token de tenant pegado a mano aquí pasaría el
    // guard y solo lo cazaría el 401 del backend.
    store.setToken(token({ sub: 'usuario-1', tid: 'acme', exp: dentroDeUnaHora() }));

    expect(store.autenticado()).toBe(false);
  });

  it('rechaza un token vencido', () => {
    store.setToken(token({ sub: 'sysadmin-1', typ: 'sysadmin', jti: 'j', exp: haceUnaHora() }));

    expect(store.autenticado()).toBe(false);
  });

  it('rechaza un token con forma inválida', () => {
    store.setToken('esto-no-es-un-jwt');

    expect(store.autenticado()).toBe(false);
  });

  it('usa una llave distinta de la del tenant', () => {
    // Compartirla haría que entrar en una superficie cerrase la sesión de la otra.
    store.setToken(TOKEN_PLATAFORMA);

    expect(localStorage.getItem('novaerp.plataforma.token')).toBe(TOKEN_PLATAFORMA);
    expect(localStorage.getItem('novaerp.token')).toBeNull();
  });

  it('no está listo hasta que llega el contexto de /api/admin/me/', () => {
    store.setToken(TOKEN_PLATAFORMA);
    expect(store.listo()).toBe(false);

    store.setMe({
      id: 'sysadmin-1',
      correo: 'root@novaerp.local',
      activo: true,
      created_at: '2026-01-01T00:00:00Z',
      mfa_enrolado: false,
      sesion: {
        jti: 'jti-1',
        emitida_en: '2026-08-07T10:00:00Z',
        expira_en: '2026-08-07T18:00:00Z',
        ip_origen: '127.0.0.1',
      },
    });

    expect(store.listo()).toBe(true);
    expect(store.correo()).toBe('root@novaerp.local');
    // El vencimiento sale del servidor, no de decodificar el JWT.
    expect(store.expiraEn()).toBe('2026-08-07T18:00:00Z');
  });

  it('no persiste la identidad, solo el token', () => {
    // Guardar el correo permitiría pintar una identidad que ya no corresponde a
    // la sesión viva; `me()` la resuelve en cada arranque.
    store.setToken(TOKEN_PLATAFORMA);
    store.setMe({
      id: 'sysadmin-1',
      correo: 'root@novaerp.local',
      activo: true,
      created_at: '2026-01-01T00:00:00Z',
      mfa_enrolado: false,
      sesion: null,
    });

    const guardado = Object.keys(localStorage);
    expect(guardado).toEqual(['novaerp.plataforma.token']);
  });

  it('limpiar es idempotente', () => {
    // Varias peticiones en vuelo pueden fallar con 401 a la vez.
    store.setToken(TOKEN_PLATAFORMA);
    store.limpiar();
    store.limpiar();

    expect(store.autenticado()).toBe(false);
    expect(store.token()).toBeNull();
    expect(localStorage.getItem('novaerp.plataforma.token')).toBeNull();
  });
});
