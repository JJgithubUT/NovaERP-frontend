import { useState } from 'react';
import { descargarBlob, exportar as exportarApi } from '../../../api/services/reportes.api';
import { isApiError } from '../../../core/errors/api-error.model';
import { mensajeDeError } from '../../../core/errors/mensaje-error';
import { toasts } from '../../../shared/ui/toast';
import { aFechaIso } from '../../../shared/utils/fecha.util';

/**
 * Rango por defecto: el mes en curso hacia atrás. Cómodo y bien dentro de los
 * 366 días que admite el backend.
 *
 * @param {number} [dias]
 */
export function rangoPorDefecto(dias = 30) {
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
 * El 403 se traduce a un mensaje concreto. El genérico («no autorizado») deja
 * al usuario sin saber que lo que le falta es un permiso puntual de
 * exportación, no acceso al reporte que está viendo.
 *
 * @param {import('../../../api/services/reportes.api.js').RutaReporte} ruta
 * @param {string} prefijo
 */
export function useExportacion(ruta, prefijo) {
  const [exportando, setExportando] = useState(false);

  /**
   * @param {object} query
   * @param {'csv' | 'pdf'} formato
   */
  async function exportar(query, formato) {
    if (exportando) return;
    setExportando(true);

    try {
      const blob = await exportarApi(ruta, query, formato);
      descargarBlob(blob, `${prefijo}-${aFechaIso(new Date())}.${formato}`);
    } catch (error) {
      toasts.error(
        isApiError(error) && error.status === 403
          ? 'No tienes el permiso ventas:reportes:exportar.'
          : mensajeDeError(error, 'No se pudo exportar el reporte.'),
      );
    } finally {
      setExportando(false);
    }
  }

  return { exportando, exportar };
}

/**
 * Formatea un porcentaje que llega como string, o `null`.
 *
 * El backend manda `null` cuando el porcentaje no aplica —la conversión de la
 * primera etapa del embudo, por ejemplo— y eso no es lo mismo que cero.
 *
 * @param {string | null} valor
 */
export function formatPorcentaje(valor) {
  if (valor === null || valor === undefined) return '—';
  const numero = Number(valor);
  return Number.isFinite(numero) ? `${numero.toFixed(1)} %` : String(valor);
}
