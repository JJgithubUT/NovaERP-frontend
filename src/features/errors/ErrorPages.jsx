import { Link } from 'react-router-dom';
import { ShieldOff, SearchX } from 'lucide-react';
import { useAuth } from '../../core/auth/useAuth';
/**
 * Las dos pantallas de error a las que mandan los guards.
 *
 * La distinción entre ellas es la misma que hace el backend y conviene
 * respetarla: **403** es "eres tú, pero no puedes"; **404** es "no existe, o no
 * te vamos a decir si existe". Un recurso de otro tenant responde 404 a
 * propósito — confirmar su existencia ya sería filtrar información entre
 * organizaciones.
 */
function Marco({ icono, codigo, titulo, descripcion }) {
  const auth = useAuth();
  const tenantSlug = auth.tenantSlug();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
        {icono}
      </div>
      <p className="font-mono text-label-caps uppercase tracking-widest text-on-surface-variant">
        Error {codigo}
      </p>
      <h1 className="text-[28px] font-extrabold tracking-[-0.5px] text-on-surface">{titulo}</h1>
      <p className="max-w-md text-body-md text-on-surface-variant">{descripcion}</p>
      <Link to={tenantSlug ? `/${tenantSlug}` : '/login'} className="btn btn-primario mt-2">
        {tenantSlug ? 'Volver al inicio' : 'Ir al acceso'}
      </Link>
    </main>
  );
}
export function NotFoundPage() {
  return (
    <Marco
      icono={<SearchX size={28} />}
      codigo="404"
      titulo="No encontramos esta página"
      descripcion="La dirección no existe, o pertenece a una organización distinta de la tuya."
    />
  );
}
export function ForbiddenPage() {
  return (
    <Marco
      icono={<ShieldOff size={28} />}
      codigo="403"
      titulo="No tienes permiso para esto"
      descripcion="Tu cuenta existe y la sesión es válida, pero tu rol no incluye el permiso que esta pantalla requiere. Habla con quien administre tu organización."
    />
  );
}
/**
 * El 404 **dentro** del shell, para una sección que no existe bajo un tenant
 * válido (`/acme/lo-que-sea`).
 *
 * Hace falta uno aparte porque `NotFoundPage` ocupa la ventana entera: anidado
 * dentro del `<main>` del shell añadiría una segunda pantalla de alto completo
 * y una barra de scroll de más. Aquí el sidebar sigue visible, que además es lo
 * útil — el usuario está dentro de su organización y solo se equivocó de
 * sección.
 */
export function SeccionNoEncontrada() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
        <SearchX size={26} />
      </div>
      <p className="font-mono text-label-caps uppercase tracking-widest text-on-surface-variant">
        Error 404
      </p>
      <h1 className="text-2xl font-bold text-on-surface">Esta sección no existe</h1>
      <p className="max-w-md text-body-md text-on-surface-variant">
        Revisa la dirección, o vuelve al menú lateral para ir a un módulo de tu organización.
      </p>
    </div>
  );
}
