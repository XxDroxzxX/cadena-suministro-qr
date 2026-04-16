import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, Search, ShoppingCart, Truck, Clock, CheckCircle, 
  XCircle, Filter, Package, User, MapPin, ExternalLink 
} from 'lucide-react';

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // New Order State
  const [newOrder, setNewOrder] = useState({
    customer_id: '',
    items: []
  });

  // Dispatch State
  const [dispatchInfo, setDispatchInfo] = useState({
    carrier: '',
    tracking_number: ''
  });

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:10000/api';

  useEffect(() => {
    fetchOrders();
    if (user.role !== 'bodeguero') {
      fetchCustomers();
      fetchProducts();
    }
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${apiUrl}/orders`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${apiUrl}/customers`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setCustomers(data);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${apiUrl}/products`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
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
    if (newOrder.items.length === 0) return alert('Agregue al menos un producto');
    
    try {
      const res = await fetch(`${apiUrl}/orders`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify(newOrder)
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewOrder({ customer_id: '', items: [] });
        fetchOrders();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al crear pedido');
      }
    } catch (err) {
      console.error('Error creating order:', err);
    }
  };

  const handleDispatch = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${apiUrl}/orders/${selectedOrder.id}/dispatch`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify(dispatchInfo)
      });
      if (res.ok) {
        setShowDispatchModal(false);
        setDispatchInfo({ carrier: '', tracking_number: '' });
        fetchOrders();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al despachar pedido');
      }
    } catch (err) {
      console.error('Error dispatching order:', err);
    }
  };

  const openDetail = async (order) => {
    try {
      const res = await fetch(`${apiUrl}/orders/${order.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setSelectedOrder(data);
      setShowDetailModal(true);
    } catch (err) {
      console.error('Error fetching order items:', err);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'waiting': return <span className="badge badge-warning"><Clock size={12} /> En Espera</span>;
      case 'dispatched': return <span className="badge badge-success"><Truck size={12} /> Despachado</span>;
      case 'cancelled': return <span className="badge badge-danger"><XCircle size={12} /> Cancelado</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  const filteredOrders = orders.filter(o => 
    o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.id.toString().includes(searchTerm)
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-info">
          <h1>Gestión de Pedidos</h1>
          <p>Cree y despache pedidos de clientes con seguimiento de transportadora.</p>
        </div>
        {(user.role === 'admin' || user.role === 'vendedor') && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={18} /> Nuevo Pedido
          </button>
        )}
      </div>

      <div className="card filters-card">
        <div className="search-box">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Buscar por cliente o # pedido..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="card table-card">
        {loading ? (
          <div className="table-loading">Cargando pedidos...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Fecha Cria.</th>
                <th>Despacho</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id}>
                  <td><strong>#{order.id}</strong></td>
                  <td>{order.customer_name}</td>
                  <td>${parseFloat(order.total_amount).toLocaleString()}</td>
                  <td>{getStatusBadge(order.status)}</td>
                  <td>{new Date(order.created_at).toLocaleDateString()}</td>
                  <td>
                    {order.carrier ? (
                      <div className="dispatch-info">
                        <small>{order.carrier}</small><br/>
                        <small className="text-muted">{order.tracking_number}</small>
                      </div>
                    ) : '-'}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button className="btn-icon" onClick={() => openDetail(order)} title="Ver Detalle">
                        <Package size={16} />
                      </button>
                      {order.status === 'waiting' && (user.role === 'admin' || user.role === 'bodeguero') && (
                        <button className="btn-icon btn-icon-success" onClick={() => { setSelectedOrder(order); setShowDispatchModal(true); }} title="Despachar">
                          <Truck size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>No se encontraron pedidos.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL: ADD ORDER */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-lg">
            <div className="modal-header">
              <h2>Crear Nuevo Pedido</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}><XCircle /></button>
            </div>
            <form onSubmit={handleCreateOrder}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Cliente</label>
                  <select 
                    value={newOrder.customer_id} 
                    onChange={e => setNewOrder({...newOrder, customer_id: e.target.value})}
                    required
                  >
                    <option value="">Seleccione un cliente...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="order-creation-grid">
                  <div className="product-selector card">
                    <h3>Seleccionar Productos</h3>
                    <div className="product-list-small">
                      {products.map(p => (
                        <div key={p.id} className="product-item-mini" onClick={() => handleAddProduct(p)}>
                          <span>{p.name} - ${parseFloat(p.unit_price).toLocaleString()}</span>
                          <span className="stock-label">Stock: {p.total_stock}</span>
                          <Plus size={14} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="order-summary card">
                    <h3>Resumen del Pedido</h3>
                    <div className="items-list">
                      {newOrder.items.map(item => (
                        <div key={item.product_id} className="summary-item">
                          <span>{item.name} x {item.quantity}</span>
                          <span>${(item.quantity * item.unit_price).toLocaleString()}</span>
                        </div>
                      ))}
                      {newOrder.items.length === 0 && <p className="text-muted">No hay productos agregados.</p>}
                    </div>
                    <div className="summary-total">
                      <strong>Total:</strong>
                      <strong>${newOrder.items.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0).toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Crear Pedido</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DISPATCH */}
      {showDispatchModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Despachar Pedido #{selectedOrder?.id}</h2>
              <button className="close-btn" onClick={() => setShowDispatchModal(false)}><XCircle /></button>
            </div>
            <form onSubmit={handleDispatch}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Transportadora</label>
                  <input 
                    type="text" 
                    placeholder="Ej: DHL, Servientrega, FedEx" 
                    value={dispatchInfo.carrier}
                    onChange={e => setDispatchInfo({...dispatchInfo, carrier: e.target.value})}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Número de Guía</label>
                  <input 
                    type="text" 
                    placeholder="Número de seguimiento" 
                    value={dispatchInfo.tracking_number}
                    onChange={e => setDispatchInfo({...dispatchInfo, tracking_number: e.target.value})}
                    required 
                  />
                </div>
                <p className="alert alert-info">
                  <Clock size={16} /> Al despachar, se descontará automáticamente el stock de la bodega en modo FIFO.
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDispatchModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-success">Confirmar Despacho</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DETAIL */}
      {showDetailModal && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Detalle Pedido #{selectedOrder.id}</h2>
              <button className="close-btn" onClick={() => setShowDetailModal(false)}><XCircle /></button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <h3>Información del Cliente</h3>
                <p><strong>Nombre:</strong> {selectedOrder.customer_name}</p>
                <p><strong>Dirección:</strong> {selectedOrder.customer_address}</p>
                <p><strong>Teléfono:</strong> {selectedOrder.customer_phone}</p>
              </div>
              <div className="detail-section">
                <h3>Productos</h3>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cant.</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map(item => (
                      <tr key={item.id}>
                        <td>{item.product_name}</td>
                        <td>{item.quantity}</td>
                        <td>${(item.quantity * item.unit_price).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowDetailModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
