const express = require('express');
const { query, transaction } = require('../config/database');
const { authenticateToken, requireManager } = require('../middleware/auth');
const { body, param, validationResult } = require('express-validator');

const router = express.Router();

// Middleware validazione area
const validateArea = [
  body('nome').trim().notEmpty().withMessage('Nome obbligatorio'),
  body('progetto_id').isUUID().withMessage('Progetto ID deve essere UUID valido'),
  body('coordinatore_id').optional().isUUID().withMessage('Coordinatore ID deve essere UUID valido'),
  body('budget_stimato').optional().isDecimal().withMessage('Budget deve essere numero'),
  body('ore_stimate').optional().isInt({ min: 0 }).withMessage('Ore stimate devono essere >= 0'),
  body('scadenza').optional().isISO8601().withMessage('Scadenza deve essere data valida'),
];

// GET /api/aree - Lista aree
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { progetto_id, risorsa_id, coordinatore_id, stato } = req.query; // ✅ TUTTI I PARAMETRI

    let whereClause = 'WHERE a.attivo = true';
    let params = [];

    if (progetto_id) {
      whereClause += ' AND a.progetto_id = $1';
      params.push(progetto_id);
    }

    // 🆕 FILTRO RISORSA
    /*
if (risorsa_id) {
  whereClause += ` AND EXISTS (
    SELECT 1 FROM attivita att2
    JOIN task t2 ON t2.attivita_id = att2.id
    WHERE att2.area_id = a.id 
    AND t2.utente_assegnato = $${params.length + 1}
  )`;
  params.push(risorsa_id);
}
*/

    // Filtro per coordinatore
    if (coordinatore_id) {
      whereClause += ' AND a.coordinatore_id = $' + (params.length + 1);
      params.push(coordinatore_id);
    }

    // Filtro per stato
    if (stato) {
      whereClause += ' AND a.stato = $' + (params.length + 1);
      params.push(stato);
    }

    // Risorsa: vede solo aree del suo cliente assegnato
    if (req.user.ruolo === 'risorsa') {
      whereClause += ' AND EXISTS (SELECT 1 FROM progetti p JOIN clienti c ON p.cliente_id = c.id WHERE p.id = a.progetto_id AND c.id = $' + (params.length + 1) + ')';
      params.push(req.user.cliente_assegnato_id);
    }

    // Coordinatore: vede solo le sue aree
    if (req.user.ruolo === 'coordinatore') {
      whereClause += ' AND a.coordinatore_id = $' + (params.length + 1);
      params.push(req.user.id);
    }

    const result = await query(`
  SELECT 
    a.id,
    a.nome,
    a.descrizione,
    a.progetto_id,
    a.coordinatore_id,
    a.budget_stimato,
    a.ore_stimate,
    a.ore_effettive,
    a.scadenza,
    a.stato,
    a.data_creazione,
    a.data_aggiornamento,
    
    -- Info progetto
    p.nome as progetto_nome,
    c.nome as cliente_nome,
    c.id as cliente_id,
    
    -- Info coordinatore
    u.nome as coordinatore_nome,
    u.email as coordinatore_email,
    
    -- Statistiche attività
    COUNT(DISTINCT att.id) as numero_attivita,
    COUNT(DISTINCT CASE WHEN att.stato = 'completata' THEN att.id END) as attivita_completate,
    
    -- Statistiche task
    COUNT(DISTINCT t.id) as numero_task,
    COUNT(DISTINCT CASE WHEN t.stato = 'completata' THEN t.id END) as task_completate,
    
    -- 💰 BUDGET PREVENTIVATO AREA - Filtrato per risorsa se risorsa_id è presente
COALESCE(ROUND(SUM(
  CASE WHEN 1=1
    ${risorsa_id ? `AND t.utente_assegnato = $${params.indexOf(risorsa_id) + 1}` : ''}
  THEN (t.ore_stimate / 60.0) * COALESCE(acr.costo_orario_finale, ut.costo_orario, 0)
  ELSE 0 END
), 2), 0) as budget_preventivato,

-- 💰 BUDGET EFFETTIVO AREA - Filtrato per risorsa se risorsa_id è presente
COALESCE(ROUND(SUM(
  CASE WHEN t.stato = 'completata' AND t.ore_effettive IS NOT NULL
    ${risorsa_id ? `AND t.utente_assegnato = $${params.indexOf(risorsa_id) + 1}` : ''}
  THEN (t.ore_effettive / 60.0) * COALESCE(acr.costo_orario_finale, ut.costo_orario, 0)
  ELSE 0 END
), 2), 0) as budget_effettivo,
    
    -- Percentuale completamento
    CASE 
      WHEN COUNT(DISTINCT t.id) > 0 THEN 
        ROUND((COUNT(DISTINCT CASE WHEN t.stato = 'completata' THEN t.id END)::decimal / COUNT(DISTINCT t.id)) * 100, 0)
      ELSE 0
    END as percentuale_completamento
    
  FROM aree a
  JOIN progetti p ON a.progetto_id = p.id
  JOIN clienti c ON p.cliente_id = c.id
  LEFT JOIN utenti u ON a.coordinatore_id = u.id
  LEFT JOIN attivita att ON att.area_id = a.id
  LEFT JOIN task t ON t.attivita_id = att.id
  LEFT JOIN utenti ut ON t.utente_assegnato = ut.id
  LEFT JOIN assegnazione_cliente_risorsa acr ON (acr.cliente_id = c.id AND acr.risorsa_id = t.utente_assegnato)
  ${whereClause}
  GROUP BY a.id, a.nome, a.descrizione, a.progetto_id, a.coordinatore_id,
           a.budget_stimato, a.ore_stimate, a.ore_effettive, a.scadenza, a.stato,
           a.data_creazione, a.data_aggiornamento, p.nome, c.nome, c.id,
           u.nome, u.email
  ORDER BY a.data_creazione DESC
`, params);

    res.json({ aree: result.rows });

  } catch (error) {
    console.error('Get aree error:', error);
    res.status(500).json({ error: 'Errore nel recupero delle aree', details: error.message });
  }
});

// GET /api/aree/:id - Dettaglio area
router.get('/:id', authenticateToken, param('id').isUUID(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    const result = await query(`
      SELECT 
        a.*,
        p.nome as progetto_nome,
        p.id as progetto_id,
        c.nome as cliente_nome,
        c.id as cliente_id,
        u.nome as coordinatore_nome,
        u.email as coordinatore_email,
        -- Statistiche
        COUNT(DISTINCT att.id) as numero_attivita,
        COUNT(DISTINCT t.id) as numero_task,
        COALESCE(SUM(t.ore_effettive), 0) as ore_effettive_totali
      FROM aree a
      JOIN progetti p ON a.progetto_id = p.id
      JOIN clienti c ON p.cliente_id = c.id
      LEFT JOIN utenti u ON a.coordinatore_id = u.id
      LEFT JOIN attivita att ON att.area_id = a.id
      LEFT JOIN task t ON t.attivita_id = att.id
      WHERE a.id = $1 AND a.attivo = true
      GROUP BY a.id, p.nome, p.id, c.nome, c.id, u.nome, u.email
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Area non trovata' });
    }

    res.json({ area: result.rows[0] });

  } catch (error) {
    console.error('Get area detail error:', error);
    res.status(500).json({ error: 'Errore nel recupero dell\'area', details: error.message });
  }
});

// POST /api/aree - Crea nuova area
router.post('/', authenticateToken, requireManager, validateArea, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nome, descrizione, progetto_id, coordinatore_id, budget_stimato, ore_stimate, scadenza } = req.body;

    // Verifica che il progetto esista
    const progettoCheck = await query('SELECT id, budget_assegnato FROM progetti WHERE id = $1', [progetto_id]);
    if (progettoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Progetto non trovato' });
    }

    // Verifica budget: somma budget aree esistenti + nuovo budget <= budget progetto
    if (budget_stimato) {
      const budgetCheck = await query(`
        SELECT COALESCE(SUM(budget_stimato), 0) as budget_utilizzato
        FROM aree
        WHERE progetto_id = $1 AND attivo = true
      `, [progetto_id]);

      const budgetTotale = parseFloat(budgetCheck.rows[0].budget_utilizzato) + parseFloat(budget_stimato);
      const budgetProgetto = parseFloat(progettoCheck.rows[0].budget_assegnato);

      if (budgetTotale > budgetProgetto) {
        return res.status(400).json({ 
          error: 'Budget insufficiente',
          details: `Budget disponibile: €${(budgetProgetto - budgetCheck.rows[0].budget_utilizzato).toFixed(2)}`
        });
      }
    }

    // Verifica che il coordinatore esista e abbia il ruolo giusto
    if (coordinatore_id) {
      const coordCheck = await query(
        'SELECT id, ruolo FROM utenti WHERE id = $1 AND attivo = true',
        [coordinatore_id]
      );
      if (coordCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Coordinatore non trovato' });
      }
      if (!['coordinatore', 'manager', 'super_admin'].includes(coordCheck.rows[0].ruolo)) {
        return res.status(400).json({ error: 'L\'utente deve avere ruolo coordinatore, manager o super_admin' });
      }
    }

    const result = await query(`
      INSERT INTO aree (
        nome, descrizione, progetto_id, coordinatore_id,
        budget_stimato, ore_stimate, scadenza
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [nome, descrizione, progetto_id, coordinatore_id, budget_stimato || 0, ore_stimate || 0, scadenza]);

    res.status(201).json({ 
      message: 'Area creata con successo',
      area: result.rows[0]
    });

  } catch (error) {
    console.error('Create area error:', error);
    res.status(500).json({ error: 'Errore nella creazione dell\'area', details: error.message });
  }
});

// PUT /api/aree/:id - Aggiorna area
router.put('/:id', authenticateToken, requireManager, param('id').isUUID(), validateArea, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { nome, descrizione, coordinatore_id, budget_stimato, ore_stimate, scadenza, stato } = req.body;

    // Verifica che l'area esista
    const areaCheck = await query('SELECT * FROM aree WHERE id = $1 AND attivo = true', [id]);
    if (areaCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Area non trovata' });
    }

    // Verifica budget se modificato
    if (budget_stimato && budget_stimato !== areaCheck.rows[0].budget_stimato) {
      const progettoId = areaCheck.rows[0].progetto_id;
      const progettoResult = await query('SELECT budget_assegnato FROM progetti WHERE id = $1', [progettoId]);
      const budgetProgetto = parseFloat(progettoResult.rows[0].budget_assegnato);

      const budgetAltreAree = await query(`
        SELECT COALESCE(SUM(budget_stimato), 0) as totale
        FROM aree
        WHERE progetto_id = $1 AND id != $2 AND attivo = true
      `, [progettoId, id]);

      const budgetTotale = parseFloat(budgetAltreAree.rows[0].totale) + parseFloat(budget_stimato);

      if (budgetTotale > budgetProgetto) {
        return res.status(400).json({ 
          error: 'Budget insufficiente',
          details: `Budget disponibile: €${(budgetProgetto - budgetAltreAree.rows[0].totale).toFixed(2)}`
        });
      }
    }

    const result = await query(`
      UPDATE aree 
      SET 
        nome = COALESCE($1, nome),
        descrizione = COALESCE($2, descrizione),
        coordinatore_id = COALESCE($3, coordinatore_id),
        budget_stimato = COALESCE($4, budget_stimato),
        ore_stimate = COALESCE($5, ore_stimate),
        scadenza = COALESCE($6, scadenza),
        stato = COALESCE($7, stato),
        data_aggiornamento = CURRENT_TIMESTAMP
      WHERE id = $8 AND attivo = true
      RETURNING *
    `, [nome, descrizione, coordinatore_id, budget_stimato, ore_stimate, scadenza, stato, id]);

    res.json({ 
      message: 'Area aggiornata con successo',
      area: result.rows[0]
    });

  } catch (error) {
    console.error('Update area error:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento dell\'area', details: error.message });
  }
});

// DELETE /api/aree/:id - Soft delete area
router.delete('/:id', authenticateToken, requireManager, param('id').isUUID(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    // Verifica che l'area esista
    const areaCheck = await query('SELECT id FROM aree WHERE id = $1 AND attivo = true', [id]);
    if (areaCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Area non trovata' });
    }

    // Soft delete
    await query('UPDATE aree SET attivo = false, data_aggiornamento = CURRENT_TIMESTAMP WHERE id = $1', [id]);

    res.json({ message: 'Area eliminata con successo' });

  } catch (error) {
    console.error('Delete area error:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione dell\'area', details: error.message });
  }
});

module.exports = router;