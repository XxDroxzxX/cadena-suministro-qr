import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { showToast } from '../utils/toast';
import Modal from '../components/UI/Modal';
import {
  Plus, Edit2, Trash2, Warehouse, QrCode, Printer,
  AlertTriangle, Package, MapPin, Eye
} from 'lucide-react';

export default function Stands() {
  const [stands, setStands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editStand, setEditStand] = useState(null);
  const [deleteStand, setDeleteStand] = useState(null);
  const [detailStand, setDetailStand] = useState(null);
  const [form, setForm] = useState({ code: '', name: '', location: '' });
  const [saving, setSaving] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [assignForm, setAssignForm] = useState({ product_id: '', quantity: '', batch_number: '' });
  const [assigning, setAssigning] = useState(false);

  useEffect(() => { loadStands(); loadProducts(); }, []);

  const loadProducts = async () => {
    try {
      const data = await api.get('/products');
      setProducts(data);
    } catch (err) { console.error(err); }
  };

  const loadStands = async () => {
    try {
      setLoading(true);
      const data = await api.get('/stands');
      setStands(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditStand(null);
    setForm({ code: '', name: '', location: '' });
    setShowModal(true);
  };

  const openEdit = (stand) => {
    setEditStand(stand);
    setForm({ code: stand.code, name: stand.name, location: stand.location || '' });
    setShowModal(true);
  };

  const openDetail = async (stand) => {
    try {
      const data = await api.get(`/stands/${stand.id}`);
      setDetailStand(data);
      setShowDetailModal(true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editStand) {
        await api.put(`/stands/${editStand.id}`, form);
        showToast('Stand actualizado', 'success');
      } else {
        await api.post('/stands', form);
        showToast('Stand creado', 'success');
      }
      setShowModal(false);
      loadStands();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/stands/${deleteStand.id}`);
      showToast('Stand eliminado', 'success');
      setShowDeleteModal(false);
      loadStands();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const printQR = (stand) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>QR - Stand ${stand.code}</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 40px; }
        .qr-label { display: inline-block; margin: 20px; padding: 20px; border: 2px dashed #ccc; border-radius: 12px; }
        .qr-label img { width: 240px; height: 240px; }
        .qr-label h3 { margin: 12px 0 4px; font-size: 18pt; }
        .qr-label p { color: #666; font-size: 12pt; margin: 2px 0; }
      </style></head><body>
        <div class="qr-label">
          <img src="${stand.qr_data}" alt="QR Code" />
          <h3>Stand ${stand.code}</h3>
          <p>${stand.name}</p>
          ${stand.location ? `<p>📍 ${stand.location}</p>` : ''}
          <p style="font-size:10pt; margin-top: 8px;">SPECIAL CLEAN OIL</p>
        </div>
        <br/><button onclick="window.print()" style="padding:8px 20px;cursor:pointer;">🖨️ Imprimir</button>
      </body></html>
    `);
    printWindow.document.close();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Stands / Estantes</h1>
          <p className="page-subtitle">Gestiona las ubicaciones de almacenamiento en bodega</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={() => loadStands()}>
            Refrescar
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={18} /> Nuevo Stand
          </button>
        </div>
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner"></div></div>
      ) : stands.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Warehouse /></div>
          <h3>No hay stands registrados</h3>
          <p>Crea tu primer stand para organizar los productos en bodega.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {stands.map((stand, idx) => (
            <div key={stand.id} className="card animate-in" style={{ animationDelay: `${idx * 0.05}s`, cursor: 'pointer' }}
              onClick={() => openDetail(stand)}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 'var(--radius-md)',
                    background: 'var(--primary-bg-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Warehouse size={26} style={{ color: 'var(--primary)' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>{stand.code}</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 600 }}>{stand.name}</p>
                  </div>
                </div>
                {stand.qr_data && (
                  <div className="qr-display" style={{ padding: '6px', margin: 0 }}>
                    <img src={stand.qr_data} alt="QR" style={{ width: '40px', height: '40px' }} />
                  </div>
                )}
              </div>

              {stand.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  <MapPin size={14} /> {stand.location}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{stand.product_count}</span> productos
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{stand.total_items}</span> unidades
                  </div>
                </div>
                <div className="table-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="btn btn-ghost btn-icon" title="Imprimir QR" onClick={() => printQR(stand)}>
                    <Printer size={15} />
                  </button>
                  <button className="btn btn-ghost btn-icon" onClick={() => openEdit(stand)}>
                    <Edit2 size={15} />
                  </button>
                  <button className="btn btn-ghost btn-icon" onClick={() => { setDeleteStand(stand); setShowDeleteModal(true); }}>
                    <Trash2 size={15} style={{ color: 'var(--danger)' }} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title={`Stand ${detailStand?.code}`} large>
        {detailStand && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{detailStand.name}</h2>
                {detailStand.location && (
                  <p style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <MapPin size={14} /> {detailStand.location}
                  </p>
                )}
              </div>
              {detailStand.qr_data && (
                <div className="qr-display" style={{ margin: 0 }}>
                  <img src={detailStand.qr_data} alt="QR" style={{ width: '100px' }} />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ color: 'var(--text-secondary)', margin: 0 }}>
                Productos en este stand ({detailStand.products?.length || 0})
              </h4>
              <button className="btn btn-primary btn-sm" onClick={() => {
                setAssignForm({ product_id: '', quantity: '', batch_number: '' });
                setShowAssignModal(true);
              }}>
                <Plus size={14} /> Asignar Producto
              </button>
            </div>

            {detailStand.products?.length === 0 ? (
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>No hay productos asignados</p>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr><th>Producto</th><th>Lote</th><th>Ingreso</th><th>Cantidad</th><th>Total Stock</th></tr>
                  </thead>
                  <tbody>
                    {detailStand.products?.map((p, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>
                          {p.name}<br/>
                          <code style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{p.sku}</code>
                        </td>
                        <td>
                          {p.batch_number ? (
                            <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>{p.batch_number}</span>
                          ) : <span style={{ color: 'var(--text-tertiary)' }}>S/L</span>}
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                          {p.batch_created ? new Date(p.batch_created).toLocaleDateString() : '—'}
                        </td>
                        <td><strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>{p.quantity}</strong></td>
                        <td style={{ color: 'var(--text-tertiary)' }}>{p.total_stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editStand ? 'Editar Stand' : 'Nuevo Stand'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !form.code || !form.name}>
              {saving && <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div>}
              {editStand ? 'Guardar' : 'Crear'}
            </button>
          </>
        }>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Código *</label>
              <input className="form-input" placeholder="A-01" value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Nombre *</label>
              <input className="form-input" placeholder="Nombre del stand" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Ubicación</label>
            <input className="form-input" placeholder="Ej: Bodega principal, pasillo 3" value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Eliminar Stand"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancelar</button>
            <button className="btn btn-danger" onClick={handleDelete}>Sí, Eliminar</button>
          </>
        }>
        <div className="confirm-icon danger"><AlertTriangle /></div>
        <p className="confirm-message">
          ¿Eliminar el stand <strong>{deleteStand?.code} - {deleteStand?.name}</strong>?
        </p>
      </Modal>

      {/* Assign Product Modal */}
      <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Asignar Producto al Stand"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={async () => {
              if (!assignForm.product_id || !assignForm.quantity) return;
              try {
                setAssigning(true);
                await api.post(`/stands/${detailStand.id}/assign`, assignForm);
                showToast('Producto asignado exitosamente', 'success');
                setShowAssignModal(false);
                // Refresh detail
                const updated = await api.get(`/stands/${detailStand.id}`);
                setDetailStand(updated);
                loadStands();
              } catch (err) {
                showToast(err.message, 'error');
              } finally {
                setAssigning(false);
              }
            }} disabled={assigning || !assignForm.product_id || !assignForm.quantity}>
              {assigning ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div> : 'Asignar'}
            </button>
          </>
        }>
        <div className="form-group">
          <label className="form-label">Producto *</label>
          <select className="form-select" value={assignForm.product_id} 
            onChange={(e) => setAssignForm({ ...assignForm, product_id: e.target.value })}>
            <option value="">Seleccionar producto...</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Cantidad *</label>
            <input type="number" className="form-input" placeholder="0" 
              value={assignForm.quantity} onChange={(e) => setAssignForm({ ...assignForm, quantity: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Número de Lote</label>
            <input className="form-input" placeholder="Opcional" 
              value={assignForm.batch_number} onChange={(e) => setAssignForm({ ...assignForm, batch_number: e.target.value })} />
          </div>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '8px' }}>
          * Esta acción ajustará la cantidad del producto en este stand específico para el lote indicado.
        </p>
      </Modal>
    </div>
  );
}
