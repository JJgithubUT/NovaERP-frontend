import { inject, provideAppInitializer, type EnvironmentProviders } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { esRutaDeEntrada } from './rutas-entrada';
import { ThemeService } from './theme.service';

/**
 * Mantiene el tema claro mientras se esté en una pantalla de entrada, y devuelve
 * el del usuario al pasar al sistema.
 *
 * Va por navegación y no por componente a propósito: así el login no tiene que
 * acordarse de forzar el tema ni —peor— de liberarlo al salir. Un `ngOnDestroy`
 * olvidado en cualquiera de las cuatro pantallas dejaría la aplicación entera
 * clavada en claro.
 *
 * Se escucha `urlAfterRedirects` y no la URL pedida porque los guards redirigen:
 * entrar a `/admin/organizaciones` sin sesión acaba en `/admin/acceso`, y esa es
 * la pantalla que de verdad se pinta.
 */
export function provideTemaDeEntrada(): EnvironmentProviders {
  return provideAppInitializer(() => {
    const router = inject(Router);
    const tema = inject(ThemeService);

    // La primera navegación puede no haber ocurrido todavía cuando corre esto,
    // así que el estado inicial se toma de la URL del navegador. Sin esto habría
    // un instante con el tema del usuario en una pantalla de entrada.
    tema.forzarClaro(esRutaDeEntrada(window.location.pathname));

    router.events
      .pipe(
        filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((evento) => tema.forzarClaro(esRutaDeEntrada(evento.urlAfterRedirects)));
  });
}
