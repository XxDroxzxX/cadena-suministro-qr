import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../utils/toast';
import Modal from '../components/UI/Modal';
import { Plus, Edit2, Trash2, Users, Search, AlertTriangle, Phone, Mail, MapPin } from 'lucide-react';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [deleteCustomer, setDeleteCustomer] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({ name: '', document_id: '', email: '', phone: '', address: '' });
  const { hasRole } = useAuth();

  useEffect(() => { loadCustomers(); }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await api.get('/customers');
      setCustomers(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.document_id && c.document_id.includes(search))
  );

  const openCreate = () => {
    setEditCustomer(null);
    setForm({ name: '', document_id: '', email: '', phone: '', address: '' });
    setShowModal(true);
  };

  const openEdit = (customer) => {
    setEditCustomer(customer);
    setForm({
      name: customer.name,
      document_id: customer.document_id || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editCustomer) {
        await api.put(`/customers/${editCustomer.id}`, form);
        showToast('Cliente actualizado', 'success');
      } else {
        await api.post('/customers', form);
        showToast('Cliente creado exitosamente', 'success');
      }
      setShowModal(false);
      loadCustomers();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/customers/${deleteCustomer.id}`);
      showToast('Cliente eliminado', 'success');
      setShowDeleteModal(false);
      loadCustomers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Cartera de Clientes</h1>
          <p className="page-subtitle">Gestiona a quiénes se les distribuye el stock</p>
        </div>
        {hasRole('admin', 'vendedor') && (
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={18} /> Nuevo Cliente
          </button>
        )}
      </div>

      <div className="filters-row">
        <div className="search-bar" style={{ maxWidth: '400px' }}>
          <Search />
          <input placeholder="Buscar cliente por nombre o NIT/CC..." value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner"></div></div>
      ) : filteredCustomers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Users /></div>
          <h3>No hay clientes</h3>
          <p>Registra tu primer cliente para empezar a asociar distribuciones.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {filteredCustomers.map((customer, idx) => (
            <div key={customer.id} className="card animate-in" style={{ animationDelay: `${idx * 0.05}s` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>{customer.name}</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {hasRole('admin', 'vendedor') && (
                    <button className="btn btn-ghost btn-icon" onClick={() => openEdit(customer)}>
                      <Edit2 size={15} />
                    </button>
                  )}
                  {hasRole('admin') && (
                    <button className="btn btn-ghost btn-icon" onClick={() => { setDeleteCustomer(customer); setShowDeleteModal(true); }}>
                      <Trash2 size={15} style={{ color: 'var(--danger)' }} />
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {customer.document_id && <div><strong>NIT/CC:</strong> {customer.document_id}</div>}
                {customer.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14}/> {customer.phone}</div>}
                {customer.email && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={14}/> {customer.email}</div>}
                {customer.address && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14}/> {customer.address}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !form.name}>
              {saving && <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div>}
              {editCustomer ? 'Guardar Cambios' : 'Crear Cliente'}
            </button>
          </>
        }>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre / Razón Social *</label>
            <input className="form-input" placeholder="Ej: Importaciones XYZ S.A.S" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">NIT o Documento</label>
              <input className="form-input" placeholder="900.xxx.xxx-x" value={form.document_id}
                onChange={(e) => setForm({ ...form, document_id: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input type="tel" className="form-input" placeholder="+57 320..." value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Correo Electrónico</label>
            <input type="email" className="form-input" placeholder="contacto@empresa.com" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Dirección</label>
            <textarea className="form-textarea" placeholder="Dirección física" value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Eliminar Cliente"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancelar</button>
            <button className="btn btn-danger" onClick={handleDelete}>Sí, Eliminar</button>
          </>
        }>
        <div className="confirm-icon danger"><AlertTriangle /></div>
        <p className="confirm-message">
          ¿Estás seguro de que quieres eliminar a <strong>{deleteCustomer?.name}</strong>?<br/>
          Los registros de salidas de stock que se le hicieron seguirán intactos para el historial.
        </p>
      </Modal>
    </div>
  );
}
