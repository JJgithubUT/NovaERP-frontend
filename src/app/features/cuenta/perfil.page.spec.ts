import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { QueryClient, provideTanStackQuery } from '@tanstack/angular-query-experimental';
import type { MeResponse, UsuarioActualizado } from '../../api/models';
import { CoreApi } from '../../api/services/core.api';
import { AuthService } from '../../core/auth/auth.service';
import { AuthStore } from '../../core/auth/auth.store';
import { crearQueryClient } from '../../core/query/query.provider';
import { PerfilPage } from './perfil.page';

function tokenFalso(): string {
  const b64 = (obj: object) => btoa(JSON.stringify(obj)).replace(/=+$/, '');
  return `${b64({ alg: 'HS256' })}.${b64({
    sub: 'usuario-1',
    tid: 'acme',
    exp: Math.floor(Date.now() / 1000) + 3600,
  })}.firma`;
}

/** Contexto de `/api/core/me/`. Incluye `telefono` (antes no lo traía; ver historial). */
const ME: MeResponse = {
  usuario: {
    id: 'usuario-1',
    nombre_completo: 'Ana Torres',
    correo: 'ana@acme.com',
    telefono: null,
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

/**
 * «Mi cuenta»: dos fallos con causas distintas.
 *
 * 1. **El nombre.** Se sembraba en el cuerpo del constructor leyendo
 *    `store.usuario()`, que en un arranque en frío —sin el `me` cacheado en
 *    localStorage— todavía es `null`: el campo se quedaba vacío para siempre y,
 *    al ser obligatorio, el botón quedaba deshabilitado.
 *
 * 2. **El teléfono.** Sí se guardaba; lo que no había era forma de verlo:
 *    `/api/core/me/` no devolvía `telefono`, así que el campo arrancaba en
 *    blanco y parecía que el guardado no había surtido efecto. Ahora `/me/` sí
 *    lo trae, se siembra desde ahí como el nombre, y dejarlo en blanco al
 *    guardar es la forma de borrarlo (se manda `telefono: null` explícito).
 */
describe('PerfilPage', () => {
  let editarUsuario: ReturnType<typeof vi.fn>;
  let cargarMe: ReturnType<typeof vi.fn>;

  function montar({ conMeCacheado }: { conMeCacheado: boolean }) {
    localStorage.clear();
    editarUsuario = vi.fn();
    cargarMe = vi.fn().mockResolvedValue(ME);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideTanStackQuery(crearQueryClient()),
        { provide: CoreApi, useValue: { editarUsuario } },
        { provide: AuthService, useValue: { loadMe: cargarMe } },
      ],
    });

    const store = TestBed.inject(AuthStore);
    store.setSession(tokenFalso());
    // Arranque templado: el contexto ya está antes de crear el componente.
    if (conMeCacheado) store.setMe(ME);

    const fixture = TestBed.createComponent(PerfilPage);
    fixture.detectChanges();

    return {
      fixture,
      store,
      interno: fixture.componentInstance as unknown as {
        form: {
          getRawValue: () => { nombre_completo: string; telefono: string };
          patchValue: (valor: Partial<{ nombre_completo: string; telefono: string }>) => void;
          invalid: boolean;
        };
        guardar: () => void;
        quitarTelefono: () => void;
      },
    };
  }

  afterEach(() => {
    TestBed.inject(QueryClient).clear();
    localStorage.clear();
  });

  it('siembra el nombre cuando el contexto ya estaba en caché', () => {
    const { interno } = montar({ conMeCacheado: true });

    expect(interno.form.getRawValue().nombre_completo).toBe('Ana Torres');
  });

  it('siembra el nombre cuando el contexto llega después (arranque en frío)', async () => {
    // El caso que estaba roto: sin `me` al construir, el efecto tiene que
    // despertar cuando llegue.
    const { fixture, store, interno } = montar({ conMeCacheado: false });
    expect(interno.form.getRawValue().nombre_completo).toBe('');

    store.setMe(ME);
    await fixture.whenStable();

    expect(interno.form.getRawValue().nombre_completo).toBe('Ana Torres');
    expect(interno.form.invalid).toBe(false);
  });

  it('no pisa lo que se está escribiendo cuando el contexto se recarga', async () => {
    const { fixture, store, interno } = montar({ conMeCacheado: true });

    interno.form.patchValue({ nombre_completo: 'Ana Torres Ruiz' });
    // Un `loadMe()` de después de guardar trae el nombre nuevo del servidor.
    store.setMe({ ...ME, usuario: { ...ME.usuario, nombre_completo: 'Ana Torres Ruiz' } });
    await fixture.whenStable();

    expect(interno.form.getRawValue().nombre_completo).toBe('Ana Torres Ruiz');
  });

  it('el teléfono arranca en blanco cuando el usuario no tiene uno guardado', () => {
    const { interno } = montar({ conMeCacheado: true });

    expect(interno.form.getRawValue().telefono).toBe('');
  });

  it('siembra el teléfono desde el contexto cuando el usuario ya tiene uno', async () => {
    // No se usa el `ME` base porque ese no trae teléfono; se prueba aparte
    // para no acoplar los demás casos a un valor no-nulo por defecto.
    const { fixture, store, interno } = montar({ conMeCacheado: false });
    store.setMe({ ...ME, usuario: { ...ME.usuario, telefono: '5599887766' } });
    await fixture.whenStable();

    expect(interno.form.getRawValue().telefono).toBe('5599887766');
  });

  it('manda el teléfono como `null` si se deja en blanco, para borrarlo', async () => {
    const { interno } = montar({ conMeCacheado: true });
    editarUsuario.mockResolvedValue({ ...ME.usuario, telefono: null });

    interno.guardar();

    // `mutate()` difiere la llamada a un microtask: asertar en seco vería cero.
    await vi.waitFor(() => expect(editarUsuario).toHaveBeenCalled());
    expect(editarUsuario).toHaveBeenCalledWith('usuario-1', {
      nombre_completo: 'Ana Torres',
      telefono: null,
    });
  });

  it('"Quitar" limpia el campo y el siguiente guardado borra el teléfono', async () => {
    const { fixture, store, interno } = montar({ conMeCacheado: false });
    store.setMe({ ...ME, usuario: { ...ME.usuario, telefono: '5599887766' } });
    await fixture.whenStable();
    expect(interno.form.getRawValue().telefono).toBe('5599887766');

    interno.quitarTelefono();
    expect(interno.form.getRawValue().telefono).toBe('');

    editarUsuario.mockResolvedValue({ ...ME.usuario, telefono: null });
    interno.guardar();

    await vi.waitFor(() =>
      expect(editarUsuario).toHaveBeenCalledWith('usuario-1', {
        nombre_completo: 'Ana Torres',
        telefono: null,
      }),
    );
  });

  it('manda el teléfono cuando se escribe uno, sin espacios', async () => {
    const { interno } = montar({ conMeCacheado: true });
    editarUsuario.mockResolvedValue({ ...ME.usuario, telefono: '5512345678' });

    interno.form.patchValue({ telefono: ' 5512345678 ' });
    interno.guardar();

    await vi.waitFor(() =>
      expect(editarUsuario).toHaveBeenCalledWith('usuario-1', {
        nombre_completo: 'Ana Torres',
        telefono: '5512345678',
      }),
    );
  });

  it('muestra el teléfono que devolvió el servidor, no el que se escribió', async () => {
    // Es la única confirmación posible de que quedó guardado. Se devuelve un
    // valor DISTINTO del escrito a propósito: si el campo acabara mostrando el
    // texto original, la prueba pasaría sin que `onSuccess` hubiera corrido.
    const { interno } = montar({ conMeCacheado: true });
    const respuesta: UsuarioActualizado = {
      id: 'usuario-1',
      correo: 'ana@acme.com',
      nombre_completo: 'Ana Torres',
      telefono: '5599887766',
      puesto: null,
      departamento: null,
      estado: 'activo',
      roles: ['Vendedor'],
      created_at: '2026-01-01T00:00:00Z',
    };
    editarUsuario.mockResolvedValue(respuesta);

    interno.form.patchValue({ telefono: '5512345678' });
    interno.guardar();

    await vi.waitFor(() => expect(interno.form.getRawValue().telefono).toBe('5599887766'));
    // El shell pinta el nombre desde el `me` cacheado: hay que recargarlo.
    expect(cargarMe).toHaveBeenCalled();
  });
});
