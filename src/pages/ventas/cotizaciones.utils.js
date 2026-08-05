import { useCallback, useEffect, useRef, useState } from 'react';

// --------------------------------------------------------------- constantes

export const ESTADOS = [
  { value: '', label: 'Todos los estados' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'pendiente_aprobacion', label: 'Pendiente de aprobación' },
  { value: 'aprobada', label: 'Aprobada' },
  { value: 'rechazada', label: 'Rechazada' },
];

export const ESTADO_BADGE = {
  borrador: 'bg-slate-100 text-slate-600',
  pendiente_aprobacion: 'bg-amber-100 text-amber-800',
  aprobada: 'bg-emerald-100 text-emerald-800',
  rechazada: 'bg-red-100 text-red-800',
};

export const ESTADOS_EDITABLES = new Set(['borrador', 'pendiente_aprobacion']);

export const PAGE_SIZE = 20;

// --------------------------------------------------------------- formato

export function money(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return v;
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

export function fmtDate(d) {
  if (!d) return '—';
  return d.length > 10 ? new Date(d).toLocaleString('es-MX') : new Date(`${d}T00:00:00`).toLocaleDateString('es-MX');
}

// --------------------------------------------------------------- api

function normalizePage(json) {
  if (Array.isArray(json)) return { results: json, count: json.length };
  if (json && Array.isArray(json.results)) return { results: json.results, count: json.count ?? json.results.length };
  if (json && Array.isArray(json.items)) return { results: json.items, count: json.total ?? json.items.length };
  return { results: [], count: 0 };
}

async function extractErrorMessage(response) {
  try {
    const data = await response.json();
    return data.detail || data.mensaje || data.message || JSON.stringify(data);
  } catch {
    return `Error inesperado (${response.status})`;
  }
}

const API_BASE_URL = 'http://localhost:8000';

function authHeaders() {
  const token = localStorage.getItem('jwt_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(url, options = {}) {
  let resp;
  try {
    resp = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: { ...authHeaders(), ...(options.headers || {}) },
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor.');
  }
  if (resp.status === 401) throw new Error('Sesión expirada, vuelve a iniciar sesión.');
  if (!resp.ok) throw new Error(await extractErrorMessage(resp));
  if (resp.status === 204) return null;
  return resp.json();
}

function qs(params = {}) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) {
      usp.set(k, v);
    }
  });
  return usp.toString();
}

export const clientesApi = {
  listar: (params) => request(`/api/ventas/clientes/?${qs(params)}`).then(normalizePage),
  obtener: (id) => request(`/api/ventas/clientes/${id}/`),
};

export const productosApi = {
  listar: (params) => request(`/api/inventario/productos/?${qs(params)}`).then(normalizePage),
};

export const cotizacionesApi = {
  listar: (params) => request(`/api/ventas/cotizaciones/?${qs(params)}`).then(normalizePage),
  crear: (data) => request('/api/ventas/cotizaciones/', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  }),
  editar: (id, data) => request(`/api/ventas/cotizaciones/${id}/`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  }),
  resolver: (id, decision) => request(`/api/ventas/cotizaciones/${id}/resolver/`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision }),
  }),
};

// --------------------------------------------------------------- hooks

export function useClienteCache() {
  const [mapa, setMapa] = useState({});
  const cargado = useRef(false);

  useEffect(() => {
    if (cargado.current) return;
    cargado.current = true;
    clientesApi.listar({ page_size: 1000, ordering: 'razon_social' })
      .then(({ results }) => {
        const nuevo = {};
        results.forEach((c) => { nuevo[c.id] = c.razon_social; });
        setMapa(nuevo);
      })
      .catch(() => {});
  }, []);

  const nombreDe = useCallback((id) => {
    if (!id) return '—';
    return mapa[id] || id;
  }, [mapa]);

  return { nombreDe };
}

export function useProductosCatalogo() {
  const [productos, setProductos] = useState([]);
  const cargado = useRef(false);

  useEffect(() => {
    if (cargado.current) return;
    cargado.current = true;
    productosApi.listar({ page_size: 1000 })
      .then(({ results }) => setProductos(results))
      .catch(() => setProductos([]));
  }, []);

  const porId = useCallback((id) => productos.find((p) => p.id === id), [productos]);

  return { productos, porId };
}

export function useCotizaciones() {
  const [filtros, setFiltros] = useState({ search: '', estado: '', vencida: false });
  const [page, setPage] = useState(1);
  const [cotizacionesCrudas, setCotizacionesCrudas] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { results, count } = await cotizacionesApi.listar({
        search: filtros.search || undefined,
        estado: filtros.estado || undefined,
        vencida: filtros.vencida ? 'true' : undefined,
        page,
        page_size: PAGE_SIZE,
      });
      setCotizacionesCrudas(results);
      setTotal(count);
    } catch (e) {
      setError(e.message);
      setCotizacionesCrudas([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filtros.estado, filtros.vencida, filtros.search, page]);

  useEffect(() => { cargar(); }, [cargar]);

  const cambiarFiltros = useCallback((f) => { setPage(1); setFiltros(f); }, []);

  return { filtros, cambiarFiltros, page, setPage, cotizacionesCrudas, total, loading, error, recargar: cargar };
}

  