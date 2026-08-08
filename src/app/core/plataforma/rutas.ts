/**
 * Prefijos de URL de la superficie de plataforma.
 *
 * `admin` no se eligió por estética: las rutas de primer nivel compiten con
 * `:tenant`, y un tenant cuyo slug fuera igual quedaría inalcanzable. El
 * backend mantiene una tabla de dominios reservados (`core.dominio_reservado`)
 * que **incluye `admin`**, así que ningún tenant puede registrarse con ese
 * slug y la colisión es imposible por construcción, no por convención.
 *
 * Están aquí y no en las rutas para poder importarlos desde el servicio de
 * sesión y los guards sin arrastrar el módulo de rutas.
 */

export const BASE_PLATAFORMA = '/admin';

export const RUTA_ACCESO_PLATAFORMA = `${BASE_PLATAFORMA}/acceso`;

export const RUTA_ORGANIZACIONES = `${BASE_PLATAFORMA}/organizaciones`;

/**
 * Canje del enlace de activación del administrador inicial. Pública y fuera de
 * `/admin`: quien llega no es el SysAdmin, es el futuro TENANT_ADMIN.
 *
 * Sigue el patrón del `/activar` que ya existe, y hereda su misma salvedad: es
 * un segmento de primer nivel que compite con `:tenant` y —a diferencia de
 * `admin`— no está en la tabla de dominios reservados, así que un tenant
 * registrado con este slug exacto quedaría inalcanzable. Se puede cerrar
 * añadiendo la palabra a `core.dominio_reservado`.
 */
export const RUTA_ACTIVAR_TENANT = '/activar-organizacion';
