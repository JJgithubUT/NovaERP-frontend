// compras.api.js
// Envuelve las llamadas HTTP del módulo de Compras usando la instancia
// axios ya existente en src/api/axios.js (baseURL + token JWT). Rutas y
// permisos tomados literal de compras/urls.py y compras/views.py — no son
// un supuesto, están confirmados por el backend que compartiste.
//
// IMPORTANTE: axios ya tiene baseURL = VITE_API_URL, que incluye "/api".
// Por eso aquí NUNCA se vuelve a escribir "/api/..." en las rutas — si lo
// haces, terminas pegándole a /api/api/... y Django responde 404.

import api from "../../api/axios";

const BASE = '/compras';

// ------------------------------------------------------------ Proveedores
// Permisos: compras:proveedores:{leer,crear,editar,eliminar}

export const proveedoresApi = {
  listar: (params) => api.get(`${BASE}/proveedores/`, { params }),
  crear: (data) => api.post(`${BASE}/proveedores/`, data),
  editar: (id, data) => api.patch(`${BASE}/proveedores/${id}/`, data),
  darDeBaja: (id) => api.delete(`${BASE}/proveedores/${id}/`),
  // RF-51: ordenes + recepciones + cuentas por pagar del proveedor en un
  // solo payload (historial_service.historial_por_proveedor).
  historial: (id) => api.get(`${BASE}/proveedores/${id}/historial/`),
};

// ----------------------------------------------------------------- Órdenes
// Permisos: compras:ordenes:{leer,crear,editar,aprobar,cancelar}
// PATCH sirve tanto para editar (proveedor_id/lineas, solo si no tiene
// recepciones) como para aprobar (estado: 'enviada' cuando está
// pendiente_aprobacion) — mismo endpoint, ver orden_service.editar_orden_compra.

export const ordenesApi = {
  listar: (params) => api.get(`${BASE}/ordenes/`, { params }),
  detalle: (id) => api.get(`${BASE}/ordenes/${id}/`),
  crear: (data) => api.post(`${BASE}/ordenes/`, data),
  editar: (id, data) => api.patch(`${BASE}/ordenes/${id}/`, data),
  aprobar: (id) => api.patch(`${BASE}/ordenes/${id}/`, { estado: 'enviada' }),
  cancelar: (id) => api.post(`${BASE}/ordenes/${id}/cancelar/`),
};

// ------------------------------------------------------------- Recepciones
// Permisos: compras:recepciones:{leer,crear}

export const recepcionesApi = {
  listar: (params) => api.get(`${BASE}/recepciones/`, { params }),
  crear: (data) => api.post(`${BASE}/recepciones/`, data),
};

// -------------------------------------------------------- Cuentas x pagar
// Permiso: compras:cuentas_por_pagar:leer (solo lectura desde Compras)

export const cuentasPorPagarApi = {
  listar: (params) => api.get(`${BASE}/cuentas-por-pagar/`, { params }),
};

// -------------------------------------------------------- Config aprobación
// Permisos: compras:config_aprobacion:{leer,editar} — RF-52, umbral único
// por tenant (sin categoría de producto, ver nota en aprobacion_service.py).

export const configAprobacionApi = {
  obtener: () => api.get(`${BASE}/config-aprobacion/`),
  actualizar: (data) => api.patch(`${BASE}/config-aprobacion/`, data),
};

// ------------------------------------------------------ Catálogos externos
// Producto/Almacén viven en el módulo de Inventario (inventario.models).

export const catalogosApi = {
  productos: (params) => api.get('/inventario/productos/', { params }),
  almacenes: (params) => api.get('/inventario/almacenes/', { params }),
};

// Lee el mensaje de un BusinessRuleError.to_dict() (core.utils.errors),
// que views.py devuelve tal cual con status 422.
export function extraerError(err) {
  const data = err?.response?.data;
  if (data?.detail) return data.detail;
  if (data?.mensaje) return data.mensaje;
  if (typeof data === 'string') return data;
  return 'Ocurrió un error inesperado. Intenta de nuevo.';
}