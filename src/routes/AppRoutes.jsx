import { Routes, Route, Navigate } from 'react-router-dom';

// Auth Pages
import Login from '../pages/auth/Login';
import Otp from '../pages/auth/Otp';
import RecuperarPassword from '../pages/auth/RecuperarPassword';

// Layout & Dashboard
import MainLayout from '../components/layout/MainLayout';
import Dashboard from '../pages/dashboard/Dashboard';

// Admin Pages
import LoginAdmin from '../pages/admin/LoginAdmin';
import DashboardAdmin from '../pages/admin/DashboardAdmin';
import Tenants from '../pages/admin/Tenants';

// Guards
import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Rutas Públicas */}
      <Route path="/auth/login" element={<Login />} />
      <Route path="/auth/otp" element={<Otp />} />
      <Route path="/auth/recuperar-password" element={<RecuperarPassword />} />
      <Route path="/admin/login" element={<LoginAdmin />} />

      {/* Rutas Protegidas ERP (En vueltas en MainLayout) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          {/* Aquí registraremos los siguientes módulos: usuarios, inventario, ventas, etc. */}
        </Route>
      </Route>

      {/* Rutas Protegidas de Administración Multi-tenant */}
      <Route element={<AdminRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/admin/dashboard" element={<DashboardAdmin />} />
          <Route path="/admin/tenants" element={<Tenants />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/auth/login" replace />} />
    </Routes>
  );
};