import { Menu } from 'lucide-react';

export default function Topbar({ title, onMenuClick, children }) {
  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button className="btn btn-ghost btn-icon mobile-menu-btn" onClick={onMenuClick}>
          <Menu size={20} />
        </button>
        <h1 className="topbar-title">{title}</h1>
      </div>
      <div className="topbar-actions">
        {children}
      </div>
    </header>
  );
}
