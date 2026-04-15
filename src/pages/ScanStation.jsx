import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../api/client';
import { showToast } from '../utils/toast';
import Modal from '../components/UI/Modal';
import {
  ScanLine, Camera, CameraOff, Package, Minus,
  Warehouse, MapPin, ArrowDownCircle, History
} from 'lucide-react';

export default function ScanStation() {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [standData, setStandData] = useState(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawProduct, setWithdrawProduct] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNotes, setWithdrawNotes] = useState('');
  const [customers, setCustomers] = useState([]);
  const [withdrawCustomer, setWithdrawCustomer] = useState('');
  const [todayMovements, setTodayMovements] = useState([]);
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);

  useEffect(() => {
    loadTodayMovements();
    loadCustomers();
    return () => stopScanner();
  }, []);

  const loadTodayMovements = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const data = await api.get(`/stock?type=salida&date_from=${today}&limit=20`);
      setTodayMovements(data);
    } catch (err) { console.error(err); }
  };

  const loadCustomers = async () => {
    try {
      const data = await api.get('/customers');
      setCustomers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const startScanner = async () => {
    try {
      const html5Qr = new Html5Qrcode("qr-reader");
      html5QrRef.current = html5Qr;

      await html5Qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess,
        () => {}
      );
      setScanning(true);
    } catch (err) {
      console.error('Scanner error:', err);
      showToast('No se pudo acceder a la cámara. Verifica los permisos.', 'error');
    }
  };

  const stopScanner = async () => {
    try {
      if (html5QrRef.current && html5QrRef.current.isScanning) {
        await html5QrRef.current.stop();
      }
    } catch (e) { console.error(e); }
    setScanning(false);
  };

  const onScanSuccess = async (decodedText) => {
    try {
      const data = JSON.parse(decodedText);
      setScanResult(data);
      await stopScanner();

      if (data.type === 'stand') {
        // Load stand info
        const standInfo = await api.get(`/stands/scan/${data.code}`);
        setStandData(standInfo);
        showToast(`Stand "${data.code}" escaneado correctamente`, 'success');
      } else if (data.type === 'product') {
        showToast(`Producto "${data.name}" escaneado`, 'info');
      }
    } catch (err) {
      // Try as stand code directly
      try {
        const standInfo = await api.get(`/stands/scan/${decodedText}`);
        setStandData(standInfo);
        setScanResult({ type: 'stand', code: decodedText });
        await stopScanner();
        showToast(`Stand "${decodedText}" escaneado correctamente`, 'success');
      } catch {
        showToast('Código QR no reconocido', 'warning');
      }
    }
  };

  const handleManualCode = async (e) => {
    e.preventDefault();
    const code = e.target.elements.manualCode.value.trim();
    if (!code) return;
    try {
      const standInfo = await api.get(`/stands/scan/${code}`);
      setStandData(standInfo);
      setScanResult({ type: 'stand', code });
      showToast(`Stand "${code}" encontrado`, 'success');
    } catch (err) {
      showToast('Stand no encontrado', 'error');
    }
  };

  const openWithdraw = (product) => {
    setWithdrawProduct(product);
    setWithdrawAmount('');
    setWithdrawNotes('');
    setWithdrawCustomer('');
    setShowWithdrawModal(true);
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    try {
      await api.post('/stock/salida', {
        product_id: withdrawProduct.product_id,
        stand_id: standData.id,
        quantity: parseInt(withdrawAmount),
        customer_id: withdrawCustomer || null,
        notes: withdrawNotes || `Retiro desde stand ${standData.code}`
      });
      showToast(`Retiradas ${withdrawAmount} unidades de ${withdrawProduct.name}`, 'success');
      setShowWithdrawModal(false);

      // Reload stand data
      const updated = await api.get(`/stands/scan/${standData.code}`);
      setStandData(updated);
      loadTodayMovements();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const resetScan = () => {
    setScanResult(null);
    setStandData(null);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Estación de Escaneo QR</h1>
          <p className="page-subtitle">Escanea el código QR de un stand para ver sus productos</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: standData ? '1fr 1fr' : '1fr', gap: '24px' }}>
        {/* Scanner Column */}
        <div>
          {!standData ? (
            <div className="card animate-in">
              <div className="card-header">
                <h3 className="card-title"><ScanLine size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />Escáner QR</h3>
              </div>

              <div id="qr-reader" ref={scannerRef} className="scanner-viewport"
                style={{ marginBottom: '16px', minHeight: scanning ? '300px' : '0' }}></div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                {!scanning ? (
                  <button className="btn btn-primary" onClick={startScanner} style={{ flex: 1 }}>
                    <Camera size={18} /> Iniciar Cámara
                  </button>
                ) : (
                  <button className="btn btn-danger" onClick={stopScanner} style={{ flex: 1 }}>
                    <CameraOff size={18} /> Detener Cámara
                  </button>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
                  O ingresa el código del stand manualmente:
                </p>
                <form onSubmit={handleManualCode} style={{ display: 'flex', gap: '8px' }}>
                  <input name="manualCode" className="form-input" placeholder="Ej: A-01"
                    style={{ flex: 1 }} />
                  <button type="submit" className="btn btn-secondary">Buscar</button>
                </form>
              </div>
            </div>
          ) : (
            /* Stand Info */
            <div className="card animate-in scan-result">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 'var(--radius-md)',
                      background: 'var(--primary-bg-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Warehouse size={24} style={{ color: 'var(--primary)' }} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
                        {standData.code}
                      </h2>
                      <p style={{ fontWeight: 600 }}>{standData.name}</p>
                    </div>
                  </div>
                  {standData.location && (
                    <p style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                      <MapPin size={14} /> {standData.location}
                    </p>
                  )}
                </div>
                <button className="btn btn-secondary btn-sm" onClick={resetScan}>
                  <ScanLine size={14} /> Nuevo Escaneo
                </button>
              </div>

              <h4 style={{ marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Productos en este stand ({standData.products?.length || 0})
              </h4>

              {standData.products?.length === 0 ? (
                <div className="empty-state" style={{ padding: '32px' }}>
                  <Package size={32} style={{ color: 'var(--text-tertiary)', marginBottom: '8px' }} />
                  <p style={{ color: 'var(--text-tertiary)' }}>No hay productos en este stand</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {standData.products?.map((p) => (
                    <div key={p.ps_id} style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                      background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      borderLeft: '4px solid var(--primary)'
                    }}>
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="product-image" />
                      ) : (
                        <div className="product-image-placeholder"><Package size={18} /></div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                          SKU: {p.sku} {p.category_name && ` • ${p.category_name}`}
                        </div>
                        {p.batch_number && (
                          <div style={{ fontSize: '0.7rem', marginTop: '2px' }}>
                            <span className="badge badge-blue" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                              Lote: {p.batch_number}
                            </span>
                            <span style={{ color: 'var(--text-tertiary)', marginLeft: '6px' }}>
                              {p.batch_created ? new Date(p.batch_created).toLocaleDateString() : ''}
                            </span>
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', marginRight: '8px' }}>
                        <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary)' }}>
                          {p.quantity}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>en lote</div>
                      </div>
                      <button className="btn btn-danger btn-sm" onClick={() => openWithdraw(p)}
                        disabled={p.quantity === 0}>
                        <Minus size={14} /> Retirar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Today's Movements */}
        <div className="card animate-in" style={{ animationDelay: '0.1s' }}>
          <div className="card-header">
            <h3 className="card-title"><History size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />Retiros del Día</h3>
            <span className="badge badge-red">{todayMovements.length}</span>
          </div>

          {todayMovements.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>No hay retiros hoy</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '500px', overflowY: 'auto' }}>
              {todayMovements.map(mov => (
                <div key={mov.id} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '10px',
                  background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)',
                  borderLeft: '3px solid var(--danger)'
                }}>
                  <ArrowDownCircle size={18} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{mov.product_name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                      {mov.stand_code ? `Stand ${mov.stand_code}` : 'Sin stand'} • {mov.user_name}
                    </div>
                    {mov.notes && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                        {mov.notes}
                      </div>
                    )}
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--danger)' }}>-{mov.quantity}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Withdraw Modal */}
      <Modal isOpen={showWithdrawModal} onClose={() => setShowWithdrawModal(false)}
        title="Retirar Stock"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowWithdrawModal(false)}>Cancelar</button>
            <button className="btn btn-danger" onClick={handleWithdraw}
              disabled={!withdrawAmount || parseInt(withdrawAmount) <= 0 || parseInt(withdrawAmount) > withdrawProduct?.quantity}>
              <Minus size={16} /> Confirmar Retiro
            </button>
          </>
        }>
        {withdrawProduct && (
          <div>
            <div style={{
              padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
              marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px'
            }}>
              {withdrawProduct.image_url ? (
                <img src={withdrawProduct.image_url} alt="" className="product-image"
                  style={{ width: 56, height: 56 }} />
              ) : (
                <div className="product-image-placeholder" style={{ width: 56, height: 56 }}>
                  <Package size={24} />
                </div>
              )}
              <div>
                <strong>{withdrawProduct.name}</strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>SKU: {withdrawProduct.sku}</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>
                  Disponible en stand: {withdrawProduct.quantity} unidades
                </p>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Cantidad a retirar *</label>
              <input type="number" className="form-input" min="1" max={withdrawProduct.quantity}
                placeholder="Cantidad" value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)} autoFocus />
              {parseInt(withdrawAmount) > withdrawProduct.quantity && (
                <p className="form-error">No puedes retirar más de lo disponible en el stand</p>
              )}
            </div>
            
            <div className="form-group">
              <label className="form-label">Cliente (Opcional)</label>
              <select className="form-select" value={withdrawCustomer} onChange={(e) => setWithdrawCustomer(e.target.value)}>
                <option value="">Consumo Interno / Sin Cliente</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Notas (opcional)</label>
              <input className="form-input" placeholder="Motivo del retiro"
                value={withdrawNotes} onChange={(e) => setWithdrawNotes(e.target.value)} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
