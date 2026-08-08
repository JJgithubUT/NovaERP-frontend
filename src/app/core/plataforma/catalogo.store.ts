import { Injectable, computed, inject, signal } from '@angular/core';
import type { CatalogosPlataforma, ModuloCatalogo, PlanCatalogo } from '../../api/models';
import { PlataformaApi } from '../../api/services/plataforma.api';
import { mensajeDeError } from '../errors/mensaje-error';

/** RF-01/CA03: el dominio comercial es `[a-z0-9-]`, de 3 a 50 caracteres. */
const SLUG_RE = /^[a-z0-9-]{3,50}$/;

/**
 * Catálogo maestro de plataforma: planes, módulos, el grafo de dependencias y
 * los dominios reservados.
 *
 * Antes de que existiera `GET /api/admin/catalogos/`, esto solo se podía
 * resolver replicando el seed en el cliente. La diferencia no es de comodidad:
 * el grafo que llega aquí es el mismo que usa `_resolver_modulos` para validar,
 * así que la cascada que el portal anticipa **no puede** divergir del 422 que
 * devuelve el backend. Una copia a mano sí podía.
 *
 * Se carga una vez por sesión de portal y se guarda en un signal en vez de en
 * TanStack Query: son tablas de semilla que no cambian mientras el SysAdmin
 * trabaja, y varias pantallas y modales las necesitan de forma síncrona para
 * decidir si un checkbox va deshabilitado.
 */
@Injectable({ providedIn: 'root' })
export class CatalogoPlataforma {
  private readonly api = inject(PlataformaApi);

  private readonly _datos = signal<CatalogosPlataforma | null>(null);
  private readonly _cargando = signal(false);
  private readonly _error = signal<string | null>(null);
  /** Deduplica las cargas concurrentes: el layout y un modal pueden pedirla a la vez. */
  private enVuelo: Promise<void> | null = null;

  readonly cargando = this._cargando.asReadonly();
  readonly error = this._error.asReadonly();
  readonly listo = computed(() => this._datos() !== null);

  readonly planes = computed<readonly PlanCatalogo[]>(() => this._datos()?.planes ?? []);
  readonly modulos = computed<readonly ModuloCatalogo[]>(() => this._datos()?.modulos ?? []);

  /**
   * Los únicos que admite el alta. El catálogo devuelve también los retirados
   * porque hay tenants contratados en ellos y el detalle tiene que nombrarlos,
   * pero mandarlos en un POST responde 422.
   */
  readonly planesVigentes = computed(() => this.planes().filter((plan) => plan.activo));

  /** Fases presentes, en orden. No se asume que sean 0/1/2. */
  readonly fases = computed(() =>
    [...new Set(this.modulos().map((m) => m.fase))].sort((a, b) => a - b),
  );

  private readonly porCodigo = computed(
    () => new Map(this.modulos().map((modulo) => [modulo.codigo, modulo])),
  );

  private readonly planesPorCodigo = computed(
    () => new Map(this.planes().map((plan) => [plan.codigo, plan])),
  );

  private readonly reservados = computed(() => new Set(this._datos()?.dominios_reservados ?? []));

  /** Idempotente. Vuelve a intentarlo si la carga anterior falló. */
  async cargar(): Promise<void> {
    if (this._datos()) return;
    if (this.enVuelo) return await this.enVuelo;

    this._cargando.set(true);
    this._error.set(null);

    this.enVuelo = this.api
      .catalogos()
      .then((datos) => {
        this._datos.set(datos);
      })
      .catch((error: unknown) => {
        this._error.set(mensajeDeError(error, 'No se pudo cargar el catálogo de plataforma.'));
      })
      .finally(() => {
        this._cargando.set(false);
        this.enVuelo = null;
      });

    return await this.enVuelo;
  }

  plan(codigo: string | undefined): PlanCatalogo | null {
    return codigo ? (this.planesPorCodigo().get(codigo) ?? null) : null;
  }

  modulo(codigo: string): ModuloCatalogo | null {
    return this.porCodigo().get(codigo) ?? null;
  }

  nombreModulo(codigo: string): string {
    return this.porCodigo().get(codigo)?.nombre ?? codigo;
  }

  modulosDeFase(fase: number): readonly ModuloCatalogo[] {
    return this.modulos().filter((modulo) => modulo.fase === fase);
  }

  modulosDelPlan(codigo: string | undefined): readonly string[] {
    return this.plan(codigo)?.modulos ?? [];
  }

  planIncluye(plan: string | undefined, modulo: string): boolean {
    return this.modulosDelPlan(plan).includes(modulo);
  }

  /** `planes: []` no es «te falta plan»: es que no se contrata en ninguno. */
  esContratable(codigo: string): boolean {
    return (this.porCodigo().get(codigo)?.planes.length ?? 0) > 0;
  }

  dependenciasDe(codigo: string): readonly string[] {
    return this.porCodigo().get(codigo)?.depende_de ?? [];
  }

  /**
   * Cierre transitivo de los módulos **activos** que dependen de `codigos`: los
   * que el backend apagaría en cascada (RF-03/RN07).
   *
   * Recorre `requerido_por`, que ya viene resuelto del servidor. Sirve para
   * avisar antes de enviar; la regla real la vuelve a evaluar el backend.
   */
  dependientesActivos(codigos: readonly string[], activos: readonly string[]): string[] {
    const cerrados = new Set(codigos);
    const pendientes = [...codigos];
    const afectados = new Set<string>();

    while (pendientes.length) {
      const base = pendientes.pop();
      if (base === undefined) break;

      for (const dependiente of this.porCodigo().get(base)?.requerido_por ?? []) {
        if (activos.includes(dependiente) && !cerrados.has(dependiente)) {
          afectados.add(dependiente);
          cerrados.add(dependiente);
          pendientes.push(dependiente);
        }
      }
    }

    return [...afectados];
  }

  /**
   * Forma del slug y palabra reservada, con la lista que manda el servidor.
   * Devuelve el mensaje de error, o `null` si es válido.
   */
  validarSlug(slug: string): string | null {
    if (!slug) return 'El dominio comercial es obligatorio.';
    if (!SLUG_RE.test(slug)) {
      return 'Solo minúsculas, dígitos y guion, de 3 a 50 caracteres.';
    }
    if (this.reservados().has(slug)) {
      return 'Este dominio está reservado para uso del sistema.';
    }
    return null;
  }
}
