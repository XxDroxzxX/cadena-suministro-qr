import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { showToast } from '../utils/toast';
import {
  ArrowLeftRight, ArrowUpCircle, ArrowDownCircle, Settings,
  Search, Filter, Package
} from 'lucide-react';

export default function StockMovements() {
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => { loadMovements(); loadProducts(); }, []);
  useEffect(() => { loadMovements(); }, [filterType, filterProduct, dateFrom, dateTo]);

  const loadMovements = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterType) params.set('type', filterType);
      if (filterProduct) params.set('product_id', filterProduct);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      const data = await api.get(`/stock?${params}`);
      setMovements(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await api.get('/products');
      setProducts(data);
    } catch (err) { console.error(err); }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'entrada': return <ArrowUpCircle size={18} style={{ color: 'var(--success)' }} />;
      case 'salida': return <ArrowDownCircle size={18} style={{ color: 'var(--danger)' }} />;
      case 'ajuste': return <Settings size={18} style={{ color: 'var(--info)' }} />;
      default: return null;
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'entrada': return <span className="badge badge-green">Entrada</span>;
      case 'salida': return <span className="badge badge-red">Salida</span>;
      case 'ajuste': return <span className="badge badge-blue">Ajuste</span>;
      default: return <span className="badge badge-default">{type}</span>;
    }
  };

  const clearFilters = () => {
    setFilterType('');
    setFilterProduct('');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Movimientos de Stock</h1>
          <p className="page-subtitle">Historial completo de entradas, salidas y ajustes de inventario</p>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-row">
        <select className="form-select" style={{ width: '160px' }}
          value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">Todos los tipos</option>
          <option value="entrada">Entradas</option>
          <option value="salida">Salidas</option>
          <option value="ajuste">Ajustes</option>
        </select>

        <select className="form-select" style={{ width: '220px' }}
          value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)}>
          <option value="">Todos los productos</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <input type="date" className="form-input" style={{ width: '160px' }}
          value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          placeholder="Desde" />

        <input type="date" className="form-input" style={{ width: '160px' }}
          value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          placeholder="Hasta" />

        {(filterType || filterProduct || dateFrom || dateTo) && (
          <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
            Limpiar filtros
          </button>
        )}
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner"></div></div>
      ) : movements.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><ArrowLeftRight /></div>
          <h3>No hay movimientos</h3>
          <p>Los movimientos de stock aparecerán aquí conforme se registren.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Producto</th>
                <th>Lote</th>
                <th>Cantidad</th>
                <th>Stand</th>
                <th>Cliente / Destino</th>
                <th>Usuario</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((mov, idx) => (
                <tr key={mov.id} className="animate-in" style={{ animationDelay: `${idx * 0.02}s` }}>
                  <td>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                      {new Date(mov.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                      {new Date(mov.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td>{getTypeBadge(mov.type)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {getTypeIcon(mov.type)}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{mov.product_name}</div>
                        <code style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{mov.sku}</code>
                      </div>
                    </div>
                  </td>
                  <td>
                    {mov.batch_number ? (
                      <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>{mov.batch_number}</span>
                    ) : (
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>—</span>
                    )}
                  </td>
                  <td>
                    <span style={{
                      fontWeight: 700, fontSize: '1rem',
                      color: mov.type === 'entrada' ? 'var(--success)' : mov.type === 'salida' ? 'var(--danger)' : 'var(--info)'
                    }}>
                      {mov.type === 'entrada' ? '+' : mov.type === 'salida' ? '-' : '±'}{mov.quantity}
                    </span>
                  </td>
                  <td>
                    {mov.stand_code ? (
                      <span className="badge badge-default">{mov.stand_code}</span>
                    ) : (
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>—</span>
                    )}
                  </td>
                  <td>
                    {mov.customer_name ? (
                      <span className="badge badge-blue" style={{ fontSize: '0.75rem' }}>{mov.customer_name}</span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Interno</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{mov.user_name}</td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '200px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', title: mov.notes }}>
                      {mov.notes || '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '12px', textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
        Mostrando {movements.length} movimiento{movements.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
