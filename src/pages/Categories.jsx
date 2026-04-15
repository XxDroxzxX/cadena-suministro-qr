import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { showToast } from '../utils/toast';
import Modal from '../components/UI/Modal';
import { Plus, Edit2, Trash2, FolderTree, AlertTriangle, Package } from 'lucide-react';

const PRESET_COLORS = [
  '#93C55D', '#3498DB', '#F39C12', '#9B59B6', '#E74C3C',
  '#1ABC9C', '#E67E22', '#2ECC71', '#34495E', '#E91E63'
];

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [deleteCategory, setDeleteCategory] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', color: '#93C55D' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await api.get('/categories');
      setCategories(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditCategory(null);
    setForm({ name: '', description: '', color: '#93C55D' });
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setEditCategory(cat);
    setForm({ name: cat.name, description: cat.description || '', color: cat.color || '#93C55D' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editCategory) {
        await api.put(`/categories/${editCategory.id}`, form);
        showToast('Categoría actualizada', 'success');
      } else {
        await api.post('/categories', form);
        showToast('Categoría creada', 'success');
      }
      setShowModal(false);
      loadCategories();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/categories/${deleteCategory.id}`);
      showToast('Categoría eliminada', 'success');
      setShowDeleteModal(false);
      loadCategories();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Categorías</h1>
          <p className="page-subtitle">Organiza los productos por categorías</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} /> Nueva Categoría
        </button>
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner"></div></div>
      ) : categories.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><FolderTree /></div>
          <h3>No hay categorías</h3>
          <p>Crea tu primera categoría para organizar los productos.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {categories.map((cat, idx) => (
            <div key={cat.id} className="card animate-in" style={{ animationDelay: `${idx * 0.05}s` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 'var(--radius-md)',
                  background: `${cat.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <FolderTree size={22} style={{ color: cat.color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{cat.name}</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    {cat.description || 'Sin descripción'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Package size={14} style={{ color: 'var(--text-tertiary)' }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {cat.product_count} producto{cat.product_count !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="table-actions">
                  <button className="btn btn-ghost btn-icon" onClick={() => openEdit(cat)}>
                    <Edit2 size={15} />
                  </button>
                  <button className="btn btn-ghost btn-icon" onClick={() => { setDeleteCategory(cat); setShowDeleteModal(true); }}>
                    <Trash2 size={15} style={{ color: 'var(--danger)' }} />
                  </button>
                </div>
              </div>

              <div style={{ width: '100%', height: '3px', background: cat.color, borderRadius: '2px', marginTop: '12px', opacity: 0.6 }} />
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editCategory ? 'Editar Categoría' : 'Nueva Categoría'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !form.name}>
              {saving ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div> : null}
              {editCategory ? 'Guardar' : 'Crear'}
            </button>
          </>
        }>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre *</label>
            <input className="form-input" placeholder="Nombre de la categoría" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea className="form-textarea" placeholder="Descripción opcional" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {PRESET_COLORS.map(c => (
                <button key={c} type="button" style={{
                  width: 32, height: 32, borderRadius: '50%', background: c,
                  border: form.color === c ? '3px solid var(--text-primary)' : '2px solid transparent',
                  cursor: 'pointer', transition: 'all 0.2s'
                }} onClick={() => setForm({ ...form, color: c })} />
              ))}
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Eliminar Categoría"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancelar</button>
            <button className="btn btn-danger" onClick={handleDelete}>Sí, Eliminar</button>
          </>
        }>
        <div className="confirm-icon danger"><AlertTriangle /></div>
        <p className="confirm-message">
          ¿Eliminar la categoría <strong>{deleteCategory?.name}</strong>?<br />
          Los productos asociados quedarán sin categoría.
        </p>
      </Modal>
    </div>
  );
}
