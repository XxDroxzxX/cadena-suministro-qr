import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../utils/toast';
import Modal from '../components/UI/Modal';
import {
  Plus, ClipboardCheck, QrCode, BarChart3, Users, Eye,
  CheckCircle, XCircle, Star, ChevronDown, ChevronUp,
  Copy, ExternalLink, Edit, ToggleLeft, ToggleRight, Trash2
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

  // Survey creation state
  const [surveyTitle, setSurveyTitle] = useState('Encuesta de Satisfacción - Special Clean Oil');
  const [surveyDesc, setSurveyDesc] = useState('Queremos conocer tu experiencia con nuestros productos para mejorar continuamente.');
  const [enabledDefaults, setEnabledDefaults] = useState(() => DEFAULT_QUESTIONS.map(q => q.id));
  const [customQuestions, setCustomQuestions] = useState([]);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ label: '', type: 'select', options: '', required: true });

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
    const selectedDefaults = DEFAULT_QUESTIONS.filter(q => enabledDefaults.includes(q.id));
    const allQuestions = [...selectedDefaults, ...customQuestions];
    if (allQuestions.length === 0) return showToast('Agrega al menos una pregunta', 'warning');
    try {
      setSaving(true);
      await api.post('/surveys', { title: surveyTitle, description: surveyDesc, questions: allQuestions });
      showToast('Encuesta creada exitosamente', 'success');
      setShowCreate(false);
      setCustomQuestions([]);
      setEnabledDefaults(DEFAULT_QUESTIONS.map(q => q.id));
      loadSurveys();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleDefaultQuestion = (id) => {
    setEnabledDefaults(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const addCustomQuestion = () => {
    if (!newQuestion.label.trim()) return showToast('Escribe la pregunta', 'warning');
    const opts = newQuestion.options.split(',').map(o => o.trim()).filter(Boolean);
    if (opts.length < 2) return showToast('Agrega al menos 2 opciones separadas por coma', 'warning');
    const q = {
      id: 'custom_' + Date.now(),
      label: newQuestion.label.trim(),
      type: newQuestion.type,
      required: newQuestion.required,
      options: opts
    };
    setCustomQuestions([...customQuestions, q]);
    setNewQuestion({ label: '', type: 'select', options: '', required: true });
    setShowAddQuestion(false);
    showToast('Pregunta personalizada agregada', 'success');
  };

  const removeCustomQuestion = (id) => {
    setCustomQuestions(customQuestions.filter(q => q.id !== id));
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

  const handleDeleteSurvey = async (survey) => {
    if (!confirm(`¿Estás seguro de eliminar la encuesta "${survey.title}"? Todas las respuestas se perderán.`)) return;
    try {
      await api.delete(`/surveys/${survey.id}`);
      showToast('Encuesta eliminada', 'success');
      loadSurveys();
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
                {hasRole('admin') && (
                  <button className="btn-icon-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => handleDeleteSurvey(survey)} title="Eliminar Encuesta">
                    <Trash2 size={16} />
                  </button>
                )}
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
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving || !surveyTitle}>
              {saving ? <div className="spinner" style={{ width: 16, height: 16 }}></div> : `Crear Encuesta (${enabledDefaults.length + customQuestions.length} preguntas)`}
            </button>
          </>
        }>
        <div className="form-group">
          <label className="form-label">Título de la Encuesta *</label>
          <input className="form-input" value={surveyTitle}
            onChange={e => setSurveyTitle(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Descripción (visible para el cliente)</label>
          <textarea className="form-textarea" value={surveyDesc}
            onChange={e => setSurveyDesc(e.target.value)} />
        </div>

        {/* DEFAULT QUESTIONS with toggles */}
        <div style={{ marginTop: '16px' }}>
          <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ClipboardCheck size={16} color="var(--primary)" /> Preguntas Predeterminadas
          </h4>
          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {DEFAULT_QUESTIONS.map((q) => {
              const isOn = enabledDefaults.includes(q.id);
              return (
                <div key={q.id} className="card" style={{
                  padding: '12px', marginBottom: '8px',
                  background: isOn ? 'var(--bg-secondary)' : 'transparent',
                  border: isOn ? 'none' : '1px dashed var(--border-color)',
                  opacity: isOn ? 1 : 0.5,
                  transition: 'all 0.2s ease'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{q.label}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                        {q.type === 'select' ? 'Selección única' : 'Selección múltiple'} · {q.options.join(', ')}
                      </div>
                    </div>
                    <button className="btn-icon-ghost" onClick={() => toggleDefaultQuestion(q.id)}
                      title={isOn ? 'Desactivar' : 'Activar'} style={{ flexShrink: 0 }}>
                      {isOn ? <ToggleRight size={22} color="var(--success)" /> : <ToggleLeft size={22} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CUSTOM QUESTIONS */}
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Edit size={16} color="var(--warning)" /> Preguntas Personalizadas ({customQuestions.length})
            </h4>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowAddQuestion(!showAddQuestion)}>
              <Plus size={14} /> Agregar
            </button>
          </div>

          {showAddQuestion && (
            <div className="card" style={{ padding: '16px', marginBottom: '12px', border: '1px solid var(--primary)', background: 'var(--primary-bg)' }}>
              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Pregunta *</label>
                <input className="form-input" placeholder="Ej: ¿Recomendarías este producto a un amigo?"
                  value={newQuestion.label} onChange={e => setNewQuestion({ ...newQuestion, label: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Tipo</label>
                  <select className="form-select" value={newQuestion.type}
                    onChange={e => setNewQuestion({ ...newQuestion, type: e.target.value })}>
                    <option value="select">Selección Única</option>
                    <option value="multiselect">Selección Múltiple</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>¿Obligatoria?</label>
                  <select className="form-select" value={newQuestion.required ? 'si' : 'no'}
                    onChange={e => setNewQuestion({ ...newQuestion, required: e.target.value === 'si' })}>
                    <option value="si">Sí</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Opciones (separadas por coma) *</label>
                <input className="form-input" placeholder="Ej: Sí, No, Tal vez"
                  value={newQuestion.options} onChange={e => setNewQuestion({ ...newQuestion, options: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowAddQuestion(false)}>Cancelar</button>
                <button className="btn btn-primary btn-sm" onClick={addCustomQuestion}>
                  <CheckCircle size={14} /> Confirmar
                </button>
              </div>
            </div>
          )}

          {customQuestions.map((q, idx) => (
            <div key={q.id} className="card" style={{ padding: '12px', marginBottom: '8px', background: 'var(--bg-secondary)', border: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                    <span className="badge badge-purple" style={{ fontSize: '0.6rem', marginRight: '6px' }}>CUSTOM</span>
                    {q.label}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                    {q.type === 'select' ? 'Selección única' : 'Selección múltiple'} · {q.options.join(', ')}
                    {q.required && <span style={{ color: 'var(--error)', marginLeft: '6px' }}>* Obligatoria</span>}
                  </div>
                </div>
                <button className="btn-icon-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => removeCustomQuestion(q.id)}>
                  <XCircle size={16} />
                </button>
              </div>
            </div>
          ))}

          {customQuestions.length === 0 && !showAddQuestion && (
            <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
              No hay preguntas personalizadas. Presiona "Agregar" para crear una.
            </div>
          )}
        </div>

        <div className="alert-info" style={{ marginTop: '16px' }}>
          <CheckCircle size={14} />
          <small>Además de las preguntas seleccionadas, el formulario recogerá nombre, teléfono y correo electrónico del encuestado automáticamente.</small>
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
