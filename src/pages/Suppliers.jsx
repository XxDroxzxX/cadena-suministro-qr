import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../utils/toast';
import Modal from '../components/UI/Modal';
import { 
  Plus, Search, Factory, Truck, Clock, CheckCircle, 
  XCircle, Star, MapPin, ExternalLink, Package, Calendar,
  BarChart3, RefreshCw, User, Phone, Mail, Award
} from 'lucide-react';

export default function Suppliers() {
  const { user, hasRole } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [stands, setStands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('suppliers');
  const [saving, setSaving] = useState(false);
  
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

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'suppliers') {
        const data = await api.get('/suppliers');
        setSuppliers(data);
      } else {
        const data = await api.get('/suppliers/orders');
        setOrders(data);
        
        // Fetch products and stands for delivery modal
        const [pData, sData] = await Promise.all([
          api.get('/products'),
          api.get('/stands')
        ]);
        setProducts(pData);
        setStands(sData);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.post('/suppliers', newSupplier);
      showToast('Proveedor registrado', 'success');
      setShowAddSupplier(false);
      setNewSupplier({ name: '', contact_name: '', email: '', phone: '', address: '' });
      fetchData();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!newOrder.supplier_id) return showToast('Seleccione un proveedor', 'warning');
    try {
      setSaving(true);
      await api.post('/suppliers/orders', newOrder);
      showToast('Pedido de materia prima creado', 'success');
      setShowAddOrder(false);
      setNewOrder({ supplier_id: '', expected_at: '', notes: '' });
      fetchData();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleShip = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put(`/suppliers/orders/${selectedOrder.id}/ship`, shipInfo);
      showToast('Pedido marcado como despachado', 'success');
      setShowShipModal(false);
      setShipInfo({ carrier: '', tracking_number: '', gps_link: '' });
      fetchData();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleDeliver = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put(`/suppliers/orders/${selectedOrder.id}/deliver`, deliverInfo);
      showToast('Pedido recibido y stock actualizado', 'success');
      setShowDeliverModal(false);
      setSelectedOrder(null);
      fetchData();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setSaving(false); }
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
      case 'pending': return <span className="badge badge-yellow">Pendiente</span>;
      case 'shipped': return <span className="badge badge-info"><Truck size={12} /> Despachado</span>;
      case 'delivered': return <span className="badge badge-green"><CheckCircle size={12} /> Entregado</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Cadena de Suministro</h1>
          <p className="page-subtitle">Gestión integral de proveedores, KPI y trazabilidad de materia prima</p>
        </div>
        <div className="header-actions">
          {activeTab === 'suppliers' && hasRole('admin') && (
            <button className="btn btn-primary" onClick={() => setShowAddSupplier(true)}>
              <Plus size={18} /> Nuevo Proveedor
            </button>
          )}
          {activeTab === 'orders' && hasRole('admin', 'bodeguero') && (
            <button className="btn btn-primary" onClick={() => setShowAddOrder(true)}>
              <Plus size={18} /> Pedir Materia Prima
            </button>
          )}
        </div>
      </div>

      <div className="tabs-container card no-print">
        <button className={`tab-link ${activeTab === 'suppliers' ? 'active' : ''}`} onClick={() => setActiveTab('suppliers')}>
          <Factory size={18} /> Proveedores e Indicadores
        </button>
        <button className={`tab-link ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
          <Truck size={18} /> Pedidos y Seguimiento GPS
        </button>
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner"></div></div>
      ) : activeTab === 'suppliers' ? (
        <div className="data-grid">
          {suppliers.map((s, idx) => (
            <div key={s.id} className="card supplier-card animate-in" style={{ animationDelay: `${idx * 0.05}s` }}>
              <div className="card-header-actions">
                <div className="avatar-initials" style={{ background: 'var(--primary-bg-strong)', color: 'var(--primary)' }}>
                  <Factory size={18} />
                </div>
                <div className="status-indicator">
                  <div className={`dot ${s.active ? 'active' : ''}`}></div>
                  <span>{s.active ? 'Activo' : 'Inactivo'}</span>
                </div>
              </div>
              
              <div className="customer-info-main" style={{ margin: '16px 0' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{s.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <User size={14} /> {s.contact_name || 'Sin contacto'}
                </div>
              </div>

              <div className="customer-details-list">
                <div className="detail-row">
                  <Phone size={14} /> <span>{s.phone || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <MapPin size={14} /> <span className="truncate">{s.address || 'Sin dirección'}</span>
                </div>
              </div>

              <div className="supplier-kpis" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="kpi-item">
                  <small style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Calidad</small>
                  {renderKPIs(s.quality_rating)}
                </div>
                <div className="kpi-item">
                  <small style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Ambiente</small>
                  {renderKPIs(s.environmental_rating)}
                </div>
              </div>
            </div>
          ))}
          {suppliers.length === 0 && <div className="empty-state" style={{ gridColumn: '1/-1' }}>No hay proveedores registrados.</div>}
        </div>
      ) : (
        <div className="card table-card animate-in">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Proveedor</th>
                  <th>Estado</th>
                  <th>Pedido</th>
                  <th>Entrega Est.</th>
                  <th>Tracking / GPS</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td><strong>#{order.id}</strong></td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{order.supplier_name}</div>
                    </td>
                    <td>{getStatusBadge(order.status)}</td>
                    <td>{new Date(order.ordered_at).toLocaleDateString()}</td>
                    <td>{order.expected_at ? new Date(order.expected_at).toLocaleDateString() : 'N/A'}</td>
                    <td>
                      {order.gps_link ? (
                        <a href={order.gps_link} target="_blank" rel="noreferrer" className="gps-link">
                          <MapPin size={14} /> GPS Activo <ExternalLink size={10} />
                        </a>
                      ) : (
                        <div style={{ fontSize: '0.85rem' }}>{order.carrier || '—'}</div>
                      )}
                    </td>
                    <td>
                      <div className="table-actions" style={{ justifyContent: 'center' }}>
                        {order.status === 'pending' && hasRole('admin', 'bodeguero') && (
                          <button className="btn-icon-ghost" onClick={() => { setSelectedOrder(order); setShowShipModal(true); }} title="Marcar Despacho">
                            <Truck size={16} />
                          </button>
                        )}
                        {order.status === 'shipped' && hasRole('admin', 'bodeguero') && (
                          <button className="btn-icon-ghost text-success" onClick={() => { setSelectedOrder(order); setShowDeliverModal(true); }} title="Confirmar Recepción">
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
        </div>
      )}

      {/* MODAL: ADD SUPPLIER */}
      <Modal isOpen={showAddSupplier} onClose={() => setShowAddSupplier(false)} title="Registrar Proveedor"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAddSupplier(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleCreateSupplier} disabled={saving || !newSupplier.name}>
              {saving ? <div className="spinner" style={{ width: 16, height: 16 }}></div> : 'Guardar'}
            </button>
          </>
        }>
        <div className="form-group">
          <label className="form-label">Nombre del Proveedor *</label>
          <input className="form-input" value={newSupplier.name} onChange={e=>setNewSupplier({...newSupplier, name: e.target.value})} required placeholder="Ej: Aceros el Cóndor" />
        </div>
        <div className="form-group">
          <label className="form-label">Persona de Contacto</label>
          <input className="form-input" value={newSupplier.contact_name} onChange={e=>setNewSupplier({...newSupplier, contact_name: e.target.value})} placeholder="Ej: Ing. Juan Pérez" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Teléfono</label>
            <input className="form-input" value={newSupplier.phone} onChange={e=>setNewSupplier({...newSupplier, phone: e.target.value})} placeholder="310..." />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" value={newSupplier.email} onChange={e=>setNewSupplier({...newSupplier, email: e.target.value})} placeholder="compras@..." />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Dirección / Planta</label>
          <textarea className="form-textarea" value={newSupplier.address} onChange={e=>setNewSupplier({...newSupplier, address: e.target.value})} placeholder="Ubicación física" />
        </div>
      </Modal>

      {/* MODAL: ADD ORDER (PURCHASE) */}
      <Modal isOpen={showAddOrder} onClose={() => setShowAddOrder(false)} title="Pedir Materia Prima"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAddOrder(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleCreateOrder} disabled={saving || !newOrder.supplier_id}>
              {saving ? <div className="spinner" style={{ width: 16, height: 16 }}></div> : 'Crear Pedido'}
            </button>
          </>
        }>
        <div className="form-group">
          <label className="form-label">Seleccionar Proveedor *</label>
          <select className="form-select" value={newOrder.supplier_id} onChange={e=>setNewOrder({...newOrder, supplier_id: e.target.value})} required>
            <option value="">Seleccione...</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Fecha Esperada de Entrega *</label>
          <input type="date" className="form-input" value={newOrder.expected_at} onChange={e=>setNewOrder({...newOrder, expected_at: e.target.value})} required />
        </div>
        <div className="form-group">
          <label className="form-label">Items y Requerimientos</label>
          <textarea className="form-textarea" style={{ minHeight: '120px' }} value={newOrder.notes} onChange={e=>setNewOrder({...newOrder, notes: e.target.value})} placeholder="Ej: 50 unidades de Insumo X..." />
        </div>
      </Modal>

      {/* MODAL: SHIP (MOCK GPS) */}
      <Modal isOpen={showShipModal} onClose={() => setShowShipModal(false)} title="Información de Envío"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowShipModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleShip} disabled={saving || !shipInfo.carrier}>
              {saving ? <div className="spinner" style={{ width: 16, height: 16 }}></div> : 'Marcar Despachado'}
            </button>
          </>
        }>
        <div className="form-group">
          <label className="form-label">Transportadora *</label>
          <input className="form-input" value={shipInfo.carrier} onChange={e=>setShipInfo({...shipInfo, carrier: e.target.value})} required />
        </div>
        <div className="form-group">
          <label className="form-label">Nro de Guía</label>
          <input className="form-input" value={shipInfo.tracking_number} onChange={e=>setShipInfo({...shipInfo, tracking_number: e.target.value})} />
        </div>
        <div className="form-group">
          <label className="form-label">Link de Trazabilidad / GPS</label>
          <input type="url" className="form-input" placeholder="https://tracking..." value={shipInfo.gps_link} onChange={e=>setShipInfo({...shipInfo, gps_link: e.target.value})} />
        </div>
      </Modal>

      {/* MODAL: DELIVER + KPIs + STOCK */}
      <Modal isOpen={showDeliverModal} onClose={() => setShowDeliverModal(false)} title="Confirmar Entrega y Recepción" large
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowDeliverModal(false)}>Cancelar</button>
            <button className="btn btn-success" onClick={handleDeliver} disabled={saving || !deliverInfo.product_id || !deliverInfo.quantity}>
              {saving ? <div className="spinner" style={{ width: 16, height: 16 }}></div> : 'Confirmar y Cargar Stock'}
            </button>
          </>
        }>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="card" style={{ background: 'var(--bg-secondary)', border: 'none' }}>
            <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Award size={18} color="var(--primary)" /> Calificación del Proveedor</h4>
            <div className="form-group">
              <label className="form-label">Calidad de Materia Prima (1-5)</label>
              <input type="number" className="form-input" min="1" max="5" value={deliverInfo.quality_rating} onChange={e=>setDeliverInfo({...deliverInfo, quality_rating: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Cumplimiento Ambiental (1-5)</label>
              <input type="number" className="form-input" min="1" max="5" value={deliverInfo.environmental_rating} onChange={e=>setDeliverInfo({...deliverInfo, environmental_rating: e.target.value})} />
            </div>
          </div>

          <div className="card" style={{ background: 'var(--primary-bg)', border: '1px dashed var(--primary)' }}>
            <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Package size={18} /> Ingreso Automático de Stock</h4>
            <div className="form-group">
              <label className="form-label">Producto Recibido</label>
              <select className="form-select" value={deliverInfo.product_id} onChange={e=>setDeliverInfo({...deliverInfo, product_id: e.target.value})} required>
                <option value="">Seleccione...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Cantidad</label>
              <input type="number" className="form-input" value={deliverInfo.quantity} onChange={e=>setDeliverInfo({...deliverInfo, quantity: e.target.value})} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Nro de Lote</label>
                <input className="form-input" value={deliverInfo.batch_number} onChange={e=>setDeliverInfo({...deliverInfo, batch_number: e.target.value})} required placeholder="BTL-xxx" />
              </div>
              <div className="form-group">
                <label className="form-label">Estante Asignado</label>
                <select className="form-select" value={deliverInfo.stand_id} onChange={e=>setDeliverInfo({...deliverInfo, stand_id: e.target.value})} required>
                  <option value="">Seleccione...</option>
                  {stands.map(s => <option key={s.id} value={s.id}>{s.name} ({s.stage || 'production'})</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
        <div className="alert-info" style={{ marginTop: '20px' }}>
          <CheckCircle size={16} />
          <div>Al confirmar, el sistema añadirá automáticamente las unidades al stock total y registrará el movimiento de entrada para auditoría.</div>
        </div>
      </Modal>
    </div>
  );
}
