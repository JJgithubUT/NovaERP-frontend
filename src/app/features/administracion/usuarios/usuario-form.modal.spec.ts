import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { QueryClient, provideTanStackQuery } from '@tanstack/angular-query-experimental';
import type { Rol, Usuario } from '../../../api/models';
import { CoreApi } from '../../../api/services/core.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { crearQueryClient } from '../../../core/query/query.provider';
import { UsuarioFormModal } from './usuario-form.modal';

const ROL: Rol = {
  id: 'rol-1',
  nombre: 'Vendedor',
  es_sistema: false,
  acceso_total: false,
  activo: true,
  permisos: [],
  usuarios_asignados: 0,
  created_at: '2026-01-01T00:00:00Z',
};

/** Token de tenant con firma de mentira: solo se lee el payload. */
function tokenFalso(): string {
  const b64 = (obj: object) => btoa(JSON.stringify(obj)).replace(/=+$/, '');
  return `${b64({ alg: 'HS256' })}.${b64({
    sub: 'usuario-1',
    tid: 'acme',
    exp: Math.floor(Date.now() / 1000) + 3600,
  })}.firma`;
}

/**
 * Regresión de un botón de guardar que no se habilitaba nunca.
 *
 * `valido` era `computed(() => form.valid && (usuario() !== null ||
 * seleccionados().length > 0))`. `form.valid` es una propiedad, no un signal, y
 * encima estaba a la izquierda de un `&&`: con el formulario vacío —que es como
 * nace el alta— el cortocircuito impedía llegar a los dos signals, así que el
 * `computed` se registraba con **cero** dependencias y quedaba clavado en `false`
 * durante toda la vida del modal. No había orden de acciones que lo despertara:
 * el alta de usuarios no se podía completar desde la interfaz.
 *
 * Por eso las pruebas recorren los dos órdenes —rol primero y campos primero—:
 * los dos tienen que terminar con el botón habilitado.
 */
describe('UsuarioFormModal · habilitación del botón de guardar', () => {
  function montar() {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideTanStackQuery(crearQueryClient()),
        {
          provide: CoreApi,
          useValue: {
            listarRoles: () =>
              Promise.resolve({ count: 1, page: 1, page_size: 100, num_pages: 1, results: [ROL] }),
          },
        },
      ],
    });

    TestBed.inject(AuthStore).setSession(tokenFalso());

    const fixture = TestBed.createComponent(UsuarioFormModal);
    fixture.componentRef.setInput('usuario', null);
    fixture.detectChanges();

    return fixture;
  }

  afterEach(() => {
    TestBed.inject(QueryClient).clear();
    localStorage.clear();
  });

  /** Acceso al interior del componente: `form` y `valido` son `protected`. */
  function interno(fixture: ReturnType<typeof montar>) {
    return fixture.componentInstance as unknown as {
      form: { setValue: (valor: Record<string, string>) => void };
      valido: () => boolean;
      alternarRol: (id: string, marcado: boolean) => void;
    };
  }

  it('arranca deshabilitado con el formulario vacío', () => {
    const fixture = montar();

    expect(interno(fixture).valido()).toBe(false);
  });

  it('se habilita al llenar los campos después de marcar el rol', () => {
    // El escenario que estaba roto: el rol primero, los campos después.
    const fixture = montar();
    const componente = interno(fixture);

    componente.alternarRol('rol-1', true);
    expect(componente.valido()).toBe(false);

    componente.form.setValue({
      nombre_completo: 'Ana Torres',
      correo: 'ana@acme.com',
      telefono: '',
      puesto: '',
      departamento: '',
    });

    expect(componente.valido()).toBe(true);
  });

  it('se habilita al marcar el rol después de llenar los campos', () => {
    const fixture = montar();
    const componente = interno(fixture);

    componente.form.setValue({
      nombre_completo: 'Ana Torres',
      correo: 'ana@acme.com',
      telefono: '',
      puesto: '',
      departamento: '',
    });
    // El alta exige al menos un rol: el backend la rechaza sin ninguno.
    expect(componente.valido()).toBe(false);

    componente.alternarRol('rol-1', true);

    expect(componente.valido()).toBe(true);
  });

  it('vuelve a deshabilitarse si un campo obligatorio se vacía', () => {
    const fixture = montar();
    const componente = interno(fixture);

    componente.alternarRol('rol-1', true);
    componente.form.setValue({
      nombre_completo: 'Ana Torres',
      correo: 'ana@acme.com',
      telefono: '',
      puesto: '',
      departamento: '',
    });
    expect(componente.valido()).toBe(true);

    componente.form.setValue({
      nombre_completo: '',
      correo: 'ana@acme.com',
      telefono: '',
      puesto: '',
      departamento: '',
    });

    expect(componente.valido()).toBe(false);
  });

  it('no se habilita con un correo mal formado', () => {
    const fixture = montar();
    const componente = interno(fixture);

    componente.alternarRol('rol-1', true);
    componente.form.setValue({
      nombre_completo: 'Ana Torres',
      correo: 'ana-arroba-nada',
      telefono: '',
      puesto: '',
      departamento: '',
    });

    expect(componente.valido()).toBe(false);
  });

  it('rellena el formulario al editar un usuario existente', () => {
    // El prellenado vivía en el constructor, donde los `input()` todavía valen
    // `null`: los campos salían vacíos y guardar habría borrado los datos del
    // usuario con cadenas en blanco.
    const existente: Usuario = {
      id: 'usuario-9',
      correo: 'ana@acme.com',
      nombre_completo: 'Ana Torres',
      telefono: '5512345678',
      puesto: 'Compras',
      departamento: 'Operaciones',
      estado: 'activo',
      mfa_enrolado: true,
      ultimo_acceso: null,
      roles: ['Vendedor'],
      created_at: '2026-01-01T00:00:00Z',
    };

    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideTanStackQuery(crearQueryClient()),
        {
          provide: CoreApi,
          useValue: { listarRoles: () => Promise.reject(new Error('no debe pedirse')) },
        },
      ],
    });
    TestBed.inject(AuthStore).setSession(tokenFalso());

    const fixture = TestBed.createComponent(UsuarioFormModal);
    fixture.componentRef.setInput('usuario', existente);
    fixture.detectChanges();

    const componente = fixture.componentInstance as unknown as {
      form: { getRawValue: () => Record<string, string> };
      valido: () => boolean;
    };

    expect(componente.form.getRawValue()).toEqual({
      nombre_completo: 'Ana Torres',
      correo: 'ana@acme.com',
      telefono: '5512345678',
      puesto: 'Compras',
      departamento: 'Operaciones',
    });
    // Al editar no hacen falta roles, así que se puede guardar de inmediato.
    expect(componente.valido()).toBe(true);
  });

  it('vuelve a deshabilitarse si se desmarca el último rol', () => {
    const fixture = montar();
    const componente = interno(fixture);

    componente.form.setValue({
      nombre_completo: 'Ana Torres',
      correo: 'ana@acme.com',
      telefono: '',
      puesto: '',
      departamento: '',
    });
    componente.alternarRol('rol-1', true);
    expect(componente.valido()).toBe(true);

    componente.alternarRol('rol-1', false);

    expect(componente.valido()).toBe(false);
  });
});
