import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Undo2 } from 'lucide-react';
import { PAGE_SIZE_DEFAULT } from '../../../api/models/common.model';
import * as ventasApi from '../../../api/services/ventas.api';
import { useTenantSlug } from '../../../core/auth/useAuth';
import { qk } from '../../../core/query/query-keys';
import { Badge } from '../../../shared/ui/Badge';
import { EstadoTabla } from '../../../shared/ui/FilaMensaje';
import { Paginacion } from '../../../shared/ui/Paginacion';
import { toasts } from '../../../shared/ui/toast';
import { formatMoneda } from '../../../shared/utils/decimal.util';
import { formatFecha } from '../../../shared/utils/fecha.util';
import { useClienteNombres } from '../useClienteNombres';
import { ESTADO_FACTURA_LABEL, tonoFactura } from '../ventas.labels';
import { FacturaFormModal } from './FacturaFormModal';
import { NotaCreditoModal } from './NotaCreditoModal';

const COLUMNAS = 8;

/**
 * Facturas y notas de crédito (RF-42..44).
 *
 * No hay acción de editar ni de eliminar, y no es un olvido: una factura
 * emitida es inmutable por integridad fiscal. La única corrección es la nota de
 * crédito, y solo sobre facturas en estado `emitida`.
 */
export function FacturasPage() {
  const tenantSlug = useTenantSlug() ?? '';
  const queryClient = useQueryClient();
  const { cliente } = useClienteNombres();

  const [pagina, setPagina] = useState(1);
  const [estado, setEstado] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [enNotaCredito, setEnNotaCredito] = useState(/** @type {object | null} */ (null));

  const filtros = {
    page: pagina,
    page_size: PAGE_SIZE_DEFAULT,
    estado: estado || undefined,
  };

  const consulta = useQuery({
    queryKey: qk.lista(tenantSlug, 'facturas', filtros),
    queryFn: () => ventasApi.listarFacturas(filtros),
  });

  /**
   * Facturar mueve stock y cambia el estado del pedido de origen; una nota de
   * crédito total puede reingresarlo. Las tres vistas quedan obsoletas a la vez.
   */
  function refrescar() {
    void queryClient.invalidateQueries({ queryKey: qk.catalogo(tenantSlug, 'facturas') });
    void queryClient.invalidateQueries({ queryKey: qk.catalogo(tenantSlug, 'pedidos') });
    void queryClient.invalidateQueries({ queryKey: qk.catalogo(tenantSlug, 'stock') });
  }

  const emision = useMutation({
    mutationFn: (datos) => ventasApi.crearFactura(datos),
    onSuccess: (factura) => {
      toasts.exito(`Factura ${factura.folio} emitida.`);
      refrescar();
      setModalAbierto(false);
    },
  });

  const notaCredito = useMutation({
    mutationFn: (datos) => ventasApi.emitirNotaCredito(enNotaCredito.id, datos),
    onSuccess: (factura) => {
      toasts.exito(`Nota de crédito aplicada a ${factura.folio}.`);
      refrescar();
      setEnNotaCredito(null);
    },
  });

  const filas = consulta.data?.results ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-headline-sm text-on-surface">Facturas</h2>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            Una factura emitida no se edita ni se elimina: se corrige con una nota de crédito.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primario"
          onClick={() => {
            emision.reset();
            setModalAbierto(true);
          }}
        >
          <Plus size={18} />
          Nueva factura
        </button>
      </div>

      <select
        aria-label="Filtrar por estado"
        className="campo-control sm:w-56"
        value={estado}
        onChange={(e) => {
          setEstado(e.target.value);
          setPagina(1);
        }}
      >
        <option value="">Todos los estados</option>
        {Object.entries(ESTADO_FACTURA_LABEL).map(([valor, etiqueta]) => (
          <option key={valor} value={valor}>
            {etiqueta}
          </option>
        ))}
      </select>

      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th className="num">Subtotal</th>
              <th className="num">Impuestos</th>
              <th className="num">Total</th>
              <th className="num">Saldo CxC</th>
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
              mensajeVacio="No hay facturas con estos filtros."
            />

            {!consulta.isPending && !consulta.error
              ? filas.map((factura) => (
                  <tr key={factura.id}>
                    <td className="clave">{factura.folio}</td>
                    <td className="tenue">
                      {cliente(factura.cliente_id)}
                      <span className="ml-2 text-label-md">{formatFecha(factura.fecha)}</span>
                    </td>
                    <td>
                      <Badge tono={tonoFactura(factura.estado)}>
                        {ESTADO_FACTURA_LABEL[factura.estado]}
                      </Badge>
                    </td>
                    <td className="num">{formatMoneda(factura.subtotal)}</td>
                    <td className="num tenue">{formatMoneda(factura.impuestos)}</td>
                    <td className="num font-semibold">{formatMoneda(factura.total)}</td>
                    <td className="num">
                      {factura.cxc_saldo === null ? '—' : formatMoneda(factura.cxc_saldo)}
                    </td>
                    <td className="text-right">
                      {/* Solo sobre una factura viva: una cancelada o ya
                          acreditada no admite otra nota. */}
                      {factura.estado === 'emitida' ? (
                        <button
                          type="button"
                          className="btn-fila"
                          onClick={() => {
                            notaCredito.reset();
                            setEnNotaCredito(factura);
                          }}
                        >
                          <Undo2 size={14} />
                          Nota de crédito
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>

        <Paginacion
          page={pagina}
          count={consulta.data?.count ?? 0}
          numPages={consulta.data?.num_pages ?? 1}
          onPage={setPagina}
        />
      </div>

      {modalAbierto ? (
        <FacturaFormModal
          enviando={emision.isPending}
          error={emision.error}
          onGuardar={(datos) => emision.mutate(datos)}
          onCerrar={() => setModalAbierto(false)}
        />
      ) : null}

      {enNotaCredito ? (
        <NotaCreditoModal
          factura={enNotaCredito}
          enviando={notaCredito.isPending}
          error={notaCredito.error}
          onConfirmar={(datos) => notaCredito.mutate(datos)}
          onCerrar={() => setEnNotaCredito(null)}
        />
      ) : null}
    </div>
  );
}
