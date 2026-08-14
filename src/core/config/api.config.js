/**
 * Origen del backend, **sin** el sufijo `/api`: todas las rutas de los
 * servicios ya lo llevan (`/api/auth/login/`, `/api/core/me/`…), igual que en
 * el contrato de `docs/openapi.yaml`.
 *
 * Vacío significa "mismo origen", que es lo que queremos en dos escenarios:
 *
 * - **Desarrollo:** el proxy de `vite.config.ts` reenvía `/api` a Django en el
 *   8000, así que el navegador nunca hace una petición cross-origin y no hay
 *   CORS que configurar.
 * - **Despliegue en la computadora de la red:** si el mismo servidor sirve el
 *   frontend y hace de proxy al backend, tampoco hay nada que apuntar.
 *
 * Solo hace falta darle valor cuando el backend vive en otro host o puerto que
 * el frontend, y entonces es el origen a secas: `http://192.168.1.50:8000`.
 */
export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');
