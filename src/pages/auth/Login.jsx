import React, { useState } from 'react';
import axios from 'axios';
import { Eye, EyeOff } from 'lucide-react'; // Importamos íconos para mostrar/ocultar contraseña

// URL base del servidor backend
const API_BASE_URL = 'http://localhost:8000';

const Login = ({ onLoginSuccess }) => {
  // Fases del login: 1 = Credenciales (email, pass), 2 = Código OTP / Enrolamiento MFA
  const [step, setStep] = useState(1);

  // Estado para alternar la visibilidad de la contraseña
  const [showPassword, setShowPassword] = useState(false);

  // Datos del formulario
  const [formData, setFormData] = useState({
    tenant_slug: '',
    correo: '',
    password: '',
    codigo: '',
  });

  // Datos devueltos tras validar la Fase 1 (reto JWT, estado MFA, secreto)
  const [retoData, setRetoData] = useState(null);

  // Estados de interfaz
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // --------------------------------------------------------------------------
  // FASE 1: Enviar identificador de tenant (opcional si es SysAdmin), correo y contraseña
  // --------------------------------------------------------------------------
  const handleFase1Submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const slugClean = formData.tenant_slug.trim();

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login/`, {
        tenant_slug: slugClean,
        tenant: slugClean,
        slug: slugClean,
        correo: formData.correo.trim(),
        password: formData.password,
      });

      setRetoData(response.data);
      setStep(2);
    } catch (err) {
      const msg =
        err.response?.data?.mensaje ||
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Credenciales inválidas o error de conexión.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // FASE 2: Validar el código TOTP de 6 dígitos
  // --------------------------------------------------------------------------
  const handleFase2Submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/otp/`, {
        reto: retoData.reto,
        codigo: formData.codigo.trim(),
      });

      const { token } = response.data;

      localStorage.setItem('jwt_token', token);

      if (onLoginSuccess) {
        onLoginSuccess(token);
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err) {
      const msg =
        err.response?.data?.mensaje ||
        err.response?.data?.detail ||
        'Código de verificación incorrecto o expirado.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Estilos de animación embebidos para asegurar fluidez */}
      <style>
        {`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes floatBlob1 {
            0%, 100% { transform: translate(0px, 0px) scale(1); }
            50% { transform: translate(30px, -20px) scale(1.05); }
          }
          @keyframes floatBlob2 {
            0%, 100% { transform: translate(0px, 0px) scale(1); }
            50% { transform: translate(-30px, 20px) scale(1.05); }
          }
          .animated-card {
            animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .blob-1 {
            animation: floatBlob1 8s ease-in-out infinite;
          }
          .blob-2 {
            animation: floatBlob2 10s ease-in-out infinite;
          }
        `}
      </style>

      {/* Elementos decorativos de fondo con colores de la paleta */}
      <div className="blob-1" style={styles.backgroundBlob1}></div>
      <div className="blob-2" style={styles.backgroundBlob2}></div>

      <div className="animated-card" style={styles.card}>
        {/* LOGO Y NOMBRE DEL SISTEMA (Alineados horizontalmente) */}
        <div style={styles.brandHeaderRow}>
          <div style={styles.brandLogo}>
            N
          </div>
          <div>
            <h1 style={styles.brandTitle}>novaERP</h1>
            <p style={styles.brandSubtitle}>Sistema de Gestión</p>
          </div>
        </div>

        <h2 style={styles.title}>Bienvenido</h2>
        <p style={styles.subtitle}>
          {step === 1
            ? 'Introduce tus datos para continuar'
            : 'Confirma tu identidad con el código de verificación'}
        </p>

        {error && <div style={styles.errorMessage}>{error}</div>}

        {/* ------------------- FORMULARIO FASE 1 ------------------- */}
        {step === 1 && (
          <form onSubmit={handleFase1Submit} style={styles.form}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Empresa (Tenant) — Opcional si eres SysAdmin</label>
              <input
                type="text"
                name="tenant_slug"
                placeholder="ej. acme (déjalo vacío si eres SysAdmin)"
                value={formData.tenant_slug}
                onChange={handleChange}
                style={styles.input}
                onFocus={(e) => {
                  e.target.style.borderColor = '#73030D';
                  e.target.style.backgroundColor = '#FFFFFF';
                  e.target.style.boxShadow = '0 0 0 3px rgba(115, 3, 13, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#AFAFAF';
                  e.target.style.backgroundColor = '#FAFAFA';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Correo Electrónico</label>
              <input
                type="email"
                name="correo"
                placeholder="usuario@dominio.com o root@novaerp.local"
                value={formData.correo}
                onChange={handleChange}
                required
                style={styles.input}
                onFocus={(e) => {
                  e.target.style.borderColor = '#73030D';
                  e.target.style.backgroundColor = '#FFFFFF';
                  e.target.style.boxShadow = '0 0 0 3px rgba(115, 3, 13, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#AFAFAF';
                  e.target.style.backgroundColor = '#FAFAFA';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Contraseña</label>
              <div style={styles.passwordContainer}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  style={{ ...styles.input, width: '100%', paddingRight: '45px' }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#73030D';
                    e.target.style.backgroundColor = '#FFFFFF';
                    e.target.style.boxShadow = '0 0 0 3px rgba(115, 3, 13, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#AFAFAF';
                    e.target.style.backgroundColor = '#FAFAFA';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} color="#AFAFAF" /> : <Eye size={18} color="#AFAFAF" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={styles.buttonPrimary}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#9E1A22')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#73030D')}
            >
              {loading ? 'Validando...' : 'Continuar'}
            </button>
          </form>
        )}

        {/* ------------------- FORMULARIO FASE 2 ------------------- */}
        {step === 2 && (
          <form onSubmit={handleFase2Submit} style={styles.form}>
            <p style={styles.infoText}>{retoData?.mensaje}</p>

            {retoData?.mfa === 'enroll' && (
              <div style={styles.enrollBox}>
                <p style={styles.enrollTitle}>Configura tu Authenticator:</p>
                <p style={{ margin: '4px 0', fontSize: '13px', color: '#0D0D0D' }}>
                  Escanea o añade esta clave en tu aplicación de autenticación:
                </p>
                <code style={styles.secretCode}>{retoData.secret}</code>
              </div>
            )}

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Código de Verificación (6 dígitos)</label>
              <input
                type="text"
                name="codigo"
                maxLength={6}
                placeholder="000000"
                value={formData.codigo}
                onChange={handleChange}
                required
                autoFocus
                style={{ ...styles.input, ...styles.otpInput }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#73030D';
                  e.target.style.backgroundColor = '#FFFFFF';
                  e.target.style.boxShadow = '0 0 0 3px rgba(115, 3, 13, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#AFAFAF';
                  e.target.style.backgroundColor = '#FAFAFA';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={styles.buttonPrimary}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#9E1A22')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#73030D')}
            >
              {loading ? 'Verificando...' : 'Iniciar Sesión'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep(1);
                setError('');
              }}
              style={styles.buttonSecondary}
            >
              ← Regresar a datos de acceso
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

// Estilos sincronizados con la paleta de colores y transiciones fluidas
const styles = {
  container: {
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#F2F2F2', // --color-fondo-main
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    overflow: 'hidden',
  },
  backgroundBlob1: {
    position: 'absolute',
    top: '-15%',
    left: '-10%',
    width: '450px',
    height: '450px',
    backgroundColor: 'rgba(115, 3, 13, 0.07)', // --color-guinda-base con transparencia
    borderRadius: '50%',
    filter: 'blur(60px)',
    zIndex: 0,
  },
  backgroundBlob2: {
    position: 'absolute',
    bottom: '-15%',
    right: '-10%',
    width: '450px',
    height: '450px',
    backgroundColor: 'rgba(13, 13, 13, 0.05)', // --color-negro-profundo con transparencia
    borderRadius: '50%',
    filter: 'blur(60px)',
    zIndex: 0,
  },
  card: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: '420px',
    padding: '40px 32px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 20px 40px rgba(13, 13, 13, 0.08), 0 1px 3px rgba(13, 13, 13, 0.04)',
    border: '1px solid #E5E5E5',
    transition: 'all 0.3s ease',
  },
  brandHeaderRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    textAlign: 'left',
    gap: '12px',
    marginBottom: '24px',
  },
  brandLogo: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    backgroundColor: '#73030D', // --color-guinda-base
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '22px',
    flexShrink: 0,
    boxShadow: '0 4px 10px rgba(115, 3, 13, 0.25)',
  },
  brandTitle: {
    margin: '0',
    fontSize: '24px',
    fontWeight: '800',
    color: '#73030D', // --color-guinda-base
    letterSpacing: '-0.5px',
    lineHeight: '1',
  },
  brandSubtitle: {
    margin: '4px 0 0 0',
    fontSize: '12px',
    color: '#AFAFAF', // --color-gris-medio
    fontWeight: '600',
  },
  title: {
    margin: '0 0 6px 0',
    fontSize: '28px',
    fontWeight: '800',
    color: '#0D0D0D', // --color-negro-profundo
    letterSpacing: '-0.5px',
  },
  subtitle: {
    margin: '0 0 28px 0',
    fontSize: '14px',
    color: '#AFAFAF', // --color-gris-medio
    lineHeight: '1.4',
  },
  errorMessage: {
    backgroundColor: '#F2F2F2',
    color: '#73030D', // --color-guinda-base
    padding: '12px 14px',
    borderRadius: '10px',
    fontSize: '13px',
    marginBottom: '20px',
    border: '1px solid #73030D',
    textAlign: 'center',
    fontWeight: '600',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#0D0D0D', // --color-negro-profundo
  },
  input: {
    padding: '13px 16px',
    fontSize: '14px',
    borderRadius: '10px',
    border: '1px solid #AFAFAF', // --color-gris-medio
    outline: 'none',
    transition: 'all 0.25s ease',
    backgroundColor: '#FAFAFA',
    color: '#0D0D0D', // --color-negro-profundo
  },
  passwordContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  eyeButton: {
    position: 'absolute',
    right: '14px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0',
    transition: 'transform 0.2s',
  },
  otpInput: {
    fontSize: '24px',
    letterSpacing: '10px',
    textAlign: 'center',
    fontWeight: '700',
    color: '#73030D', // --color-guinda-base
  },
  buttonPrimary: {
    padding: '14px',
    fontSize: '15px',
    fontWeight: '600',
    color: '#ffffff',
    backgroundColor: '#73030D', // --color-guinda-base
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    boxShadow: '0 4px 14px rgba(115, 3, 13, 0.25)',
    marginTop: '4px',
  },
  buttonSecondary: {
    padding: '8px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#0D0D0D', // --color-negro-profundo
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'opacity 0.2s',
  },
  infoText: {
    fontSize: '14px',
    color: '#0D0D0D', // --color-negro-profundo
    margin: '0 0 4px 0',
    lineHeight: '1.5',
  },
  enrollBox: {
    backgroundColor: '#F2F2F2', // --color-fondo-main
    padding: '14px',
    borderRadius: '10px',
    borderLeft: '4px solid #73030D', // --color-guinda-base
    border: '1px solid #AFAFAF', // --color-gris-medio
  },
  enrollTitle: {
    margin: '0 0 4px 0',
    fontWeight: '700',
    fontSize: '13px',
    color: '#73030D', // --color-guinda-base
  },
  secretCode: {
    display: 'inline-block',
    padding: '8px 12px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#73030D', // --color-guinda-base
    letterSpacing: '1px',
    wordBreak: 'break-all',
    marginTop: '8px',
    border: '1px solid #AFAFAF', // --color-gris-medio
  },
};

export default Login;