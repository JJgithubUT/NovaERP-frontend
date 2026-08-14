/** @typedef {import('./auth.model.js').UsuarioEstado} UsuarioEstado */

/** @typedef {import('./common.model.js').Uuid} Uuid */

/**
 * Dominio de Usuarios: directorio, roles, sesiones, seguridad y auditoría.
 * Espejo de la sección Núcleo del `openapi.yaml`.
 *
 * Sobre este dominio operan **dos actores** y el tipo no los distingue, pero la
 * UI sí debe hacerlo (FLUJO-USUARIOS §1): el administrador actúa sobre
 * cualquier usuario del tenant por permiso de catálogo; el propietario solo
 * sobre su propia cuenta y sin permiso ninguno.
 *
 * @typedef {object} Usuario
 * @property {Uuid} id
 * @property {string} correo
 * @property {string} nombre_completo
 * @property {string | null} telefono
 * @property {string | null} puesto
 * @property {string | null} departamento
 * @property {UsuarioEstado} estado
 * @property {boolean} [mfa_enrolado] No viene en las filas del directorio, solo en el detalle.
 * @property {string[]} roles Nombres de rol, no ids. Para asignar hace falta `RolesDeUsuario`.
 * @property {string | null} [ultimo_acceso] Solo en el directorio.
 * @property {string} created_at
 */

/**
 * El alta devuelve el token **en claro una sola vez**.
 *
 * En producción llega por correo al usuario; en desarrollo viene aquí y es la
 * única oportunidad de copiarlo. La pantalla tiene que mostrarlo de forma
 * inequívoca, porque no hay endpoint para recuperarlo después.
 *
 * @typedef {object} UsuarioCreado
 * @see Usuario (hereda sus propiedades)
 * @property {string} [activacion_token]
 */

/**
 * Cambiar el correo devuelve el token de reconfirmación, también una sola vez.
 *
 * @typedef {object} UsuarioActualizado
 * @see Usuario (hereda sus propiedades)
 * @property {string} [verificacion_token]
 */

/**
 * @typedef {object} UsuarioCreate
 * @property {string} correo
 * @property {string} nombre_completo
 * @property {Uuid[]} roles Al menos uno. Son ids de rol, no nombres.
 * @property {string | null} [telefono]
 * @property {string} [puesto]
 * @property {string} [departamento]
 */

/**
 * Lo que acepta el PATCH depende de quién lo manda: el admin puede tocar los
 * cinco campos; el propietario, solo `nombre_completo` y `telefono` (cualquier
 * otro → 422).
 *
 * `telefono: null` (o `""`) lo borra explícitamente; omitir la key lo deja
 * como estaba (el backend distingue "no viene" de "viene vacío").
 *
 * @typedef {object} UsuarioUpdate
 * @property {string} [nombre_completo]
 * @property {string | null} [telefono]
 * @property {string} [correo]
 * @property {string} [puesto]
 * @property {string} [departamento]
 */

/**
 * Conjunto vigente de roles tras asignar o revocar.
 *
 * @typedef {object} RolesDeUsuario
 * @property {Uuid} usuario_id
 * @property {{ id: Uuid; nombre: string; activo: boolean; es_sistema: boolean; }[]} roles
 */

/**
 * Entrada del catálogo maestro. El código es `dominio:recurso:accion`.
 *
 * No confundir con `Permiso` de `auth.model`: aquel es lo que `/me` dice que
 * **tú** tienes; este es el catálogo completo del que se arman los roles, y
 * lleva además descripción y la marca de inerte.
 *
 * @typedef {object} PermisoCatalogo
 * @property {string} codigo
 * @property {string} dominio
 * @property {string} recurso
 * @property {string} accion
 * @property {string | null} descripcion
 * @property {boolean} inerte Su módulo está desactivado en el tenant: no se puede elegir y no autoriza nada. No se ocultan a propósito — así el admin entiende **por qué** no puede marcarlos.
 */

/**
 * @typedef {object} DominioPermisos
 * @property {string} dominio
 * @property {PermisoCatalogo[]} permisos
 */

/**
 * @typedef {object} CatalogoPermisos
 * @property {DominioPermisos[]} dominios
 */

/**
 * Permisos del rol, ya agrupados por dominio.
 *
 * @typedef {object} PermisoDeRol
 * @property {string} dominio
 * @property {{ codigo: string; inerte: boolean }[]} permisos
 */

/**
 * @typedef {object} Rol
 * @property {Uuid} id
 * @property {string} nombre
 * @property {boolean} es_sistema
 * @property {boolean} activo
 * @property {boolean} acceso_total `true` = rol de sistema con bypass: autoriza todo.
 * @property {number} usuarios_asignados
 * @property {PermisoDeRol[]} permisos
 * @property {string} created_at
 */

/**
 * @typedef {object} RolCreate
 * @property {string} nombre
 * @property {string[]} permisos Códigos `dominio:recurso:accion`, no ids.
 */

/**
 * @typedef {Partial<RolCreate>} RolUpdate
 */

/**
 * @typedef {object} Sesion
 * @property {Uuid} id
 * @property {string} jti Identificador del token. Es la clave para cerrarla.
 * @property {string | null} dispositivo
 * @property {string | null} ip_origen
 * @property {string} iniciada_en
 * @property {string} ultima_actividad
 * @property {string} expira_en
 * @property {boolean} actual La sesión desde la que se está mirando. Cerrarla equivale a salir.
 */

/**
 * @typedef {object} SesionesResponse
 * @property {Sesion[]} results
 */

/**
 * @typedef {object} RevocacionResponse
 * @property {number} revocadas
 */

/**
 * Rango que la plataforma permite en cada campo. El formulario valida contra esto.
 *
 * @typedef {object} LimitePlataforma
 * @property {number} min
 * @property {number} max
 */

/**
 * @typedef {object} ConfigSeguridad
 * @property {number} politica_password_min_len
 * @property {string | null} politica_password_regex
 * @property {number} jwt_expiracion_horas
 * @property {number} intentos_max_ventana
 * @property {number} ventana_minutos
 * @property {number} bloqueo_minutos
 * @property {string | null} updated_at `null` si el tenant nunca guardó su política: son los valores por defecto.
 * @property {Record<string, LimitePlataforma>} limites_plataforma
 */

/**
 * @typedef {Partial< Omit<ConfigSeguridad, 'updated_at' | 'limites_plataforma'> >} ConfigSeguridadUpdate
 */

/**
 * @typedef {'BAJA' | 'NORMAL' | 'ALTA'} CriticidadEvento
 */

/**
 * @typedef {object} EventoAuditoria
 * @property {number} id
 * @property {Uuid | null} usuario_id
 * @property {string} entidad
 * @property {string} entidad_id
 * @property {string} operacion `CREATE`/`UPDATE`/`DELETE`/`LOGIN`/`LOGIN_FAILED`/…
 * @property {CriticidadEvento} criticidad
 * @property {string | null} ip_origen
 * @property {string} ocurrido_en
 * @property {Record<string, unknown> | null} valores_antes Fila anterior. `null` en INSERT y en eventos de sesión.
 * @property {Record<string, unknown> | null} valores_despues Fila resultante. `null` en DELETE y en eventos de sesión.
 */

/**
 * @typedef {object} ActividadUsuario
 * @property {Uuid} usuario_id
 * @property {string} nombre_completo
 * @property {string} correo
 * @property {string | null} departamento
 * @property {string | null} puesto
 * @property {UsuarioEstado} estado
 * @property {string | null} ultimo_acceso
 * @property {number} num_sesiones
 * @property {number} num_acciones_cud INSERT/UPDATE/DELETE auditados en el rango.
 */

/**
 * @typedef {'nombre' | 'created_at' | 'ultimo_acceso'} OrdenUsuarios
 */

/**
 * @typedef {object} UsuarioQuery
 * @property {number} [page]
 * @property {number} [page_size]
 * @property {string} [search] Busca en nombre, correo y puesto.
 * @property {UsuarioEstado} [estado]
 * @property {Uuid} [rol]
 * @property {string} [departamento]
 * @property {string} [desde]
 * @property {string} [hasta]
 * @property {OrdenUsuarios} [orden]
 * @property {boolean} [desc]
 */

/**
 * @typedef {object} RolQuery
 * @property {number} [page]
 * @property {number} [page_size]
 * @property {string} [search]
 * @property {boolean} [activo] `false` lista los roles dados de baja.
 */

/**
 * @typedef {object} BitacoraQuery
 * @property {number} [page]
 * @property {number} [page_size]
 * @property {Uuid} [usuario_id]
 * @property {string} [operacion]
 * @property {string} [entidad]
 * @property {string} [desde]
 * @property {string} [hasta]
 */

/**
 * @typedef {object} ActividadQuery
 * @property {number} [page]
 * @property {number} [page_size]
 * @property {string} [desde]
 * @property {string} [hasta]
 * @property {string} [departamento]
 * @property {string} [puesto]
 */

/**
 * Activación de cuenta y reconfirmación de correo. Público, con token.
 *
 * @typedef {object} ActivarCuenta
 * @property {string} token
 * @property {string} [password] Requerido en el alta; se omite al reconfirmar un correo.
 */

export {};
