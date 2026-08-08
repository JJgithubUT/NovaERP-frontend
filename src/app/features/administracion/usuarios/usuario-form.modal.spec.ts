import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { QueryClient, provideTanStackQuery } from '@tanstack/angular-query-experimental';
import type { Rol } from '../../../api/models';
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
 * `valido` era un `computed` que leía `form.valid`, y eso es una propiedad, no un
 * signal: el grafo reactivo no la ve, así que el valor memoizado se quedaba
 * congelado en el primer cálculo —formulario vacío, inválido— y escribir en los
 * campos no lo despertaba. Solo se refrescaba de rebote al marcar un rol, que sí
 * toca un signal.
 *
 * El orden de los pasos de estas pruebas es el del bug: marcar el rol **antes**
 * de llenar los campos es lo que dejaba el botón muerto para siempre, porque el
 * único recálculo ocurría cuando el formulario todavía estaba incompleto.
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
