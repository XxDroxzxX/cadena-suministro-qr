import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../utils/toast';
import { formatCOP } from '../utils/format';
import Modal from '../components/UI/Modal';
import {
  Plus, Search, Edit2, Trash2, QrCode, Package, Upload,
  AlertTriangle, Printer, Download, Eye
} from 'lucide-react';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [detailProduct, setDetailProduct] = useState(null);
  const [deleteProduct, setDeleteProduct] = useState(null);
  const [stockProduct, setStockProduct] = useState(null);
  const [stockAmount, setStockAmount] = useState('');
  const [stockStand, setStockStand] = useState('');
  const [stockBatch, setStockBatch] = useState('');
  const [stockNotes, setStockNotes] = useState('');
  const [stands, setStands] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', sku: '', category_id: '', unit_price: '', min_stock: '5', total_stock: '' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  const { hasRole } = useAuth();
  const printRef = useRef(null);

  useEffect(() => { loadProducts(); loadCategories(); loadStands(); }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterCategory) params.set('category_id', filterCategory);
      if (filterLowStock) params.set('low_stock', 'true');
      const data = await api.get(`/products?${params}`);
      setProducts(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await api.get('/categories');
      setCategories(data);
    } catch (err) { console.error(err); }
  };

  const loadStands = async () => {
    try {
      const data = await api.get('/stands');
      setStands(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { loadProducts(); }, [search, filterCategory, filterLowStock]);

  const openCreate = () => {
    setEditProduct(null);
    setForm({ name: '', description: '', sku: '', category_id: '', unit_price: '', min_stock: '5', total_stock: '' });
    setImageFile(null); setImagePreview(null);
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditProduct(product);
    setForm({
      name: product.name,
      description: product.description || '',
      sku: product.sku,
      category_id: product.category_id || '',
      unit_price: product.unit_price || '',
      min_stock: product.min_stock || '5',
      total_stock: ''
    });
    setImagePreview(product.image_url);
    setImageFile(null);
    setShowModal(true);
  };

  const openDetail = async (product) => {
    try {
      const data = await api.get(`/products/${product.id}`);
      setDetailProduct(data);
      setShowDetailModal(true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '') formData.append(k, v); });
      if (imageFile) formData.append('image', imageFile);

      if (editProduct) {
        await api.uploadPut(`/products/${editProduct.id}`, formData);
        showToast('Producto actualizado correctamente', 'success');
      } else {
        await api.upload('/products', formData);
        showToast('Producto creado correctamente', 'success');
      }
      setShowModal(false);
      loadProducts();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/products/${deleteProduct.id}`);
      showToast('Producto eliminado', 'success');
      setShowDeleteModal(false);
      loadProducts();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    try {
      await api.post('/stock/entrada', {
        product_id: stockProduct.id,
        stand_id: stockStand || null,
        batch_number: stockBatch || null,
        quantity: parseInt(stockAmount),
        notes: stockNotes || `Entrada de stock manual`
      });
      showToast(`Stock agregado: +${stockAmount} unidades`, 'success');
      setShowStockModal(false);
      setStockAmount(''); setStockNotes(''); setStockStand(''); setStockBatch('');
      loadProducts();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const printQR = (product) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>QR - ${product.name}</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 40px; }
        .qr-label { display: inline-block; margin: 20px; padding: 20px; border: 2px dashed #ccc; border-radius: 12px; }
        .qr-label img { width: 200px; height: 200px; }
        .qr-label h3 { margin: 12px 0 4px; font-size: 16pt; }
        .qr-label p { color: #666; font-size: 10pt; margin: 0; }
        @media print { .no-print { display: none; } border: none; }
      </style></head><body>
        <div class="qr-label">
          <img src="${product.qr_data}" alt="QR Code" />
          <h3>${product.name}</h3>
          <p>SKU: ${product.sku}</p>
          <p>SPECIAL CLEAN OIL</p>
        </div>
        <br/><button class="no-print" onclick="window.print()">🖨️ Imprimir</button>
      </body></html>
    `);
    printWindow.document.close();
  };

  const getStockBadge = (product) => {
    if (product.total_stock === 0) return <span className="badge badge-red">Sin Stock</span>;
    if (product.total_stock <= product.min_stock) return <span className="badge badge-yellow">Stock Bajo</span>;
    return <span className="badge badge-green">En Stock</span>;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Productos</h1>
          <p className="page-subtitle">Gestiona el catálogo de productos de Special Clean Oil</p>
        </div>
        {hasRole('admin', 'vendedor') && (
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={18} /> Nuevo Producto
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="filters-row">
        <div className="search-bar" style={{ flex: 1, maxWidth: '360px' }}>
          <Search />
          <input placeholder="Buscar por nombre o SKU..." value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: '200px' }}
          value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className={`btn ${filterLowStock ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setFilterLowStock(!filterLowStock)}>
          <AlertTriangle size={14} /> Stock Bajo
        </button>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="page-loading"><div className="spinner"></div></div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Package /></div>
          <h3>No se encontraron productos</h3>
          <p>Crea tu primer producto para empezar a gestionar el inventario.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, idx) => (
                <tr key={p.id} className="animate-in" style={{ animationDelay: `${idx * 0.03}s` }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="product-image" />
                      ) : (
                        <div className="product-image-placeholder"><Package size={18} /></div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        {p.description && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td><code style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>{p.sku}</code></td>
                  <td>
                    {p.category_name ? (
                      <span className="badge" style={{ background: `${p.category_color}20`, color: p.category_color }}>
                        {p.category_name}
                      </span>
                    ) : '—'}
                  </td>
                  <td>{formatCOP(p.unit_price)}</td>
                  <td>
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>{p.total_stock}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}> / min {p.min_stock}</span>
                  </td>
                  <td>{getStockBadge(p)}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-ghost btn-icon" title="Ver detalle" onClick={() => openDetail(p)}>
                        <Eye size={16} />
                      </button>
                      {p.qr_data && (
                        <button className="btn btn-ghost btn-icon" title="Imprimir QR" onClick={() => printQR(p)}>
                          <Printer size={16} />
                        </button>
                      )}
                      {hasRole('admin', 'vendedor') && (
                        <>
                          <button className="btn btn-ghost btn-icon" title="Agregar stock"
                            onClick={() => { setStockProduct(p); setShowStockModal(true); }}>
                            <Plus size={16} style={{ color: 'var(--success)' }} />
                          </button>
                          <button className="btn btn-ghost btn-icon" title="Editar" onClick={() => openEdit(p)}>
                            <Edit2 size={16} />
                          </button>
                          <button className="btn btn-ghost btn-icon" title="Eliminar"
                            onClick={() => { setDeleteProduct(p); setShowDeleteModal(true); }}>
                            <Trash2 size={16} style={{ color: 'var(--danger)' }} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editProduct ? 'Editar Producto' : 'Nuevo Producto'} large
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div> : null}
              {editProduct ? 'Guardar Cambios' : 'Crear Producto'}
            </button>
          </>
        }>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Nombre *</label>
              <input className="form-input" placeholder="Nombre del producto" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">SKU *</label>
              <input className="form-input" placeholder="Ej: SCO-001" value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea className="form-textarea" placeholder="Descripción del producto" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Categoría</label>
              <select className="form-select" value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Sin categoría</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Precio Unitario</label>
              <input type="number" step="0.01" className="form-input" placeholder="0.00" value={form.unit_price}
                onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Stock Mínimo</label>
              <input type="number" className="form-input" placeholder="5" value={form.min_stock}
                onChange={(e) => setForm({ ...form, min_stock: e.target.value })} />
            </div>
          </div>

          {!editProduct && (
            <div className="form-group">
              <label className="form-label">Stock Inicial</label>
              <input type="number" className="form-input" placeholder="0" value={form.total_stock}
                onChange={(e) => setForm({ ...form, total_stock: e.target.value })} />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Imagen del Producto</label>
            <div className="image-upload" onClick={() => fileRef.current?.click()}>
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="image-upload-preview" />
              ) : (
                <Upload size={32} />
              )}
              <p>Haz clic para <span>subir una imagen</span></p>
              <p style={{ fontSize: '0.7rem' }}>PNG, JPG, WEBP (máx 5MB)</p>
            </div>
            <input type="file" ref={fileRef} accept="image/*" className="file-input-hidden"
              onChange={handleImageChange} />
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)}
        title="Detalle del Producto" large>
        {detailProduct && (
          <div>
            <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', flexWrap: 'wrap' }}>
              {detailProduct.image_url ? (
                <img src={detailProduct.image_url} alt={detailProduct.name}
                  style={{ width: '160px', height: '160px', borderRadius: 'var(--radius-lg)', objectFit: 'cover', border: '1px solid var(--border-color)' }} />
              ) : (
                <div style={{ width: '160px', height: '160px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={48} style={{ color: 'var(--text-tertiary)' }} />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px' }}>{detailProduct.name}</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>{detailProduct.description || 'Sin descripción'}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div><span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>SKU</span><br /><strong>{detailProduct.sku}</strong></div>
                  <div><span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>Precio</span><br /><strong>{formatCOP(detailProduct.unit_price)}</strong></div>
                  <div><span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>Stock</span><br /><strong>{detailProduct.total_stock}</strong></div>
                  <div><span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>Categoría</span><br /><strong>{detailProduct.category_name || '—'}</strong></div>
                </div>
              </div>
            </div>

            {detailProduct.qr_data && (
              <div style={{ textAlign: 'center', padding: '20px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', marginBottom: '16px' }}>
                <div className="qr-display">
                  <img src={detailProduct.qr_data} alt="QR Code" style={{ width: '180px' }} />
                </div>
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => printQR(detailProduct)}>
                    <Printer size={14} /> Imprimir QR
                  </button>
                  <a href={detailProduct.qr_data} download={`QR-${detailProduct.sku}.png`}
                    className="btn btn-secondary btn-sm">
                    <Download size={14} /> Descargar QR
                  </a>
                </div>
              </div>
            )}

            {detailProduct.stands?.length > 0 && (
              <div>
                <h4 style={{ marginBottom: '8px', fontSize: '0.9rem' }}>Ubicaciones en Stands</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {detailProduct.stands.map((s, idx) => (
                    <div key={idx} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      padding: '10px 14px', 
                      background: 'var(--bg-secondary)', 
                      borderRadius: 'var(--radius-md)',
                      borderLeft: '4px solid var(--primary)'
                    }}>
                      <div>
                        <span style={{ fontWeight: 600 }}>{s.stand_name} ({s.code})</span>
                        {s.batch_number && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                            Lote: <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{s.batch_number}</span>
                          </div>
                        )}
                      </div>
                      <strong style={{ fontSize: '1.1rem' }}>{s.quantity} u.</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Eliminar Producto"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancelar</button>
            <button className="btn btn-danger" onClick={handleDelete}>Sí, Eliminar</button>
          </>
        }>
        <div className="confirm-icon danger"><AlertTriangle /></div>
        <p className="confirm-message">
          ¿Estás seguro de eliminar <strong>{deleteProduct?.name}</strong>?<br />
          Esta acción no se puede deshacer.
        </p>
      </Modal>

      {/* Add Stock Modal */}
      <Modal isOpen={showStockModal} onClose={() => setShowStockModal(false)} title="Agregar Stock"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowStockModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleAddStock} disabled={!stockAmount}>Agregar Stock</button>
          </>
        }>
        {stockProduct && (
          <div>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              Agregando stock a: <strong style={{ color: 'var(--text-primary)' }}>{stockProduct.name}</strong>
              <br />Stock actual: <strong>{stockProduct.total_stock}</strong> unidades
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Stand (Opcional)</label>
                <select className="form-select" value={stockStand} onChange={(e) => setStockStand(e.target.value)}>
                  <option value="">Seleccionar Stand...</option>
                  {stands.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Número de Lote (Opcional)</label>
                <input className="form-input" placeholder="Ej: LOT-2024-001"
                  value={stockBatch} onChange={(e) => setStockBatch(e.target.value)} />
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Cantidad a agregar *</label>
              <input type="number" className="form-input" min="1" placeholder="Cantidad"
                value={stockAmount} onChange={(e) => setStockAmount(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Notas (opcional)</label>
              <input className="form-input" placeholder="Motivo o referencia"
                value={stockNotes} onChange={(e) => setStockNotes(e.target.value)} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
