import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api.config';
import { buildParams } from '../http-params';
import type {
  ActivarCuenta,
  ActividadQuery,
  ActividadUsuario,
  BitacoraQuery,
  CatalogoPermisos,
  ConfigSeguridad,
  ConfigSeguridadUpdate,
  EventoAuditoria,
  Paginated,
  RevocacionResponse,
  Rol,
  RolCreate,
  RolQuery,
  RolUpdate,
  RolesDeUsuario,
  SesionesResponse,
  Usuario,
  UsuarioActualizado,
  UsuarioCreado,
  UsuarioCreate,
  UsuarioQuery,
  UsuarioUpdate,
  Uuid,
} from '../models';

/**
 * Cliente HTTP del núcleo: usuarios, roles, sesiones, seguridad y auditoría.
 *
 * Varias de estas operaciones **invalidan sesiones al instante**: suspender un
 * usuario, cerrar sus sesiones o resetear su MFA hacen que su token deje de
 * servir en la siguiente petición. Si el objetivo es uno mismo, la propia
 * sesión de quien pulsa se cae — las pantallas lo advierten antes de llamar.
 */
@Injectable({ providedIn: 'root' })
export class CoreApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/api`;

  /* -------------------------------------------------------------- activación */

  /**
   * Público, sin sesión: fija la contraseña con el token de alta, o reconfirma
   * un cambio de correo (ahí se omite `password`). El flujo lo decide el estado
   * del registro, no el cliente.
   */
  activarCuenta(body: ActivarCuenta): Promise<Usuario> {
    return firstValueFrom(this.http.post<Usuario>(`${this.base}/auth/activar/`, body));
  }

  /* ---------------------------------------------------------------- usuarios */

  listarUsuarios(query: UsuarioQuery = {}): Promise<Paginated<Usuario>> {
    return this.get<Paginated<Usuario>>('/core/usuarios/', query);
  }

  /** La respuesta trae `activacion_token` en claro **una sola vez**. */
  crearUsuario(body: UsuarioCreate): Promise<UsuarioCreado> {
    return firstValueFrom(this.http.post<UsuarioCreado>(`${this.base}/core/usuarios/`, body));
  }

  /**
   * Sirve al admin y al propietario; lo que se acepta depende de quién llama.
   * Cambiar el correo devuelve `verificacion_token` y deja al usuario en
   * `pendiente_verificacion`, sin poder entrar hasta reconfirmarlo.
   */
  editarUsuario(id: Uuid, body: UsuarioUpdate): Promise<UsuarioActualizado> {
    return firstValueFrom(
      this.http.patch<UsuarioActualizado>(`${this.base}/core/usuarios/${id}/`, body),
    );
  }

  /** Cierra todas sus sesiones y bloquea su login. No aplica al último admin. */
  suspenderUsuario(id: Uuid): Promise<Usuario> {
    return firstValueFrom(
      this.http.post<Usuario>(`${this.base}/core/usuarios/${id}/suspender/`, {}),
    );
  }

  reactivarUsuario(id: Uuid): Promise<Usuario> {
    return firstValueFrom(
      this.http.post<Usuario>(`${this.base}/core/usuarios/${id}/reactivar/`, {}),
    );
  }

  /** Para pérdida de dispositivo: el usuario re-enrola en su próximo login. */
  resetearMfa(id: Uuid): Promise<Usuario> {
    return firstValueFrom(
      this.http.post<Usuario>(`${this.base}/core/usuarios/${id}/reset-mfa/`, {}),
    );
  }

  cerrarSesionesDe(id: Uuid): Promise<RevocacionResponse> {
    return firstValueFrom(
      this.http.post<RevocacionResponse>(`${this.base}/core/usuarios/${id}/cerrar-sesiones/`, {}),
    );
  }

  asignarRoles(id: Uuid, roles: Uuid[]): Promise<RolesDeUsuario> {
    return firstValueFrom(
      this.http.post<RolesDeUsuario>(`${this.base}/core/usuarios/${id}/roles/`, { roles }),
    );
  }

  /** No deja al usuario sin roles ni revoca al último administrador. */
  revocarRol(id: Uuid, rolId: Uuid): Promise<RolesDeUsuario> {
    return firstValueFrom(
      this.http.delete<RolesDeUsuario>(`${this.base}/core/usuarios/${id}/roles/${rolId}/`),
    );
  }

  /* ------------------------------------------------------------------- roles */

  listarRoles(query: RolQuery = {}): Promise<Paginated<Rol>> {
    return this.get<Paginated<Rol>>('/core/roles/', query);
  }

  crearRol(body: RolCreate): Promise<Rol> {
    return firstValueFrom(this.http.post<Rol>(`${this.base}/core/roles/`, body));
  }

  editarRol(id: Uuid, body: RolUpdate): Promise<Rol> {
    return firstValueFrom(this.http.patch<Rol>(`${this.base}/core/roles/${id}/`, body));
  }

  /**
   * Baja lógica. Si el rol tiene usuarios asignados el backend la bloquea con
   * 422 y hay que repetirla con `desactivar: true`; el error trae cuántos son.
   * Un rol de sistema nunca se puede desactivar (403).
   */
  desactivarRol(id: Uuid, desactivar = false): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.base}/core/roles/${id}/`, {
        params: buildParams(desactivar ? { desactivar: true } : {}),
      }),
    );
  }

  /** Catálogo maestro para el selector. Los inertes vienen marcados, no ocultos. */
  catalogoPermisos(): Promise<CatalogoPermisos> {
    return firstValueFrom(this.http.get<CatalogoPermisos>(`${this.base}/core/permisos/`));
  }

  /* ---------------------------------------------------------------- sesiones */

  /** Las propias, no las de otros. Marca cuál es la actual. */
  misSesiones(): Promise<SesionesResponse> {
    return firstValueFrom(this.http.get<SesionesResponse>(`${this.base}/core/sesiones/`));
  }

  cerrarOtrasSesiones(): Promise<RevocacionResponse> {
    return firstValueFrom(
      this.http.post<RevocacionResponse>(`${this.base}/core/sesiones/cerrar-otras/`, {}),
    );
  }

  /** Logout remoto de un dispositivo. Con el `jti` de la sesión actual, sale. */
  cerrarSesion(jti: string): Promise<{ revocada: boolean }> {
    return firstValueFrom(
      this.http.delete<{ revocada: boolean }>(`${this.base}/core/sesiones/${jti}/`),
    );
  }

  /* -------------------------------------------------- seguridad y auditoría */

  configSeguridad(): Promise<ConfigSeguridad> {
    return firstValueFrom(this.http.get<ConfigSeguridad>(`${this.base}/core/config-seguridad/`));
  }

  editarConfigSeguridad(body: ConfigSeguridadUpdate): Promise<ConfigSeguridad> {
    return firstValueFrom(
      this.http.patch<ConfigSeguridad>(`${this.base}/core/config-seguridad/`, body),
    );
  }

  bitacora(query: BitacoraQuery = {}): Promise<Paginated<EventoAuditoria>> {
    return this.get<Paginated<EventoAuditoria>>('/core/bitacora/', query);
  }

  /** Exporta el resultado completo, sin paginar. Se audita como EXPORT. */
  exportarBitacora(query: BitacoraQuery, formato: 'csv' | 'pdf'): Promise<Blob> {
    return firstValueFrom(
      this.http.get(`${this.base}/core/bitacora/export/`, {
        params: buildParams({ ...query, formato }),
        responseType: 'blob',
      }),
    );
  }

  reporteActividad(query: ActividadQuery = {}): Promise<Paginated<ActividadUsuario>> {
    return this.get<Paginated<ActividadUsuario>>('/core/reportes/actividad/', query);
  }

  exportarActividad(query: ActividadQuery, formato: 'csv' | 'pdf'): Promise<Blob> {
    return firstValueFrom(
      this.http.get(`${this.base}/core/reportes/actividad/`, {
        params: buildParams({ ...query, formato }),
        responseType: 'blob',
      }),
    );
  }

  private get<T>(ruta: string, query: object): Promise<T> {
    return firstValueFrom(this.http.get<T>(this.base + ruta, { params: buildParams(query) }));
  }
}
