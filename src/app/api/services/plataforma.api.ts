import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api.config';
import { buildParams } from '../http-params';
import type {
  ActivarTenantRequest,
  CatalogosPlataforma,
  ReenvioActivacion,
  SuspenderTenant,
  SysadminLoginRequest,
  SysadminLoginResponse,
  SysadminMe,
  Tenant,
  TenantActivado,
  TenantCreado,
  TenantCreate,
  TenantDetalle,
  TenantListado,
  TenantQuery,
  TenantSuspendido,
  TenantUpdate,
  Uuid,
} from '../models';

/**
 * Cliente HTTP del portal de plataforma (`/api/admin/*`).
 *
 * Es un servicio aparte de `CoreApi` porque lo son las superficies: estas
 * rutas exigen una sesión de SysAdmin y **rechazan** un token de tenant, igual
 * que las de tenant rechazan uno de plataforma. El `plataformaInterceptor` es
 * quien pone el Bearer correcto según el prefijo de la URL.
 *
 * Varias de estas operaciones son de consecuencia inmediata: suspender o dar
 * de baja una organización cierra **todas** las sesiones de sus usuarios al
 * instante, y reenviar la activación invalida el enlace anterior. Las
 * pantallas lo advierten antes de llamar.
 */
@Injectable({ providedIn: 'root' })
export class PlataformaApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/api`;

  /* ------------------------------------------------------------------ sesión */

  /** Una sola fase: no hay reto OTP que verificar después. */
  login(body: SysadminLoginRequest): Promise<SysadminLoginResponse> {
    return firstValueFrom(this.http.post<SysadminLoginResponse>(`${this.base}/admin/login/`, body));
  }

  logout(): Promise<{ detail: string }> {
    return firstValueFrom(this.http.post<{ detail: string }>(`${this.base}/admin/logout/`, {}));
  }

  /** Identidad y sesión en curso. 200 = el token guardado sigue vivo. */
  me(): Promise<SysadminMe> {
    return firstValueFrom(this.http.get<SysadminMe>(`${this.base}/admin/me/`));
  }

  /* --------------------------------------------------------------- catálogos */

  /** Planes, módulos, grafo de dependencias y dominios reservados. */
  catalogos(): Promise<CatalogosPlataforma> {
    return firstValueFrom(this.http.get<CatalogosPlataforma>(`${this.base}/admin/catalogos/`));
  }

  /* ----------------------------------------------------------------- tenants */

  listarTenants(query: TenantQuery = {}): Promise<TenantListado> {
    return firstValueFrom(
      this.http.get<TenantListado>(`${this.base}/admin/tenants/`, {
        params: buildParams(query),
      }),
    );
  }

  detalleTenant(id: Uuid): Promise<TenantDetalle> {
    return firstValueFrom(this.http.get<TenantDetalle>(`${this.base}/admin/tenants/${id}/`));
  }

  /** La respuesta trae `activacion_token` en claro **una sola vez**. */
  crearTenant(body: TenantCreate): Promise<TenantCreado> {
    return firstValueFrom(this.http.post<TenantCreado>(`${this.base}/admin/tenants/`, body));
  }

  /**
   * Datos generales, plan y módulos. Solo hay que mandar lo que cambia: un
   * PATCH sin cambios se rechaza con 422.
   */
  editarTenant(id: Uuid, body: TenantUpdate): Promise<TenantDetalle> {
    return firstValueFrom(
      this.http.patch<TenantDetalle>(`${this.base}/admin/tenants/${id}/`, body),
    );
  }

  /**
   * Suspensión (`baja: false`) o baja lógica (`baja: true`) — mismo endpoint,
   * el estado destino va en la query. No borra información y es reversible,
   * pero cierra todas las sesiones del tenant: la respuesta dice cuántas.
   */
  suspenderTenant(id: Uuid, body: SuspenderTenant, baja = false): Promise<TenantSuspendido> {
    return firstValueFrom(
      this.http.post<TenantSuspendido>(`${this.base}/admin/tenants/${id}/suspender/`, body, {
        params: buildParams(baja ? { baja: 1 } : {}),
      }),
    );
  }

  reactivarTenant(id: Uuid): Promise<Tenant> {
    return firstValueFrom(
      this.http.post<Tenant>(`${this.base}/admin/tenants/${id}/reactivar/`, {}),
    );
  }

  /**
   * Reemite el enlace de activación de un entorno que sigue `pendiente`.
   *
   * Es la única vía de rescate: la activación no pasa por el login y el
   * restablecimiento de contraseña exige una cuenta ya activa, así que un
   * enlace vencido dejaría el entorno atrapado para siempre. Rota el token.
   */
  reenviarActivacion(id: Uuid): Promise<ReenvioActivacion> {
    return firstValueFrom(
      this.http.post<ReenvioActivacion>(
        `${this.base}/admin/tenants/${id}/reenviar-activacion/`,
        {},
      ),
    );
  }

  /**
   * Canje del enlace por el administrador inicial. **Público y sin token**: no
   * cuelga de `/api/admin/`, lo autoriza el token del enlace y quien lo usa
   * todavía no puede autenticarse.
   */
  activarTenant(body: ActivarTenantRequest): Promise<TenantActivado> {
    return firstValueFrom(
      this.http.post<TenantActivado>(`${this.base}/auth/activar-tenant/`, body),
    );
  }
}
