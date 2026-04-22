const express = require('express');
const QRCode = require('qrcode');
const { pool } = require('../db/database');
const { authMiddleware, roleGuard } = require('../middleware/auth');

const router = express.Router();

// GET /api/surveys - List all surveys (admin/vendedor)
router.get('/', authMiddleware, roleGuard('admin', 'vendedor'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.*, 
        (SELECT COUNT(*) FROM survey_responses sr WHERE sr.survey_id = s.id) as response_count
      FROM surveys s
      ORDER BY s.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Get surveys error:', err);
    res.status(500).json({ error: 'Error al obtener encuestas' });
  }
});

// GET /api/surveys/:id - Get survey with stats (admin/vendedor)
router.get('/:id', authMiddleware, roleGuard('admin', 'vendedor'), async (req, res) => {
  try {
    const { rows: surveyRows } = await pool.query('SELECT * FROM surveys WHERE id = $1', [req.params.id]);
    if (surveyRows.length === 0) return res.status(404).json({ error: 'Encuesta no encontrada' });

    const { rows: responses } = await pool.query(`
      SELECT sr.*, c.name as customer_name 
      FROM survey_responses sr
      LEFT JOIN customers c ON sr.customer_id = c.id
      WHERE sr.survey_id = $1
      ORDER BY sr.created_at DESC
    `, [req.params.id]);

    res.json({ ...surveyRows[0], responses });
  } catch (err) {
    console.error('Get survey detail error:', err);
    res.status(500).json({ error: 'Error al obtener encuesta' });
  }
});

// GET /api/surveys/:id/stats - Consolidated stats
router.get('/:id/stats', authMiddleware, roleGuard('admin', 'vendedor'), async (req, res) => {
  try {
    const { rows: responses } = await pool.query(
      'SELECT answers FROM survey_responses WHERE survey_id = $1',
      [req.params.id]
    );

    if (responses.length === 0) return res.json({ total: 0, stats: {} });

    // Aggregate answers
    const stats = {};
    for (const row of responses) {
      const answers = row.answers;
      for (const [question, answer] of Object.entries(answers)) {
        if (!stats[question]) stats[question] = {};
        const val = String(answer);
        stats[question][val] = (stats[question][val] || 0) + 1;
      }
    }

    res.json({ total: responses.length, stats });
  } catch (err) {
    console.error('Get survey stats error:', err);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// POST /api/surveys - Create survey (admin/vendedor)
router.post('/', authMiddleware, roleGuard('admin', 'vendedor'), async (req, res) => {
  try {
    const { title, description, questions } = req.body;
    if (!title || !questions || questions.length === 0) {
      return res.status(400).json({ error: 'Título y preguntas son requeridos' });
    }

    // Generate a unique public token for the survey
    const publicToken = require('crypto').randomBytes(8).toString('hex');

    const { rows } = await pool.query(`
      INSERT INTO surveys (title, description, questions, public_token, active)
      VALUES ($1, $2, $3, $4, true)
      RETURNING *
    `, [title, description, JSON.stringify(questions), publicToken]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create survey error:', err);
    res.status(500).json({ error: 'Error al crear encuesta' });
  }
});

// PUT /api/surveys/:id - Update survey
router.put('/:id', authMiddleware, roleGuard('admin', 'vendedor'), async (req, res) => {
  try {
    const { title, description, questions, active } = req.body;
    const { rows } = await pool.query(`
      UPDATE surveys SET title = COALESCE($1, title), description = COALESCE($2, description),
        questions = COALESCE($3, questions), active = COALESCE($4, active)
      WHERE id = $5 RETURNING *
    `, [title, description, questions ? JSON.stringify(questions) : null, active, req.params.id]);

    if (rows.length === 0) return res.status(404).json({ error: 'Encuesta no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Update survey error:', err);
    res.status(500).json({ error: 'Error al actualizar encuesta' });
  }
});

// GET /api/surveys/public/:token - Public endpoint for customers to get survey
router.get('/public/:token', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, title, description, questions FROM surveys WHERE public_token = $1 AND active = true',
      [req.params.token]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Encuesta no encontrada o inactiva' });
    
    // Parse questions if stored as string
    const survey = rows[0];
    if (typeof survey.questions === 'string') {
      survey.questions = JSON.parse(survey.questions);
    }
    res.json(survey);
  } catch (err) {
    console.error('Get public survey error:', err);
    res.status(500).json({ error: 'Error al obtener encuesta' });
  }
});

// POST /api/surveys/public/:token/respond - Public endpoint for customers to submit responses
router.post('/public/:token/respond', async (req, res) => {
  try {
    const { answers, respondent_name, respondent_email, respondent_phone } = req.body;
    
    const { rows: surveyRows } = await pool.query(
      'SELECT id FROM surveys WHERE public_token = $1 AND active = true',
      [req.params.token]
    );
    if (surveyRows.length === 0) return res.status(404).json({ error: 'Encuesta no encontrada o inactiva' });

    const surveyId = surveyRows[0].id;

    // Try to find existing customer by email or phone
    let customerId = null;
    if (respondent_email || respondent_phone) {
      let q = 'SELECT id FROM customers WHERE ';
      const params = [];
      if (respondent_email) { params.push(respondent_email); q += `email = $${params.length}`; }
      else if (respondent_phone) { params.push(respondent_phone); q += `phone = $${params.length}`; }
      const { rows: custRows } = await pool.query(q, params);
      if (custRows.length > 0) customerId = custRows[0].id;
    }

    await pool.query(`
      INSERT INTO survey_responses (survey_id, customer_id, respondent_name, respondent_email, respondent_phone, answers)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [surveyId, customerId, respondent_name, respondent_email, respondent_phone, JSON.stringify(answers)]);

    res.status(201).json({ message: '¡Gracias por tu respuesta!' });
  } catch (err) {
    console.error('Submit survey response error:', err);
    res.status(500).json({ error: 'Error al guardar respuesta' });
  }
});

// GET /api/surveys/:id/qr - Generate QR code for survey
router.get('/:id/qr', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT public_token FROM surveys WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Encuesta no encontrada' });

    // Build the public URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const surveyUrl = `${baseUrl}/encuesta/${rows[0].public_token}`;

    const qrDataUrl = await QRCode.toDataURL(surveyUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#1A1F2E', light: '#FFFFFF' }
    });

    res.json({ qr: qrDataUrl, url: surveyUrl });
  } catch (err) {
    console.error('Generate survey QR error:', err);
    res.status(500).json({ error: 'Error al generar QR' });
  }
});

module.exports = router;
