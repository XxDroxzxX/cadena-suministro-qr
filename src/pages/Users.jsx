import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { showToast } from '../utils/toast';
import Modal from '../components/UI/Modal';
import {
  Plus, Edit2, Trash2, Users as UsersIcon, Shield, AlertTriangle,
  UserCheck, UserX
} from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', full_name: '', role: 'vendedor' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.get('/users');
      setUsers(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditUser(null);
    setForm({ username: '', password: '', full_name: '', role: 'vendedor' });
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditUser(user);
    setForm({ username: user.username, password: '', full_name: user.full_name, role: user.role });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editUser) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await api.put(`/users/${editUser.id}`, payload);
        showToast('Usuario actualizado', 'success');
      } else {
        if (!form.password) {
          showToast('La contraseña es requerida', 'error');
          setSaving(false);
          return;
        }
        await api.post('/users', form);
        showToast('Usuario creado', 'success');
      }
      setShowModal(false);
      loadUsers();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/users/${deleteUser.id}`);
      showToast('Usuario eliminado', 'success');
      setShowDeleteModal(false);
      loadUsers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const toggleActive = async (user) => {
    try {
      await api.put(`/users/${user.id}`, { active: user.active ? 0 : 1 });
      showToast(`Usuario ${user.active ? 'desactivado' : 'activado'}`, 'success');
      loadUsers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin': return <span className="badge badge-purple"><Shield size={10} /> Admin</span>;
      case 'bodeguero': return <span className="badge badge-blue">Bodeguero</span>;
      case 'vendedor': return <span className="badge badge-green">Vendedor</span>;
      default: return <span className="badge badge-default">{role}</span>;
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Usuarios</h1>
          <p className="page-subtitle">Administra las cuentas de usuario y sus permisos</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} /> Nuevo Usuario
        </button>
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner"></div></div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Nombre Completo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Fecha de Creación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => (
                <tr key={u.id} className="animate-in" style={{ animationDelay: `${idx * 0.04}s` }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: u.role === 'admin' ? 'rgba(139,92,246,0.15)' : u.role === 'bodeguero' ? 'var(--info-bg)' : 'var(--primary-bg-strong)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '0.8rem',
                        color: u.role === 'admin' ? '#8B5CF6' : u.role === 'bodeguero' ? 'var(--info)' : 'var(--primary)'
                      }}>
                        {u.full_name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <strong style={{ fontSize: '0.9rem' }}>{u.username}</strong>
                    </div>
                  </td>
                  <td>{u.full_name}</td>
                  <td>{getRoleBadge(u.role)}</td>
                  <td>
                    {u.active ? (
                      <span className="badge badge-green"><UserCheck size={10} /> Activo</span>
                    ) : (
                      <span className="badge badge-red"><UserX size={10} /> Inactivo</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {new Date(u.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-ghost btn-icon" title={u.active ? 'Desactivar' : 'Activar'}
                        onClick={() => toggleActive(u)}>
                        {u.active ? <UserX size={16} style={{ color: 'var(--warning)' }} /> : <UserCheck size={16} style={{ color: 'var(--success)' }} />}
                      </button>
                      <button className="btn btn-ghost btn-icon" title="Editar" onClick={() => openEdit(u)}>
                        <Edit2 size={16} />
                      </button>
                      <button className="btn btn-ghost btn-icon" title="Eliminar"
                        onClick={() => { setDeleteUser(u); setShowDeleteModal(true); }}>
                        <Trash2 size={16} style={{ color: 'var(--danger)' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editUser ? 'Editar Usuario' : 'Nuevo Usuario'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSubmit}
              disabled={saving || !form.username || !form.full_name}>
              {saving && <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div>}
              {editUser ? 'Guardar' : 'Crear'}
            </button>
          </>
        }>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre Completo *</label>
            <input className="form-input" placeholder="Nombre completo" value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Usuario *</label>
              <input className="form-input" placeholder="nombre_usuario" value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, '_') })} required />
            </div>
            <div className="form-group">
              <label className="form-label">{editUser ? 'Nueva Contraseña' : 'Contraseña *'}</label>
              <input type="password" className="form-input"
                placeholder={editUser ? 'Dejar vacío para no cambiar' : 'Contraseña segura'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={!editUser} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Rol *</label>
            <select className="form-select" value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="vendedor">Vendedor — Gestión de productos y stock</option>
              <option value="bodeguero">Bodeguero — Escaneo QR y retiros</option>
              <option value="admin">Administrador — Acceso total</option>
            </select>
          </div>

          <div style={{
            padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
            fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px'
          }}>
            <strong style={{ color: 'var(--text-primary)' }}>Permisos del rol:</strong>
            {form.role === 'admin' && <p>Acceso total: productos, categorías, stands, usuarios, escaneo, movimientos.</p>}
            {form.role === 'vendedor' && <p>Crear/editar/eliminar productos, agregar stock, ver movimientos.</p>}
            {form.role === 'bodeguero' && <p>Escanear QR de stands, retirar stock, ver productos y movimientos.</p>}
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Eliminar Usuario"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancelar</button>
            <button className="btn btn-danger" onClick={handleDelete}>Sí, Eliminar</button>
          </>
        }>
        <div className="confirm-icon danger"><AlertTriangle /></div>
        <p className="confirm-message">
          ¿Eliminar al usuario <strong>{deleteUser?.full_name}</strong> ({deleteUser?.username})?<br />
          Esta acción no se puede deshacer.
        </p>
      </Modal>
    </div>
  );
}
