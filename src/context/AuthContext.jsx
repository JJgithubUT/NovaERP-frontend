import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

// Aplana la respuesta de /api/core/me/ ({usuario, tenant, roles, es_admin,
// permisos, modulos}) a un objeto más cómodo de consumir en el resto de la
// UI (Sidebar, MainLayout, etc.), sin perder los datos originales.
const flattenPerfil = (me) => ({
  ...me.usuario,
  nombre: me.usuario?.nombre_completo,
  email: me.usuario?.correo,
  role: me.es_admin ? 'admin' : (me.roles?.[0] || 'operador'),
  roles: me.roles,
  permisos: me.permisos,
  modulos: me.modulos,
  es_admin: me.es_admin,
  tenant_name: me.tenant?.razon_social,
  tenant: me.tenant,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  // JWT efímero (~5 min) de la fase 1. Solo sirve para /api/auth/otp/,
  // nunca se guarda como credencial de sesión.
  const [reto, setReto] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  // Fase 1: valida tenant_slug + correo + password.
  // Nunca devuelve token de sesión: devuelve un "reto" para la fase 2.
  // Si es el primer login (mfa: "enroll"), también llegan "secret" y
  // "otpauth_uri" para pintar el QR del segundo factor -- una sola vez.
  const loginPhase1 = async (tenantSlug, correo, password) => {
    const { data } = await api.post('/auth/login/', {
      tenant_slug: tenantSlug,
      correo,
      password,
    });
    setReto(data.reto);
    return data; // { reto, mfa: 'enroll' | 'otp', secret?, otpauth_uri?, mensaje }
  };

  // Fase 2: reto + código TOTP -> token de sesión.
  // La respuesta NO incluye el perfil del usuario, así que después de
  // guardar el token hay que pedirlo a /api/core/me/.
  const verifyOtp = async (codigo) => {
    const { data } = await api.post('/auth/otp/', { reto, codigo });
    const accessToken = data.token;

    localStorage.setItem('token', accessToken);
    setToken(accessToken);
    setReto(null);

    const { data: me } = await api.get('/core/me/');
    const perfil = flattenPerfil(me);
    localStorage.setItem('user', JSON.stringify(perfil));
    setUser(perfil);

    return perfil;
  };

  // Login del SysAdmin (portal de plataforma): una sola fase, sin MFA.
  // Es un token distinto ({typ:"sysadmin"}) y no tiene un /core/me/
  // equivalente, por lo que aquí no hay perfil de tenant que cargar.
  const loginAdmin = async (correo, password) => {
    const { data } = await api.post('/admin/login/', { correo, password });
    const accessToken = data.token;
    const perfil = { correo, role: 'superadmin' };

    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(perfil));
    setToken(accessToken);
    setUser(perfil);

    return perfil;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setReto(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      reto,
      loading,
      loginPhase1,
      verifyOtp,
      loginAdmin,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);