import { ModuloLayout } from '../../shared/ui/ModuloLayout';

const PESTANAS = [
  { segmento: 'perfil', label: 'Mi perfil' },
  { segmento: 'sesiones', label: 'Mis sesiones' },
];

/**
 * Autoservicio de la cuenta propia.
 *
 * Nada de aquí exige permisos de catálogo: basta con estar autenticado y ser el
 * dueño del registro (FLUJO-USUARIOS §5). Por eso vive fuera de
 * «Administración» — meterlo ahí lo escondería de la mayoría de usuarios, que
 * son justamente quienes lo necesitan.
 */
export function CuentaLayout() {
  return (
    <ModuloLayout
      titulo="Mi cuenta"
      descripcion="Tus datos y los dispositivos donde tienes la sesión abierta."
      base="cuenta"
      pestanas={PESTANAS}
    />
  );
}
