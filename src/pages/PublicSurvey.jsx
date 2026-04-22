import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ClipboardCheck, CheckCircle, Send, Heart } from 'lucide-react';

export default function PublicSurvey() {
  const { token } = useParams();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const [respondentName, setRespondentName] = useState('');
  const [respondentEmail, setRespondentEmail] = useState('');
  const [respondentPhone, setRespondentPhone] = useState('');
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    loadSurvey();
  }, [token]);

  const loadSurvey = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/surveys/public/${token}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Encuesta no encontrada');
      }
      const data = await res.json();
      setSurvey(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId, value, type) => {
    if (type === 'multiselect') {
      const current = answers[questionId] || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      setAnswers({ ...answers, [questionId]: updated });
    } else {
      setAnswers({ ...answers, [questionId]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required
    for (const q of survey.questions) {
      if (q.required) {
        const ans = answers[q.id];
        if (!ans || (Array.isArray(ans) && ans.length === 0)) {
          alert(`Por favor responde: "${q.label}"`);
          return;
        }
      }
    }
    if (!respondentPhone) {
      alert('Por favor ingresa tu número telefónico');
      return;
    }
    if (!respondentEmail) {
      alert('Por favor ingresa tu correo electrónico');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/surveys/public/${token}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers,
          respondent_name: respondentName,
          respondent_email: respondentEmail,
          respondent_phone: respondentPhone
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      setSubmitted(true);
    } catch (err) {
      alert(err.message || 'Error al enviar la respuesta');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 16px' }}></div>
            <p style={{ color: '#aaa' }}>Cargando encuesta...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <ClipboardCheck size={56} style={{ color: '#555', marginBottom: '16px' }} />
            <h2 style={{ color: '#fff', margin: '0 0 8px' }}>Encuesta no disponible</h2>
            <p style={{ color: '#999' }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(46,204,113,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Heart size={40} style={{ color: '#2ECC71' }} />
            </div>
            <h2 style={{ color: '#fff', margin: '0 0 8px' }}>¡Muchas Gracias!</h2>
            <p style={{ color: '#aaa', fontSize: '1.1rem', maxWidth: '400px', margin: '0 auto' }}>
              Tu opinión es muy valiosa para nosotros. Gracias por tomarte el tiempo de responder esta encuesta.
            </p>
            <div style={{ marginTop: '30px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', display: 'inline-block' }}>
              <img src="/logo.jpg" alt="Special Clean Oil" style={{ width: '60px', height: '60px', objectFit: 'contain', borderRadius: '8px' }} />
              <p style={{ color: '#888', marginTop: '8px', fontSize: '0.85rem' }}>Special Clean Oil</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <img src="/logo.jpg" alt="Logo" style={{ width: 50, height: 50, objectFit: 'contain', borderRadius: '8px' }} />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.3rem', color: '#fff' }}>{survey.title}</h1>
            {survey.description && <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#aaa' }}>{survey.description}</p>}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Contact Info */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Datos de Contacto</h3>
            <div style={styles.formGroup}>
              <label style={styles.label}>Nombre Completo</label>
              <input style={styles.input} value={respondentName} onChange={e => setRespondentName(e.target.value)} placeholder="Tu nombre" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Número Telefónico *</label>
                <input style={styles.input} type="tel" required value={respondentPhone} onChange={e => setRespondentPhone(e.target.value)} placeholder="310..." />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Correo Electrónico *</label>
                <input style={styles.input} type="email" required value={respondentEmail} onChange={e => setRespondentEmail(e.target.value)} placeholder="correo@..." />
              </div>
            </div>
          </div>

          {/* Questions */}
          {survey.questions.map((q, idx) => (
            <div key={q.id} style={styles.section}>
              <h3 style={styles.sectionTitle}>
                {idx + 1}. {q.label} {q.required && <span style={{ color: '#E74C3C' }}>*</span>}
              </h3>

              {q.type === 'select' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {q.options.map(opt => (
                    <label key={opt} style={{
                      ...styles.optionLabel,
                      background: answers[q.id] === opt ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                      borderColor: answers[q.id] === opt ? '#6366f1' : 'rgba(255,255,255,0.08)',
                    }}>
                      <input type="radio" name={q.id} value={opt} checked={answers[q.id] === opt}
                        onChange={() => handleAnswer(q.id, opt, 'select')}
                        style={{ display: 'none' }} />
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%',
                        border: answers[q.id] === opt ? '5px solid #6366f1' : '2px solid rgba(255,255,255,0.2)',
                        background: answers[q.id] === opt ? '#fff' : 'transparent',
                        flexShrink: 0,
                        transition: 'all 0.2s ease'
                      }}></div>
                      <span style={{ color: '#ddd', fontSize: '0.9rem' }}>{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'multiselect' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {q.options.map(opt => {
                    const isChecked = (answers[q.id] || []).includes(opt);
                    return (
                      <label key={opt} style={{
                        ...styles.optionLabel,
                        background: isChecked ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                        borderColor: isChecked ? '#6366f1' : 'rgba(255,255,255,0.08)',
                      }}>
                        <input type="checkbox" checked={isChecked}
                          onChange={() => handleAnswer(q.id, opt, 'multiselect')}
                          style={{ display: 'none' }} />
                        <div style={{
                          width: 18, height: 18, borderRadius: '4px',
                          border: isChecked ? 'none' : '2px solid rgba(255,255,255,0.2)',
                          background: isChecked ? '#6366f1' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, transition: 'all 0.2s ease'
                        }}>
                          {isChecked && <CheckCircle size={12} color="#fff" />}
                        </div>
                        <span style={{ color: '#ddd', fontSize: '0.9rem' }}>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {/* Submit */}
          <button type="submit" disabled={submitting} style={{
            ...styles.submitBtn,
            opacity: submitting ? 0.6 : 1
          }}>
            {submitting ? (
              <div className="spinner" style={{ width: 20, height: 20 }}></div>
            ) : (
              <><Send size={18} /> Enviar Respuesta</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%)',
    padding: '20px',
    display: 'flex',
    justifyContent: 'center',
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  container: {
    width: '100%',
    maxWidth: '600px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
    padding: '20px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  section: {
    marginBottom: '20px',
    padding: '20px',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  sectionTitle: {
    margin: '0 0 16px',
    fontSize: '0.95rem',
    fontWeight: 700,
    color: '#e0e0e0',
  },
  formGroup: {
    marginBottom: '14px',
  },
  label: {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#aaa',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  optionLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  submitBtn: {
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '40px',
    transition: 'transform 0.2s',
  },
};
