import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminRoute = () => {
  const { user, token, loading } = useAuth();

  if (loading) return <div>Cargando...</div>;

  const isAdmin = user && (user.role === 'admin' || user.role === 'superadmin');

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  return isAdmin ? <Outlet /> : <Navigate to="/dashboard" replace />;
};

export default AdminRoute;