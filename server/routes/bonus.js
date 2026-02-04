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

// =====================================================
// AGGIUNGI QUESTO CODICE ALLA FINE DI server/routes/bonus.js
// PRIMA DI: module.exports = router;
// =====================================================

// =====================================================
// SOSTITUISCI L'ENDPOINT /api/bonus/resource/:risorsaId
// IN server/routes/bonus.js CON QUESTO CODICE
// =====================================================

// GET /api/bonus/resource/:risorsaId - Dettaglio completo risorsa con gerarchia, bonus e totali aggregati
router.get('/resource/:risorsaId', authenticateToken, async (req, res) => {
  try {
    const { risorsaId } = req.params;
    
    console.log(`📊 Recupero dettaglio risorsa con totali: ${risorsaId}`);
    
    // Query principale: ottieni tutti i dati della gerarchia con bonus E totali aggregati
    const result = await query(`
      WITH risorsa_info AS (
        SELECT 
          u.id as risorsa_id,
          u.nome as risorsa_nome,
          u.email,
          u.costo_orario as costo_orario_base_utente
        FROM utenti u
        WHERE u.id = $1 AND u.attivo = true
      ),
      -- CTE per calcolare i totali dei bonus per attività
      bonus_attivita AS (
        SELECT 
          t.attivita_id,
          SUM(CASE WHEN b.stato = 'pending' THEN b.importo_bonus ELSE 0 END) as bonus_pending,
          SUM(CASE WHEN b.stato = 'approvato' THEN b.importo_bonus ELSE 0 END) as bonus_approvato,
          SUM(b.importo_bonus) as bonus_totale
        FROM task t
        LEFT JOIN bonus_risorse b ON b.task_id = t.id AND b.risorsa_id = $1
        WHERE t.utente_assegnato = $1 AND t.attivo = true
        GROUP BY t.attivita_id
      ),
      -- CTE per calcolare i totali dei bonus per area
      bonus_area AS (
        SELECT 
          att.area_id,
          SUM(CASE WHEN b.stato = 'pending' THEN b.importo_bonus ELSE 0 END) as bonus_pending,
          SUM(CASE WHEN b.stato = 'approvato' THEN b.importo_bonus ELSE 0 END) as bonus_approvato,
          SUM(b.importo_bonus) as bonus_totale
        FROM attivita att
        JOIN task t ON t.attivita_id = att.id
        LEFT JOIN bonus_risorse b ON b.task_id = t.id AND b.risorsa_id = $1
        WHERE t.utente_assegnato = $1 AND att.attivo = true AND t.attivo = true
        GROUP BY att.area_id
      ),
      -- CTE per calcolare i totali dei bonus per progetto
      bonus_progetto AS (
        SELECT 
          COALESCE(att.area_id, p.id) as progetto_ref,
          p.id as progetto_id,
          SUM(CASE WHEN b.stato = 'pending' THEN b.importo_bonus ELSE 0 END) as bonus_pending,
          SUM(CASE WHEN b.stato = 'approvato' THEN b.importo_bonus ELSE 0 END) as bonus_approvato,
          SUM(b.importo_bonus) as bonus_totale
        FROM progetti p
        LEFT JOIN aree ar ON ar.progetto_id = p.id
        LEFT JOIN attivita att ON att.area_id = ar.id
        JOIN task t ON t.attivita_id = att.id
        LEFT JOIN bonus_risorse b ON b.task_id = t.id AND b.risorsa_id = $1
        WHERE t.utente_assegnato = $1 AND p.attivo = true AND t.attivo = true
        GROUP BY p.id, att.area_id
      ),
      -- CTE per calcolare i totali dei bonus per cliente
      bonus_cliente AS (
        SELECT 
          c.id as cliente_id,
          SUM(CASE WHEN b.stato = 'pending' THEN b.importo_bonus ELSE 0 END) as bonus_pending,
          SUM(CASE WHEN b.stato = 'approvato' THEN b.importo_bonus ELSE 0 END) as bonus_approvato,
          SUM(b.importo_bonus) as bonus_totale
        FROM clienti c
        JOIN progetti p ON p.cliente_id = c.id
        LEFT JOIN aree ar ON ar.progetto_id = p.id
        LEFT JOIN attivita att ON att.area_id = ar.id
        JOIN task t ON t.attivita_id = att.id
        LEFT JOIN bonus_risorse b ON b.task_id = t.id AND b.risorsa_id = $1
        WHERE t.utente_assegnato = $1 AND c.attivo = true AND p.attivo = true AND t.attivo = true
        GROUP BY c.id
      )
      SELECT 
        ri.risorsa_id,
        ri.risorsa_nome,
        ri.email,
        
        -- Cliente con totali aggregati
        c.id as cliente_id,
        c.nome as cliente_nome,
        c.budget as cliente_budget,
        c.budget_utilizzato as cliente_budget_utilizzato,
        acr.costo_orario_base,
        acr.costo_orario_finale,
        acr.ore_assegnate as ore_assegnate_cliente,
        acr.budget_risorsa as budget_cliente,
        COALESCE(bc.bonus_pending, 0) as cliente_bonus_pending,
        COALESCE(bc.bonus_approvato, 0) as cliente_bonus_approvato,
        COALESCE(bc.bonus_totale, 0) as cliente_bonus_totale,
        
        -- Progetto con totali aggregati
        p.id as progetto_id,
        p.nome as progetto_nome,
        p.budget_assegnato as progetto_budget_assegnato,
        p.budget_utilizzato as progetto_budget_utilizzato,
        ap.ore_assegnate as ore_assegnate_progetto,
        ap.budget_risorsa as budget_progetto,
        COALESCE(bp.bonus_pending, 0) as progetto_bonus_pending,
        COALESCE(bp.bonus_approvato, 0) as progetto_bonus_approvato,
        COALESCE(bp.bonus_totale, 0) as progetto_bonus_totale,
        
        -- Area con totali aggregati
        a.id as area_id,
        a.nome as area_nome,
        a.ore_stimate as area_ore_stimate,
        a.ore_effettive as area_ore_effettive,
        a.budget_stimato as area_budget_stimato,
        a.budget_assegnato as area_budget_assegnato,
        a.budget_utilizzato as area_budget_utilizzato,
        aa.ore_assegnate as ore_assegnate_area,
        aa.budget_risorsa as budget_area,
        COALESCE(ba.bonus_pending, 0) as area_bonus_pending,
        COALESCE(ba.bonus_approvato, 0) as area_bonus_approvato,
        COALESCE(ba.bonus_totale, 0) as area_bonus_totale,
        
        -- Attività con totali aggregati
        att.id as attivita_id,
        att.nome as attivita_nome,
        att.ore_stimate as attivita_ore_stimate,
        att.ore_effettive as attivita_ore_effettive,
        att.budget_assegnato as attivita_budget_assegnato,
        att.budget_utilizzato as attivita_budget_utilizzato,
        COALESCE(batt.bonus_pending, 0) as attivita_bonus_pending,
        COALESCE(batt.bonus_approvato, 0) as attivita_bonus_approvato,
        COALESCE(batt.bonus_totale, 0) as attivita_bonus_totale,
        
        -- Task
        t.id as task_id,
        t.nome as task_nome,
        t.stato as task_stato,
        t.ore_stimate as task_ore_stimate,
        t.ore_effettive as task_ore_effettive,
        t.scadenza as task_scadenza,
        t.data_completamento,
        
        -- Bonus (se esiste)
        b.id as bonus_id,
        b.tipo as bonus_tipo,
        b.differenza_ore,
        b.importo_bonus,
        b.percentuale_bonus,
        b.costo_orario_finale as bonus_costo_orario_finale,
        b.stato as bonus_stato,
        b.stato_gestione,
        b.azione_negativo,
        b.manager_id,
        b.data_approvazione,
        b.commento_manager,
        b.data_creazione as bonus_data_creazione
        
      FROM risorsa_info ri
      
      -- Join con assegnazione cliente
      LEFT JOIN assegnazione_cliente_risorsa acr ON acr.risorsa_id = ri.risorsa_id
      LEFT JOIN clienti c ON c.id = acr.cliente_id AND c.attivo = true
      LEFT JOIN bonus_cliente bc ON bc.cliente_id = c.id
      
      -- Join con progetti
      LEFT JOIN assegnazioni_progetto ap ON ap.utente_id = ri.risorsa_id AND ap.attivo = true
      LEFT JOIN progetti p ON p.id = ap.progetto_id AND p.cliente_id = c.id AND p.attivo = true
      LEFT JOIN bonus_progetto bp ON bp.progetto_id = p.id
      
      -- Join con aree
      LEFT JOIN assegnazioni_area aa ON aa.utente_id = ri.risorsa_id
      LEFT JOIN aree a ON a.id = aa.area_id AND a.progetto_id = p.id AND a.attivo = true
      LEFT JOIN bonus_area ba ON ba.area_id = a.id
      
      -- Join con attività
      LEFT JOIN assegnazioni_attivita aat ON aat.utente_id = ri.risorsa_id AND aat.attivo = true
      LEFT JOIN attivita att ON att.id = aat.attivita_id AND att.area_id = a.id AND att.attivo = true
      LEFT JOIN bonus_attivita batt ON batt.attivita_id = att.id
      
      -- Join con task
      LEFT JOIN task t ON t.utente_assegnato = ri.risorsa_id AND t.attivita_id = att.id AND t.attivo = true
      
      -- Join con bonus
      LEFT JOIN bonus_risorse b ON b.task_id = t.id AND b.risorsa_id = ri.risorsa_id
      
      ORDER BY 
        c.nome, 
        p.nome, 
        a.nome, 
        att.nome, 
        t.scadenza NULLS LAST
    `, [risorsaId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Risorsa non trovata o senza assegnazioni'
      });
    }
    
    // Struttura i dati in gerarchia (usa la stessa funzione buildResourceHierarchy ma con campi aggiuntivi)
    const hierarchyData = buildResourceHierarchyWithTotals(result.rows);
    
    
    console.log(`✅ Dettaglio risorsa con totali recuperato: ${result.rows.length} record`);
    
    res.json({
      risorsa: {
        id: result.rows[0].risorsa_id,
        nome: result.rows[0].risorsa_nome,
        email: result.rows[0].email
      },
      hierarchy: hierarchyData
    });
    
  } catch (error) {
    console.error('❌ Errore recupero dettaglio risorsa:', error);
    res.status(500).json({
      error: 'Errore nel recupero del dettaglio risorsa',
      details: error.message
    });
  }
});

// =====================================================
// FUNZIONE HELPER AGGIORNATA: Costruisce gerarchia con totali
// =====================================================
function buildResourceHierarchyWithTotals(rows) {
  const clienti = new Map();
  
  rows.forEach(row => {
    // Salta righe senza cliente
    if (!row.cliente_id) return;
    
    // Cliente
    if (!clienti.has(row.cliente_id)) {
      clienti.set(row.cliente_id, {
        id: row.cliente_id,
        nome: row.cliente_nome,
        budget: parseFloat(row.cliente_budget) || 0,
        budget_utilizzato: parseFloat(row.cliente_budget_utilizzato) || 0,
        costo_orario_base: parseFloat(row.costo_orario_base) || 0,
        costo_orario_finale: parseFloat(row.costo_orario_finale) || 0,
        ore_assegnate: parseFloat(row.ore_assegnate_cliente) || 0,
        budget_risorsa: parseFloat(row.budget_cliente) || 0,
        // TOTALI AGGREGATI
        bonus_pending: parseFloat(row.cliente_bonus_pending) || 0,
        bonus_approvato: parseFloat(row.cliente_bonus_approvato) || 0,
        bonus_totale: parseFloat(row.cliente_bonus_totale) || 0,
        progetti: new Map()
      });
    }
    
    const cliente = clienti.get(row.cliente_id);
    
    // Progetto
    if (row.progetto_id && !cliente.progetti.has(row.progetto_id)) {
      cliente.progetti.set(row.progetto_id, {
        id: row.progetto_id,
        nome: row.progetto_nome,
        budget_assegnato: parseFloat(row.progetto_budget_assegnato) || 0,
        budget_utilizzato: parseFloat(row.progetto_budget_utilizzato) || 0,
        ore_assegnate: parseFloat(row.ore_assegnate_progetto) || 0,
        budget_risorsa: parseFloat(row.budget_progetto) || 0,
        // TOTALI AGGREGATI
        bonus_pending: parseFloat(row.progetto_bonus_pending) || 0,
        bonus_approvato: parseFloat(row.progetto_bonus_approvato) || 0,
        bonus_totale: parseFloat(row.progetto_bonus_totale) || 0,
        aree: new Map()
      });
    }
    
    if (row.progetto_id) {
      const progetto = cliente.progetti.get(row.progetto_id);
      
      // Area
      if (row.area_id && !progetto.aree.has(row.area_id)) {
        progetto.aree.set(row.area_id, {
          id: row.area_id,
          nome: row.area_nome,
          ore_stimate: parseInt(row.area_ore_stimate) || 0,
          ore_effettive: parseInt(row.area_ore_effettive) || 0,
          budget_stimato: parseFloat(row.area_budget_stimato) || 0,
          budget_assegnato: parseFloat(row.area_budget_assegnato) || 0,
          budget_utilizzato: parseFloat(row.area_budget_utilizzato) || 0,
          ore_assegnate: parseFloat(row.ore_assegnate_area) || 0,
          budget_risorsa: parseFloat(row.budget_area) || 0,
          // TOTALI AGGREGATI
          bonus_pending: parseFloat(row.area_bonus_pending) || 0,
          bonus_approvato: parseFloat(row.area_bonus_approvato) || 0,
          bonus_totale: parseFloat(row.area_bonus_totale) || 0,
          attivita: new Map()
        });
      }
      
      if (row.area_id) {
        const area = progetto.aree.get(row.area_id);
        
        // Attività
        if (row.attivita_id && !area.attivita.has(row.attivita_id)) {
          area.attivita.set(row.attivita_id, {
            id: row.attivita_id,
            nome: row.attivita_nome,
            ore_stimate: parseInt(row.attivita_ore_stimate) || 0,
            ore_effettive: parseInt(row.attivita_ore_effettive) || 0,
            budget_assegnato: parseFloat(row.attivita_budget_assegnato) || 0,
            budget_utilizzato: parseFloat(row.attivita_budget_utilizzato) || 0,
            // TOTALI AGGREGATI
            bonus_pending: parseFloat(row.attivita_bonus_pending) || 0,
            bonus_approvato: parseFloat(row.attivita_bonus_approvato) || 0,
            bonus_totale: parseFloat(row.attivita_bonus_totale) || 0,
            tasks: []
          });
        }
        
        if (row.attivita_id && row.task_id) {
          const attivita = area.attivita.get(row.attivita_id);
          
          // Task
          attivita.tasks.push({
            id: row.task_id,
            nome: row.task_nome,
            stato: row.task_stato,
            ore_stimate: parseInt(row.task_ore_stimate) || 0,
            ore_effettive: parseInt(row.task_ore_effettive) || 0,
            scadenza: row.task_scadenza,
            data_completamento: row.data_completamento,
            bonus: row.bonus_id ? {
              id: row.bonus_id,
              tipo: row.bonus_tipo,
              differenza_ore: parseInt(row.differenza_ore) || 0,
              importo_bonus: parseFloat(row.importo_bonus) || 0,
              percentuale_bonus: parseFloat(row.percentuale_bonus) || 0,
              costo_orario_finale: parseFloat(row.bonus_costo_orario_finale) || 0,
              stato: row.bonus_stato,
              stato_gestione: row.stato_gestione,
              azione_negativo: row.azione_negativo,
              risorsa_id: row.risorsa_id,
              data_creazione: row.bonus_data_creazione,
              data_approvazione: row.data_approvazione,
              commento_manager: row.commento_manager
            } : null
          });
        }
      }
    }
  });
  
  // Converti Map in Array
  return Array.from(clienti.values()).map(cliente => ({
    ...cliente,
    progetti: Array.from(cliente.progetti.values()).map(progetto => ({
      ...progetto,
      aree: Array.from(progetto.aree.values()).map(area => ({
        ...area,
        attivita: Array.from(area.attivita.values())
      }))
    }))
  }));
}



// =====================================================
// GESTIONE BONUS/PENALITÀ - Nuovi Endpoint
// =====================================================

// PUT /api/bonus/:id/paga - Marca bonus come pagato (APPROVA + PAGA)
router.put('/:id/paga', authenticateToken, requireManager, param('id').isUUID(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { note } = req.body;

    const bonusCheck = await query('SELECT * FROM bonus_risorse WHERE id = $1', [id]);
    if (bonusCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Bonus non trovato' });
    }

    if (!['pending', 'approvato'].includes(bonusCheck.rows[0].stato)) {
      return res.status(400).json({ error: 'Bonus già gestito o rifiutato' });
    }

    if (bonusCheck.rows[0].tipo === 'negativo') {
      return res.status(400).json({ error: 'Le penalità non possono essere pagate' });
    }

    if (bonusCheck.rows[0].stato === 'approvato' && bonusCheck.rows[0].stato_gestione !== 'non_gestito') {
      return res.status(400).json({ error: 'Bonus già gestito precedentemente' });
    }

    const result = await query(`
      UPDATE bonus_risorse 
      SET 
        stato = 'approvato',
        stato_gestione = 'pagato',
        data_gestione = CURRENT_TIMESTAMP,
        data_approvazione = CURRENT_TIMESTAMP,
        gestito_da = $1,
        manager_id = $1,
        note_gestione = $2
      WHERE id = $3
      RETURNING *
    `, [req.user.id, note || 'Bonus pagato', id]);

    await query(`
      INSERT INTO log_redistribuzione_ore (
        manager_id, tipo_azione, importo_bonus, commento, dettagli_json
      )
      VALUES ($1, 'bonus_pagato', $2, $3, $4)
    `, [
      req.user.id,
      bonusCheck.rows[0].importo_bonus,
      note || 'Bonus approvato e pagato',
      JSON.stringify({ bonus_id: id, risorsa_id: bonusCheck.rows[0].risorsa_id })
    ]);

    console.log(`✅ Bonus ${id} approvato e pagato`);
    res.json({ 
      message: 'Bonus approvato e pagato',
      bonus: result.rows[0]
    });

  } catch (error) {
    console.error('Paga bonus error:', error);
    res.status(500).json({ error: 'Errore nel pagamento del bonus', details: error.message });
  }
});

// =====================================================
// FIX ENDPOINT: PUT /api/bonus/:id/converti-ore
// Questo codice SOSTITUISCE l'endpoint esistente in server/routes/bonus.js
// =====================================================

// PUT /api/bonus/:id/converti-ore - Converte penalità in ore per cliente (APPROVA + CONVERTI)
router.put('/:id/converti-ore', authenticateToken, requireManager, param('id').isUUID(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { cliente_id, note } = req.body; // ← NUOVO: serve cliente_id!

    // Validazione cliente_id
    if (!cliente_id) {
      return res.status(400).json({ error: 'Cliente destinazione obbligatorio' });
    }

    // Recupera bonus
    const bonusCheck = await query('SELECT * FROM bonus_risorse WHERE id = $1', [id]);
    if (bonusCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Bonus non trovato' });
    }

    const bonus = bonusCheck.rows[0];

    // Validazioni stato
    if (!['pending', 'approvato'].includes(bonus.stato)) {
      return res.status(400).json({ error: 'Penalità già gestita o rifiutata' });
    }

    if (bonus.tipo !== 'negativo') {
      return res.status(400).json({ error: 'Solo le penalità possono essere convertite in ore' });
    }

    if (bonus.stato === 'approvato' && bonus.stato_gestione !== 'non_gestito') {
      return res.status(400).json({ error: 'Penalità già gestita precedentemente' });
    }

    // =====================================================
    // STEP 1: Verifica che la risorsa sia assegnata al cliente
    // =====================================================
    const assegnazioneCheck = await query(`
      SELECT * FROM assegnazione_cliente_risorsa
      WHERE cliente_id = $1 AND risorsa_id = $2
    `, [cliente_id, bonus.risorsa_id]);

    if (assegnazioneCheck.rows.length === 0) {
      return res.status(400).json({ 
        error: 'Risorsa non assegnata al cliente selezionato' 
      });
    }

    const assegnazione = assegnazioneCheck.rows[0];

    // =====================================================
    // STEP 2: Calcola ore da spostare (minuti → ore)
    // =====================================================
    const minutiDaSpostare = Math.abs(bonus.differenza_ore);
    const oreInOre = minutiDaSpostare / 60.0;

    console.log(`🔄 Conversione ore:`, {
      bonus_id: id,
      minuti: minutiDaSpostare,
      ore: oreInOre,
      risorsa: bonus.risorsa_id,
      cliente_destinazione: cliente_id
    });

    // =====================================================
    // STEP 3: Aggiorna assegnazione_cliente_risorsa
    // =====================================================
    const nuoveOreAssegnate = parseFloat(assegnazione.ore_assegnate) + oreInOre;
    const nuovoBudget = nuoveOreAssegnate * parseFloat(assegnazione.costo_orario_finale);

    await query(`
      UPDATE assegnazione_cliente_risorsa
      SET 
        ore_assegnate = $1,
        budget_risorsa = $2,
        data_aggiornamento = CURRENT_TIMESTAMP
      WHERE cliente_id = $3 AND risorsa_id = $4
    `, [
      nuoveOreAssegnate.toFixed(2),
      nuovoBudget.toFixed(2),
      cliente_id,
      bonus.risorsa_id
    ]);

    console.log(`✅ Assegnazione aggiornata:`, {
      ore_prima: assegnazione.ore_assegnate,
      ore_dopo: nuoveOreAssegnate.toFixed(2),
      budget_prima: assegnazione.budget_risorsa,
      budget_dopo: nuovoBudget.toFixed(2)
    });

    // =====================================================
    // STEP 4: Marca bonus come gestito
    // =====================================================
    const result = await query(`
      UPDATE bonus_risorse 
      SET 
        stato = 'approvato',
        stato_gestione = 'convertito_ore',
        data_gestione = CURRENT_TIMESTAMP,
        data_approvazione = CURRENT_TIMESTAMP,
        gestito_da = $1,
        manager_id = $1,
        note_gestione = $2
      WHERE id = $3
      RETURNING *
    `, [
      req.user.id, 
      note || `Penalità convertita in ${oreInOre.toFixed(2)}h per cliente`,
      id
    ]);

    // =====================================================
    // STEP 5: Log redistribuzione
    // =====================================================
    await query(`
      INSERT INTO log_redistribuzione_ore (
        manager_id, 
        tipo_azione, 
        da_risorsa_id,
        a_risorsa_id,
        ore_spostate, 
        commento, 
        dettagli_json
      )
      VALUES ($1, 'conversione_penalita_ore', $2, $2, $3, $4, $5)
    `, [
      req.user.id,
      bonus.risorsa_id, // stessa risorsa (da e a)
      oreInOre,
      note || `Penalità convertita in ${oreInOre.toFixed(2)}h per cliente`,
      JSON.stringify({ 
        bonus_id: id, 
        risorsa_id: bonus.risorsa_id,
        cliente_destinazione: cliente_id,
        minuti_spostati: minutiDaSpostare,
        ore_aggiunte: oreInOre,
        nuovo_totale_ore: nuoveOreAssegnate
      })
    ]);

    console.log(`✅ Penalità ${id} convertita in ${oreInOre.toFixed(2)}h per cliente ${cliente_id}`);

    res.json({ 
      message: `Penalità convertita in ${oreInOre.toFixed(2)}h disponibili per il cliente`,
      bonus: result.rows[0],
      ore_aggiunte: oreInOre,
      cliente_id: cliente_id,
      nuove_ore_totali: nuoveOreAssegnate
    });

  } catch (error) {
    console.error('Converti ore error:', error);
    res.status(500).json({ 
      error: 'Errore nella conversione in ore', 
      details: error.message 
    });
  }
});

// POST /api/bonus/:id/crea-task-recupero - Crea task di recupero (APPROVA + CREA TASK)
router.post('/:id/crea-task-recupero', authenticateToken, requireManager, param('id').isUUID(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { taskData } = req.body;

    if (!taskData) {
      return res.status(400).json({ error: 'Dati task obbligatori' });
    }

    const { nome, attivita_id, scadenza } = taskData;
    if (!nome || !attivita_id || !scadenza) {
      return res.status(400).json({ error: 'Nome, attività e scadenza sono obbligatori' });
    }

    const bonusCheck = await query('SELECT * FROM bonus_risorse WHERE id = $1', [id]);
    if (bonusCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Bonus non trovato' });
    }

    if (!['pending', 'approvato'].includes(bonusCheck.rows[0].stato)) {
      return res.status(400).json({ error: 'Penalità già gestita o rifiutata' });
    }

    if (bonusCheck.rows[0].tipo !== 'negativo') {
      return res.status(400).json({ error: 'Solo le penalità possono generare task di recupero' });
    }

    if (bonusCheck.rows[0].stato === 'approvato' && bonusCheck.rows[0].stato_gestione !== 'non_gestito') {
      return res.status(400).json({ error: 'Penalità già gestita precedentemente' });
    }

    const oreStimate = Math.abs(bonusCheck.rows[0].differenza_ore);

    const taskResult = await query(`
      INSERT INTO task (
        nome,
        descrizione,
        attivita_id,
        utente_assegnato,
        ore_stimate,
        scadenza,
        stato,
        creata_da
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'programmata', $7)
      RETURNING *
    `, [
      nome,
      taskData.descrizione || `Task di recupero da penalità (${oreStimate/60}h)`,
      attivita_id,
      bonusCheck.rows[0].risorsa_id,
      oreStimate,
      scadenza,
      req.user.id
    ]);

    const newTaskId = taskResult.rows[0].id;

    const bonusResult = await query(`
      UPDATE bonus_risorse 
      SET 
        stato = 'approvato',
        stato_gestione = 'task_creata',
        data_gestione = CURRENT_TIMESTAMP,
        data_approvazione = CURRENT_TIMESTAMP,
        gestito_da = $1,
        manager_id = $1,
        task_recupero_id = $2,
        note_gestione = $3
      WHERE id = $4
      RETURNING *
    `, [
      req.user.id, 
      newTaskId,
      `Task di recupero creata: ${nome}`,
      id
    ]);

    await query(`
  INSERT INTO log_redistribuzione_ore (
    manager_id, tipo_azione, ore_spostate, commento, dettagli_json
  )
  VALUES ($1, 'creazione_task', $2, $3, $4)
`, [
  req.user.id,
  oreStimate,
  `Task di recupero approvata e creata per penalità`,
  JSON.stringify({ 
    bonus_id: id, 
    risorsa_id: bonusCheck.rows[0].risorsa_id,
    task_recupero_id: newTaskId,
    ore_stimate_minuti: oreStimate
  })
]);

    console.log(`✅ Task di recupero ${newTaskId} creata per penalità ${id}`);
    res.status(201).json({ 
      message: 'Task di recupero approvata e creata con successo',
      bonus: bonusResult.rows[0],
      task: taskResult.rows[0]
    });

  } catch (error) {
    console.error('Crea task recupero error:', error);
    res.status(500).json({ error: 'Errore nella creazione della task di recupero', details: error.message });
  }
});



module.exports = router;