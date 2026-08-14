/**
 * Estados de usuario y lo que habilitan.
 *
 * La regla que gobierna todo (FLUJO-USUARIOS §2): **el login solo funciona en
 * `activo`**. Los otros tres estados son formas distintas de no poder entrar, y
 * la UI tiene que decir cuál es cada una — "no puede entrar" a secas no le dice
 * al admin si tiene que reactivar, reenviar la activación o esperar a que el
 * usuario reconfirme su correo.
 */

/** @typedef {import('../../api/models/auth.model.js').UsuarioEstado} UsuarioEstado */
/** @typedef {import('../../shared/ui/Badge.jsx').BadgeTono} BadgeTono */

export const ESTADO_USUARIO_LABEL = {
  activo: 'Activo',
  pendiente: 'Pendiente de activar',
  suspendido: 'Suspendido',
  pendiente_verificacion: 'Pendiente de verificar correo',
};

/** Qué tiene que pasar para que ese usuario pueda entrar. */
export const ESTADO_USUARIO_AYUDA = {
  activo: 'Puede iniciar sesión con normalidad.',
  pendiente: 'Debe fijar su contraseña con el enlace de activación antes de entrar.',
  suspendido: 'Bloqueado por un administrador. Reactívalo para devolverle el acceso.',
  pendiente_verificacion: 'Cambió de correo y debe reconfirmarlo antes de volver a entrar.',
};

/**
 * @param {UsuarioEstado} estado
 * @returns {BadgeTono}
 */
export function tonoUsuario(estado) {
  switch (estado) {
    case 'activo':
      return 'exito';
    case 'suspendido':
      return 'error';
    default:
      return 'aviso';
  }
}

/** @param {UsuarioEstado} estado */
export function puedeSuspender(estado) {
  return estado !== 'suspendido';
}

/** @param {UsuarioEstado} estado */
export function puedeReactivar(estado) {
  return estado === 'suspendido';
}
