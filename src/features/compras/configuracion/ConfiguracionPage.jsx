import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as comprasApi from '../../../api/services/compras.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { campoDeError, mensajeDeError } from '../../../core/errors/mensaje-error';
import { qk } from '../../../core/query/query-keys';
import { Campo } from '../../../shared/ui/Campo';
import { toasts } from '../../../shared/ui/toast';
import { formatMoneda, isNonNegative } from '../../../shared/utils/decimal.util';

/**
 * Umbral de aprobación de órdenes de compra.
 *
 * Es un solo número, pero gobierna toda la cadena: una orden cuyo total lo
 * supere nace en `pendiente_aprobacion` y **no admite recepciones** hasta que
 * alguien la apruebe. Bajarlo retiene más gasto; subirlo lo deja fluir.
 *
 * Cero no desactiva el control: significa que **toda** orden pasa por
 * aprobación, porque cualquier total positivo lo supera. Conviene decirlo, que
 * es lo contrario de lo que mucha gente asume.
 */
export function ConfiguracionPage() {
  const tenantSlug = useTenantSlug() ?? '';
  const queryClient = useQueryClient();

  const [umbral, setUmbral] = useState('');
  const [tocado, setTocado] = useState(false);

  const consulta = useQuery({
    queryKey: qk.catalogo(tenantSlug, 'config-aprobacion'),
    enabled: tenantSlug !== '',
    queryFn: () => comprasApi.obtenerConfigAprobacion(),
  });

  /*
   * Siembra el campo cuando llega la configuración. Se compara con el valor
   * servido para no pisar lo que el usuario esté escribiendo si la consulta se
   * refresca de fondo.
   *
   * Un tenant sin umbral configurado lo devuelve como `null`; el campo es
   * controlado y su estado tiene que seguir siendo string, así que entra vacío.
   */
  const servido = consulta.data?.umbral_monto;
  useEffect(() => {
    if (servido !== undefined) setUmbral(servido ?? '');
  }, [servido]);

  const guardado = useMutation({
    mutationFn: (datos) => comprasApi.editarConfigAprobacion(datos),
    onSuccess: (config) => {
      toasts.exito(`Umbral actualizado a ${formatMoneda(config.umbral_monto)}.`);
      void queryClient.invalidateQueries({
        queryKey: qk.catalogo(tenantSlug, 'config-aprobacion'),
      });
    },
  });

  const valido = isNonNegative(umbral);
  const errorGeneral =
    !guardado.error || campoDeError(guardado.error) ? null : mensajeDeError(guardado.error);

  function enviar(evento) {
    evento.preventDefault();
    if (!valido || guardado.isPending) {
      setTocado(true);
      return;
    }
    guardado.mutate({ umbral_monto: umbral.trim() });
  }

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <div>
        <h2 className="text-headline-sm text-on-surface">Configuración de compras</h2>
        <p className="mt-0.5 text-body-sm text-on-surface-variant">
          Define a partir de qué importe una orden necesita aprobación antes de poder recibirse.
        </p>
      </div>

      {consulta.fetchStatus === 'paused' ? (
        <p className="text-body-sm text-error">Sin conexión con el servidor.</p>
      ) : consulta.isPending ? (
        <p className="text-body-sm text-on-surface-variant">Cargando configuración…</p>
      ) : consulta.error ? (
        <p className="text-body-sm text-error">
          {mensajeDeError(consulta.error, 'No se pudo cargar la configuración.')}
        </p>
      ) : (
        <form onSubmit={enviar} className="flex flex-col gap-4">
          {errorGeneral ? (
            <p
              role="alert"
              className="rounded-DEFAULT border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
            >
              {errorGeneral}
            </p>
          ) : null}

          <Campo
            etiqueta="Umbral de aprobación"
            paraId="umbral"
            error={
              tocado && !valido
                ? 'Debe ser un número mayor o igual a 0.'
                : campoDeError(guardado.error) === 'umbral_monto'
                  ? mensajeDeError(guardado.error)
                  : ''
            }
            ayuda="Las órdenes por encima de este importe nacerán pendientes de aprobación."
          >
            <input
              id="umbral"
              inputMode="decimal"
              className="campo-control"
              value={umbral}
              onChange={(e) => setUmbral(e.target.value)}
              onBlur={() => setTocado(true)}
            />
          </Campo>

          {umbral.trim() === '0' ? (
            <p className="rounded-DEFAULT border border-warning bg-warning-container px-3 py-2 text-body-sm text-on-warning-container">
              Con el umbral en cero, <strong>todas</strong> las órdenes pasarán por aprobación: no
              es desactivar el control, es aplicarlo siempre.
            </p>
          ) : null}

          <button
            type="submit"
            className="btn btn-primario self-start"
            disabled={guardado.isPending || !valido}
          >
            {guardado.isPending ? 'Guardando…' : 'Guardar umbral'}
          </button>
        </form>
      )}
    </div>
  );
}
