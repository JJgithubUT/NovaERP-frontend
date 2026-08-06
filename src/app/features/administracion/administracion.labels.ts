import type { UsuarioEstado } from '../../api/models';
import type { BadgeTono } from '../../shared/ui/badge/badge.component';

/**
 * Estados de usuario y lo que habilitan.
 *
 * La regla que gobierna todo (FLUJO-USUARIOS §2): **el login solo funciona en
 * `activo`**. Los otros tres estados son formas distintas de no poder entrar, y
 * la UI tiene que decir cuál es cada una — "no puede entrar" a secas no le dice
 * al admin si tiene que reactivar, reenviar la activación o esperar a que el
 * usuario reconfirme su correo.
 */

export const ESTADO_USUARIO_LABEL: Readonly<Record<UsuarioEstado, string>> = {
  activo: 'Activo',
  pendiente: 'Pendiente de activar',
  suspendido: 'Suspendido',
  pendiente_verificacion: 'Pendiente de verificar correo',
};

/** Qué tiene que pasar para que ese usuario pueda entrar. */
export const ESTADO_USUARIO_AYUDA: Readonly<Record<UsuarioEstado, string>> = {
  activo: 'Puede iniciar sesión con normalidad.',
  pendiente: 'Debe fijar su contraseña con el enlace de activación antes de entrar.',
  suspendido: 'Bloqueado por un administrador. Reactívalo para devolverle el acceso.',
  pendiente_verificacion: 'Cambió de correo y debe reconfirmarlo antes de volver a entrar.',
};

export function tonoUsuario(estado: UsuarioEstado): BadgeTono {
  switch (estado) {
    case 'activo':
      return 'exito';
    case 'suspendido':
      return 'error';
    case 'pendiente':
    case 'pendiente_verificacion':
      return 'aviso';
  }
}

export function puedeSuspender(estado: UsuarioEstado): boolean {
  return estado !== 'suspendido';
}

export function puedeReactivar(estado: UsuarioEstado): boolean {
  return estado === 'suspendido';
}
