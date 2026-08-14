/** @typedef {import('./common.model.js').Uuid} Uuid */

/**
 * @typedef {object} LoginRequest
 * @property {string} tenant_slug
 * @property {string} correo
 * @property {string} password
 */

/**
 * @typedef {object} LoginResponse
 * @property {string} token JWT HS256, vigente 8 horas. No hay refresh token todavía.
 * @property {string} mensaje
 */

/**
 * @typedef {'otp' | 'enroll'} MfaModo
 */

/**
 * Respuesta de la fase 1 del login (`POST /api/auth/login/`). Nunca trae
 * `token`: el backend exige el segundo factor (RN07) antes de abrir sesión.
 *
 * @typedef {object} LoginChallengeResponse
 * @property {string} reto JWT de corta vida (5 min) que identifica el reto ante `/api/auth/otp/`.
 * @property {MfaModo} mfa `enroll` = primer login, hay que dar de alta el TOTP antes de validar.
 * @property {string} [secret] Solo si `mfa === 'enroll'`.
 * @property {string} [otpauth_uri] Solo si `mfa === 'enroll'`. URI `otpauth://` para el authenticator.
 * @property {string} mensaje
 */

/**
 * @typedef {object} OtpRequest
 * @property {string} reto
 * @property {string} codigo
 */

/**
 * Pide el enlace de restablecimiento. Necesita la organización además del
 * correo: el backend busca al usuario por la pareja `tenant__slug` + `correo`.
 *
 * @typedef {object} RecuperarPasswordRequest
 * @property {string} tenant_slug
 * @property {string} correo
 */

/**
 * Canjea el token del enlace por una contraseña nueva.
 *
 * @typedef {object} RestablecerPasswordRequest
 * @property {string} token
 * @property {string} password
 */

/**
 * Los dos endpoints de RF-18 responden únicamente un `mensaje`.
 *
 * El de `recuperar` es **siempre el mismo** exista el correo o no (RN02): la
 * respuesta no puede servir para averiguar quién tiene cuenta. Por eso la
 * pantalla lo muestra tal cual en vez de redactar un «te hemos enviado un
 * correo», que afirmaría más de lo que el backend está diciendo.
 *
 * @typedef {object} MensajeResponse
 * @property {string} mensaje
 */

/**
 * Payload del JWT. Se lee sin verificar firma: el backend es quien valida.
 *
 * @typedef {object} JwtPayload
 * @property {Uuid} sub Id del usuario (claim estándar `sub`).
 * @property {string} tid Slug del tenant (claim `tid`).
 * @property {number} exp Expiración en segundos desde epoch (no milisegundos).
 */

/**
 * @typedef {'pendiente' | 'activo' | 'suspendido' | 'pendiente_verificacion'} UsuarioEstado
 */

/**
 * `core.tenant_estado` completo. `pendiente` es el estado en el que nace una
 * organización recién creada por el SysAdmin, antes de que su administrador
 * inicial canjee el enlace de activación.
 *
 * En `MeTenant` no se verá nunca: el validador de sesión rechaza cualquier tenant
 * que no esté `activo`, así que quien llega a tener un `me` está en un entorno
 * activo por construcción. Está aquí, y no solo en el modelo de plataforma,
 * porque el ENUM es uno y duplicarlo dejaría dos definiciones que pueden
 * divergir.
 *
 * @typedef {'activo' | 'pendiente' | 'suspendido' | 'baja_logica'} TenantEstado
 */

/**
 * @typedef {object} MeUsuario
 * @property {Uuid} id
 * @property {string} nombre_completo
 * @property {string} correo
 * @property {string | null} telefono
 * @property {UsuarioEstado} estado
 * @property {boolean} mfa_enrolado
 * @property {string | null} [ultimo_acceso]
 */

/**
 * @typedef {object} MeTenant
 * @property {Uuid} id
 * @property {string} slug
 * @property {string} razon_social
 * @property {TenantEstado} estado
 * @property {string} plan
 */

/**
 * @typedef {object} Permiso
 * @property {string} codigo
 * @property {string} dominio
 * @property {string} recurso
 * @property {string} accion
 */

/**
 * Módulo habilitado para el tenant. Es la fuente del sidebar dinámico.
 *
 * @typedef {object} Modulo
 * @property {string} codigo
 * @property {string} nombre
 * @property {number} fase
 */

/**
 * @typedef {object} MeResponse
 * @property {MeUsuario} usuario
 * @property {MeTenant} tenant
 * @property {string[]} roles
 * @property {boolean} [es_admin] Rol de sistema con bypass: autoriza cualquier cosa sin pasar por el catálogo de permisos. Es lo que decide si se muestra la administración, porque un `TENANT_ADMIN` puede tener `permisos` vacío y aun así poder todo.
 * @property {Permiso[]} permisos Puede venir vacío aunque haya roles, si `rol_permiso` no está poblado.
 * @property {Modulo[]} modulos
 */

export {};
