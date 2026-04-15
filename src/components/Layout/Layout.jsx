import { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ToastContainer from '../UI/ToastContainer';

const pageTitles = {
  '/': 'Dashboard',
  '/products': 'Productos',
  '/categories': 'Categorías',
  '/stands': 'Stands / Estantes',
  '/scan': 'Escanear QR',
  '/movements': 'Movimientos de Stock',
  '/users': 'Gestión de Usuarios',
};

export default function Layout() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" style={{ width: 40, height: 40 }}></div>
        <p>Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const title = pageTitles[location.pathname] || 'Special Clean Oil';

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main-content">
        <Topbar title={title} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <div className="page-content">
          <Outlet />
        </div>
      </main>
      <ToastContainer />
    </div>
  );
}
