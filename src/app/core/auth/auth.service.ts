import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { QueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import type {
  LoginChallengeResponse,
  LoginRequest,
  LoginResponse,
  MeResponse,
} from '../../api/models';
import { API_BASE_URL } from '../config/api.config';
import { AuthStore } from './auth.store';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly queryClient = inject(QueryClient);

  /**
   * Fase 1 del login: valida credenciales. Nunca abre sesión por sí sola — el
   * backend exige el segundo factor (RN07), así que la respuesta es siempre un
   * reto de OTP (`mfa: 'otp'` si ya está inscrito, `'enroll'` si es el primer
   * login y hay que dar de alta el TOTP con `secret`/`otpauth_uri`).
   */
  async login(credentials: LoginRequest): Promise<LoginChallengeResponse> {
    return await firstValueFrom(
      this.http.post<LoginChallengeResponse>(`${this.baseUrl}/api/auth/login/`, credentials),
    );
  }

  /**
   * Fase 2: valida el código TOTP contra el `reto` de la fase 1. Solo aquí se
   * emite el token de sesión. Devuelve el `me` ya resuelto para que el caller
   * sepa a qué ruta mandar al usuario.
   */
  async verifyOtp(reto: string, codigo: string): Promise<MeResponse> {
    const response = await firstValueFrom(
      this.http.post<LoginResponse>(`${this.baseUrl}/api/auth/otp/`, { reto, codigo }),
    );
    this.store.setSession(response.token);
    return await this.loadMe();
  }

  /** Contexto del usuario: perfil, tenant, roles, permisos y módulos. */
  async loadMe(): Promise<MeResponse> {
    const me = await firstValueFrom(this.http.get<MeResponse>(`${this.baseUrl}/api/core/me/`));
    this.store.setMe(me);
    return me;
  }

  /**
   * Cierre de sesión global. Lo llama tanto el usuario como el interceptor de
   * 401. Limpia la caché de queries además del store: si no, el siguiente
   * usuario que entre en este dispositivo vería por un instante los datos del
   * anterior renderizados desde caché.
   *
   * `revocar` decide si además se cierra la sesión **en el servidor** (RF-17).
   * Va en `true` cuando sale el usuario y en `false` cuando el disparador es un
   * 401: ahí la sesión ya está muerta en el backend y la petición solo serviría
   * para recibir otro 401.
   *
   * La limpieza local ocurre pase lo que pase. Si la revocación falla —sin red,
   * el token ya caducó, el servidor no responde— el usuario igual sale de la
   * aplicación: dejarlo dentro por no poder avisar al backend sería el peor de
   * los dos resultados.
   */
  async logout({ redirectTo = '/login', revocar = true } = {}): Promise<void> {
    // Antes de `store.clear()`: el Bearer que necesita esta petición sale del
    // store, y una vez limpiado ya no habría token que revocar.
    if (revocar && this.store.token()) {
      await this.revocarSesion();
    }

    this.store.clear();
    this.queryClient.clear();
    await this.router.navigateByUrl(redirectTo, { replaceUrl: true });
  }

  /**
   * Revocación best-effort del `jti` en curso. El backend la define como
   * idempotente, así que reintentar o llegar tarde no rompe nada.
   */
  private async revocarSesion(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.baseUrl}/api/auth/logout/`, {}));
    } catch {
      // Silencio deliberado: el cierre local no es negociable y no hay nada
      // que el usuario pueda hacer con este error.
    }
  }
}
