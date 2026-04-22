import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Package, QrCode, ScanLine, ArrowLeftRight,
  Users, LogOut, FolderTree, Warehouse, Briefcase, FileBarChart,
  ShoppingCart, Truck, Factory, ClipboardCheck,
} from 'lucide-react';

const navItems = [
  {
    section: 'Principal',
    links: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'bodeguero', 'vendedor'] },
    ]
  },
  {
    section: 'Inventario',
    links: [
      { to: '/products', icon: Package, label: 'Productos', roles: ['admin', 'vendedor', 'bodeguero'] },
      { to: '/categories', icon: FolderTree, label: 'Categorías', roles: ['admin'] },
      { to: '/stands', icon: Warehouse, label: 'Stands', roles: ['admin'] },
    ]
  },
  {
    section: 'Operaciones',
    links: [
      { to: '/scan', icon: ScanLine, label: 'Escanear QR', roles: ['admin', 'bodeguero'] },
      { to: '/movements', icon: ArrowLeftRight, label: 'Movimientos', roles: ['admin', 'bodeguero', 'vendedor'] },
    ]
  },
  {
    section: 'Ventas y Distribución',
    links: [
      { to: '/orders', icon: ShoppingCart, label: 'Pedidos', roles: ['admin', 'vendedor', 'bodeguero'] },
      { to: '/customers', icon: Briefcase, label: 'Clientes', roles: ['admin', 'vendedor'] },
      { to: '/sales-report', icon: FileBarChart, label: 'Reportes', roles: ['admin', 'vendedor'] },
      { to: '/surveys', icon: ClipboardCheck, label: 'Encuestas', roles: ['admin', 'vendedor'] },
    ]
  },
  {
    section: 'Abastecimiento',
    links: [
      { to: '/suppliers', icon: Factory, label: 'Proveedores', roles: ['admin', 'bodeguero'] },
    ]
  },
  {
    section: 'Sistema',
    links: [
      { to: '/users', icon: Users, label: 'Usuarios', roles: ['admin'] },
    ]
  }
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const getInitials = (name) => {
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  };

  const getRoleBadge = (role) => {
    const labels = { admin: 'Administrador', bodeguero: 'Bodeguero', vendedor: 'Vendedor' };
    return labels[role] || role;
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <img src="/logo.jpg" alt="Special Clean Oil" />
        <div className="sidebar-logo-text">
          <h1>SPECIAL CLEAN OIL</h1>
          <span>Sistema de Inventario</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((section) => {
          const visibleLinks = section.links.filter(link => link.roles.includes(user?.role));
          if (visibleLinks.length === 0) return null;
          
          return (
            <div className="sidebar-section" key={section.section}>
              <div className="sidebar-section-title">{section.section}</div>
              {visibleLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive && (link.to === '/' ? location.pathname === '/' : true) ? 'active' : ''}`
                  }
                  end={link.to === '/'}
                  onClick={() => onClose?.()}
                >
                  <link.icon />
                  <span>{link.label}</span>
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-user">
        <div className="sidebar-user-avatar">{getInitials(user?.full_name || 'U')}</div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{user?.full_name}</div>
          <div className="sidebar-user-role">{getRoleBadge(user?.role)}</div>
        </div>
        <button className="sidebar-logout" onClick={logout} title="Cerrar sesión">
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
