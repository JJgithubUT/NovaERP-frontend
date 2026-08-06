import { inject, signal } from '@angular/core';
import type { FormatoExport } from '../../../api/models';
import { ReportesApi, descargarBlob, type RutaReporte } from '../../../api/services/reportes.api';
import { isApiError } from '../../../core/errors/api-error.model';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { aFechaIso } from '../../../shared/utils/fecha.util';

/** Rango por defecto: el mes en curso hacia atrás. Cómodo y bien dentro de los 366 días. */
export function rangoPorDefecto(dias = 30): { desde: string; hasta: string } {
  const hasta = new Date();
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);
  return { desde: aFechaIso(desde), hasta: aFechaIso(hasta) };
}

/**
 * Exportación a CSV/PDF, común a los seis reportes.
 *
 * Vive aparte de las consultas porque no es una query de TanStack: no hay nada
 * que cachear en descargar un archivo, y una segunda pulsación debe volver a
 * pedirlo, no servir el blob anterior.
 *
 * El 403 se traduce a un mensaje concreto. El genérico ("no autorizado") deja
 * al usuario sin saber que lo que le falta es un permiso puntual de
 * exportación, no acceso al reporte que está viendo.
 */
export function usarExportacion(ruta: RutaReporte, prefijo: string) {
  const api = inject(ReportesApi);
  const toasts = inject(ToastService);

  const exportando = signal(false);

  async function exportar(query: object, formato: FormatoExport): Promise<void> {
    if (exportando()) return;
    exportando.set(true);

    try {
      const blob = await api.exportar(ruta, query, formato);
      descargarBlob(blob, `${prefijo}-${aFechaIso(new Date())}.${formato}`);
    } catch (error) {
      toasts.error(
        isApiError(error) && error.status === 403
          ? 'No tienes el permiso ventas:reportes:exportar.'
          : mensajeDeError(error, 'No se pudo exportar el reporte.'),
      );
    } finally {
      exportando.set(false);
    }
  }

  return { exportando, exportar };
}
