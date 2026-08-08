import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { QueryClient, provideTanStackQuery } from '@tanstack/angular-query-experimental';
import type { Rol } from '../../../api/models';
import { CoreApi } from '../../../api/services/core.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { crearQueryClient } from '../../../core/query/query.provider';
import { RolFormModal } from './rol-form.modal';

/** Rol con permisos agrupados por dominio, como los devuelve el backend. */
const ROL: Rol = {
  id: 'rol-7',
  nombre: 'Oficial de Seguridad',
  es_sistema: false,
  acceso_total: false,
  activo: true,
  usuarios_asignados: 3,
  permisos: [
    {
      dominio: 'core',
      permisos: [
        { codigo: 'core:politicas:editar', inerte: false },
        { codigo: 'core:bitacora:leer', inerte: false },
      ],
    },
    {
      dominio: 'ventas',
      permisos: [{ codigo: 'ventas:reportes:leer', inerte: false }],
    },
  ],
  created_at: '2026-01-01T00:00:00Z',
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
 * Regresión del prellenado al editar un rol.
 *
 * El nombre y los permisos marcados se sembraban en el constructor, y los valores
 * de los `input()` de signals se asignan **después** de construir el componente:
 * el diálogo abría con el nombre en blanco y **ningún** permiso marcado. Guardar
 * así no era un formulario incompleto, era una revocación silenciosa de todos los
 * permisos del rol.
 */
describe('RolFormModal · prellenado al editar', () => {
  function montar(rol: Rol | null) {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideTanStackQuery(crearQueryClient()),
        {
          provide: CoreApi,
          // El catálogo se queda pendiente a propósito: el prellenado no depende
          // de él y así el test no espera a la red.
          useValue: { catalogoPermisos: () => new Promise(() => undefined) },
        },
      ],
    });

    TestBed.inject(AuthStore).setSession(tokenFalso());

    const fixture = TestBed.createComponent(RolFormModal);
    fixture.componentRef.setInput('rol', rol);
    fixture.detectChanges();

    return fixture.componentInstance as unknown as {
      nombre: () => string;
      seleccionados: () => string[];
      valido: () => boolean;
    };
  }

  afterEach(() => {
    TestBed.inject(QueryClient).clear();
    localStorage.clear();
  });

  it('rellena el nombre del rol', () => {
    expect(montar(ROL).nombre()).toBe('Oficial de Seguridad');
  });

  it('marca los permisos que el rol ya tenía, aplanando los dominios', () => {
    // El rol los trae agrupados por dominio; el selector trabaja con códigos.
    expect([...montar(ROL).seleccionados()].sort()).toEqual([
      'core:bitacora:leer',
      'core:politicas:editar',
      'ventas:reportes:leer',
    ]);
  });

  it('habilita guardar de entrada al editar', () => {
    // Con el nombre en blanco el botón salía deshabilitado y el diálogo era un
    // callejón sin salida.
    expect(montar(ROL).valido()).toBe(true);
  });

  it('arranca vacío al crear un rol nuevo', () => {
    const componente = montar(null);

    expect(componente.nombre()).toBe('');
    expect(componente.seleccionados()).toEqual([]);
    expect(componente.valido()).toBe(false);
  });
});
