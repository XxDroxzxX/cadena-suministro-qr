import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatCOP } from '../utils/format';
import { showToast } from '../utils/toast';
import Modal from '../components/UI/Modal';
import { 
  Plus, Search, ShoppingCart, Truck, Clock, CheckCircle, 
  XCircle, Package, User, MapPin, ExternalLink, Calendar,
  Hash, DollarSign, Tag
} from 'lucide-react';

export default function Orders() {
  const { user, hasRole } = useAuth();
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [saving, setSaving] = useState(false);

  // New Order State
  const [newOrder, setNewOrder] = useState({ customer_id: '', items: [] });
  // Dispatch State
  const [dispatchInfo, setDispatchInfo] = useState({ carrier: '', tracking_number: '' });

  useEffect(() => {
    loadOrders();
    if (hasRole('admin', 'vendedor')) {
      loadCustomers();
      loadProducts();
    }
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await api.get('/orders');
      setOrders(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const data = await api.get('/customers');
      setCustomers(data);
    } catch (err) { console.error(err); }
  };

  const loadProducts = async () => {
    try {
      const data = await api.get('/products');
      setProducts(data);
    } catch (err) { console.error(err); }
  };

  const handleAddProduct = (product) => {
    const existing = newOrder.items.find(item => item.product_id === product.id);
    if (existing) {
      setNewOrder({
        ...newOrder,
        items: newOrder.items.map(item => 
          item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      });
    } else {
      setNewOrder({
        ...newOrder,
        items: [...newOrder.items, { product_id: product.id, name: product.name, quantity: 1, unit_price: product.unit_price }]
      });
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (newOrder.items.length === 0) return showToast('Agregue al menos un producto', 'warning');
    
    try {
      setSaving(true);
      await api.post('/orders', newOrder);
      showToast('Pedido creado exitosamente', 'success');
      setShowAddModal(false);
      setNewOrder({ customer_id: '', items: [] });
      loadOrders();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDispatch = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put(`/orders/${selectedOrder.id}/dispatch`, dispatchInfo);
      showToast('Pedido despachado y stock actualizado', 'success');
      setShowDispatchModal(false);
      setDispatchInfo({ carrier: '', tracking_number: '' });
      loadOrders();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (order) => {
    try {
      const data = await api.get(`/orders/${order.id}`);
      setSelectedOrder(data);
      setShowDetailModal(true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'waiting': return <span className="badge badge-yellow"><Clock size={12} /> En Espera</span>;
      case 'dispatched': return <span className="badge badge-green"><Truck size={12} /> Despachado</span>;
      case 'cancelled': return <span className="badge badge-red"><XCircle size={12} /> Cancelado</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  const filteredOrders = orders.filter(o => 
    o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.id.toString().includes(searchTerm)
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Pedidos</h1>
          <p className="page-subtitle">Monitoreo de salida y despacho de productos terminados</p>
        </div>
        {hasRole('admin', 'vendedor') && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={18} /> Nuevo Pedido
          </button>
        )}
      </div>

      <div className="filters-row">
        <div className="search-bar" style={{ maxWidth: '400px' }}>
          <Search />
          <input placeholder="Buscar por cliente o # de pedido..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner"></div></div>
      ) : (
        <div className="data-grid">
          {filteredOrders.map((order, idx) => (
            <div key={order.id} className="card animate-in" style={{ animationDelay: `${idx * 0.05}s` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div className="avatar-initials" style={{ background: order.status === 'dispatched' ? 'var(--success-bg)' : 'var(--warning-bg)', color: order.status === 'dispatched' ? 'var(--success)' : 'var(--warning)' }}>
                    <Hash size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Pedido #{order.id}</h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{new Date(order.created_at).toLocaleString()}</div>
                  </div>
                </div>
                {getStatusBadge(order.status)}
              </div>

              <div className="customer-info-main" style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>Cliente</div>
                <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{order.customer_name}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div className="card" style={{ padding: '10px', background: 'var(--bg-secondary)', border: 'none' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Total</div>
                  <div style={{ fontWeight: 800 }}>{formatCOP(order.total_amount)}</div>
                </div>
                <div className="card" style={{ padding: '10px', background: 'var(--bg-secondary)', border: 'none' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Transportadora</div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{order.carrier || 'Pendiente'}</div>
                </div>
              </div>

              <div className="card-footer-actions" style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => openDetail(order)}>
                  <Package size={14} /> Detalles
                </button>
                {order.status === 'waiting' && hasRole('admin', 'bodeguero') && (
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => { setSelectedOrder(order); setShowDispatchModal(true); }}>
                    <Truck size={14} /> Despachar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: ADD ORDER */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)}
        title="Crear Nuevo Pedido"
        className="modal-lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleCreateOrder} disabled={saving || !newOrder.customer_id || newOrder.items.length === 0}>
              {saving ? <div className="spinner" style={{ width: 16, height: 16 }}></div> : 'Crear Pedido'}
            </button>
          </>
        }>
        <div className="form-group">
          <label className="form-label">Cliente *</label>
          <select className="form-select" value={newOrder.customer_id} 
            onChange={e => setNewOrder({...newOrder, customer_id: e.target.value})} required>
            <option value="">Seleccione un cliente...</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="order-creation-grid">
          <div className="product-selector card" style={{ background: 'var(--bg-secondary)', border: 'none' }}>
            <h4 style={{ marginBottom: '12px', fontSize: '0.9rem' }}>Seleccionar Productos</h4>
            <div className="product-list-small">
              {products.map(p => (
                <div key={p.id} className="product-item-mini" onClick={() => handleAddProduct(p)}>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="stock-label">Stock: {p.total_stock}</span>
                    <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>{formatCOP(p.unit_price)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="order-summary card" style={{ background: 'var(--primary-bg)', border: '1px dashed var(--primary)' }}>
            <h4 style={{ marginBottom: '12px', fontSize: '0.9rem' }}>Resumen del Pedido</h4>
            <div className="items-list">
              {newOrder.items.map(item => (
                <div key={item.product_id} className="summary-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.85rem' }}>{item.name} <small>x{item.quantity}</small></span>
                  <span style={{ fontWeight: 700 }}>{formatCOP(item.quantity * item.unit_price)}</span>
                </div>
              ))}
              {newOrder.items.length === 0 && <p style={{ textAlign: 'center', padding: '20px', opacity: 0.5 }}>Sin productos</p>}
            </div>
            <div className="summary-total" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '2px solid var(--primary)', display: 'flex', justifyContent: 'space-between' }}>
              <strong>Total:</strong>
              <strong style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>
                {formatCOP(newOrder.items.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0))}
              </strong>
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL: DISPATCH */}
      <Modal isOpen={showDispatchModal} onClose={() => setShowDispatchModal(false)}
        title={`Despachar Pedido #${selectedOrder?.id}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowDispatchModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleDispatch} disabled={saving || !dispatchInfo.carrier || !dispatchInfo.tracking_number}>
              {saving ? <div className="spinner" style={{ width: 16, height: 16 }}></div> : 'Confirmar Despacho'}
            </button>
          </>
        }>
        <div className="form-group">
          <label className="form-label">Transportadora *</label>
          <input className="form-input" placeholder="Ej: DHL, Servientrega" value={dispatchInfo.carrier}
            onChange={e => setDispatchInfo({...dispatchInfo, carrier: e.target.value})} required />
        </div>
        <div className="form-group">
          <label className="form-label">Número de Guía *</label>
          <input className="form-input" placeholder="Referencia de rastreo" value={dispatchInfo.tracking_number}
            onChange={e => setDispatchInfo({...dispatchInfo, tracking_number: e.target.value})} required />
        </div>
        <div className="alert-info">
          <Clock size={16} /> 
          <div>Al confirmar, el sistema validará el stock y registrará la salida automática de la bodega siguiendo el flujo FIFO.</div>
        </div>
      </Modal>

      {/* MODAL: DETAIL */}
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)}
        title={`Detalle Pedido #${selectedOrder?.id}`}
        className="modal-lg">
        {selectedOrder && (
          <>
            <div className="detail-section card" style={{ background: 'var(--bg-secondary)', border: 'none', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div className="avatar-initials"><User size={20} /></div>
                <div>
                  <h4 style={{ margin: 0 }}>{selectedOrder.customer_name}</h4>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12}/> {selectedOrder.customer_address}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <h4 style={{ marginBottom: '12px' }}>Productos Solicitados</h4>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th style={{ textAlign: 'right' }}>Cant.</th>
                    <th style={{ textAlign: 'right' }}>Unitario</th>
                    <th style={{ textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map(item => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                        <code style={{ fontSize: '0.7rem' }}>{item.sku}</code>
                      </td>
                      <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{formatCOP(item.unit_price)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCOP(item.quantity * item.unit_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
