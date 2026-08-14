/** @typedef {import('./auth.model.js').TenantEstado} TenantEstado */

/** @typedef {import('./common.model.js').Paginated} Paginated */
/** @typedef {import('./common.model.js').Uuid} Uuid */

/**
 * El plan tal como lo incrusta el tenant serializado: sin `activo` ni módulos.
 *
 * @typedef {object} PlanContratado
 * @property {string} codigo
 * @property {string} nombre
 * @property {number} licencias_max
 */

/**
 * @typedef {object} Tenant
 * @property {Uuid} id
 * @property {string} slug
 * @property {string} razon_social
 * @property {string} dominio_comercial
 * @property {PlanContratado} plan
 * @property {TenantEstado} estado
 * @property {string | null} motivo_suspension
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {object} ModuloActivo
 * @property {string} codigo
 * @property {string} nombre
 * @property {number} fase
 */

/**
 * Consumo de licencias frente al techo del plan. Puede pasar del techo: bajar
 *  de plan no borra usuarios.
 *
 * @typedef {object} UsoLicencias
 * @property {number} registrados
 * @property {number} licencias_consumidas
 * @property {number} licencias_max
 */

/**
 * RF-02/CA05: el detalle añade módulos activos y consumo de licencias.
 *
 * @typedef {object} TenantDetalle
 * @see Tenant (hereda sus propiedades)
 * @property {ModuloActivo[]} modulos_activos
 * @property {UsoLicencias} usuarios
 */

/**
 * El listado añade `mensaje` cuando no hay resultados. Viene redactado del
 * backend, así que la pantalla lo muestra tal cual en vez de inventar el suyo.
 *
 * @typedef {object} TenantListado
 * @see Paginated<Tenant> (hereda sus propiedades)
 * @property {string} [mensaje]
 */

/**
 * @typedef {'razon_social' | 'created_at' | 'estado' | 'plan'} OrdenTenant
 */

/**
 * @typedef {object} TenantQuery
 * @property {number} [page]
 * @property {number} [page_size]
 * @property {string} [search] Razón social, dominio o UUID.
 * @property {TenantEstado | ''} [estado]
 * @property {string} [plan]
 * @property {string} [desde] Fecha de alta, `YYYY-MM-DD`.
 * @property {string} [hasta]
 * @property {OrdenTenant} [orden]
 * @property {boolean} [desc]
 */

/**
 * @typedef {object} AdminInicial
 * @property {Uuid} id
 * @property {string} correo
 * @property {string} nombre_completo
 * @property {string} estado
 */

/**
 * @typedef {object} TenantCreate
 * @property {string} slug Dominio comercial: `[a-z0-9-]{3,50}`, único en la plataforma e inmutable.
 * @property {string} razon_social
 * @property {string} dominio_comercial
 * @property {string} plan
 * @property {string} nombre_completo
 * @property {string} correo
 */

/**
 * El alta devuelve el token de activación **en claro una sola vez**: en la
 * tabla vive su hash. Si no se copia, la única salida es reenviarlo.
 *
 * @typedef {object} TenantCreado
 * @see TenantDetalle (hereda sus propiedades)
 * @property {AdminInicial} admin_inicial
 * @property {string} activacion_token
 */

/**
 * Reemisión del enlace. Rota el token: el anterior deja de servir.
 *
 * @typedef {object} ReenvioActivacion
 * @property {string} activacion_token
 * @property {string} expira_en
 * @property {AdminInicial} admin_inicial
 */

/**
 * Canje del enlace por parte del administrador inicial. Endpoint público.
 *
 * @typedef {object} ActivarTenantRequest
 * @property {string} token
 * @property {string} password
 */

/**
 * @typedef {object} TenantActivado
 * @see TenantDetalle (hereda sus propiedades)
 * @property {Pick<AdminInicial, 'id' | 'correo' | 'estado'>} admin_inicial
 */

/**
 * @typedef {object} CambioModulos
 * @property {string[]} activar
 * @property {string[]} desactivar
 */

/**
 * @typedef {object} TenantUpdate
 * @property {string} [razon_social]
 * @property {string} [dominio_comercial]
 * @property {string} [plan]
 * @property {CambioModulos} [modulos]
 * @property {boolean} [confirmar_cascada] Apagar un módulo del que dependen otros activos exige confirmarlo. Sin esto el backend responde 422 con `requiere_confirmar_cascada` y la lista de afectados.
 */

/**
 * @typedef {'administrativa' | 'cumplimiento'} TipoSuspension
 */

/**
 * @typedef {object} SuspenderTenant
 * @property {TipoSuspension} tipo
 * @property {string} motivo
 */

/**
 * Suspender y dar de baja cierran todas las sesiones del tenant al instante.
 *
 * @typedef {object} TenantSuspendido
 * @see Tenant (hereda sus propiedades)
 * @property {number} sesiones_revocadas
 */

/**
 * @typedef {object} PlanCatalogo
 * @property {string} codigo
 * @property {string} nombre
 * @property {number} licencias_max
 * @property {boolean} activo Un plan retirado sigue existiendo: hay tenants contratados en él. El alta solo puede usar los vigentes — es lo que valida el POST.
 * @property {string[]} modulos
 */

/**
 * @typedef {object} ModuloCatalogo
 * @property {string} codigo
 * @property {string} nombre
 * @property {number} fase
 * @property {boolean} nucleo Fase 0. Nunca se puede desactivar: el backend lo rechaza con 422.
 * @property {string[]} depende_de
 * @property {string[]} requerido_por
 * @property {string[]} planes Planes que lo incluyen. Vacío = no contratable en ninguno.
 */

/**
 * Catálogo maestro de plataforma. Trae el mismo grafo de dependencias con el
 * que el backend valida la cascada, para que lo que el portal anticipe no
 * pueda divergir del 422.
 *
 * @typedef {object} CatalogosPlataforma
 * @property {PlanCatalogo[]} planes
 * @property {ModuloCatalogo[]} modulos
 * @property {string[]} dominios_reservados
 */

/**
 * @typedef {object} SysadminLoginRequest
 * @property {string} correo
 * @property {string} password
 */

/**
 * Login de una fase: sin MFA ni reto OTP, a diferencia del de tenant.
 *
 * @typedef {object} SysadminLoginResponse
 * @property {string} token
 * @property {string} mensaje
 */

/**
 * @typedef {object} SysadminSesion
 * @property {string} jti
 * @property {string} emitida_en
 * @property {string} expira_en Permite avisar del vencimiento sin decodificar el JWT.
 * @property {string | null} ip_origen
 */

/**
 * @typedef {object} SysadminMe
 * @property {Uuid} id
 * @property {string} correo
 * @property {boolean} activo
 * @property {string} created_at
 * @property {boolean} mfa_enrolado
 * @property {SysadminSesion | null} sesion
 */

export {};
