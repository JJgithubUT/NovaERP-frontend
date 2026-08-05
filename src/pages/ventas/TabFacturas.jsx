import React, { useCallback, useEffect, useMemo, useState } from 'react';
// ⚠️ Ajusta esta ruta a donde vive tu axios.js (el que agrega el JWT via
// interceptor). Igual que en TabPedidos.jsx.
import api from '../../api/axios';

/**
 * Facturación y Comprobantes (RF-42..44)
 * ------------------------------------------------------------------
 * Flujo (ver diagrama de PedidoVenta — la factura no tiene su propio
 * diagrama de estados, vive DENTRO del de pedido):
 *
 *   confirmado / pendiente_surtido --facturar parte--> facturado_parcial
 *   facturado_parcial --facturar el resto--------------> facturado_total
 *   confirmado --facturar todo-------------------------> facturado_total
 *
 * Una factura en sí solo tiene dos estados propios (FacturaVenta.estado):
 *   emitida -> con_nota_credito   (RF-44, la factura NUNCA se edita/borra)
 *
 * Esta pestaña:
 *   1) Lista facturas (filtros: cliente, estado, pedido, rango de fecha).
 *   2) Genera una factura nueva a partir de un pedido facturable
 *      (estado en {confirmado, pendiente_surtido, facturado_parcial}),
 *      total o parcial por línea — RN01 (no más de lo pendiente/reservado).
 *   3) Emite notas de crédito sobre una factura existente — RN02
 *      (revierte saldo en CxC; si es NC total y se pide, reingresa stock).
 *
 * Ajusta las constantes de abajo si tus endpoints viven en otra ruta.
 */

const FACTURAS_URL = '/ventas/facturas/';
const PEDIDOS_URL = '/ventas/pedidos/';
const CLIENTES_URL = '/ventas/clientes/';

// Estados de pedido desde los que se puede facturar — debe reflejar
// ESTADOS_FACTURABLES en factura_service.py.
const ESTADOS_FACTURABLES = new Set(['confirmado', 'pendiente_surtido', 'facturado_parcial']);

const ESTADOS_FACTURA = {
  emitida: { label: 'Emitida', className: 'bg-blue-100 text-blue-800' },
  con_nota_credito: { label: 'Con nota de crédito', className: 'bg-amber-100 text-amber-800' },
};

const ESTADOS_PEDIDO_LABEL = {
  borrador: 'Borrador',
  confirmado: 'Confirmado',
  pendiente_surtido: 'Pendiente de surtido',
  cancelado: 'Cancelado',
  facturado_parcial: 'Facturado parcial',
  facturado_total: 'Facturado total',
};

function EstadoBadge({ estado }) {
  const cfg = ESTADOS_FACTURA[estado] || { label: estado, className: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function money(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return v;
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

// Misma envoltura que en TabPedidos.jsx sobre la instancia de axios
// compartida (JWT via interceptor).
async function apiFetch(url, options = {}) {
  const method = (options.method || 'GET').toLowerCase();
  try {
    const res = await api.request({
      url,
      method,
      data: options.body ? JSON.parse(options.body) : undefined,
    });
    return res.data;
  } catch (e) {
    if (!e.response) {
      throw new Error('No se pudo contactar al servidor.');
    }
    const body = e.response.data;
    const err = new Error((body && (body.detail || body.error)) || `Error ${e.response.status}`);
    err.status = e.response.status;
    err.body = body;
    throw err;
  }
}

function unwrapList(data) {
  if (Array.isArray(data)) return { items: data, count: data.length };
  if (data && Array.isArray(data.results)) return { items: data.results, count: data.count ?? data.results.length };
  if (data && Array.isArray(data.items)) return { items: data.items, count: data.count ?? data.items.length };
  return { items: [], count: 0 };
}

// ------------------------------------------------------------------ Buscador generico con autocompletado

function BuscadorEntidad({ url, placeholder, valueLabel, onSelect, searchParam = 'search', filtrar }) {
  const [q, setQ] = useState('');
  const [opciones, setOpciones] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [disponible, setDisponible] = useState(true);

  useEffect(() => {
    if (!q || q.length < 2) {
      setOpciones([]);
      return;
    }
    let cancelado = false;
    setCargando(true);
    const t = setTimeout(async () => {
      try {
        const sep = url.includes('?') ? '&' : '?';
        const data = await apiFetch(`${url}${sep}${searchParam}=${encodeURIComponent(q)}`);
        if (!cancelado) {
          const items = unwrapList(data).items;
          setOpciones(filtrar ? items.filter(filtrar) : items);
          setDisponible(true);
        }
      } catch (e) {
        if (!cancelado) setDisponible(false);
      } finally {
        if (!cancelado) setCargando(false);
      }
    }, 300);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [q, url, searchParam]);

  if (!disponible) {
    return (
      <input
        type="text"
        placeholder={`${placeholder} (ID manual)`}
        className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-red-800 focus:outline-none"
        onChange={(e) => onSelect({ id: e.target.value.trim() }, e.target.value.trim())}
      />
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={q}
        placeholder={placeholder}
        className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-red-800 focus:outline-none"
        onChange={(e) => {
          setQ(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
      />
      {abierto && q.length >= 2 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-auto">
          {cargando && <div className="px-2 py-1.5 text-xs text-slate-400">Buscando...</div>}
          {!cargando && opciones.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-slate-400">Sin resultados</div>
          )}
          {opciones.map((op) => (
            <button
              type="button"
              key={op.id}
              className="block w-full text-left px-2 py-1.5 text-xs hover:bg-slate-50"
              onMouseDown={() => {
                setQ(valueLabel(op));
                setAbierto(false);
                onSelect(op, valueLabel(op));
              }}
            >
              {valueLabel(op)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Modal: generar factura desde un pedido (RF-42)

function EditorLineasFactura({ lineas, setLineas }) {
  const actualizarCantidad = (id, valor) =>
    setLineas(lineas.map((l) => (l.pedido_linea_id === id ? { ...l, cantidad: valor } : l)));

  const toggle = (id) =>
    setLineas(lineas.map((l) => (l.pedido_linea_id === id ? { ...l, incluida: !l.incluida } : l)));

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-slate-400 text-left">
          <th className="py-1 font-medium"></th>
          <th className="py-1 font-medium">Producto</th>
          <th className="py-1 font-medium text-right">Pendiente</th>
          <th className="py-1 font-medium text-right">Reservado</th>
          <th className="py-1 font-medium text-right">A facturar</th>
        </tr>
      </thead>
      <tbody>
        {lineas.map((l) => (
          <tr key={l.pedido_linea_id} className="border-t border-slate-100">
            <td className="py-1">
              <input
                type="checkbox"
                checked={l.incluida}
                onChange={() => toggle(l.pedido_linea_id)}
                className="rounded border-slate-300 text-red-800 focus:ring-red-800"
              />
            </td>
            <td className="py-1 text-slate-700">{l.producto_id?.slice(0, 8)}</td>
            <td className="py-1 text-right text-slate-500">{l.pendiente_facturar}</td>
            <td className="py-1 text-right text-slate-500">{l.cantidad_reservada}</td>
            <td className="py-1 text-right">
              <input
                type="number"
                min="0"
                step="0.001"
                disabled={!l.incluida}
                value={l.cantidad}
                onChange={(e) => actualizarCantidad(l.pedido_linea_id, e.target.value)}
                className="w-24 border border-slate-300 rounded-lg px-2 py-1 text-right disabled:opacity-40 focus:ring-2 focus:ring-red-800 focus:outline-none"
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ModalFacturarPedido({ onClose, onFacturada }) {
  const [pedido, setPedido] = useState(null);
  const [lineas, setLineas] = useState([]);
  const [modo, setModo] = useState('todo'); // 'todo' | 'parcial'
  const [cargandoPedido, setCargandoPedido] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const seleccionarPedido = async (p) => {
    setError(null);
    setPedido(null);
    setLineas([]);
    if (!p?.id) return;
    setCargandoPedido(true);
    try {
      const full = await apiFetch(`${PEDIDOS_URL}${p.id}/`);
      setPedido(full);
      // El máximo facturable por línea es el menor entre lo pendiente de
      // facturar y lo reservado — igual que _plan_de_facturacion en el
      // backend (RN01).
      setLineas(
        (full.lineas || [])
          .map((l) => {
            const max = Math.min(Number(l.pendiente_facturar), Number(l.cantidad_reservada));
            return {
              pedido_linea_id: l.id,
              producto_id: l.producto_id,
              pendiente_facturar: l.pendiente_facturar,
              cantidad_reservada: l.cantidad_reservada,
              cantidad: max > 0 ? String(max) : '0',
              incluida: max > 0,
            };
          })
          .filter((l) => Number(l.cantidad_reservada) > 0 || Number(l.pendiente_facturar) > 0)
      );
    } catch (e) {
      setError({ detail: e.body?.detail || e.message || 'No fue posible cargar el pedido.' });
    } finally {
      setCargandoPedido(false);
    }
  };

  const facturable = pedido && ESTADOS_FACTURABLES.has(pedido.estado);

  const submit = async () => {
    setEnviando(true);
    setError(null);
    try {
      const payload =
        modo === 'todo'
          ? {}
          : {
              lineas: lineas
                .filter((l) => l.incluida && Number(l.cantidad) > 0)
                .map((l) => ({ pedido_linea_id: l.pedido_linea_id, cantidad: l.cantidad })),
            };
      const factura = await apiFetch(`${PEDIDOS_URL}${pedido.id}/facturar/`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      onFacturada(factura);
    } catch (e) {
      setError(e.body || { detail: e.message });
    } finally {
      setEnviando(false);
    }
  };

  const puedeEnviar =
    facturable && (modo === 'todo' || lineas.some((l) => l.incluida && Number(l.cantidad) > 0));

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between">
          <h3 className="text-base font-bold text-slate-800 mb-1">Nueva Factura</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <p className="text-xs text-slate-500 mb-4">Genera una factura total o parcial a partir de un pedido facturable.</p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Pedido a facturar</label>
            <BuscadorEntidad
              url={PEDIDOS_URL}
              placeholder="Buscar por folio..."
              valueLabel={(p) => `${p.folio} — ${ESTADOS_PEDIDO_LABEL[p.estado] || p.estado}`}
              onSelect={seleccionarPedido}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Solo pedidos en confirmado, pendiente_surtido o facturado_parcial admiten facturación.
            </p>
          </div>

          {cargandoPedido && <p className="text-xs text-slate-400">Cargando pedido…</p>}

          {pedido && !facturable && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-lg text-xs">
              El pedido {pedido.folio} está en estado "{ESTADOS_PEDIDO_LABEL[pedido.estado] || pedido.estado}" y no
              admite facturación.
            </div>
          )}

          {pedido && facturable && (
            <>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModo('todo')}
                  className={`flex-1 border rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    modo === 'todo' ? 'border-red-800 bg-red-800 text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Facturar todo lo pendiente/reservado
                </button>
                <button
                  type="button"
                  onClick={() => setModo('parcial')}
                  className={`flex-1 border rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    modo === 'parcial' ? 'border-red-800 bg-red-800 text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Elegir líneas / cantidades
                </button>
              </div>

              {modo === 'parcial' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Líneas</label>
                  <EditorLineasFactura lineas={lineas} setLineas={setLineas} />
                </div>
              )}
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
              {error.detail || 'No fue posible generar la factura.'}
              {error.campo && <span className="text-red-400"> ({error.campo})</span>}
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={submit}
              disabled={!puedeEnviar || enviando}
              className="px-3 py-1.5 bg-red-800 text-white rounded-lg text-xs font-medium hover:bg-red-900 disabled:opacity-50"
            >
              {enviando ? 'Generando…' : 'Generar Factura'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Modal: nota de crédito (RF-44)

function ModalNotaCredito({ factura, onClose, onEmitida }) {
  const [motivo, setMotivo] = useState('');
  const [monto, setMonto] = useState(factura.cxc_saldo ?? factura.total);
  const [reingresarStock, setReingresarStock] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const esTotal = String(monto) === String(factura.total);

  const submit = async () => {
    setEnviando(true);
    setError(null);
    try {
      const f = await apiFetch(`${FACTURAS_URL}${factura.id}/notas-credito/`, {
        method: 'POST',
        body: JSON.stringify({
          motivo,
          monto,
          ...(esTotal ? { reingresar_stock: reingresarStock } : {}),
        }),
      });
      onEmitida(f);
    } catch (e) {
      setError(e.body || { detail: e.message });
    } finally {
      setEnviando(false);
    }
  };

  const puedeEnviar = motivo.trim().length > 0 && Number(monto) > 0 && Number(monto) <= Number(factura.cxc_saldo);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-start justify-between">
          <h3 className="text-base font-bold text-slate-800 mb-1">Nota de Crédito — {factura.folio}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <p className="text-xs text-slate-500 mb-4">Revierte el saldo en la cuenta por cobrar de esta factura.</p>

        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            La factura no se edita ni se elimina; la nota de crédito revierte el saldo en la cuenta por cobrar.
            Saldo actual: <strong>{money(factura.cxc_saldo)}</strong>.
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Motivo</label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-red-800 focus:outline-none"
              placeholder="Devolución, error de captura, etc."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Monto</label>
            <input
              type="number"
              min="0"
              step="0.01"
              max={factura.cxc_saldo}
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-red-800 focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">No puede exceder el saldo por cobrar.</p>
          </div>

          {esTotal && (
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={reingresarStock}
                onChange={(e) => setReingresarStock(e.target.checked)}
                className="rounded border-slate-300 text-red-800 focus:ring-red-800"
              />
              Reingresar a inventario el stock facturado (solo aplica en NC total)
            </label>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
              {error.detail || 'No fue posible emitir la nota de crédito.'}
              {error.campo && <span className="text-red-400"> ({error.campo})</span>}
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Cerrar
            </button>
            <button
              onClick={submit}
              disabled={!puedeEnviar || enviando}
              className="px-3 py-1.5 bg-red-800 text-white rounded-lg text-xs font-medium hover:bg-red-900 disabled:opacity-50"
            >
              {enviando ? 'Emitiendo…' : 'Emitir Nota de Crédito'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Fila expandible

function FilaFactura({ factura, clienteNombre, onAbrirNotaCredito }) {
  const [abierto, setAbierto] = useState(false);
  const [detalle, setDetalle] = useState(factura);

  const toggle = async () => {
    if (!abierto) {
      try {
        const full = await apiFetch(`${FACTURAS_URL}${factura.id}/`);
        setDetalle(full);
      } catch (_) {
        setDetalle(factura);
      }
    }
    setAbierto(!abierto);
  };

  const puedeEmitirNC = Number(factura.cxc_saldo) > 0;

  return (
    <>
      <tr className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={toggle}>
        <td className="p-3 font-semibold text-slate-800">{factura.folio}</td>
        <td className="p-3 text-slate-600">{clienteNombre || factura.cliente_id?.slice(0, 8)}</td>
        <td className="p-3 text-slate-600">{factura.pedido_id?.slice(0, 8)}</td>
        <td className="p-3 text-center"><EstadoBadge estado={factura.estado} /></td>
        <td className="p-3 text-right font-medium text-slate-700">{money(factura.total)}</td>
        <td className="p-3 text-right font-medium text-slate-700">
          {factura.cxc_saldo != null ? money(factura.cxc_saldo) : '—'}
        </td>
        <td className="p-3 text-slate-600">
          {new Date(factura.fecha_emision).toLocaleDateString('es-MX')}
        </td>
        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
          {puedeEmitirNC ? (
            <button
              onClick={() => onAbrirNotaCredito(factura)}
              className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-800 rounded border border-red-800 text-[11px] font-medium transition-colors"
            >
              Nota de Crédito
            </button>
          ) : (
            <span className="text-[11px] text-slate-400">Sin saldo</span>
          )}
        </td>
      </tr>
      {abierto && (
        <tr className="bg-slate-50 border-b border-slate-100">
          <td colSpan={8} className="px-4 py-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 text-left">
                  <th className="py-1 font-medium">Línea de pedido</th>
                  <th className="py-1 font-medium text-right">Cantidad</th>
                  <th className="py-1 font-medium text-right">P. unitario</th>
                  <th className="py-1 font-medium text-right">Importe</th>
                </tr>
              </thead>
              <tbody>
                {(detalle.lineas || []).map((l) => (
                  <tr key={l.id} className="border-t border-slate-200">
                    <td className="py-1 text-slate-700">{l.pedido_linea_id?.slice(0, 8)}</td>
                    <td className="py-1 text-right">{l.cantidad}</td>
                    <td className="py-1 text-right">{money(l.precio_unitario)}</td>
                    <td className="py-1 text-right">{money(l.importe)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}

// ------------------------------------------------------------------ Componente principal

export default function TabFacturas() {
  const [facturas, setFacturas] = useState([]);
  const [count, setCount] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [clientesCache, setClientesCache] = useState({});

  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroCliente, setFiltroCliente] = useState(null);
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');

  const [modalFacturar, setModalFacturar] = useState(false);
  const [notaCreditoFactura, setNotaCreditoFactura] = useState(null);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (filtroEstado) p.set('estado', filtroEstado);
    if (filtroCliente?.id) p.set('cliente_id', filtroCliente.id);
    if (filtroDesde) p.set('desde', filtroDesde);
    if (filtroHasta) p.set('hasta', filtroHasta);
    return p.toString();
  }, [filtroEstado, filtroCliente, filtroDesde, filtroHasta]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await apiFetch(`${FACTURAS_URL}${query ? `?${query}` : ''}`);
      const { items, count: c } = unwrapList(data);
      setFacturas(items);
      setCount(c);

      const faltantes = [...new Set(items.map((f) => f.cliente_id))].filter((id) => id && !clientesCache[id]);
      if (faltantes.length) {
        const resultados = await Promise.all(
          faltantes.map((id) =>
            apiFetch(`${CLIENTES_URL}${id}/`).then((c) => [id, c.razon_social]).catch(() => [id, null])
          )
        );
        setClientesCache((prev) => {
          const next = { ...prev };
          resultados.forEach(([id, nombre]) => {
            if (nombre) next[id] = nombre;
          });
          return next;
        });
      }
    } catch (e) {
      setError(e.body?.detail || e.message || 'No fue posible cargar las facturas.');
    } finally {
      setCargando(false);
    }
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs">
          <strong>Aviso de backend:</strong> {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-red-800">Facturación y Comprobantes</h2>
          <p className="text-slate-500 text-xs">
            Facturas parciales/totales, Notas de Crédito e integración con Cuentas por Cobrar.
          </p>
        </div>
        <button
          onClick={() => setModalFacturar(true)}
          className="bg-red-800 hover:bg-red-900 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5"
        >
          <span>+</span> Nueva Factura
        </button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-wrap">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-800 focus:outline-none"
          >
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS_FACTURA).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <div className="w-56">
            <BuscadorEntidad
              url={CLIENTES_URL}
              placeholder="Filtrar por cliente..."
              valueLabel={(c) => c.razon_social}
              onSelect={(c) => setFiltroCliente(c.id ? c : null)}
            />
          </div>
          <input
            type="date"
            value={filtroDesde}
            onChange={(e) => setFiltroDesde(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-800 focus:outline-none"
          />
          <input
            type="date"
            value={filtroHasta}
            onChange={(e) => setFiltroHasta(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-800 focus:outline-none"
          />
          {(filtroEstado || filtroCliente || filtroDesde || filtroHasta) && (
            <button
              onClick={() => {
                setFiltroEstado('');
                setFiltroCliente(null);
                setFiltroDesde('');
                setFiltroHasta('');
              }}
              className="text-xs text-red-800 hover:underline px-2 font-medium"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-red-800 text-white font-bold border-b border-red-900 uppercase tracking-wider">
            <tr>
              <th className="p-3">Folio</th>
              <th className="p-3">Cliente</th>
              <th className="p-3">Pedido</th>
              <th className="p-3 text-center">Estado</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3 text-right">Saldo CxC</th>
              <th className="p-3">Emitida</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {cargando && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-400">
                  Cargando facturas desde la base de datos...
                </td>
              </tr>
            )}
            {!cargando && facturas.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  No hay facturas que coincidan con los filtros.
                </td>
              </tr>
            )}
            {!cargando &&
              facturas.map((f) => (
                <FilaFactura
                  key={f.id}
                  factura={f}
                  clienteNombre={clientesCache[f.cliente_id]}
                  onAbrirNotaCredito={setNotaCreditoFactura}
                />
              ))}
          </tbody>
        </table>
      </div>
      {!cargando && count > 0 && (
        <p className="text-xs text-slate-500">{count} factura{count === 1 ? '' : 's'}</p>
      )}

      {modalFacturar && (
        <ModalFacturarPedido
          onClose={() => setModalFacturar(false)}
          onFacturada={() => {
            setModalFacturar(false);
            cargar();
          }}
        />
      )}

      {notaCreditoFactura && (
        <ModalNotaCredito
          factura={notaCreditoFactura}
          onClose={() => setNotaCreditoFactura(null)}
          onEmitida={() => {
            setNotaCreditoFactura(null);
            cargar();
          }}
        />
      )}
    </div>
  );
}