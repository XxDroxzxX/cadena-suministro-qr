import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, Search, Factory, Truck, Clock, CheckCircle, 
  XCircle, Star, MapPin, ExternalLink, Package, Calendar,
  BarChart3, RefreshCw
} from 'lucide-react';

export default function Suppliers() {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [stands, setStands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('suppliers');
  
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [showShipModal, setShowShipModal] = useState(false);
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [newSupplier, setNewSupplier] = useState({ name: '', contact_name: '', email: '', phone: '', address: '' });
  const [newOrder, setNewOrder] = useState({ supplier_id: '', expected_at: '', notes: '' });
  const [shipInfo, setShipInfo] = useState({ carrier: '', tracking_number: '', gps_link: '' });
  const [deliverInfo, setDeliverInfo] = useState({ 
    quality_rating: 5, environmental_rating: 5, 
    product_id: '', quantity: '', batch_number: '', stand_id: '' 
  });

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:10000/api';

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
      if (activeTab === 'suppliers') {
        const res = await fetch(`${apiUrl}/suppliers`, { headers });
        const data = await res.json();
        setSuppliers(data);
      } else {
        const res = await fetch(`${apiUrl}/suppliers/orders`, { headers });
        const data = await res.json();
        setOrders(data);
        
        // Fetch products and stands for delivery modal
        const [pRes, sRes] = await Promise.all([
          fetch(`${apiUrl}/products`, { headers }),
          fetch(`${apiUrl}/stands`, { headers })
        ]);
        setProducts(await pRes.json());
        setStands(await sRes.json());
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${apiUrl}/suppliers`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify(newSupplier)
      });
      if (res.ok) {
        setShowAddSupplier(false);
        setNewSupplier({ name: '', contact_name: '', email: '', phone: '', address: '' });
        fetchData();
      }
    } catch (err) { console.error(err); }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${apiUrl}/suppliers/orders`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify(newOrder)
      });
      if (res.ok) {
        setShowAddOrder(false);
        setNewOrder({ supplier_id: '', expected_at: '', notes: '' });
        fetchData();
      }
    } catch (err) { console.error(err); }
  };

  const handleShip = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${apiUrl}/suppliers/orders/${selectedOrder.id}/ship`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify(shipInfo)
      });
      if (res.ok) {
        setShowShipModal(false);
        fetchData();
      }
    } catch (err) { console.error(err); }
  };

  const handleDeliver = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${apiUrl}/suppliers/orders/${selectedOrder.id}/deliver`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify(deliverInfo)
      });
      if (res.ok) {
        setShowDeliverModal(false);
        fetchData();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al recibir pedido');
      }
    } catch (err) { console.error(err); }
  };

  const renderKPIs = (val) => {
    return (
      <div className="kpi-stars">
        {[1,2,3,4,5].map(s => (
          <Star key={s} size={14} fill={s <= Math.round(val) ? "#F1C40F" : "none"} color={s <= Math.round(val) ? "#F1C40F" : "#BDC3C7"} />
        ))}
        <span className="kpi-value">{parseFloat(val).toFixed(1)}</span>
      </div>
    );
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pending': return <span className="badge badge-warning">Pendiente</span>;
      case 'shipped': return <span className="badge badge-info"><Truck size={12} /> Despachado</span>;
      case 'delivered': return <span className="badge badge-success"><CheckCircle size={12} /> Entregado</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-info">
          <h1>Cadena de Suministro</h1>
          <p>Gestione proveedores, rastree guías GPS y evalúe puntualidad y calidad.</p>
        </div>
        <div className="header-actions">
          {activeTab === 'suppliers' && user.role === 'admin' && (
            <button className="btn btn-primary" onClick={() => setShowAddSupplier(true)}>
              <Plus size={18} /> Nuevo Proveedor
            </button>
          )}
          {activeTab === 'orders' && (user.role === 'admin' || user.role === 'bodeguero') && (
            <button className="btn btn-primary" onClick={() => setShowAddOrder(true)}>
              <Plus size={18} /> Pedir Materia Prima
            </button>
          )}
        </div>
      </div>

      <div className="tabs-container card">
        <button className={`tab-link ${activeTab === 'suppliers' ? 'active' : ''}`} onClick={() => setActiveTab('suppliers')}>
          <Factory size={18} /> Proveedores e Indicadores
        </button>
        <button className={`tab-link ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
          <Truck size={18} /> Pedidos y Seguimiento GPS
        </button>
      </div>

      {activeTab === 'suppliers' ? (
        <div className="suppliers-grid">
          {suppliers.map(s => (
            <div key={s.id} className="card supplier-card">
              <div className="supplier-header">
                <h3>{s.name}</h3>
                <span className={`status-dot ${s.active ? 'active' : ''}`}></span>
              </div>
              <div className="supplier-body">
                <p><User size={14} /> {s.contact_name}</p>
                <p><Calendar size={14} /> {s.phone}</p>
                <p className="address-text"><MapPin size={14} /> {s.address}</p>
              </div>
              <div className="supplier-kpis">
                <div className="kpi-item">
                  <small>Calidad MP</small>
                  {renderKPIs(s.quality_rating)}
                </div>
                <div className="kpi-item">
                  <small>Criterio Ambiental</small>
                  {renderKPIs(s.environmental_rating)}
                </div>
              </div>
            </div>
          ))}
          {suppliers.length === 0 && <div className="card empty-state">No hay proveedores registrados.</div>}
        </div>
      ) : (
        <div className="card table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Proveedor</th>
                <th>Estado</th>
                <th>F. Pedido</th>
                <th>F. Esperada</th>
                <th>Seguimiento</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id}>
                  <td><strong>#{order.id}</strong></td>
                  <td>{order.supplier_name}</td>
                  <td>{getStatusBadge(order.status)}</td>
                  <td>{new Date(order.ordered_at).toLocaleDateString()}</td>
                  <td>{order.expected_at ? new Date(order.expected_at).toLocaleDateString() : '-'}</td>
                  <td>
                    {order.gps_link ? (
                      <a href={order.gps_link} target="_blank" rel="noreferrer" className="gps-link">
                        <MapPin size={14} /> En tiempo real <ExternalLink size={10} />
                      </a>
                    ) : (order.carrier || '-')}
                  </td>
                  <td>
                    <div className="table-actions">
                      {order.status === 'pending' && (
                        <button className="btn-icon" onClick={() => { setSelectedOrder(order); setShowShipModal(true); }}>
                          <Truck size={16} />
                        </button>
                      )}
                      {order.status === 'shipped' && (
                        <button className="btn-icon btn-icon-success" onClick={() => { setSelectedOrder(order); setShowDeliverModal(true); }}>
                          <CheckCircle size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: ADD SUPPLIER */}
      {showAddSupplier && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Registrar Proveedor</h2>
              <button className="close-btn" onClick={() => setShowAddSupplier(false)}><XCircle /></button>
            </div>
            <form onSubmit={handleCreateSupplier}>
              <div className="modal-body">
                <div className="form-group"><label>Nombre</label><input type="text" value={newSupplier.name} onChange={e=>setNewSupplier({...newSupplier, name: e.target.value})} required /></div>
                <div className="form-group"><label>Contacto</label><input type="text" value={newSupplier.contact_name} onChange={e=>setNewSupplier({...newSupplier, contact_name: e.target.value})} /></div>
                <div className="form-group"><label>Teléfono</label><input type="text" value={newSupplier.phone} onChange={e=>setNewSupplier({...newSupplier, phone: e.target.value})} /></div>
                <div className="form-group"><label>Dirección</label><input type="text" value={newSupplier.address} onChange={e=>setNewSupplier({...newSupplier, address: e.target.value})} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddSupplier(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD ORDER */}
      {showAddOrder && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Pedir Materia Prima</h2>
              <button className="close-btn" onClick={() => setShowAddOrder(false)}><XCircle /></button>
            </div>
            <form onSubmit={handleCreateOrder}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Proveedor</label>
                  <select value={newOrder.supplier_id} onChange={e=>setNewOrder({...newOrder, supplier_id: e.target.value})} required>
                    <option value="">Seleccione...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Fecha Esperada de Entrega</label>
                  <input type="date" value={newOrder.expected_at} onChange={e=>setNewOrder({...newOrder, expected_at: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Notas</label>
                  <textarea value={newOrder.notes} onChange={e=>setNewOrder({...newOrder, notes: e.target.value})} placeholder="Lista de materiales..."></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddOrder(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Crear Pedido</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SHIP (MOCK GPS) */}
      {showShipModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Información de Envío</h2>
              <button className="close-btn" onClick={() => setShowShipModal(false)}><XCircle /></button>
            </div>
            <form onSubmit={handleShip}>
              <div className="modal-body">
                <div className="form-group"><label>Transportadora</label><input type="text" value={shipInfo.carrier} onChange={e=>setShipInfo({...shipInfo, carrier: e.target.value})} required /></div>
                <div className="form-group"><label>Nro Guía</label><input type="text" value={shipInfo.tracking_number} onChange={e=>setShipInfo({...shipInfo, tracking_number: e.target.value})} required /></div>
                <div className="form-group"><label>Link Seguimiento GPS</label><input type="url" placeholder="https://..." value={shipInfo.gps_link} onChange={e=>setShipInfo({...shipInfo, gps_link: e.target.value})} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowShipModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-info">Marcar Despachado</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELIVER + KPIs + STOCK */}
      {showDeliverModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-lg">
            <div className="modal-header">
              <h2>Confirmar Entrega y Calificar Proveedor</h2>
              <button className="close-btn" onClick={() => setShowDeliverModal(false)}><XCircle /></button>
            </div>
            <form onSubmit={handleDeliver}>
              <div className="modal-body">
                <div className="kpi-rating-grid card">
                  <div className="form-group">
                    <label>Calidad de Materia Prima (1-5)</label>
                    <input type="number" min="1" max="5" value={deliverInfo.quality_rating} onChange={e=>setDeliverInfo({...deliverInfo, quality_rating: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Criterio Ambiental (1-5)</label>
                    <input type="number" min="1" max="5" value={deliverInfo.environmental_rating} onChange={e=>setDeliverInfo({...deliverInfo, environmental_rating: e.target.value})} />
                  </div>
                </div>

                <div className="stock-intake-section card">
                  <h3>Ingreso de Stock Automático</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Producto</label>
                      <select value={deliverInfo.product_id} onChange={e=>setDeliverInfo({...deliverInfo, product_id: e.target.value})} required>
                        <option value="">Seleccione...</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Cantidad</label>
                      <input type="number" value={deliverInfo.quantity} onChange={e=>setDeliverInfo({...deliverInfo, quantity: e.target.value})} required />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Número de Lote</label>
                      <input type="text" value={deliverInfo.batch_number} onChange={e=>setDeliverInfo({...deliverInfo, batch_number: e.target.value})} required />
                    </div>
                    <div className="form-group">
                      <label>Stand / Almacén (Materia Prima)</label>
                      <select value={deliverInfo.stand_id} onChange={e=>setDeliverInfo({...deliverInfo, stand_id: e.target.value})} required>
                        <option value="">Seleccione...</option>
                        {stands.map(s => <option key={s.id} value={s.id}>{s.name} ({s.stage || 'production'})</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeliverModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-success">Confirmar y Cargar Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
