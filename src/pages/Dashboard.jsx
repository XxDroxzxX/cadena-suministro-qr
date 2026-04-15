import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Package, Warehouse, TrendingDown, Users, ArrowUpCircle, ArrowDownCircle,
  AlertTriangle, RefreshCw
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await api.get('/stock/dashboard');
      setStats(data);
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="page-loading">
        <div className="spinner" style={{ width: 40, height: 40 }}></div>
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">¡Bienvenido, {user?.full_name}!</h1>
          <p className="page-subtitle">Resumen general del inventario de Special Clean Oil</p>
        </div>
        <button className="btn btn-secondary" onClick={loadDashboard}>
          <RefreshCw size={16} /> Actualizar
        </button>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card animate-in animate-in-delay-1">
          <div className="stat-icon green"><Package /></div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalProducts}</div>
            <div className="stat-label">Productos Totales</div>
          </div>
        </div>

        <div className="stat-card animate-in animate-in-delay-2">
          <div className="stat-icon blue"><Warehouse /></div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalStock.toLocaleString()}</div>
            <div className="stat-label">Unidades en Stock</div>
          </div>
        </div>

        <div className="stat-card animate-in animate-in-delay-3">
          <div className="stat-icon yellow"><AlertTriangle /></div>
          <div className="stat-info">
            <div className="stat-value">{stats.lowStock}</div>
            <div className="stat-label">Stock Bajo</div>
          </div>
        </div>

        <div className="stat-card animate-in animate-in-delay-4">
          <div className="stat-icon green"><Users /></div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalUsers}</div>
            <div className="stat-label">Usuarios Activos</div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Recent Movements */}
        <div className="card animate-in" style={{ animationDelay: '0.2s' }}>
          <div className="card-header">
            <h3 className="card-title">Movimientos Recientes</h3>
            <span className="badge badge-blue">{stats.recentMovements.length}</span>
          </div>
          {stats.recentMovements.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>No hay movimientos registrados</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {stats.recentMovements.map((mov) => (
                <div key={mov.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '10px',
                  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)'
                }}>
                  {mov.type === 'entrada' ? (
                    <ArrowUpCircle size={20} style={{ color: 'var(--success)', flexShrink: 0 }} />
                  ) : (
                    <ArrowDownCircle size={20} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {mov.product_name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                      {mov.user_name} • {mov.stand_code || 'Sin stand'}
                      {mov.batch_number && ` • Lote: ${mov.batch_number}`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`movement-type ${mov.type}`}>
                      {mov.type === 'entrada' ? '+' : '-'}{mov.quantity}
                    </span>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                      {new Date(mov.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Low Stock Alert */}
          <div className="card animate-in" style={{ animationDelay: '0.25s' }}>
            <div className="card-header">
              <h3 className="card-title">⚠️ Alertas de Stock Bajo</h3>
            </div>
            {stats.lowStockProducts.length === 0 ? (
              <p style={{ color: 'var(--success)', fontSize: '0.875rem' }}>✅ Todos los productos con stock suficiente</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {stats.lowStockProducts.map((p) => {
                  const percentage = p.min_stock > 0 ? (p.total_stock / p.min_stock) * 100 : 100;
                  const barColor = percentage <= 25 ? 'red' : percentage <= 75 ? 'yellow' : 'green';
                  return (
                    <div key={p.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{p.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                          {p.total_stock} / {p.min_stock} min
                        </span>
                      </div>
                      <div className="stock-bar">
                        <div className={`stock-bar-fill ${barColor}`}
                          style={{ width: `${Math.min(percentage, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Category Distribution */}
          <div className="card animate-in" style={{ animationDelay: '0.3s' }}>
            <div className="card-header">
              <h3 className="card-title">Distribución por Categoría</h3>
            </div>
            {stats.categoryStats.length === 0 ? (
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>No hay categorías</p>
            ) : (
              <div>
                {stats.categoryStats.map((cat) => {
                  const maxStock = Math.max(...stats.categoryStats.map(c => c.total_stock), 1);
                  return (
                    <div className="category-bar-item" key={cat.name}>
                      <div className="category-dot" style={{ background: cat.color }}></div>
                      <div className="category-bar-info">
                        <div className="category-bar-name">{cat.name}</div>
                        <div className="category-bar-count">{cat.count} productos • {cat.total_stock} unidades</div>
                      </div>
                      <div className="category-bar-track">
                        <div className="category-bar-fill"
                          style={{ width: `${(cat.total_stock / maxStock) * 100}%`, background: cat.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
