import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { toDataURL } from 'qrcode';
import { isApiError } from '../../core/errors/api-error.model';
import * as auth from '../../core/auth/auth.service';
import { AvisoError, PantallaAcceso } from './PantallaAcceso';
/**
 * Formulario de acceso, en dos fases (RN07): credenciales y luego OTP. El
 * backend nunca abre sesión en la fase 1 — su respuesta es siempre un `reto`,
 * nunca un `token`. Si `mfa === 'enroll'` es el primer login del usuario y el
 * `reto` trae además `secret`/`otpauth_uri` para dar de alta el TOTP antes de
 * confirmar el código.
 *
 * No distingue "usuario no existe" de "password incorrecta" en la fase 1, ni
 * "código incorrecto" de "reto expirado" en la fase 2: el backend manda el
 * mismo mensaje a propósito y la UI no debe inventarse la diferencia.
 *
 * Frente al login que tenía `main`, lo que se gana aquí es el QR del
 * enrolamiento —allí solo se mostraba el secreto en texto, que obliga a
 * teclearlo a mano en el authenticator—, el respeto del `redirectTo` y los
 * enlaces a recuperación y al portal de plataforma.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tenantSlug, setTenantSlug] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [codigo, setCodigo] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [reto, setReto] = useState(null);
  const [qr, setQr] = useState(null);
  async function enviarCredenciales(evento) {
    evento.preventDefault();
    if (enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const respuesta = await auth.login({
        tenant_slug: tenantSlug.trim(),
        correo: correo.trim(),
        password,
      });
      setReto(respuesta);
      if (respuesta.mfa === 'enroll' && respuesta.otpauth_uri) {
        setQr(await toDataURL(respuesta.otpauth_uri));
      }
    } catch (e) {
      setError(isApiError(e) ? e.message : 'No se pudo iniciar sesión.');
    } finally {
      setEnviando(false);
    }
  }
  async function enviarCodigo(evento) {
    evento.preventDefault();
    if (!reto || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const me = await auth.verificarOtp(reto.reto, codigo.trim());
      // `redirectTo` devuelve al usuario a donde iba antes de que el guard lo
      // mandara aquí.
      const destino = searchParams.get('redirectTo') ?? `/${me.tenant.slug}`;
      navigate(destino, { replace: true });
    } catch (e) {
      setError(isApiError(e) ? e.message : 'No se pudo validar el código.');
    } finally {
      setEnviando(false);
    }
  }
  function volverACredenciales() {
    setReto(null);
    setQr(null);
    setCodigo('');
    setError(null);
  }
  return (
    <PantallaAcceso
      titulo="Bienvenido"
      subtitulo={
        reto
          ? 'Confirma tu identidad con el código de verificación'
          : 'Introduce tus datos para continuar'
      }
      pie={
        // El SysAdmin no entra por aquí: su cuenta no vive en core.usuario y su
        // sesión es de otra superficie (/api/admin/login/).
        <span className="text-on-surface-variant">
          ¿Administras la plataforma?{' '}
          <Link to="/admin/acceso" className="font-semibold text-action hover:underline">
            Portal de plataforma
          </Link>
        </span>
      }
    >
      {error ? <AvisoError mensaje={error} /> : null}

      {reto ? (
        <form onSubmit={enviarCodigo} className="flex flex-col gap-5">
          <p className="text-body-md leading-relaxed text-on-surface">{reto.mensaje}</p>

          {reto.mfa === 'enroll' ? (
            <div className="flex flex-col items-center gap-3 rounded-DEFAULT border border-outline bg-background p-3.5">
              <p className="self-start text-body-sm font-bold text-action">
                Configura tu Authenticator:
              </p>
              <p className="self-start text-body-sm text-on-surface">
                Escanea este código con tu aplicación de autenticación, o añade la clave a mano:
              </p>

              {qr ? (
                <img
                  src={qr}
                  alt="Código QR para configurar el segundo factor"
                  width={180}
                  height={180}
                  className="rounded-sm bg-white p-1"
                />
              ) : null}

              <code className="w-full break-all rounded-sm border border-outline bg-surface px-3 py-2 text-center font-mono text-body-sm font-bold tracking-wide text-action">
                {reto.secret}
              </code>
            </div>
          ) : null}

          <div className="campo">
            <label className="campo-etiqueta" htmlFor="codigo">
              Código de Verificación (6 dígitos)
            </label>
            <input
              id="codigo"
              name="codigo"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              required
              autoFocus
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              className="campo-control text-center text-[24px] font-bold tracking-[10px] text-action"
            />
          </div>

          <button type="submit" disabled={enviando} className="btn btn-primario py-3.5">
            {enviando ? 'Verificando...' : 'Iniciar Sesión'}
          </button>

          <button
            type="button"
            onClick={volverACredenciales}
            className="text-body-sm font-semibold text-on-surface transition-opacity hover:opacity-70"
          >
            ← Regresar a datos de acceso
          </button>
        </form>
      ) : (
        <form onSubmit={enviarCredenciales} className="flex flex-col gap-5">
          <div className="campo">
            <label className="campo-etiqueta" htmlFor="tenant_slug">
              Empresa (Tenant)
            </label>
            <input
              id="tenant_slug"
              name="tenant_slug"
              type="text"
              autoComplete="organization"
              placeholder="ej. acme"
              required
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              className="campo-control font-mono"
            />
          </div>

          <div className="campo">
            <label className="campo-etiqueta" htmlFor="correo">
              Correo Electrónico
            </label>
            <input
              id="correo"
              name="correo"
              type="email"
              autoComplete="username"
              placeholder="usuario@dominio.com"
              required
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="campo-control"
            />
          </div>

          <div className="campo">
            <label className="campo-etiqueta" htmlFor="password">
              Contraseña
            </label>
            <div className="relative flex items-center">
              <input
                id="password"
                name="password"
                type={verPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="campo-control pr-11"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setVerPassword(!verPassword)}
                aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-3.5 flex items-center text-gris-medio"
              >
                {verPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={enviando} className="btn btn-primario py-3.5">
            {enviando ? 'Validando...' : 'Continuar'}
          </button>

          {/* Se arrastra la organización ya escrita: el restablecimiento la
                necesita, y volver a teclearla es fricción gratuita. */}
          <Link
            to={`/recuperar?tenant=${encodeURIComponent(tenantSlug.trim())}`}
            className="text-center text-body-sm font-semibold text-on-surface-variant hover:text-on-surface"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </form>
      )}
    </PantallaAcceso>
  );
}
