const express = require('express');
const { query, transaction } = require('../config/database');
const { authenticateToken, requireManager } = require('../middleware/auth');
const { body, param, validationResult } = require('express-validator');

const router = express.Router();

// GET /api/bonus - Lista bonus con filtri
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { risorsa_id, stato, tipo, data_da, data_a } = req.query;

    let whereClause = 'WHERE 1=1';
    let params = [];

    // Filtro per risorsa
    if (risorsa_id) {
      whereClause += ' AND b.risorsa_id = $' + (params.length + 1);
      params.push(risorsa_id);
    }

    // Filtro per stato
    if (stato) {
      whereClause += ' AND b.stato = $' + (params.length + 1);
      params.push(stato);
    }

    // Filtro per tipo
    if (tipo) {
      whereClause += ' AND b.tipo = $' + (params.length + 1);
      params.push(tipo);
    }

    // Filtro data
    if (data_da) {
      whereClause += ' AND b.data_creazione >= $' + (params.length + 1);
      params.push(data_da);
    }

    if (data_a) {
      whereClause += ' AND b.data_creazione <= $' + (params.length + 1);
      params.push(data_a);
    }

    // Risorsa vede solo i suoi bonus
    if (req.user.ruolo === 'risorsa') {
      whereClause += ' AND b.risorsa_id = $' + (params.length + 1);
      params.push(req.user.id);
    }

    const result = await query(`
      SELECT 
        b.*,
        u.nome as risorsa_nome,
        u.email as risorsa_email,
        t.nome as task_nome,
        a.nome as attivita_nome,
        p.nome as progetto_nome,
        c.nome as cliente_nome,
        m.nome as manager_nome
      FROM bonus_risorse b
      JOIN utenti u ON b.risorsa_id = u.id
      JOIN task t ON b.task_id = t.id
      JOIN attivita a ON t.attivita_id = a.id
      JOIN progetti p ON a.progetto_id = p.id
      JOIN clienti c ON p.cliente_id = c.id
      LEFT JOIN utenti m ON b.manager_id = m.id
      ${whereClause}
      ORDER BY b.data_creazione DESC
    `, params);

    res.json({ bonus: result.rows });

  } catch (error) {
    console.error('Get bonus error:', error);
    res.status(500).json({ error: 'Errore nel recupero dei bonus', details: error.message });
  }
});

// GET /api/bonus/risorsa/:risorsa_id/totale - Totale bonus per risorsa
router.get('/risorsa/:risorsa_id/totale', authenticateToken, param('risorsa_id').isUUID(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { risorsa_id } = req.params;

    const result = await query(`
      SELECT 
        COUNT(*) as totale_task,
        SUM(CASE WHEN tipo = 'positivo' THEN 1 ELSE 0 END) as task_positive,
        SUM(CASE WHEN tipo = 'zero' THEN 1 ELSE 0 END) as task_precise,
        SUM(CASE WHEN tipo = 'negativo' THEN 1 ELSE 0 END) as task_negative,
        SUM(CASE WHEN stato = 'approvato' THEN importo_bonus ELSE 0 END) as bonus_approvato,
        SUM(CASE WHEN stato = 'pending' THEN importo_bonus ELSE 0 END) as bonus_pending,
        SUM(CASE WHEN stato = 'rifiutato' THEN importo_bonus ELSE 0 END) as bonus_rifiutato,
        SUM(CASE WHEN stato = 'approvato' AND tipo = 'positivo' THEN importo_bonus ELSE 0 END) as bonus_positivo_totale,
        SUM(CASE WHEN stato = 'approvato' AND tipo = 'negativo' THEN importo_bonus ELSE 0 END) as penalita_totale
      FROM bonus_risorse
      WHERE risorsa_id = $1
    `, [risorsa_id]);

    res.json({ totale: result.rows[0] });

  } catch (error) {
    console.error('Get totale bonus error:', error);
    res.status(500).json({ error: 'Errore nel calcolo totale bonus', details: error.message });
  }
});

// POST /api/bonus/calcola - Calcola bonus/penalità quando task completata
router.post('/calcola', authenticateToken, async (req, res) => {
  try {
    const { task_id } = req.body;

    if (!task_id) {
      return res.status(400).json({ error: 'task_id obbligatorio' });
    }

    // Verifica task esista e sia completata
    const taskCheck = await query(`
      SELECT 
        t.*,
        u.costo_orario,
        m.costo_orario_finale as costo_orario_progetto
      FROM task t
      JOIN utenti u ON t.utente_assegnato = u.id
      JOIN attivita a ON t.attivita_id = a.id
      JOIN progetti p ON a.progetto_id = p.id
      LEFT JOIN margini_progetto m ON m.progetto_id = p.id AND m.risorsa_id = u.id
      WHERE t.id = $1
    `, [task_id]);

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task non trovata' });
    }

    const task = taskCheck.rows[0];

    if (task.stato !== 'completata') {
      return res.status(400).json({ error: 'La task deve essere completata' });
    }

    if (!task.ore_effettive) {
      return res.status(400).json({ error: 'Ore effettive non inserite' });
    }

    // Verifica se bonus già calcolato
    const bonusCheck = await query('SELECT id FROM bonus_risorse WHERE task_id = $1', [task_id]);
    if (bonusCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Bonus già calcolato per questa task' });
    }

    // Calcola differenza ore (in minuti)
    const differenzaOre = task.ore_stimate - task.ore_effettive;

    // Determina tipo
    let tipo;
    let percentualeBonus = 0;
    let importoBonus = 0;

    if (differenzaOre > 0) {
      // POSITIVO: ha risparmiato tempo
      tipo = 'positivo';
      percentualeBonus = 5.0; // 5%
      // Bonus calcolato su costo orario PIENO (205€) × ore effettive
      const costoOrarioPieno = task.costo_orario * 100.0 / 20.0; // Formula: base × 100 ÷ 20
      importoBonus = costoOrarioPieno * (task.ore_effettive / 60.0) * (percentualeBonus / 100.0);
    } else if (differenzaOre === 0) {
      // ZERO: preciso
      tipo = 'zero';
      percentualeBonus = 2.5; // 2.5%
      const costoOrarioPieno = task.costo_orario * 100.0 / 20.0;
      importoBonus = costoOrarioPieno * (task.ore_effettive / 60.0) * (percentualeBonus / 100.0);
    } else {
      // NEGATIVO: ha sforato
      tipo = 'negativo';
      percentualeBonus = 0;
      // Costo calcolato su costo orario PROGETTO × ore in eccesso
      const oreInEccesso = Math.abs(differenzaOre);
      const costoOrarioProgetto = task.costo_orario_progetto || task.costo_orario;
      importoBonus = -(costoOrarioProgetto * (oreInEccesso / 60.0)); // Negativo!
    }

    // Inserisci bonus
    const result = await query(`
      INSERT INTO bonus_risorse (
        risorsa_id, task_id, tipo,
        ore_stimate, ore_effettive, differenza_ore,
        importo_bonus, percentuale_bonus, costo_orario_base
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      task.utente_assegnato,
      task_id,
      tipo,
      task.ore_stimate,
      task.ore_effettive,
      differenzaOre,
      importoBonus.toFixed(2),
      percentualeBonus,
      task.costo_orario * 100.0 / 20.0 // Costo pieno
    ]);

    res.status(201).json({ 
      message: 'Bonus calcolato con successo',
      bonus: result.rows[0]
    });

  } catch (error) {
    console.error('Calcola bonus error:', error);
    res.status(500).json({ error: 'Errore nel calcolo del bonus', details: error.message });
  }
});

// PUT /api/bonus/:id/approva - Approva bonus
router.put('/:id/approva', authenticateToken, requireManager, param('id').isUUID(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { commento } = req.body;

    // Verifica bonus esista e sia pending
    const bonusCheck = await query('SELECT * FROM bonus_risorse WHERE id = $1', [id]);
    if (bonusCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Bonus non trovato' });
    }

    if (bonusCheck.rows[0].stato !== 'pending') {
      return res.status(400).json({ error: 'Bonus non è in stato pending' });
    }

    // Approva
    const result = await query(`
      UPDATE bonus_risorse 
      SET 
        stato = 'approvato',
        manager_id = $1,
        data_approvazione = CURRENT_TIMESTAMP,
        commento_manager = $2
      WHERE id = $3
      RETURNING *
    `, [req.user.id, commento, id]);

    // Log azione
    await query(`
      INSERT INTO log_redistribuzione_ore (
        manager_id, tipo_azione, importo_bonus, commento, dettagli_json
      )
      VALUES ($1, 'approvazione_bonus', $2, $3, $4)
    `, [
      req.user.id,
      bonusCheck.rows[0].importo_bonus,
      commento || 'Bonus approvato',
      JSON.stringify({ bonus_id: id, risorsa_id: bonusCheck.rows[0].risorsa_id })
    ]);

    res.json({ 
      message: 'Bonus approvato con successo',
      bonus: result.rows[0]
    });

  } catch (error) {
    console.error('Approva bonus error:', error);
    res.status(500).json({ error: 'Errore nell\'approvazione del bonus', details: error.message });
  }
});

// PUT /api/bonus/:id/rifiuta - Rifiuta bonus
router.put('/:id/rifiuta', authenticateToken, requireManager, param('id').isUUID(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { commento } = req.body;

    if (!commento) {
      return res.status(400).json({ error: 'Commento obbligatorio per rifiuto' });
    }

    // Verifica bonus esista
    const bonusCheck = await query('SELECT * FROM bonus_risorse WHERE id = $1', [id]);
    if (bonusCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Bonus non trovato' });
    }

    // Rifiuta
    const result = await query(`
      UPDATE bonus_risorse 
      SET 
        stato = 'rifiutato',
        manager_id = $1,
        data_approvazione = CURRENT_TIMESTAMP,
        commento_manager = $2
      WHERE id = $3
      RETURNING *
    `, [req.user.id, commento, id]);

    // Log azione
    await query(`
      INSERT INTO log_redistribuzione_ore (
        manager_id, tipo_azione, importo_bonus, commento, dettagli_json
      )
      VALUES ($1, 'rifiuto_bonus', $2, $3, $4)
    `, [
      req.user.id,
      bonusCheck.rows[0].importo_bonus,
      commento,
      JSON.stringify({ bonus_id: id, risorsa_id: bonusCheck.rows[0].risorsa_id })
    ]);

    res.json({ 
      message: 'Bonus rifiutato',
      bonus: result.rows[0]
    });

  } catch (error) {
    console.error('Rifiuta bonus error:', error);
    res.status(500).json({ error: 'Errore nel rifiuto del bonus', details: error.message });
  }
});

// POST /api/bonus/:id/gestisci-negativo - Gestisci bonus negativo
router.post('/:id/gestisci-negativo', authenticateToken, requireManager, param('id').isUUID(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { azione, commento } = req.body;

    if (!azione || !['penalita_economica', 'sottrai_ore_future'].includes(azione)) {
      return res.status(400).json({ error: 'Azione deve essere "penalita_economica" o "sottrai_ore_future"' });
    }

    if (!commento) {
      return res.status(400).json({ error: 'Commento obbligatorio' });
    }

    // Verifica bonus esista e sia negativo
    const bonusCheck = await query('SELECT * FROM bonus_risorse WHERE id = $1', [id]);
    if (bonusCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Bonus non trovato' });
    }

    if (bonusCheck.rows[0].tipo !== 'negativo') {
      return res.status(400).json({ error: 'Questa azione è solo per bonus negativi' });
    }

    // Aggiorna bonus
    const result = await query(`
      UPDATE bonus_risorse 
      SET 
        stato = 'approvato',
        azione_negativo = $1,
        manager_id = $2,
        data_approvazione = CURRENT_TIMESTAMP,
        commento_manager = $3
      WHERE id = $4
      RETURNING *
    `, [azione, req.user.id, commento, id]);

    // Se sottrai ore future, aggiorna ore utente
    if (azione === 'sottrai_ore_future') {
      const oreDaSottrarre = Math.abs(bonusCheck.rows[0].differenza_ore);
      await query(`
        UPDATE utenti
        SET ore_annue_totali = ore_annue_totali - $1
        WHERE id = $2
      `, [oreDaSottrarre, bonusCheck.rows[0].risorsa_id]);
    }

    // Log azione
    await query(`
      INSERT INTO log_redistribuzione_ore (
        manager_id, tipo_azione, importo_bonus, ore_spostate, commento, dettagli_json
      )
      VALUES ($1, 'gestione_negativo', $2, $3, $4, $5)
    `, [
      req.user.id,
      bonusCheck.rows[0].importo_bonus,
      azione === 'sottrai_ore_future' ? Math.abs(bonusCheck.rows[0].differenza_ore) : 0,
      commento,
      JSON.stringify({ 
        bonus_id: id, 
        risorsa_id: bonusCheck.rows[0].risorsa_id,
        azione
      })
    ]);

    res.json({ 
      message: 'Bonus negativo gestito con successo',
      bonus: result.rows[0]
    });

  } catch (error) {
    console.error('Gestisci negativo error:', error);
    res.status(500).json({ error: 'Errore nella gestione del bonus negativo', details: error.message });
  }
});

module.exports = router;