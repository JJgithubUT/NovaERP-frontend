import { ModuloLayout } from '../../shared/ui/ModuloLayout';

/**
 * De lo concreto a lo transversal: quién entra, con qué alcance, bajo qué
 * reglas, y qué quedó registrado.
 */
const PESTANAS = [
  { segmento: 'usuarios', label: 'Usuarios' },
  { segmento: 'roles', label: 'Roles' },
  { segmento: 'seguridad', label: 'Seguridad' },
  { segmento: 'bitacora', label: 'Bitácora' },
  { segmento: 'actividad', label: 'Actividad' },
];

export function AdministracionLayout() {
  return (
    <ModuloLayout
      titulo="Administración"
      descripcion="Usuarios, roles, políticas de seguridad y auditoría del tenant."
      base="administracion"
      pestanas={PESTANAS}
    />
  );
}
