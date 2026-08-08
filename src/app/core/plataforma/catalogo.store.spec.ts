import { TestBed } from '@angular/core/testing';
import type { CatalogosPlataforma } from '../../api/models';
import { PlataformaApi } from '../../api/services/plataforma.api';
import { CatalogoPlataforma } from './catalogo.store';

/**
 * Espejo reducido de lo que devuelve `GET /api/admin/catalogos/`: el núcleo, la
 * fase de operación con su dependencia real (ventas y compras necesitan
 * inventario), un plan retirado y un módulo no contratable en ningún plan.
 */
const CATALOGO: CatalogosPlataforma = {
  planes: [
    {
      codigo: 'STARTER',
      nombre: 'Starter',
      licencias_max: 10,
      activo: true,
      modulos: ['USUARIOS', 'INVENTARIO'],
    },
    {
      codigo: 'BUSINESS',
      nombre: 'Business',
      licencias_max: 50,
      activo: true,
      modulos: ['USUARIOS', 'INVENTARIO', 'VENTAS', 'COMPRAS'],
    },
    {
      codigo: 'LEGACY',
      nombre: 'Legacy',
      licencias_max: 25,
      activo: false,
      modulos: ['USUARIOS', 'INVENTARIO'],
    },
  ],
  modulos: [
    {
      codigo: 'USUARIOS',
      nombre: 'Gestión de Usuarios',
      fase: 0,
      nucleo: true,
      depende_de: [],
      requerido_por: [],
      planes: ['STARTER', 'BUSINESS', 'LEGACY'],
    },
    {
      codigo: 'INVENTARIO',
      nombre: 'Inventario',
      fase: 1,
      nucleo: false,
      depende_de: [],
      requerido_por: ['VENTAS', 'COMPRAS'],
      planes: ['STARTER', 'BUSINESS', 'LEGACY'],
    },
    {
      codigo: 'VENTAS',
      nombre: 'Ventas / CRM',
      fase: 1,
      nucleo: false,
      depende_de: ['INVENTARIO'],
      requerido_por: [],
      planes: ['BUSINESS'],
    },
    {
      codigo: 'COMPRAS',
      nombre: 'Compras',
      fase: 1,
      nucleo: false,
      depende_de: ['INVENTARIO'],
      requerido_por: [],
      planes: ['BUSINESS'],
    },
    {
      codigo: 'BI',
      nombre: 'Reportería / BI',
      fase: 2,
      nucleo: false,
      depende_de: [],
      requerido_por: [],
      planes: [],
    },
  ],
  dominios_reservados: ['admin', 'portal', 'sysadmin'],
};

/**
 * Este store existe para que el portal no replique el seed del backend, y su
 * valor está justo en las reglas que anticipa: si divergen de las que valida
 * `_resolver_modulos`, el portal ofrece cosas que el 422 después rechaza. Estas
 * pruebas fijan esa equivalencia contra la forma real del catálogo.
 */
describe('CatalogoPlataforma', () => {
  let catalogo: CatalogoPlataforma;
  let pedirCatalogos: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    pedirCatalogos = vi.fn().mockResolvedValue(CATALOGO);

    TestBed.configureTestingModule({
      providers: [{ provide: PlataformaApi, useValue: { catalogos: pedirCatalogos } }],
    });

    catalogo = TestBed.inject(CatalogoPlataforma);
    await catalogo.cargar();
  });

  describe('planes', () => {
    it('deja fuera del alta los planes retirados', () => {
      // El POST responde 422 si se le manda uno, así que el selector no debe
      // ofrecerlo.
      expect(catalogo.planesVigentes().map((plan) => plan.codigo)).toEqual(['STARTER', 'BUSINESS']);
    });

    it('conserva los retirados en el catálogo completo', () => {
      // Hay organizaciones contratadas en ellos y el detalle tiene que nombrarlas.
      expect(catalogo.plan('LEGACY')?.nombre).toBe('Legacy');
      expect(catalogo.plan('LEGACY')?.activo).toBe(false);
    });

    it('sabe qué módulos incluye cada plan', () => {
      expect(catalogo.planIncluye('STARTER', 'VENTAS')).toBe(false);
      expect(catalogo.planIncluye('BUSINESS', 'VENTAS')).toBe(true);
    });
  });

  describe('módulos', () => {
    it('distingue "no contratable" de "no incluido en este plan"', () => {
      // `planes: []` no es un plan que falte: no hay ninguno al que subir. Ofrecer
      // "actualiza el plan" ahí sería mentir.
      expect(catalogo.esContratable('BI')).toBe(false);
      expect(catalogo.esContratable('VENTAS')).toBe(true);
    });

    it('marca el núcleo sin que la pantalla tenga que saberse la fase', () => {
      expect(catalogo.modulo('USUARIOS')?.nucleo).toBe(true);
      expect(catalogo.modulo('INVENTARIO')?.nucleo).toBe(false);
    });

    it('agrupa por las fases que el catálogo trae, sin asumir 0/1/2', () => {
      expect(catalogo.fases()).toEqual([0, 1, 2]);
      expect(catalogo.modulosDeFase(1).map((modulo) => modulo.codigo)).toEqual([
        'INVENTARIO',
        'VENTAS',
        'COMPRAS',
      ]);
    });
  });

  describe('cascada de desactivación', () => {
    it('arrastra a los dependientes activos', () => {
      const afectados = catalogo.dependientesActivos(
        ['INVENTARIO'],
        ['USUARIOS', 'INVENTARIO', 'VENTAS', 'COMPRAS'],
      );

      expect([...afectados].sort()).toEqual(['COMPRAS', 'VENTAS']);
    });

    it('ignora los dependientes que ya estaban apagados', () => {
      // Apagar algo que ya está apagado no es un efecto que haya que confirmar.
      const afectados = catalogo.dependientesActivos(
        ['INVENTARIO'],
        ['USUARIOS', 'INVENTARIO', 'VENTAS'],
      );

      expect(afectados).toEqual(['VENTAS']);
    });

    it('no reporta nada al apagar una hoja del grafo', () => {
      expect(
        catalogo.dependientesActivos(['VENTAS'], ['USUARIOS', 'INVENTARIO', 'VENTAS']),
      ).toEqual([]);
    });

    it('expone las dependencias que exige encender un módulo', () => {
      expect(catalogo.dependenciasDe('VENTAS')).toEqual(['INVENTARIO']);
      expect(catalogo.dependenciasDe('INVENTARIO')).toEqual([]);
    });
  });

  describe('validarSlug', () => {
    it('exige el dominio', () => {
      expect(catalogo.validarSlug('')).toContain('obligatorio');
    });

    it('rechaza la forma inválida', () => {
      expect(catalogo.validarSlug('ab')).toContain('3 a 50');
      expect(catalogo.validarSlug('ACME')).toContain('minúsculas');
      expect(catalogo.validarSlug('con espacio')).toContain('minúsculas');
    });

    it('rechaza las palabras reservadas que manda el servidor', () => {
      // La lista no está codificada en el cliente: llega en el catálogo, así que
      // añadir una en la base la bloquea aquí sin tocar el frontend.
      expect(catalogo.validarSlug('admin')).toContain('reservado');
      expect(catalogo.validarSlug('sysadmin')).toContain('reservado');
    });

    it('acepta un dominio válido', () => {
      expect(catalogo.validarSlug('acme')).toBeNull();
      expect(catalogo.validarSlug('acme-2')).toBeNull();
    });
  });

  describe('carga', () => {
    it('no vuelve a pedir el catálogo si ya lo tiene', async () => {
      await catalogo.cargar();

      expect(pedirCatalogos).toHaveBeenCalledTimes(1);
    });
  });
});

describe('CatalogoPlataforma sin catálogo', () => {
  it('deduplica las cargas concurrentes', async () => {
    // El layout y un modal pueden pedirlo a la vez en el mismo tick.
    const pedirCatalogos = vi.fn().mockResolvedValue(CATALOGO);
    TestBed.configureTestingModule({
      providers: [{ provide: PlataformaApi, useValue: { catalogos: pedirCatalogos } }],
    });
    const catalogo = TestBed.inject(CatalogoPlataforma);

    await Promise.all([catalogo.cargar(), catalogo.cargar(), catalogo.cargar()]);

    expect(pedirCatalogos).toHaveBeenCalledTimes(1);
    expect(catalogo.listo()).toBe(true);
  });

  it('deja reintentar después de un fallo', async () => {
    const pedirCatalogos = vi
      .fn()
      .mockRejectedValueOnce(new Error('sin red'))
      .mockResolvedValue(CATALOGO);
    TestBed.configureTestingModule({
      providers: [{ provide: PlataformaApi, useValue: { catalogos: pedirCatalogos } }],
    });
    const catalogo = TestBed.inject(CatalogoPlataforma);

    await catalogo.cargar();
    expect(catalogo.error()).toBe('sin red');
    expect(catalogo.listo()).toBe(false);

    await catalogo.cargar();
    expect(catalogo.error()).toBeNull();
    expect(catalogo.listo()).toBe(true);
  });
});
