import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { QueryClient } from '@tanstack/angular-query-experimental';
import type { SysadminLoginRequest, SysadminMe } from '../../api/models';
import { PlataformaApi } from '../../api/services/plataforma.api';
import { PlataformaStore } from './plataforma.store';
import { RUTA_ACCESO_PLATAFORMA } from './rutas';

/**
 * Orquestador de la sesión del portal de plataforma. Equivale a `AuthService`
 * en la superficie de tenant, con una diferencia de fondo: el login es de
 * **una sola fase**. El backend no exige segundo factor al SysAdmin (decisión
 * documentada, `core.sysadmin.mfa_secret` queda reservada), así que no hay reto
 * OTP que verificar después.
 */
@Injectable({ providedIn: 'root' })
export class PlataformaService {
  private readonly api = inject(PlataformaApi);
  private readonly store = inject(PlataformaStore);
  private readonly router = inject(Router);
  private readonly queryClient = inject(QueryClient);

  /** Devuelve el contexto ya resuelto: quien llama no necesita un segundo paso. */
  async login(credenciales: SysadminLoginRequest): Promise<SysadminMe> {
    const { token } = await this.api.login(credenciales);
    this.store.setToken(token);
    return await this.cargarMe();
  }

  async cargarMe(): Promise<SysadminMe> {
    const me = await this.api.me();
    this.store.setMe(me);
    return me;
  }

  /**
   * Cierre de sesión del portal. Lo llaman tanto el SysAdmin como el
   * interceptor de 401.
   *
   * `revocar` va en `false` cuando el disparador es un 401: ahí el backend ya
   * dio la sesión por muerta y la petición solo traería otro 401. La limpieza
   * local ocurre pase lo que pase — dejar a alguien dentro del portal por no
   * poder avisar al servidor sería el peor de los dos resultados.
   */
  async salir({ revocar = true } = {}): Promise<void> {
    // Antes de limpiar: el Bearer que necesita esta petición sale del store.
    if (revocar && this.store.token()) {
      try {
        await this.api.logout();
      } catch {
        // Silencio deliberado: el backend la define idempotente y no hay nada
        // que el SysAdmin pueda hacer con este error.
      }
    }

    this.store.limpiar();
    // Las consultas del portal son cross-tenant: dejarlas en caché mostraría
    // organizaciones ajenas al siguiente que entre en este dispositivo.
    this.queryClient.clear();
    await this.router.navigateByUrl(RUTA_ACCESO_PLATAFORMA, { replaceUrl: true });
  }
}
