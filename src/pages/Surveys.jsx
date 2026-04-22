import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../utils/toast';
import Modal from '../components/UI/Modal';
import {
  Plus, ClipboardCheck, QrCode, BarChart3, Users, Eye,
  CheckCircle, XCircle, Star, ChevronDown, ChevronUp,
  Copy, ExternalLink, Edit, ToggleLeft, ToggleRight
} from 'lucide-react';

const DEFAULT_QUESTIONS = [
  {
    id: 'edad',
    label: 'Edad',
    type: 'select',
    required: true,
    options: ['18-25', '26-35', '36-45', '46-59', '60-75', '76-90']
  },
  {
    id: 'sexo',
    label: 'Sexo',
    type: 'select',
    required: true,
    options: ['Femenino', 'Masculino', 'Prefiero no decirlo']
  },
  {
    id: 'ciudad',
    label: 'Ciudad de donde eres',
    type: 'select',
    required: true,
    options: ['Ocaña', 'Bucaramanga', 'Cúcuta', 'Medellín', 'Bogotá', 'Cali', 'Extranjeros']
  },
  {
    id: 'zona_aplicacion',
    label: '¿En qué parte del cuerpo aplicó la loción antiespasmódica?',
    type: 'multiselect',
    required: true,
    options: ['Cuello', 'Espalda', 'Abdomen', 'Piernas', 'Brazos', 'Otra']
  },
  {
    id: 'frecuencia',
    label: '¿Con qué frecuencia utilizó el producto?',
    type: 'select',
    required: true,
    options: ['Una vez', 'Varias veces al día', 'Ocasionalmente']
  },
  {
    id: 'beneficios',
    label: '¿Qué beneficios obtuvo al usar la loción?',
    type: 'multiselect',
    required: true,
    options: ['Alivio del dolor', 'Relajación muscular', 'Disminución de espasmos', 'Sensación de bienestar', 'No noté mejoría']
  },
  {
    id: 'satisfaccion',
    label: '¿Qué tan satisfecho(a) está con el producto?',
    type: 'select',
    required: true,
    options: ['Muy satisfecho', 'Satisfecho', 'Poco satisfecho', 'Insatisfecho']
  }
];

export default function Surveys() {
  const { hasRole } = useAuth();
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [expandedQuestion, setExpandedQuestion] = useState(null);

  const [newSurvey, setNewSurvey] = useState({
    title: 'Encuesta de Satisfacción - Special Clean Oil',
    description: 'Queremos conocer tu experiencia con nuestros productos para mejorar continuamente.',
    questions: DEFAULT_QUESTIONS
  });

  useEffect(() => { loadSurveys(); }, []);

  const loadSurveys = async () => {
    try {
      setLoading(true);
      const data = await api.get('/surveys');
      setSurveys(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setSaving(true);
      await api.post('/surveys', newSurvey);
      showToast('Encuesta creada exitosamente', 'success');
      setShowCreate(false);
      loadSurveys();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (survey) => {
    try {
      await api.put(`/surveys/${survey.id}`, { active: !survey.active });
      showToast(survey.active ? 'Encuesta desactivada' : 'Encuesta activada', 'success');
      loadSurveys();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleShowQR = async (survey) => {
    try {
      setSelectedSurvey(survey);
      const data = await api.get(`/surveys/${survey.id}/qr`);
      setQrData(data);
      setShowQR(true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleShowStats = async (survey) => {
    try {
      setSelectedSurvey(survey);
      const [detail, stats] = await Promise.all([
        api.get(`/surveys/${survey.id}`),
        api.get(`/surveys/${survey.id}/stats`)
      ]);
      setStatsData({ ...stats, responses: detail.responses, questions: typeof detail.questions === 'string' ? JSON.parse(detail.questions) : detail.questions });
      setShowStats(true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url);
    showToast('Enlace copiado al portapapeles', 'success');
  };

  const getSatisfactionColor = (label) => {
    switch (label) {
      case 'Muy satisfecho': return '#2ECC71';
      case 'Satisfecho': return '#3498DB';
      case 'Poco satisfecho': return '#F39C12';
      case 'Insatisfecho': return '#E74C3C';
      default: return 'var(--primary)';
    }
  };

  const renderBar = (label, count, total) => {
    const pct = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
    return (
      <div key={label} style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.8rem' }}>
          <span style={{ fontWeight: 600 }}>{label}</span>
          <span style={{ color: 'var(--text-tertiary)' }}>{count} ({pct}%)</span>
        </div>
        <div style={{ height: '10px', background: 'var(--bg-secondary)', borderRadius: '5px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: `linear-gradient(90deg, var(--primary), var(--primary-light, #60a5fa))`,
            borderRadius: '5px',
            transition: 'width 0.6s ease'
          }}></div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Encuestas de Satisfacción</h1>
          <p className="page-subtitle">Trazabilidad de la experiencia del cliente con nuestros productos</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={18} /> Nueva Encuesta
        </button>
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner"></div></div>
      ) : surveys.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <ClipboardCheck size={56} style={{ color: 'var(--text-tertiary)', marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px', fontWeight: 700 }}>Sin encuestas aún</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Crea tu primera encuesta de satisfacción para compartirla con tus clientes.</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={18} /> Crear Encuesta
          </button>
        </div>
      ) : (
        <div className="data-grid">
          {surveys.map((survey, idx) => (
            <div key={survey.id} className="card animate-in" style={{ animationDelay: `${idx * 0.05}s` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div className="avatar-initials" style={{ background: survey.active ? 'var(--success-bg)' : 'var(--bg-secondary)', color: survey.active ? 'var(--success)' : 'var(--text-tertiary)' }}>
                    <ClipboardCheck size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>{survey.title}</h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{new Date(survey.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <span className={`badge ${survey.active ? 'badge-green' : 'badge-red'}`}>
                  {survey.active ? 'Activa' : 'Inactiva'}
                </span>
              </div>

              {survey.description && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>{survey.description}</p>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div className="card" style={{ padding: '12px', background: 'var(--bg-secondary)', border: 'none', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{survey.response_count || 0}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Respuestas</div>
                </div>
                <div className="card" style={{ padding: '12px', background: 'var(--bg-secondary)', border: 'none', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                    {typeof survey.questions === 'string' ? JSON.parse(survey.questions).length : (survey.questions?.length || 0)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Preguntas</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => handleShowQR(survey)}>
                  <QrCode size={14} /> QR
                </button>
                <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => handleShowStats(survey)}>
                  <BarChart3 size={14} /> Resultados
                </button>
                <button className="btn-icon-ghost btn-sm" onClick={() => handleToggleActive(survey)}
                  title={survey.active ? 'Desactivar' : 'Activar'}>
                  {survey.active ? <ToggleRight size={18} color="var(--success)" /> : <ToggleLeft size={18} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: CREATE SURVEY */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Crear Encuesta de Satisfacción" large
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving || !newSurvey.title}>
              {saving ? <div className="spinner" style={{ width: 16, height: 16 }}></div> : 'Crear Encuesta'}
            </button>
          </>
        }>
        <div className="form-group">
          <label className="form-label">Título de la Encuesta *</label>
          <input className="form-input" value={newSurvey.title}
            onChange={e => setNewSurvey({ ...newSurvey, title: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Descripción (visible para el cliente)</label>
          <textarea className="form-textarea" value={newSurvey.description}
            onChange={e => setNewSurvey({ ...newSurvey, description: e.target.value })} />
        </div>
        <div style={{ marginTop: '16px' }}>
          <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ClipboardCheck size={16} color="var(--primary)" /> Preguntas Incluidas ({newSurvey.questions.length})
          </h4>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {newSurvey.questions.map((q, idx) => (
              <div key={q.id} className="card" style={{ padding: '12px', marginBottom: '8px', background: 'var(--bg-secondary)', border: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{idx + 1}. {q.label}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                      {q.type === 'select' ? 'Selección única' : 'Selección múltiple'} · {q.options.length} opciones
                      {q.required && <span style={{ color: 'var(--error)', marginLeft: '6px' }}>* Obligatoria</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="alert-info" style={{ marginTop: '12px' }}>
            <CheckCircle size={14} />
            <small>Las preguntas incluyen datos demográficos y de satisfacción del producto. Además se recopilarán nombre, teléfono y correo electrónico del encuestado.</small>
          </div>
        </div>
      </Modal>

      {/* MODAL: QR CODE */}
      {selectedSurvey && showQR && qrData && (
        <Modal isOpen={showQR} onClose={() => { setShowQR(false); setQrData(null); }} title="Compartir Encuesta">
          <div style={{ textAlign: 'center' }}>
            <img src={qrData.qr} alt="QR de la encuesta" style={{ width: '250px', height: '250px', margin: '0 auto 20px', borderRadius: '12px', border: '2px solid var(--border-color)' }} />
            <h4 style={{ margin: '0 0 8px' }}>{selectedSurvey.title}</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Escanea el código QR o comparte el enlace con tus clientes
            </p>
            <div style={{ display: 'flex', gap: '8px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', alignItems: 'center' }}>
              <input className="form-input" readOnly value={qrData.url} style={{ flex: 1, fontSize: '0.8rem' }} />
              <button className="btn btn-primary btn-sm" onClick={() => copyUrl(qrData.url)}>
                <Copy size={14} /> Copiar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: STATS/RESULTS */}
      {selectedSurvey && showStats && statsData && (
        <Modal isOpen={showStats} onClose={() => { setShowStats(false); setStatsData(null); setExpandedQuestion(null); }}
          title={`Resultados: ${selectedSurvey.title}`} large>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div className="card" style={{ padding: '16px', textAlign: 'center', background: 'var(--primary-bg)', border: 'none' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{statsData.total}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Total Respuestas</div>
            </div>
            {statsData.stats['satisfaccion'] && (() => {
              const satStats = statsData.stats['satisfaccion'];
              const positive = (satStats['Muy satisfecho'] || 0) + (satStats['Satisfecho'] || 0);
              const pct = statsData.total > 0 ? ((positive / statsData.total) * 100).toFixed(0) : 0;
              return (
                <>
                  <div className="card" style={{ padding: '16px', textAlign: 'center', background: 'var(--success-bg)', border: 'none' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)' }}>{pct}%</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Aprobación</div>
                  </div>
                  <div className="card" style={{ padding: '16px', textAlign: 'center', background: 'var(--bg-secondary)', border: 'none' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800 }}>{positive}/{statsData.total}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Satisfechos</div>
                  </div>
                </>
              );
            })()}
          </div>

          {statsData.total === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
              <Users size={40} style={{ opacity: 0.4, marginBottom: '12px' }} />
              <p>Aún no hay respuestas para esta encuesta.</p>
            </div>
          ) : (
            <div>
              <h4 style={{ marginBottom: '16px' }}>Desglose por Pregunta</h4>
              {(statsData.questions || []).map((q) => {
                const qStats = statsData.stats[q.id] || {};
                const isOpen = expandedQuestion === q.id;
                return (
                  <div key={q.id} className="card" style={{ marginBottom: '12px', padding: '16px', background: 'var(--bg-secondary)', border: 'none', cursor: 'pointer' }}
                    onClick={() => setExpandedQuestion(isOpen ? null : q.id)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{q.label}</div>
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                    {isOpen && (
                      <div style={{ marginTop: '16px' }}>
                        {Object.entries(qStats)
                          .sort((a, b) => b[1] - a[1])
                          .map(([label, count]) => renderBar(label, count, statsData.total))}
                      </div>
                    )}
                  </div>
                );
              })}

              <h4 style={{ margin: '24px 0 12px' }}>Últimas Respuestas</h4>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Nombre</th>
                      <th>Teléfono</th>
                      <th>Satisfacción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(statsData.responses || []).slice(0, 20).map(r => {
                      const answers = typeof r.answers === 'string' ? JSON.parse(r.answers) : r.answers;
                      return (
                        <tr key={r.id}>
                          <td style={{ fontSize: '0.85rem' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                          <td style={{ fontWeight: 600 }}>{r.respondent_name || r.customer_name || '—'}</td>
                          <td>{r.respondent_phone || '—'}</td>
                          <td>
                            <span className="badge" style={{ background: getSatisfactionColor(answers.satisfaccion) + '22', color: getSatisfactionColor(answers.satisfaccion), fontWeight: 700 }}>
                              {answers.satisfaccion || '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
