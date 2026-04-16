import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatCOP } from '../utils/format';
import { showToast } from '../utils/toast';
import { FileBarChart, Calendar, TrendingUp, Package, Search } from 'lucide-react';

export default function SalesReport() {
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1); // First day of current month
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [filterCustomer, setFilterCustomer] = useState('');

  useEffect(() => { 
    loadCustomers(); 
  }, []);

  useEffect(() => { 
    loadSales(); 
  }, [dateFrom, dateTo, filterCustomer]);

  const loadCustomers = async () => {
    try {
      const data = await api.get('/customers');
      setCustomers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadSales = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateFrom) params.append('start_date', dateFrom);
      if (dateTo) params.append('end_date', dateTo);
      if (filterCustomer) params.append('customer_id', filterCustomer);

      const data = await api.get(`/stock/sales-report?${params.toString()}`);
      setSales(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const totalAmount = sales.reduce((sum, item) => sum + (item.total_price || 0), 0);
    const totalUnits = sales.reduce((sum, item) => sum + item.quantity, 0);
    return { totalAmount, totalUnits };
  };

  const { totalAmount, totalUnits } = calculateTotals();

  const printReport = () => {
    window.print();
  };

  return (
    <div>
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">Reporte de Distribución y Ventas</h1>
          <p className="page-subtitle">Consolidado financiero e histórico por clientes</p>
        </div>
        <button className="btn btn-secondary" onClick={printReport}>
          Imprimir Reporte
        </button>
      </div>

      <div className="filters-row no-print" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Calendar size={18} style={{ color: 'var(--text-tertiary)' }} />
          <input type="date" className="form-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span style={{ color: 'var(--text-tertiary)' }}>a</span>
          <input type="date" className="form-input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <select className="form-select" style={{ maxWidth: '300px' }}
          value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)}>
          <option value="">Todos los clientes</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner"></div></div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <TrendingUp size={24} />
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>Total Distribuido / Facturado</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {formatCOP(totalAmount)}
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <Package size={24} />
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>Unidades Despachadas</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {totalUnits}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="card-header" style={{ padding: '20px' }}>
              <h3 className="card-title">Detalle de Operaciones</h3>
            </div>
            
            {sales.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                <FileBarChart size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                <p>No se encontraron registros en este periodo.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Cliente</th>
                      <th>Producto</th>
                      <th>Lote</th>
                      <th style={{ textAlign: 'right' }}>Cant.</th>
                      <th style={{ textAlign: 'right' }}>Precio Und.</th>
                      <th style={{ textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((item, idx) => (
                      <tr key={item.id} style={{ animationDelay: `${idx * 0.02}s` }} className="animate-in">
                        <td style={{ fontSize: '0.85rem' }}>
                          {new Date(item.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{item.customer_name}</div>
                          {item.document_id && <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>NIT/CC: {item.document_id}</div>}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.product_name}</div>
                          <code style={{ fontSize: '0.7rem' }}>{item.sku}</code>
                        </td>
                        <td>
                          {item.batch_number ? (
                            <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>{item.batch_number}</span>
                          ) : (
                            <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{formatCOP(item.unit_price)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800 }}>{formatCOP(item.total_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Print stylesheet */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          html, body { 
            height: auto !important; 
            margin: 0 !important; 
            padding: 0 !important;
            background: white !important;
          }
          .no-print { display: none !important; }
          .card { border: none !important; box-shadow: none !important; margin: 0 !important; background: transparent !important; }
          .sidebar, .topbar { display: none !important; }
          body { padding: 1.5cm !important; color: black !important; }
          .layout-content { padding: 0 !important; margin: 0 !important; overflow: visible !important; }
          .page-content { padding: 0 !important; }
          
          /* Force text color and visibility for print */
          * { 
            color: black !important; 
            text-shadow: none !important; 
            opacity: 1 !important; 
            visibility: visible !important; 
            animation: none !important; 
            transition: none !important;
          }
          .animate-in { opacity: 1 !important; transform: none !important; animation: none !important; }
          
          /* Table Styles for Print */
          .table { border-collapse: collapse !important; width: 100% !important; margin-top: 10px !important; }
          .table th { 
            background: #f8f9fa !important; 
            color: black !important; 
            padding: 12px 8px !important;
            border-bottom: 2px solid #333 !important;
            text-align: left !important;
          }
          .table td { 
            padding: 10px 8px !important;
            border-bottom: 1px solid #eee !important;
          }
          .badge { 
            border: 1px solid #ddd !important; 
            background: white !important; 
            padding: 2px 6px !important;
            font-size: 0.75rem !important;
          }
          
          /* Add logo for print */
          .print-header { 
            display: flex !important; 
            align-items: center; 
            justify-content: space-between; 
            margin-bottom: 20px;
            border-bottom: 3px solid #000;
            padding-bottom: 15px;
          }
          .print-logo { width: 70px; height: 70px; object-fit: contain; }
          .print-title { text-align: right; }
          .print-title h2 { margin: 0; font-size: 1.5rem; text-transform: uppercase; letter-spacing: 1px; }
          .print-title p { margin: 2px 0 0; color: #444 !important; font-size: 0.9rem; font-weight: 600; }
          .print-title small { color: #888 !important; }
        }
        @media screen {
          .print-header { display: none !important; }
        }
      `}} />

      {/* Hidden header only for printing */}
      <div className="print-header">
        <img src="/logo.jpg" alt="Logo" className="print-logo" />
        <div className="print-title">
          <h2>SPECIAL CLEAN OIL</h2>
          <p>SISTEMA DE GESTIÓN DE CADENA DE SUMINISTRO</p>
          <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Reporte de Inventario y Movimientos</p>
          <small>Generado el: {new Date().toLocaleString('es-CO')}</small>
        </div>
      </div>
    </div>
  );
}
