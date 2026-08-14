import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import * as coreApi from '../../api/services/core.api';
import { useTenantSlug } from '../../core/auth/useAuth';
import { mensajeDeError } from '../../core/errors/mensaje-error';
import { qk } from '../../core/query/query-keys';
import { Badge } from '../../shared/ui/Badge';
import { Confirmar } from '../../shared/ui/Confirmar';
import { EstadoTabla } from '../../shared/ui/FilaMensaje';
import { toasts } from '../../shared/ui/toast';
import { formatFechaHora } from '../../shared/utils/fecha.util';

const COLUMNAS = 5;

/**
 * Mis sesiones abiertas, con cierre remoto.
 *
 * Cerrar una sesión ajena es inmediato: su token deja de servir en la siguiente
 * petición. Cerrar **la actual** equivale a salir de la aplicación, y por eso
 * esa fila no ofrece el botón — para eso está «Cerrar Sesión» en la barra
 * lateral. Sin esa distinción, el usuario se expulsaría a sí mismo creyendo que
 * limpia otro dispositivo.
 */
export function SesionesPage() {
  const tenantSlug = useTenantSlug() ?? '';
  const queryClient = useQueryClient();

  const [enCierre, setEnCierre] = useState(/** @type {object | null} */ (null));
  const [confirmarOtras, setConfirmarOtras] = useState(false);

  const consulta = useQuery({
    queryKey: qk.catalogo(tenantSlug, 'sesiones'),
    queryFn: () => coreApi.misSesiones(),
  });

  function refrescar() {
    void queryClient.invalidateQueries({ queryKey: qk.catalogo(tenantSlug, 'sesiones') });
  }

  const cerrarUna = useMutation({
    mutationFn: (sesion) => coreApi.cerrarSesion(sesion.jti),
    onSuccess: () => {
      toasts.exito('Sesión cerrada.');
      refrescar();
      setEnCierre(null);
    },
  });

  const cerrarOtras = useMutation({
    mutationFn: () => coreApi.cerrarOtrasSesiones(),
    onSuccess: (resultado) => {
      toasts.exito(
        resultado.revocadas === 1
          ? 'Se cerró 1 sesión.'
          : `Se cerraron ${resultado.revocadas} sesiones.`,
      );
      refrescar();
      setConfirmarOtras(false);
    },
  });

  const filas = consulta.data?.results ?? [];
  const otras = filas.filter((sesion) => !sesion.actual).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-headline-sm text-on-surface">Sesiones activas</h2>
          <p className="mt-0.5 max-w-prose text-body-sm text-on-surface-variant">
            Dispositivos donde tu cuenta tiene la sesión abierta. Si no reconoces alguno, ciérralo y
            cambia tu contraseña.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secundario"
          disabled={cerrarOtras.isPending || otras === 0}
          onClick={() => {
            cerrarOtras.reset();
            setConfirmarOtras(true);
          }}
        >
          Cerrar las demás ({otras})
        </button>
      </div>

      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th>Dispositivo</th>
              <th>IP</th>
              <th>Iniciada</th>
              <th>Última actividad</th>
              <th>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <EstadoTabla
              columnas={COLUMNAS}
              cargando={consulta.isPending}
              pausado={consulta.fetchStatus === 'paused'}
              error={consulta.error}
              vacio={filas.length === 0}
              mensajeVacio="No hay sesiones abiertas."
            />

            {!consulta.isPending && !consulta.error
              ? filas.map((sesion) => (
                  <tr key={sesion.jti}>
                    <td className="font-medium">
                      <span className="flex flex-wrap items-center gap-2">
                        {sesion.dispositivo || 'Dispositivo desconocido'}
                        {sesion.actual ? <Badge tono="info">Este dispositivo</Badge> : null}
                      </span>
                    </td>
                    <td className="clave tenue">{sesion.ip_origen ?? '—'}</td>
                    <td className="tenue">{formatFechaHora(sesion.iniciada_en)}</td>
                    <td className="tenue">{formatFechaHora(sesion.ultima_actividad)}</td>
                    <td className="text-right">
                      {/* La sesión actual no se cierra desde aquí: ver la nota
                          de cabecera. */}
                      {sesion.actual ? (
                        <span className="text-label-md text-on-surface-variant">
                          Usa «Cerrar Sesión»
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="btn-fila"
                          onClick={() => {
                            cerrarUna.reset();
                            setEnCierre(sesion);
                          }}
                        >
                          <LogOut size={14} />
                          Cerrar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>

      {enCierre ? (
        <Confirmar
          titulo="Cerrar esta sesión"
          mensaje="El dispositivo tendrá que volver a iniciar sesión."
          detalle={`${enCierre.dispositivo || 'Dispositivo desconocido'} · última actividad ${formatFechaHora(enCierre.ultima_actividad)}`}
          etiquetaConfirmar="Cerrar sesión"
          peligroso
          enviando={cerrarUna.isPending}
          error={cerrarUna.error ? mensajeDeError(cerrarUna.error) : ''}
          onConfirmar={() => cerrarUna.mutate(enCierre)}
          onCancelar={() => setEnCierre(null)}
        />
      ) : null}

      {confirmarOtras ? (
        <Confirmar
          titulo="Cerrar las demás sesiones"
          mensaje="Se cerrarán todas tus sesiones salvo la de este dispositivo."
          detalle="Tendrás que volver a iniciar sesión en el resto de dispositivos."
          etiquetaConfirmar="Cerrar las demás"
          peligroso
          enviando={cerrarOtras.isPending}
          error={cerrarOtras.error ? mensajeDeError(cerrarOtras.error) : ''}
          onConfirmar={() => cerrarOtras.mutate()}
          onCancelar={() => setConfirmarOtras(false)}
        />
      ) : null}
    </div>
  );
}
