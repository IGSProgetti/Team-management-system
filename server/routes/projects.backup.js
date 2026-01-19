const express = require('express');
const { query, transaction } = require('../config/database');
const { authenticateToken, requireManager, requireResource } = require('../middleware/auth');
const { validateProject, validateProjectAssignment, validateUUID, validatePagination } = require('../middleware/validation');

const router = express.Router();

// GET /api/projects - Lista progetti
router.get('/', authenticateToken, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 20, sort = 'nome', order = 'asc', cliente_id, stato_approvazione } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    let params = [];

    // Manager vede tutti, risorsa solo quelli assegnati e approvati
    if (req.user.ruolo === 'risorsa') {
      whereClause += ` AND (p.stato_approvazione = 'approvata' OR p.creato_da = $1)
                 AND (EXISTS (SELECT 1 FROM assegnazioni_progetto ap WHERE ap.progetto_id = p.id AND ap.utente_id = $1) 
                      OR p.creato_da = $1)`;
      params.push(req.user.id);
    } else if (stato_approvazione) {
      whereClause += ' AND p.stato_approvazione = $' + (params.length + 1);
      params.push(stato_approvazione);
    }

    if (cliente_id) {
      whereClause += ' AND p.cliente_id = $' + (params.length + 1);
      params.push(cliente_id);
    }

    const result = await query(`
      SELECT 
        p.id, p.nome, p.descrizione, p.budget_assegnato, p.budget_utilizzato,
        p.stato_approvazione, p.data_inizio, p.data_fine, p.data_creazione,
        c.nome as cliente_nome, c.id as cliente_id,
        u.nome as creato_da_nome,
        COUNT(DISTINCT ap.utente_id) as numero_risorse,
        COALESCE(SUM(ap.ore_assegnate), 0) as ore_totali_assegnate,
        COALESCE(0, 0) as ore_totali_utilizzate
      FROM progetti p
      JOIN clienti c ON p.cliente_id = c.id
      LEFT JOIN utenti u ON p.creato_da = u.id
      LEFT JOIN assegnazioni_progetto ap ON p.id = ap.progetto_id
      ${whereClause}
      GROUP BY p.id, p.nome, p.descrizione, p.budget_assegnato, p.budget_utilizzato,
               p.stato_approvazione, p.data_inizio, p.data_fine, p.data_creazione,
               c.nome, c.id, u.nome
      ORDER BY ${sort === 'cliente_nome' ? 'c.nome' : sort === 'nome' ? 'p.nome' : 'p.' + sort} ${order.toUpperCase()}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);

    res.json({ projects: result.rows });

  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Server Error', details: 'Failed to fetch projects' });
  }
});

// POST /api/projects - Crea nuovo progetto
router.post('/', authenticateToken, requireResource, validateProject, async (req, res) => {
  try {
    const { nome, descrizione, cliente_id, budget_assegnato, data_inizio, data_fine } = req.body;

    const statoApprovazione = req.user.ruolo === 'manager' ? 'approvata' : 'pending_approval';
    const creatoDataRisorsa = req.user.ruolo === 'risorsa' ? req.user.id : req.user.id;

    const result = await query(`
      INSERT INTO progetti (nome, descrizione, cliente_id, budget_assegnato, stato_approvazione, creato_da, data_inizio, data_fine)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [nome, descrizione, cliente_id, budget_assegnato, statoApprovazione, creatoDataRisorsa, data_inizio, data_fine]);

    res.status(201).json({
      message: statoApprovazione === 'pending_approval' ? 'Project created and pending approval' : 'Project created successfully',
      project: result.rows[0]
    });

  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Server Error', details: 'Failed to create project' });
  }
});

// GET /api/projects/:id - Dettagli progetto
router.get('/:id', authenticateToken, validateUUID('id'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        p.*, c.nome as cliente_nome,
        COALESCE(SUM(
          CASE WHEN t.stato = 'completata' AND t.ore_effettive IS NOT NULL 
          THEN (t.ore_effettive::decimal / 60) * ut.costo_orario 
          ELSE 0 END
        ), 0) as costo_effettivo_progetto
      FROM progetti p
      JOIN clienti c ON p.cliente_id = c.id
      LEFT JOIN attivita a ON p.id = a.progetto_id
      LEFT JOIN task t ON a.id = t.attivita_id
      LEFT JOIN utenti ut ON t.utente_assegnato = ut.id
      WHERE p.id = $1
      GROUP BY p.id, c.nome
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', details: 'Project not found' });
    }

    res.json({ project: result.rows[0] });

  } catch (error) {
    console.error('Get project details error:', error);
    res.status(500).json({ error: 'Server Error', details: 'Failed to fetch project details' });
  }
});

// POST /api/projects/:id/assign - Assegna risorse (solo manager)
router.post('/:id/assign', authenticateToken, requireManager, validateUUID('id'), async (req, res) => {
  try {
    const { assegnazioni } = req.body;

    const results = [];
    for (const assegnazione of assegnazioni) {
      const { utente_id, ore_assegnate } = assegnazione;

      const result = await query(`
        INSERT INTO assegnazioni_progetto (progetto_id, utente_id, ore_assegnate)
        VALUES ($1, $2, $3)
        ON CONFLICT (progetto_id, utente_id) 
        DO UPDATE SET ore_assegnate = $3, data_assegnazione = CURRENT_TIMESTAMP
        RETURNING *
      `, [req.params.id, utente_id, ore_assegnate]);

      results.push(result.rows[0]);
    }

    res.json({ message: 'Resources assigned successfully', assignments: results });

  } catch (error) {
    console.error('Assign project resources error:', error);
    res.status(500).json({ error: 'Server Error', details: 'Failed to assign resources' });
  }
});

module.exports = router;
