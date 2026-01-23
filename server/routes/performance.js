// ============================================================================
// PERFORMANCE TASK ROUTES - Vista Gerarchica con Filtri
// File: server/routes/performance.js
// ============================================================================

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken, requireManager } = require('../middleware/auth');

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Costruisce la clausola WHERE per i filtri comuni
 */
function buildFilterClause(filters, params) {
  let whereConditions = [];
  
  // Filtro Periodo (scadenza O completamento)
  if (filters.periodo_inizio && filters.periodo_fine) {
    whereConditions.push(`(
      (scadenza >= $${params.length + 1} AND scadenza <= $${params.length + 2})
      OR 
      (data_completamento >= $${params.length + 1} AND data_completamento <= $${params.length + 2})
    )`);
    params.push(filters.periodo_inizio, filters.periodo_fine);
  } else if (filters.periodo_inizio) {
    whereConditions.push(`(scadenza >= $${params.length + 1} OR data_completamento >= $${params.length + 1})`);
    params.push(filters.periodo_inizio);
  } else if (filters.periodo_fine) {
    whereConditions.push(`(scadenza <= $${params.length + 1} OR data_completamento <= $${params.length + 1})`);
    params.push(filters.periodo_fine);
  }
  
  // Filtro Utente
  if (filters.utente_id) {
    whereConditions.push(`utente_assegnato = $${params.length + 1}`);
    params.push(filters.utente_id);
  }
  
  return whereConditions.length > 0 ? ' AND ' + whereConditions.join(' AND ') : '';
}

/**
 * Calcola i ritardi per un livello
 */
function countRitardi(rows, scadenzaField = 'scadenza', statoField = 'stato') {
  const now = new Date();
  return rows.filter(row => {
    const scadenza = new Date(row[scadenzaField]);
    const stato = row[statoField];
    return scadenza < now && stato !== 'completata';
  }).length;
}

// ============================================================================
// GET /api/performance/clienti - Lista Clienti con Dati Aggregati
// ============================================================================
router.get('/clienti', authenticateToken, requireManager, async (req, res) => {
  try {
    const { periodo_inizio, periodo_fine, utente_id, stato_attivita, stato_task } = req.query;
    
    console.log('[PERFORMANCE] Fetching clienti with filters:', { 
      periodo_inizio, periodo_fine, utente_id, stato_attivita, stato_task 
    });

    // Query per ottenere clienti con ore aggregate
    let clientiQuery = `
      WITH task_filtered AS (
        SELECT 
          t.id as task_id,
          t.attivita_id,
          t.ore_effettive,
          t.utente_assegnato,
          t.stato as task_stato,
          t.scadenza as task_scadenza,
          t.data_completamento
        FROM task t
        WHERE t.attivo = true
    `;
    
    let params = [];
    
    // Applica filtri sulle task SOLO se i valori esistono
    if (stato_task && stato_task !== '') {
      clientiQuery += ` AND t.stato = $${params.length + 1}`;
      params.push(stato_task);
    }
    
    if (periodo_inizio && periodo_inizio !== '' && periodo_fine && periodo_fine !== '') {
      clientiQuery += ` AND (
        (t.scadenza >= $${params.length + 1} AND t.scadenza <= $${params.length + 2})
        OR 
        (t.data_completamento >= $${params.length + 1} AND t.data_completamento <= $${params.length + 2})
      )`;
      params.push(periodo_inizio, periodo_fine);
    }
    
    if (utente_id && utente_id !== '') {
      clientiQuery += ` AND t.utente_assegnato = $${params.length + 1}`;
      params.push(utente_id);
    }
    
    clientiQuery += `
      ),
      progetti_ore AS (
        SELECT 
          p.id as progetto_id,
          p.cliente_id,
          p.budget_assegnato as progetto_ore_assegnate,
          p.scadenza as progetto_scadenza,
          p.stato_approvazione,
          COALESCE(SUM(tf.ore_effettive), 0) as progetto_ore_effettive,
          COUNT(DISTINCT CASE WHEN tf.task_stato != 'completata' 
            AND tf.task_scadenza < NOW() THEN tf.task_id END) as task_in_ritardo
        FROM progetti p
        LEFT JOIN attivita att ON p.id = att.progetto_id
        LEFT JOIN task_filtered tf ON att.id = tf.attivita_id
        WHERE p.attivo = true
    `;
    
    if (stato_attivita && stato_attivita !== '') {
      clientiQuery += ` AND att.stato = $${params.length + 1}`;
      params.push(stato_attivita);
    }
    
    clientiQuery += `
        GROUP BY p.id, p.cliente_id, p.budget_assegnato, p.scadenza, p.stato_approvazione
      )
      SELECT 
        c.id,
        c.nome,
        c.descrizione,
        c.budget as budget_totale,
        COALESCE(SUM(po.progetto_ore_assegnate), 0) as ore_assegnate_progetti,
        COALESCE(SUM(po.progetto_ore_effettive), 0) as ore_effettive,
        c.budget - COALESCE(SUM(po.progetto_ore_assegnate), 0) as ore_disponibili,
        COUNT(DISTINCT po.progetto_id) as numero_progetti,
        COUNT(DISTINCT CASE WHEN po.progetto_scadenza < NOW() 
          AND po.stato_approvazione != 'approvata' THEN po.progetto_id END) as progetti_in_ritardo,
        SUM(po.task_in_ritardo) as task_in_ritardo_totali
      FROM clienti c
      LEFT JOIN progetti_ore po ON c.id = po.cliente_id
      WHERE c.attivo = true
      GROUP BY c.id, c.nome, c.descrizione, c.budget
      ORDER BY c.nome
    `;
    
    const result = await query(clientiQuery, params);
    
    // Calcola delta per ogni cliente
    const clienti = result.rows.map(cliente => ({
      ...cliente,
      delta_budget: parseFloat(cliente.budget_totale || 0) - parseFloat(cliente.ore_effettive || 0),
      delta_efficienza: parseFloat(cliente.ore_assegnate_progetti || 0) - parseFloat(cliente.ore_effettive || 0),
      ore_effettive: parseFloat(cliente.ore_effettive || 0),
      ore_assegnate_progetti: parseFloat(cliente.ore_assegnate_progetti || 0),
      ore_disponibili: parseFloat(cliente.ore_disponibili || 0),
      progetti_in_ritardo: parseInt(cliente.progetti_in_ritardo || 0),
      task_in_ritardo_totali: parseInt(cliente.task_in_ritardo_totali || 0)
    }));

    console.log(`[PERFORMANCE] Found ${clienti.length} clienti`);

    res.json({
      success: true,
      clienti,
      total: clienti.length,
      filters_applied: { periodo_inizio, periodo_fine, utente_id, stato_attivita, stato_task }
    });

  } catch (error) {
    console.error('[PERFORMANCE] Error fetching clienti:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server Error', 
      details: error.message 
    });
  }
});

// ============================================================================
// GET /api/performance/progetti/:clienteId - Progetti di un Cliente
// ============================================================================
router.get('/progetti/:clienteId', authenticateToken, requireManager, async (req, res) => {
  try {
    const { clienteId } = req.params;
    const { periodo_inizio, periodo_fine, utente_id, stato_attivita, stato_task } = req.query;
    
    console.log('[PERFORMANCE] Fetching progetti for cliente:', clienteId);

    let progettiQuery = `
      WITH task_filtered AS (
        SELECT 
          t.id as task_id,
          t.attivita_id,
          t.ore_effettive,
          t.stato as task_stato,
          t.scadenza as task_scadenza,
          t.data_completamento
        FROM task t
        WHERE t.attivo = true
    `;
    
    let params = [clienteId];
    
    if (stato_task && stato_task !== '') {
      progettiQuery += ` AND t.stato = $${params.length + 1}`;
      params.push(stato_task);
    }
    
    if (periodo_inizio && periodo_inizio !== '' && periodo_fine && periodo_fine !== '') {
      progettiQuery += ` AND (
        (t.scadenza >= $${params.length + 1} AND t.scadenza <= $${params.length + 2})
        OR 
        (t.data_completamento >= $${params.length + 1} AND t.data_completamento <= $${params.length + 2})
      )`;
      params.push(periodo_inizio, periodo_fine);
    }
    
    if (utente_id && utente_id !== '') {
      progettiQuery += ` AND t.utente_assegnato = $${params.length + 1}`;
      params.push(utente_id);
    }
    
    progettiQuery += `
      ),
      aree_ore AS (
        SELECT 
          a.id as area_id,
          a.progetto_id,
          a.ore_stimate as area_ore_assegnate,
          a.scadenza as area_scadenza,
          a.stato as area_stato,
          COALESCE(SUM(tf.ore_effettive), 0) as area_ore_effettive,
          COUNT(DISTINCT CASE WHEN tf.task_stato != 'completata' 
            AND tf.task_scadenza < NOW() THEN tf.task_id END) as task_in_ritardo
        FROM aree a
        LEFT JOIN attivita att ON a.id = att.area_id
        LEFT JOIN task_filtered tf ON att.id = tf.attivita_id
        WHERE a.attivo = true
    `;
    
    if (stato_attivita && stato_attivita !== '') {
      progettiQuery += ` AND att.stato = $${params.length + 1}`;
      params.push(stato_attivita);
    }
    
    progettiQuery += `
        GROUP BY a.id, a.progetto_id, a.ore_stimate, a.scadenza, a.stato
      )
      SELECT 
        p.id,
        p.nome,
        p.descrizione,
        p.cliente_id,
        p.budget_assegnato as ore_assegnate,
        p.scadenza,
        p.stato_approvazione,
        COALESCE(SUM(ao.area_ore_assegnate), 0) as ore_assegnate_aree,
        COALESCE(SUM(ao.area_ore_effettive), 0) as ore_effettive,
        COUNT(DISTINCT ao.area_id) as numero_aree,
        COUNT(DISTINCT CASE WHEN ao.area_scadenza < NOW() 
          AND ao.area_stato != 'completata' THEN ao.area_id END) as aree_in_ritardo,
        SUM(ao.task_in_ritardo) as task_in_ritardo_totali,
        c.nome as cliente_nome
      FROM progetti p
      JOIN clienti c ON p.cliente_id = c.id
      LEFT JOIN aree_ore ao ON p.id = ao.progetto_id
      WHERE p.cliente_id = $1 AND p.attivo = true
      GROUP BY p.id, p.nome, p.descrizione, p.cliente_id, p.budget_assegnato, 
               p.scadenza, p.stato_approvazione, c.nome
      ORDER BY p.nome
    `;
    
    const result = await query(progettiQuery, params);
    
    const progetti = result.rows.map(progetto => ({
      ...progetto,
      ore_assegnate: parseFloat(progetto.ore_assegnate || 0),
      ore_assegnate_aree: parseFloat(progetto.ore_assegnate_aree || 0),
      ore_effettive: parseFloat(progetto.ore_effettive || 0),
      delta: parseFloat(progetto.ore_assegnate || 0) - parseFloat(progetto.ore_effettive || 0),
      aree_in_ritardo: parseInt(progetto.aree_in_ritardo || 0),
      task_in_ritardo_totali: parseInt(progetto.task_in_ritardo_totali || 0)
    }));

    console.log(`[PERFORMANCE] Found ${progetti.length} progetti`);

    res.json({
      success: true,
      progetti,
      total: progetti.length,
      cliente_id: clienteId,
      filters_applied: { periodo_inizio, periodo_fine, utente_id, stato_attivita, stato_task }
    });

  } catch (error) {
    console.error('[PERFORMANCE] Error fetching progetti:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server Error', 
      details: error.message 
    });
  }
});

// ============================================================================
// GET /api/performance/aree/:progettoId - Aree di un Progetto
// ============================================================================
router.get('/aree/:progettoId', authenticateToken, requireManager, async (req, res) => {
  try {
    const { progettoId } = req.params;
    const { periodo_inizio, periodo_fine, utente_id, stato_attivita, stato_task } = req.query;
    
    console.log('[PERFORMANCE] Fetching aree for progetto:', progettoId);

    let areeQuery = `
      WITH task_filtered AS (
        SELECT 
          t.id as task_id,
          t.attivita_id,
          t.ore_effettive,
          t.stato as task_stato,
          t.scadenza as task_scadenza,
          t.data_completamento
        FROM task t
        WHERE t.attivo = true
    `;
    
    let params = [progettoId];
    
    if (stato_task && stato_task !== '') {
      areeQuery += ` AND t.stato = $${params.length + 1}`;
      params.push(stato_task);
    }
    
    if (periodo_inizio && periodo_inizio !== '' && periodo_fine && periodo_fine !== '') {
      areeQuery += ` AND (
        (t.scadenza >= $${params.length + 1} AND t.scadenza <= $${params.length + 2})
        OR 
        (t.data_completamento >= $${params.length + 1} AND t.data_completamento <= $${params.length + 2})
      )`;
      params.push(periodo_inizio, periodo_fine);
    }
    
    if (utente_id && utente_id !== '') {
      areeQuery += ` AND t.utente_assegnato = $${params.length + 1}`;
      params.push(utente_id);
    }
    
    areeQuery += `
      ),
      attivita_ore AS (
        SELECT 
          att.id as attivita_id,
          att.area_id,
          att.ore_stimate as attivita_ore_assegnate,
          att.scadenza as attivita_scadenza,
          att.stato as attivita_stato,
          COALESCE(SUM(tf.ore_effettive), 0) as attivita_ore_effettive,
          COUNT(DISTINCT CASE WHEN tf.task_stato != 'completata' 
            AND tf.task_scadenza < NOW() THEN tf.task_id END) as task_in_ritardo
        FROM attivita att
        LEFT JOIN task_filtered tf ON att.id = tf.attivita_id
        WHERE att.attivo = true
    `;
    
    if (stato_attivita && stato_attivita !== '') {
      areeQuery += ` AND att.stato = $${params.length + 1}`;
      params.push(stato_attivita);
    }
    
    areeQuery += `
        GROUP BY att.id, att.area_id, att.ore_stimate, att.scadenza, att.stato
      )
      SELECT 
        a.id,
        a.nome,
        a.descrizione,
        a.progetto_id,
        a.coordinatore_id,
        a.ore_stimate as ore_assegnate,
        a.scadenza,
        a.stato,
        COALESCE(SUM(ato.attivita_ore_assegnate), 0) as ore_assegnate_attivita,
        COALESCE(SUM(ato.attivita_ore_effettive), 0) as ore_effettive,
        COUNT(DISTINCT ato.attivita_id) as numero_attivita,
        COUNT(DISTINCT CASE WHEN ato.attivita_scadenza < NOW() 
          AND ato.attivita_stato != 'completata' THEN ato.attivita_id END) as attivita_in_ritardo,
        SUM(ato.task_in_ritardo) as task_in_ritardo_totali,
        u.nome as coordinatore_nome,
        p.nome as progetto_nome,
        c.nome as cliente_nome
      FROM aree a
      JOIN progetti p ON a.progetto_id = p.id
      JOIN clienti c ON p.cliente_id = c.id
      LEFT JOIN utenti u ON a.coordinatore_id = u.id
      LEFT JOIN attivita_ore ato ON a.id = ato.area_id
      WHERE a.progetto_id = $1 AND a.attivo = true
      GROUP BY a.id, a.nome, a.descrizione, a.progetto_id, a.coordinatore_id, 
               a.ore_stimate, a.scadenza, a.stato, u.nome, p.nome, c.nome
      ORDER BY a.nome
    `;
    
    const result = await query(areeQuery, params);
    
    const aree = result.rows.map(area => ({
      ...area,
      ore_assegnate: parseFloat(area.ore_assegnate || 0),
      ore_assegnate_attivita: parseFloat(area.ore_assegnate_attivita || 0),
      ore_effettive: parseFloat(area.ore_effettive || 0),
      delta: parseFloat(area.ore_assegnate || 0) - parseFloat(area.ore_effettive || 0),
      attivita_in_ritardo: parseInt(area.attivita_in_ritardo || 0),
      task_in_ritardo_totali: parseInt(area.task_in_ritardo_totali || 0)
    }));

    console.log(`[PERFORMANCE] Found ${aree.length} aree`);

    res.json({
      success: true,
      aree,
      total: aree.length,
      progetto_id: progettoId,
      filters_applied: { periodo_inizio, periodo_fine, utente_id, stato_attivita, stato_task }
    });

  } catch (error) {
    console.error('[PERFORMANCE] Error fetching aree:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server Error', 
      details: error.message 
    });
  }
});

// ============================================================================
// GET /api/performance/attivita/:areaId - Attività di un'Area
// ============================================================================
router.get('/attivita/:areaId', authenticateToken, requireManager, async (req, res) => {
  try {
    const { areaId } = req.params;
    const { periodo_inizio, periodo_fine, utente_id, stato_attivita, stato_task } = req.query;
    
    console.log('[PERFORMANCE] Fetching attivita for area:', areaId);

    let attivitaQuery = `
      WITH task_data AS (
        SELECT 
          t.id as task_id,
          t.attivita_id,
          t.ore_stimate,
          t.ore_effettive,
          t.stato,
          t.scadenza,
          t.data_completamento,
          t.utente_assegnato
        FROM task t
        WHERE t.attivo = true
    `;
    
    let params = [areaId];
    
    if (stato_task && stato_task !== '') {
      attivitaQuery += ` AND t.stato = $${params.length + 1}`;
      params.push(stato_task);
    }
    
    if (periodo_inizio && periodo_inizio !== '' && periodo_fine && periodo_fine !== '') {
      attivitaQuery += ` AND (
        (t.scadenza >= $${params.length + 1} AND t.scadenza <= $${params.length + 2})
        OR 
        (t.data_completamento >= $${params.length + 1} AND t.data_completamento <= $${params.length + 2})
      )`;
      params.push(periodo_inizio, periodo_fine);
    }
    
    if (utente_id && utente_id !== '') {
      attivitaQuery += ` AND t.utente_assegnato = $${params.length + 1}`;
      params.push(utente_id);
    }
    
    attivitaQuery += `
      )
      SELECT 
        att.id,
        att.nome,
        att.descrizione,
        att.progetto_id,
        att.area_id,
        att.ore_stimate as ore_assegnate,
        att.ore_effettive,
        att.scadenza,
        att.stato,
        COUNT(td.task_id) as numero_task,
        COUNT(CASE WHEN td.stato = 'completata' THEN 1 END) as task_completate,
        COUNT(CASE WHEN td.stato != 'completata' AND td.scadenza < NOW() THEN 1 END) as task_in_ritardo,
        COALESCE(SUM(td.ore_stimate), 0) as task_ore_stimate_totali,
        COALESCE(SUM(td.ore_effettive), 0) as task_ore_effettive_totali,
        a.nome as area_nome,
        p.nome as progetto_nome,
        c.nome as cliente_nome,
        STRING_AGG(DISTINCT u.nome, ', ') as risorse_assegnate
      FROM attivita att
      JOIN aree a ON att.area_id = a.id
      JOIN progetti p ON att.progetto_id = p.id
      JOIN clienti c ON p.cliente_id = c.id
      LEFT JOIN task_data td ON att.id = td.attivita_id
      LEFT JOIN assegnazioni_attivita aa ON att.id = aa.attivita_id
      LEFT JOIN utenti u ON aa.utente_id = u.id
      WHERE att.area_id = $1 AND att.attivo = true
    `;
    
    if (stato_attivita && stato_attivita !== '') {
      attivitaQuery += ` AND att.stato = $${params.length + 1}`;
      params.push(stato_attivita);
    }
    
    attivitaQuery += `
      GROUP BY att.id, att.nome, att.descrizione, att.progetto_id, att.area_id,
               att.ore_stimate, att.ore_effettive, att.scadenza, att.stato,
               a.nome, p.nome, c.nome
      ORDER BY att.scadenza ASC, att.nome
    `;
    
    const result = await query(attivitaQuery, params);
    
    const attivita = result.rows.map(att => ({
      ...att,
      ore_assegnate: parseFloat(att.ore_assegnate || 0),
      ore_effettive: parseFloat(att.task_ore_effettive_totali || 0),
      delta: parseFloat(att.ore_assegnate || 0) - parseFloat(att.task_ore_effettive_totali || 0),
      task_in_ritardo: parseInt(att.task_in_ritardo || 0),
      numero_task: parseInt(att.numero_task || 0),
      task_completate: parseInt(att.task_completate || 0)
    }));

    console.log(`[PERFORMANCE] Found ${attivita.length} attivita`);

    res.json({
      success: true,
      attivita,
      total: attivita.length,
      area_id: areaId,
      filters_applied: { periodo_inizio, periodo_fine, utente_id, stato_attivita, stato_task }
    });

  } catch (error) {
    console.error('[PERFORMANCE] Error fetching attivita:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server Error', 
      details: error.message 
    });
  }
});

// ============================================================================
// GET /api/performance/tasks/:attivitaId - Task di un'Attività
// ============================================================================
router.get('/tasks/:attivitaId', authenticateToken, requireManager, async (req, res) => {
  try {
    const { attivitaId } = req.params;
    const { periodo_inizio, periodo_fine, utente_id, stato_task } = req.query;
    
    console.log('[PERFORMANCE] Fetching tasks for attivita:', attivitaId);

    let tasksQuery = `
      SELECT 
        t.id,
        t.nome,
        t.descrizione,
        t.attivita_id,
        t.utente_assegnato,
        t.ore_stimate,
        t.ore_effettive,
        t.stato,
        t.scadenza,
        t.data_completamento,
        t.data_creazione,
        u.nome as utente_nome,
        u.email as utente_email,
        att.nome as attivita_nome,
        a.nome as area_nome,
        p.nome as progetto_nome,
        c.nome as cliente_nome
      FROM task t
      JOIN utenti u ON t.utente_assegnato = u.id
      JOIN attivita att ON t.attivita_id = att.id
      LEFT JOIN aree a ON att.area_id = a.id
      JOIN progetti p ON att.progetto_id = p.id
      JOIN clienti c ON p.cliente_id = c.id
      WHERE t.attivita_id = $1 AND t.attivo = true
    `;
    
    let params = [attivitaId];
    
    if (stato_task && stato_task !== '') {
      tasksQuery += ` AND t.stato = $${params.length + 1}`;
      params.push(stato_task);
    }
    
    if (periodo_inizio && periodo_inizio !== '' && periodo_fine && periodo_fine !== '') {
      tasksQuery += ` AND (
        (t.scadenza >= $${params.length + 1} AND t.scadenza <= $${params.length + 2})
        OR 
        (t.data_completamento >= $${params.length + 1} AND t.data_completamento <= $${params.length + 2})
      )`;
      params.push(periodo_inizio, periodo_fine);
    }
    
    if (utente_id && utente_id !== '') {
      tasksQuery += ` AND t.utente_assegnato = $${params.length + 1}`;
      params.push(utente_id);
    }
    
    tasksQuery += ` ORDER BY t.scadenza ASC, t.nome`;
    
    const result = await query(tasksQuery, params);
    
    const now = new Date();
    const tasks = result.rows.map(task => {
      const scadenza = new Date(task.scadenza);
      const isInRitardo = scadenza < now && task.stato !== 'completata';
      const oreStimate = parseFloat(task.ore_stimate || 0);
      const oreEffettive = parseFloat(task.ore_effettive || 0);
      
      return {
        ...task,
        ore_stimate: oreStimate,
        ore_effettive: oreEffettive,
        delta: oreStimate - oreEffettive,
        is_in_ritardo: isInRitardo,
        giorni_ritardo: isInRitardo ? Math.floor((now - scadenza) / (1000 * 60 * 60 * 24)) : 0
      };
    });

    console.log(`[PERFORMANCE] Found ${tasks.length} tasks`);

    res.json({
      success: true,
      tasks,
      total: tasks.length,
      attivita_id: attivitaId,
      filters_applied: { periodo_inizio, periodo_fine, utente_id, stato_task }
    });

  } catch (error) {
    console.error('[PERFORMANCE] Error fetching tasks:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server Error', 
      details: error.message 
    });
  }
});

// ============================================================================
// EXPORT ROUTER
// ============================================================================
module.exports = router;