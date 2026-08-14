import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import * as coreApi from '../../api/services/core.api';
import { cargarMe } from '../../core/auth/auth.service';
import { useAuth } from '../../core/auth/useAuth';
import { campoDeError, mensajeDeError } from '../../core/errors/mensaje-error';
import { Badge } from '../../shared/ui/Badge';
import { Campo } from '../../shared/ui/Campo';
import { toasts } from '../../shared/ui/toast';
import { formatFechaHora } from '../../shared/utils/fecha.util';
import { ESTADO_USUARIO_LABEL, tonoUsuario } from '../administracion/administracion.labels';

/**
 * Datos propios del usuario.
 *
 * Solo se editan nombre y teléfono. El **correo no se cambia desde aquí** a
 * propósito: hacerlo deja la cuenta en `pendiente_verificacion` —sin poder
 * entrar— hasta reconfirmarlo con un código que emite el backend, y ese código
 * lo recibe quien administra, no el propio usuario. Cambiarlo uno mismo sería
 * quedarse fuera sin manera de volver.
 */
export function PerfilPage() {
  const auth = useAuth();
  const usuario = auth.usuario();
  const tenant = auth.tenant();

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [tocado, setTocado] = useState(false);
  /*
   * Impide que un refresco del contexto pise lo que se esté escribiendo. El
   * formulario se siembra una sola vez, en cuanto llega el usuario — que en un
   * arranque en frío, sin `me` cacheado, es después del primer render.
   */
  const sembrado = useRef(false);

  useEffect(() => {
    if (!usuario || sembrado.current) return;
    setNombre(usuario.nombre_completo);
    setTelefono(usuario.telefono ?? '');
    sembrado.current = true;
  }, [usuario]);

  const guardado = useMutation({
    mutationFn: (datos) => coreApi.editarUsuario(auth.usuarioId(), datos),
    onSuccess: async (actualizado) => {
      // Se siembra con la respuesta del PATCH para que el campo refleje al
      // instante lo que quedó guardado (incluye el caso de haberlo borrado).
      setTelefono(actualizado.telefono ?? '');
      toasts.exito('Datos actualizados.');
      // El nombre se pinta en el shell desde el `me` cacheado: sin recargarlo,
      // la barra lateral seguiría mostrando el anterior hasta el próximo
      // arranque.
      await cargarMe();
    },
    onError: (error) => {
      if (!campoDeError(error)) toasts.error(mensajeDeError(error));
    },
  });

  const errorNombre = !nombre.trim() ? 'Este campo es obligatorio.' : '';
  const errorGeneral =
    !guardado.error || campoDeError(guardado.error) ? null : mensajeDeError(guardado.error);

  function errorDe(campo) {
    if (campo === 'nombre_completo' && tocado && errorNombre) return errorNombre;
    return campoDeError(guardado.error) === campo ? mensajeDeError(guardado.error) : '';
  }

  function enviar(evento) {
    evento.preventDefault();
    if (errorNombre || guardado.isPending) {
      setTocado(true);
      return;
    }

    const limpio = telefono.trim();
    guardado.mutate({
      nombre_completo: nombre.trim(),
      // El campo arranca sembrado con el valor real, así que dejarlo en blanco
      // es una decisión explícita de borrarlo: se manda `null` en vez de omitir
      // la clave.
      telefono: limpio === '' ? null : limpio,
    });
  }

  if (!usuario) {
    return <p className="text-body-sm text-on-surface-variant">Cargando tus datos…</p>;
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h2 className="text-headline-sm text-on-surface">Mi perfil</h2>
        <p className="mt-0.5 text-body-sm text-on-surface-variant">
          Tus datos en {tenant?.razon_social ?? 'la organización'}.
        </p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        <Dato
          etiqueta="Correo"
          valor={usuario.correo}
          ayuda="Solo un administrador puede cambiarlo."
        />
        <Dato
          etiqueta="Estado"
          valor={
            <Badge tono={tonoUsuario(usuario.estado)}>{ESTADO_USUARIO_LABEL[usuario.estado]}</Badge>
          }
        />
        <Dato etiqueta="Roles" valor={auth.roles().join(' · ') || '—'} />
        <Dato
          etiqueta="Segundo factor"
          valor={
            usuario.mfa_enrolado ? (
              <Badge tono="exito">Configurado</Badge>
            ) : (
              <Badge tono="aviso">Sin configurar</Badge>
            )
          }
        />
        <Dato etiqueta="Último acceso" valor={formatFechaHora(usuario.ultimo_acceso)} />
      </dl>

      {errorGeneral ? (
        <p
          role="alert"
          className="rounded-DEFAULT border border-error bg-error-container px-3 py-2 text-body-sm text-on-error-container"
        >
          {errorGeneral}
        </p>
      ) : null}

      <form onSubmit={enviar} className="flex flex-col gap-4">
        <Campo etiqueta="Nombre completo" paraId="nombre" error={errorDe('nombre_completo')}>
          <input
            id="nombre"
            className="campo-control"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onBlur={() => setTocado(true)}
          />
        </Campo>

        <Campo
          etiqueta="Teléfono"
          paraId="telefono"
          error={errorDe('telefono')}
          ayuda="Déjalo vacío para borrarlo."
        >
          <input
            id="telefono"
            className="campo-control"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
          />
        </Campo>

        <button
          type="submit"
          className="btn btn-primario self-start"
          disabled={guardado.isPending || errorNombre !== ''}
        >
          {guardado.isPending ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  );
}

/** @param {{ etiqueta: string, valor: React.ReactNode, ayuda?: string }} props */
function Dato({ etiqueta, valor, ayuda }) {
  return (
    <div className="rounded-DEFAULT border border-outline-variant bg-surface-container px-3 py-2">
      <dt className="text-label-caps uppercase text-on-surface-variant">{etiqueta}</dt>
      <dd className="mt-0.5 text-body-md text-on-surface">{valor}</dd>
      {ayuda ? <p className="mt-0.5 text-label-md text-on-surface-variant">{ayuda}</p> : null}
    </div>
  );
}
