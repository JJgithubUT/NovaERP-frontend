// inventario/api.js
//
// Cliente HTTP del módulo de Inventario. Usa la instancia de axios compartida
// (src/api/axios.js), la misma que usan Compras y el resto de la app, para
// heredar automáticamente el JWT (Authorization: Bearer ...) y el baseURL
// correcto (VITE_API_URL, que ya incluye "/api").
//
// IMPORTANTE: como axios ya trae baseURL = ".../api", aquí NO se repite el
// prefijo "/api" — solo "/inventario". Si lo dejas como "/api/inventario"
// vas a duplicar el prefijo igual que pasó en Compras.
//
// Los nombres de query params para FILTROS (producto_id, almacen_id, tipo,
// sku, almacen, notificada) están confirmados en views.py (filter_fields /
// AlertaStockMinimoListView). Los que SÍ son una suposición y viven en un solo
// lugar (pageParams / SEARCH_PARAM) son: paginación (page/page_size) y el
// query param de búsqueda de texto (search).

import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';

const API_BASE = '/inventario';

// ---- ASUNCIONES centralizadas: cámbialas aquí si tu backend usa otros nombres ----
const PAGE_PARAM = 'page';
const PAGE_SIZE_PARAM = 'page_size';
const SEARCH_PARAM = 'search';
export const PAGE_SIZE = 20;

export function pageParams(page, extra = {}) {
  return { [PAGE_PARAM]: page, [PAGE_SIZE_PARAM]: PAGE_SIZE, ...extra };
}
export function searchParam(value) {
  return { [SEARCH_PARAM]: value || undefined };
}

// ASUNCIÓN: core.utils.pagination.paginate() regresa {count, next, previous,
// results} (estilo DRF). Si tu paginador regresa otra forma (ej. {total,
// items}), ajusta solo esta función — todo lo demás sigue funcionando igual.
function parsePage(data) {
  if (Array.isArray(data)) return { results: data, count: data.length };
  return {
    results: data.results || data.items || data.data || [],
    count: data.count ?? data.total ?? (data.results || data.items || []).length,
  };
}

async function request(path, { method = 'GET', body, params } = {}) {
  try {
    const res = await api.request({
      url: API_BASE + path,
      method,
      params,   // axios arma el query string solo, respetando undefined/null
      data: body,
    });
    return res.data;
  } catch (err) {
    // Normalizamos el error para que tenga la misma forma que antes
    // (err.status, err.campo, err.raw, err.message), así useResourceList
    // y los componentes que ya leen estos campos no necesitan cambios.
    const data = err.response?.data ?? null;
    const normalized = new Error(
      (data && (data.detail || data.message)) || err.message || `Error ${err.response?.status ?? ''}`
    );
    normalized.status = err.response?.status;
    normalized.campo = data && data.campo;
    normalized.raw = data;
    throw normalized;
  }
}

export const inventarioApi = {
  // Productos — RF catálogo
  listarProductos: (params) => request('/productos/', { params }),
  crearProducto: (body) => request('/productos/', { method: 'POST', body }),
  editarProducto: (id, body) => request(`/productos/${id}/`, { method: 'PATCH', body }),
  darDeBajaProducto: (id) => request(`/productos/${id}/`, { method: 'DELETE' }),

  // Almacenes
  listarAlmacenes: (params) => request('/almacenes/', { params }),
  crearAlmacen: (body) => request('/almacenes/', { method: 'POST', body }),
  editarAlmacen: (id, body) => request(`/almacenes/${id}/`, { method: 'PATCH', body }),
  darDeBajaAlmacen: (id) => request(`/almacenes/${id}/`, { method: 'DELETE' }),

  // Movimientos manuales — RF-58
  crearMovimiento: (body) => request('/movimientos/', { method: 'POST', body }),

  // Ajustes — RF-60
  listarAjustes: (params) => request('/ajustes/', { params }),
  crearAjuste: (body) => request('/ajustes/', { method: 'POST', body }),

  // Transferencias — RF-61
  listarTransferencias: (params) => request('/transferencias/', { params }),
  crearTransferencia: (body) => request('/transferencias/', { method: 'POST', body }),

  // Consultas de solo lectura — RF-59, RF-62, RF-64
  listarStockDisponible: (params) => request('/stock-disponible/', { params }),
  listarKardex: (params) => request('/kardex/', { params }),
  listarValuacion: (params) => request('/valuacion/', { params }),

  // Alertas de stock mínimo — RF-63
  listarAlertas: (params) => request('/alertas-stock-minimo/', { params }),
  notificarAlerta: (id) => request(`/alertas-stock-minimo/${id}/notificar/`, { method: 'POST' }),
};

/**
 * Hook genérico de listado con paginación + recarga.
 * `enabled` evita disparar el fetch cuando la pestaña no está activa.
 */
export function useResourceList(fetchFn, params, { enabled = true } = {}) {
  const [state, setState] = useState({ loading: true, error: null, results: [], count: 0 });
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetchFn(params)
      .then((data) => {
        if (!alive) return;
        const parsed = parsePage(data);
        setState({ loading: false, error: null, results: parsed.results, count: parsed.count });
      })
      .catch((err) => {
        if (!alive) return;
        setState({ loading: false, error: err.message, results: [], count: 0 });
      });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, JSON.stringify(params), reloadKey]);

  return { ...state, reload };
}