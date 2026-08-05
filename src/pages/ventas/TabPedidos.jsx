import React, { useCallback, useEffect, useMemo, useState } from 'react';
// ⚠️ Ajusta esta ruta a donde vive tu axios.js (el que agrega el JWT via
// interceptor). Ese archivo ya resuelve baseURL (VITE_API_URL) y el header
// Authorization: Bearer <access_token> desde localStorage.
import api from '../../api/axios';

/**
 * Pedidos de Venta (RF-38..41)
 * ------------------------------------------------------------------
 * Flujo (ver diagrama):
 *
 *   crear (desde cotizacion aprobada o directo) -> borrador
 *   borrador --confirmar (stock reservado, credito OK)--> confirmado
 *   borrador --confirmar (backorder)--------------------> pendiente_surtido
 *   borrador / confirmado / pendiente_surtido --cancelar (libera stock)--> cancelado
 *   confirmado / pendiente_surtido --facturar parte/todo--> facturado_parcial -> facturado_total
 *
 * La facturacion (ultimas dos transiciones) vive en la pestana de Facturas
 * (RF-42..44); aqui solo se refleja como parte del stepper de estado.
 *
 * Ajusta las constantes de abajo si tus endpoints de productos/almacenes
 * viven en otra ruta.
 */

const PEDIDOS_URL = '/ventas/pedidos/';
const CLIENTES_URL = '/ventas/clientes/';
const COTIZACIONES_URL = '/ventas/cotizaciones/';
// Ajustar si tu app de inventario expone otras rutas:
const PRODUCTOS_URL = '/inventario/productos/';
const ALMACENES_URL = '/inventario/almacenes/';

const ESTADOS = {
  borrador: { label: 'Borrador', className: 'bg-slate-100 text-slate-600' },
  confirmado: { label: 'Confirmado', className: 'bg-blue-100 text-blue-800' },
  pendiente_surtido: { label: 'Pendiente de surtido', className: 'bg-amber-100 text-amber-800' },
  cancelado: { label: 'Cancelado', className: 'bg-red-100 text-red-800' },
  facturado_parcial: { label: 'Facturado parcial', className: 'bg-purple-100 text-purple-800' },
  facturado_total: { label: 'Facturado total', className: 'bg-emerald-100 text-emerald-800' },
};

const FLUJO_PRINCIPAL = ['borrador', 'confirmado', 'facturado_parcial', 'facturado_total'];

function EstadoBadge({ estado }) {
  const cfg = ESTADOS[estado] || { label: estado, className: 'bg-slate-100 text-slate-600' };
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

// Envoltura sobre la instancia de axios compartida (JWT via interceptor) que
// conserva la misma firma que antes usaba fetch: apiFetch(url, {method, body}),
// devuelve el body en exito y lanza un Error con .status/.body en fallo, para
// no tener que tocar el resto de los componentes de abajo.
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
      // Error de red / CORS, no hubo respuesta del servidor
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

// ------------------------------------------------------------------ Stepper

function PedidoStepper({ estado }) {
  const cancelado = estado === 'cancelado';
  const idxActual = FLUJO_PRINCIPAL.indexOf(
    estado === 'pendiente_surtido' ? 'confirmado' : estado
  );

  return (
    <div className="flex items-center flex-wrap gap-1 text-xs">
      {FLUJO_PRINCIPAL.map((paso, i) => {
        const activo = !cancelado && i === idxActual;
        const pasado = !cancelado && i < idxActual;
        const label = paso === 'confirmado' && estado === 'pendiente_surtido' ? 'pendiente_surtido' : paso;
        return (
          <React.Fragment key={paso}>
            {i > 0 && <span className="text-slate-300">&rarr;</span>}
            <span
              className={
                'px-2 py-0.5 rounded-lg border font-medium ' +
                (activo
                  ? 'border-red-800 text-red-800 font-semibold'
                  : pasado
                  ? 'border-slate-300 text-slate-400 line-through'
                  : 'border-slate-200 text-slate-400')
              }
            >
              {(ESTADOS[label] || { label }).label}
            </span>
          </React.Fragment>
        );
      })}
      {cancelado && (
        <>
          <span className="text-slate-300">&rarr;</span>
          <span className="px-2 py-0.5 rounded-lg border border-red-300 text-red-700 font-semibold">Cancelado</span>
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Buscador generico con autocompletado

function BuscadorEntidad({ url, placeholder, valueLabel, onSelect, searchParam = 'search' }) {
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
          setOpciones(unwrapList(data).items);
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
    // Fallback: entrada manual de ID si el endpoint no existe / no responde.
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

// ------------------------------------------------------------------ Editor de lineas (crear / editar borrador)

function EditorLineas({ lineas, setLineas }) {
  const agregar = () =>
    setLineas([...lineas, { producto_id: '', producto_label: '', cantidad: '1', precio_unitario: '' }]);

  const actualizar = (i, patch) =>
    setLineas(lineas.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const quitar = (i) => setLineas(lineas.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      {lineas.map((l, i) => (
        <div key={i} className="flex gap-2 items-start bg-slate-50 border border-slate-200 rounded-lg p-2">
          <div className="flex-1">
            <BuscadorEntidad
              url={PRODUCTOS_URL}
              placeholder="Buscar producto..."
              valueLabel={(p) => p.nombre || p.descripcion || p.id}
              onSelect={(p, label) => actualizar(i, { producto_id: p.id, producto_label: label })}
            />
          </div>
          <input
            type="number"
            min="0"
            step="0.001"
            value={l.cantidad}
            onChange={(e) => actualizar(i, { cantidad: e.target.value })}
            placeholder="Cantidad"
            className="w-24 border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-red-800 focus:outline-none"
          />
          <input
            type="number"
            min="0"
            step="0.0001"
            value={l.precio_unitario}
            onChange={(e) => actualizar(i, { precio_unitario: e.target.value })}
            placeholder="Precio (opcional)"
            className="w-32 border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-red-800 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => quitar(i)}
            className="text-red-500 hover:text-red-700 text-xs px-2 py-1.5"
            title="Quitar linea"
          >
            &times;
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={agregar}
        className="text-xs text-slate-700 border border-dashed border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-50 w-full font-medium"
      >
        + Agregar linea
      </button>
    </div>
  );
}

// ------------------------------------------------------------------ Modal crear pedido

function ModalCrearPedido({ onClose, onCreado }) {
  const [origen, setOrigen] = useState('directo'); // 'directo' | 'cotizacion'
  const [cliente, setCliente] = useState(null);
  const [cotizacion, setCotizacion] = useState(null);
  const [lineas, setLineas] = useState([{ producto_id: '', producto_label: '', cantidad: '1', precio_unitario: '' }]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    setEnviando(true);
    setError(null);
    try {
      const payload =
        origen === 'cotizacion'
          ? { cotizacion_id: cotizacion?.id }
          : {
              cliente_id: cliente?.id,
              lineas: lineas
                .filter((l) => l.producto_id && l.cantidad)
                .map((l) => ({
                  producto_id: l.producto_id,
                  cantidad: l.cantidad,
                  ...(l.precio_unitario ? { precio_unitario: l.precio_unitario } : {}),
                })),
            };
      const pedido = await apiFetch(PEDIDOS_URL, { method: 'POST', body: JSON.stringify(payload) });
      onCreado(pedido);
    } catch (e) {
      setError(e.body || { detail: e.message });
    } finally {
      setEnviando(false);
    }
  };

  const puedeEnviar =
    origen === 'cotizacion'
      ? !!cotizacion?.id
      : !!cliente?.id && lineas.some((l) => l.producto_id && l.cantidad);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between">
          <h3 className="text-base font-bold text-slate-800 mb-1">Nuevo Pedido de Venta</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <p className="text-xs text-slate-500 mb-4">Captura el cliente y las líneas, o genera el pedido a partir de una cotización aprobada.</p>

        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOrigen('directo')}
              className={`flex-1 border rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                origen === 'directo' ? 'border-red-800 bg-red-800 text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Directo (cliente + líneas)
            </button>
            <button
              type="button"
              onClick={() => setOrigen('cotizacion')}
              className={`flex-1 border rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                origen === 'cotizacion' ? 'border-red-800 bg-red-800 text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Desde cotización aprobada
            </button>
          </div>

          {origen === 'cotizacion' ? (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Cotización aprobada</label>
              <BuscadorEntidad
                url={`${COTIZACIONES_URL}?estado=aprobada`}
                placeholder="Buscar por folio..."
                searchParam="search"
                valueLabel={(c) => `${c.folio} - ${money(c.total)}`}
                onSelect={(c) => setCotizacion(c)}
              />
              <p className="text-[11px] text-slate-400 mt-1">Se copiarán las líneas de la cotización al pedido.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Cliente</label>
                <BuscadorEntidad
                  url={CLIENTES_URL}
                  placeholder="Buscar cliente..."
                  valueLabel={(c) => c.razon_social}
                  onSelect={(c) => setCliente(c)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Líneas</label>
                <EditorLineas lineas={lineas} setLineas={setLineas} />
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
              {error.detail || 'No fue posible crear el pedido.'}
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
              {enviando ? 'Creando…' : 'Crear Borrador'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Modal confirmar pedido (RN02/RN03)

function ModalConfirmarPedido({ pedido, onClose, onConfirmado }) {
  const [almacen, setAlmacen] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [bloqueoCredito, setBloqueoCredito] = useState(false);

  const intentar = async (autorizarCredito) => {
    if (!almacen?.id) {
      setError({ detail: 'Selecciona un almacen.' });
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const p = await apiFetch(`${PEDIDOS_URL}${pedido.id}/confirmar/`, {
        method: 'POST',
        body: JSON.stringify({ almacen_id: almacen.id, ...(autorizarCredito ? { autorizar_credito: true } : {}) }),
      });
      onConfirmado(p);
    } catch (e) {
      if (e.status === 422 && e.body?.campo === 'credito') {
        setBloqueoCredito(true);
        setError(e.body);
      } else if (e.status === 403) {
        setError({ detail: 'No tienes permiso para autorizar el credito excedido. Solicita a un supervisor.' });
      } else {
        setError(e.body || { detail: e.message });
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-start justify-between">
          <h3 className="text-base font-bold text-slate-800 mb-1">Confirmar Pedido {pedido.folio}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <p className="text-xs text-slate-500 mb-4">Reserva de stock y validación de límite de crédito.</p>

        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Se validará el límite de crédito del cliente y se reservará stock en el almacén elegido. Si falta
            existencia y el tenant permite backorder, el pedido quedará en <strong>pendiente_surtido</strong>.
          </p>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Almacén</label>
            <BuscadorEntidad
              url={ALMACENES_URL}
              placeholder="Buscar almacén..."
              valueLabel={(a) => a.nombre || a.id}
              onSelect={(a) => setAlmacen(a)}
            />
          </div>

          {error && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-lg text-xs">
              {error.detail}
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
            {bloqueoCredito && (
              <button
                onClick={() => intentar(true)}
                disabled={enviando}
                className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 disabled:opacity-50"
              >
                Autorizar crédito y confirmar
              </button>
            )}
            <button
              onClick={() => intentar(false)}
              disabled={enviando}
              className="px-3 py-1.5 bg-red-800 text-white rounded-lg text-xs font-medium hover:bg-red-900 disabled:opacity-50"
            >
              {enviando ? 'Confirmando…' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Fila expandible

// Transiciones validas segun el diagrama: solo lo que pedido_service.py
// realmente soporta (confirmar / cancelar). Facturar vive en la pestana de
// Facturas y no se ofrece aqui.
function transicionesValidas(estado) {
  switch (estado) {
    case 'borrador':
      return [
        { value: 'confirmar', label: 'Confirmar (reservar stock)' },
        { value: 'cancelar', label: 'Cancelar' },
      ];
    case 'confirmado':
    case 'pendiente_surtido':
      return [{ value: 'cancelar', label: 'Cancelar (libera stock)' }];
    default:
      // cancelado, facturado_parcial, facturado_total: estados terminales aqui.
      return [];
  }
}

function SelectorEstado({ pedido, onAbrirConfirmar, onCancelar }) {
  const [cancelando, setCancelando] = useState(false);
  const opciones = transicionesValidas(pedido.estado);

  const manejarCambio = async (e) => {
    const valor = e.target.value;
    e.target.value = '';
    if (valor === 'confirmar') {
      onAbrirConfirmar(pedido);
    } else if (valor === 'cancelar') {
      if (!window.confirm(`Cancelar el pedido ${pedido.folio}? Se liberara el stock reservado.`)) return;
      setCancelando(true);
      try {
        await onCancelar(pedido.id);
      } finally {
        setCancelando(false);
      }
    }
  };

  if (opciones.length === 0) {
    return <span className="text-xs text-slate-400">Sin transiciones</span>;
  }

  return (
    <select
      value=""
      onChange={manejarCambio}
      disabled={cancelando}
      className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white disabled:opacity-40 focus:ring-2 focus:ring-red-800 focus:outline-none"
    >
      <option value="">Cambiar estado...</option>
      {opciones.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function FilaPedido({ pedido, clienteNombre, onAbrirConfirmar, onCancelar }) {
  const [abierto, setAbierto] = useState(false);
  const [detalle, setDetalle] = useState(pedido);

  const toggle = async () => {
    if (!abierto) {
      try {
        const full = await apiFetch(`${PEDIDOS_URL}${pedido.id}/`);
        setDetalle(full);
      } catch (_) {
        setDetalle(pedido);
      }
    }
    setAbierto(!abierto);
  };

  return (
    <>
      <tr className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={toggle}>
        <td className="p-3 font-semibold text-slate-800">{pedido.folio}</td>
        <td className="p-3 text-slate-600">{clienteNombre || pedido.cliente_id?.slice(0, 8)}</td>
        <td className="p-3 text-center"><EstadoBadge estado={pedido.estado} /></td>
        <td className="p-3 text-right font-medium text-slate-700">{money(pedido.total)}</td>
        <td className="p-3 text-slate-600">{new Date(pedido.created_at).toLocaleDateString('es-MX')}</td>
        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
          <SelectorEstado pedido={pedido} onAbrirConfirmar={onAbrirConfirmar} onCancelar={onCancelar} />
        </td>
      </tr>
      {abierto && (
        <tr className="bg-slate-50 border-b border-slate-100">
          <td colSpan={6} className="p-4">
            <div className="mb-3">
              <PedidoStepper estado={pedido.estado} />
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 text-left">
                  <th className="py-1 font-medium">Producto</th>
                  <th className="py-1 font-medium text-right">Cantidad</th>
                  <th className="py-1 font-medium text-right">Reservada</th>
                  <th className="py-1 font-medium text-right">Facturada</th>
                  <th className="py-1 font-medium text-right">Pendiente</th>
                  <th className="py-1 font-medium text-right">P. unitario</th>
                </tr>
              </thead>
              <tbody>
                {(detalle.lineas || []).map((l) => (
                  <tr key={l.id} className="border-t border-slate-200">
                    <td className="py-1 text-slate-700">{l.producto_id?.slice(0, 8)}</td>
                    <td className="py-1 text-right">{l.cantidad}</td>
                    <td className="py-1 text-right">{l.cantidad_reservada}</td>
                    <td className="py-1 text-right">{l.cantidad_facturada}</td>
                    <td className="py-1 text-right">{l.pendiente_facturar}</td>
                    <td className="py-1 text-right">{money(l.precio_unitario)}</td>
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

export default function TabPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [count, setCount] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [clientesCache, setClientesCache] = useState({});

  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroCliente, setFiltroCliente] = useState(null);
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');

  const [modalCrear, setModalCrear] = useState(false);
  const [pedidoConfirmar, setPedidoConfirmar] = useState(null);

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
      const data = await apiFetch(`${PEDIDOS_URL}${query ? `?${query}` : ''}`);
      const { items, count: c } = unwrapList(data);
      setPedidos(items);
      setCount(c);

      // resolver nombres de cliente faltantes
      const faltantes = [...new Set(items.map((p) => p.cliente_id))].filter((id) => id && !clientesCache[id]);
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
      setError(e.body?.detail || e.message || 'No fue posible cargar los pedidos.');
    } finally {
      setCargando(false);
    }
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cancelarPedido = async (id) => {
    try {
      await apiFetch(`${PEDIDOS_URL}${id}/cancelar/`, { method: 'POST' });
      await cargar();
    } catch (e) {
      setError(e.body?.detail || e.message);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs">
          <strong>Aviso de backend:</strong> {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-red-800">Pedidos de Venta</h2>
          <p className="text-slate-500 text-xs">
            Confirmación de órdenes, reserva de stock y validación de límite de crédito.
          </p>
        </div>
        <button
          onClick={() => setModalCrear(true)}
          className="bg-red-800 hover:bg-red-900 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5"
        >
          <span>+</span> Nuevo Pedido
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
            {Object.entries(ESTADOS).map(([k, v]) => (
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
              <th className="p-3 text-center">Estado</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3">Creado</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {cargando && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400">
                  Cargando pedidos desde la base de datos...
                </td>
              </tr>
            )}
            {!cargando && pedidos.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  No hay pedidos que coincidan con los filtros.
                </td>
              </tr>
            )}
            {!cargando &&
              pedidos.map((p) => (
                <FilaPedido
                  key={p.id}
                  pedido={p}
                  clienteNombre={clientesCache[p.cliente_id]}
                  onAbrirConfirmar={setPedidoConfirmar}
                  onCancelar={cancelarPedido}
                />
              ))}
          </tbody>
        </table>
      </div>
      {!cargando && count > 0 && (
        <p className="text-xs text-slate-500">{count} pedido{count === 1 ? '' : 's'}</p>
      )}

      {modalCrear && (
        <ModalCrearPedido
          onClose={() => setModalCrear(false)}
          onCreado={() => {
            setModalCrear(false);
            cargar();
          }}
        />
      )}

      {pedidoConfirmar && (
        <ModalConfirmarPedido
          pedido={pedidoConfirmar}
          onClose={() => setPedidoConfirmar(null)}
          onConfirmado={() => {
            setPedidoConfirmar(null);
            cargar();
          }}
        />
      )}
    </div>
  );
}