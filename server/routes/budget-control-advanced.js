const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, requireManager } = require('../middleware/auth');

const router = express.Router();

// GET /api/budget-control-advanced/overview - Dashboard principale
router.get('/overview', authenticateToken, requireManager, async (req, res) => {
  try {
    const { 
      cliente_id, 
      progetto_id, 
      area_id, 
      attivita_id, 
      risorsa_id,
      data_da,
      data_a
    } = req.query;

    let whereClause = 'WHERE t.stato = \'completata\' AND t.ore_effettive IS NOT NULL';
    let params = [];

    // Filtri
    if (cliente_id) {
      whereClause += ' AND c.id = $' + (params.length + 1);
      params.push(cliente_id);
    }

    if (progetto_id) {
      whereClause += ' AND p.id = $' + (params.length + 1);
      params.push(progetto_id);
    }

    if (area_id) {
      whereClause += ' AND ar.id = $' + (params.length + 1);
      params.push(area_id);
    }

    if (attivita_id) {
      whereClause += ' AND a.id = $' + (params.length + 1);
      params.push(attivita_id);
    }

    if (risorsa_id) {
      whereClause += ' AND u.id = $' + (params.length + 1);
      params.push(risorsa_id);
    }

    if (data_da) {
      whereClause += ' AND t.data_completamento >= $' + (params.length + 1);
      params.push(data_da);
    }

    if (data_a) {
      whereClause += ' AND t.data_completamento <= $' + (params.length + 1);
      params.push(data_a);
    }

    // Query principale
    const result = await query(`
      SELECT 
        t.id as task_id,
        t.nome as task_nome,
        t.ore_stimate,
        t.ore_effettive,
        t.ore_stimate - t.ore_effettive as differenza_ore,
        t.data_completamento,
        -- Risorsa
        u.id as risorsa_id,
        u.nome as risorsa_nome,
        u.email as risorsa_email,
        u.costo_orario as costo_orario_base,
        -- Attività
        a.id as attivita_id,
        a.nome as attivita_nome,
        -- Area
        ar.id as area_id,
        ar.nome as area_nome,
        -- Progetto
        p.id as progetto_id,
        p.nome as progetto_nome,
        -- Cliente
        c.id as cliente_id,
        c.nome as cliente_nome,
        -- Margini progetto
        m.costo_orario_finale,
        -- Bonus se esiste
        b.id as bonus_id,
        b.tipo as bonus_tipo,
        b.importo_bonus,
        b.stato as bonus_stato,
        b.percentuale_bonus,
        -- Calcolo colore (positivo/zero/negativo)
        CASE
          WHEN t.ore_stimate - t.ore_effettive > 0 THEN 'positivo'
          WHEN t.ore_stimate - t.ore_effettive = 0 THEN 'zero'
          ELSE 'negativo'
        END as performance_tipo
      FROM task t
      JOIN utenti u ON t.utente_assegnato = u.id
      JOIN attivita a ON t.attivita_id = a.id
      LEFT JOIN aree ar ON a.area_id = ar.id
      JOIN progetti p ON a.progetto_id = p.id
      JOIN clienti c ON p.cliente_id = c.id
      LEFT JOIN margini_progetto m ON m.progetto_id = p.id AND m.risorsa_id = u.id
      LEFT JOIN bonus_risorse b ON b.task_id = t.id
      ${whereClause}
      ORDER BY t.data_completamento DESC
    `, params);

    // Calcola statistiche aggregate
    const stats = {
      totale_task: result.rows.length,
      task_positive: result.rows.filter(r => r.performance_tipo === 'positivo').length,
      task_precise: result.rows.filter(r => r.performance_tipo === 'zero').length,
      task_negative: result.rows.filter(r => r.performance_tipo === 'negativo').length,
      ore_stimate_totali: result.rows.reduce((sum, r) => sum + parseInt(r.ore_stimate || 0), 0),
      ore_effettive_totali: result.rows.reduce((sum, r) => sum + parseInt(r.ore_effettive || 0), 0),
      bonus_totale: result.rows.reduce((sum, r) => sum + parseFloat(r.importo_bonus || 0), 0),
      bonus_pending: result.rows.filter(r => r.bonus_stato === 'pending').length,
      bonus_approvati: result.rows.filter(r => r.bonus_stato === 'approvato').length,
    };

    res.json({ 
      task: result.rows,
      statistiche: stats
    });

  } catch (error) {
    console.error('Budget control overview error:', error);
    res.status(500).json({ error: 'Errore nel caricamento della dashboard', details: error.message });
  }
});

// GET /api/budget-control-advanced/risorse - Performance risorse
router.get('/risorse', authenticateToken, requireManager, async (req, res) => {
  try {
    const { data_da, data_a } = req.query;

    let whereClause = 'WHERE t.stato = \'completata\' AND t.ore_effettive IS NOT NULL';
    let params = [];

    if (data_da) {
      whereClause += ' AND t.data_completamento >= $' + (params.length + 1);
      params.push(data_da);
    }

    if (data_a) {
      whereClause += ' AND t.data_completamento <= $' + (params.length + 1);
      params.push(data_a);
    }

    const result = await query(`
      SELECT 
        u.id as risorsa_id,
        u.nome as risorsa_nome,
        u.email as risorsa_email,
        u.ruolo,
        u.costo_orario,
        u.ore_annue_totali,
        u.ore_annue_normali,
        u.ore_annue_tesoretto,
        -- Statistiche task
        COUNT(DISTINCT t.id) as totale_task,
        COUNT(DISTINCT CASE WHEN t.ore_stimate - t.ore_effettive > 0 THEN t.id END) as task_positive,
        COUNT(DISTINCT CASE WHEN t.ore_stimate - t.ore_effettive = 0 THEN t.id END) as task_precise,
        COUNT(DISTINCT CASE WHEN t.ore_stimate - t.ore_effettive < 0 THEN t.id END) as task_negative,
        -- Ore
        COALESCE(SUM(t.ore_stimate), 0) as ore_stimate_totali,
        COALESCE(SUM(t.ore_effettive), 0) as ore_effettive_totali,
        COALESCE(SUM(t.ore_stimate - t.ore_effettive), 0) as differenza_ore_totali,
        -- Bonus
        COALESCE(SUM(CASE WHEN b.stato = 'approvato' THEN b.importo_bonus ELSE 0 END), 0) as bonus_approvato,
        COALESCE(SUM(CASE WHEN b.stato = 'pending' THEN b.importo_bonus ELSE 0 END), 0) as bonus_pending,
        COALESCE(COUNT(DISTINCT CASE WHEN b.stato = 'pending' THEN b.id END), 0) as bonus_pending_count,
        -- Performance %
        CASE 
          WHEN COUNT(DISTINCT t.id) > 0 THEN
            ROUND((COUNT(DISTINCT CASE WHEN t.ore_stimate - t.ore_effettive > 0 THEN t.id END)::decimal / COUNT(DISTINCT t.id)) * 100, 1)
          ELSE 0
        END as percentuale_positive
      FROM utenti u
      LEFT JOIN task t ON t.utente_assegnato = u.id AND t.stato = 'completata' AND t.ore_effettive IS NOT NULL
      LEFT JOIN bonus_risorse b ON b.risorsa_id = u.id
      WHERE u.attivo = true AND u.ruolo IN ('risorsa', 'coordinatore', 'manager')
      GROUP BY u.id, u.nome, u.email, u.ruolo, u.costo_orario, 
               u.ore_annue_totali, u.ore_annue_normali, u.ore_annue_tesoretto
      ORDER BY percentuale_positive DESC
    `, params);

    res.json({ risorse: result.rows });

  } catch (error) {
    console.error('Budget control risorse error:', error);
    res.status(500).json({ error: 'Errore nel caricamento performance risorse', details: error.message });
  }
});

// GET /api/budget-control-advanced/progetti - Performance progetti
router.get('/progetti', authenticateToken, requireManager, async (req, res) => {
  try {
    const { cliente_id } = req.query;

    let whereClause = '';
    let params = [];

    if (cliente_id) {
      whereClause = 'WHERE c.id = $1';
      params.push(cliente_id);
    }

    const result = await query(`
      SELECT 
        p.id as progetto_id,
        p.nome as progetto_nome,
        p.budget_assegnato,
        c.id as cliente_id,
        c.nome as cliente_nome,
        -- Ore previste vs effettive
        COALESCE(SUM(a.ore_stimate), 0) as ore_stimate_totali,
        COALESCE(SUM(a.ore_effettive), 0) as ore_effettive_totali,
        -- Costo effettivo (ore effettive × costo orario finale)
        COALESCE(SUM(
          (t.ore_effettive::decimal / 60.0) * COALESCE(m.costo_orario_finale, u.costo_orario)
        ), 0) as costo_effettivo,
        -- Budget utilizzato %
        CASE 
          WHEN p.budget_assegnato > 0 THEN
            ROUND((COALESCE(SUM(
              (t.ore_effettive::decimal / 60.0) * COALESCE(m.costo_orario_finale, u.costo_orario)
            ), 0) / p.budget_assegnato) * 100, 1)
          ELSE 0
        END as percentuale_budget_utilizzato,
        -- Task statistiche
        COUNT(DISTINCT t.id) as totale_task,
        COUNT(DISTINCT CASE WHEN t.stato = 'completata' THEN t.id END) as task_completate,
        -- Aree
        COUNT(DISTINCT ar.id) as numero_aree
      FROM progetti p
      JOIN clienti c ON p.cliente_id = c.id
      LEFT JOIN aree ar ON ar.progetto_id = p.id
      LEFT JOIN attivita a ON a.progetto_id = p.id
      LEFT JOIN task t ON t.attivita_id = a.id AND t.stato = 'completata' AND t.ore_effettive IS NOT NULL
      LEFT JOIN utenti u ON t.utente_assegnato = u.id
      LEFT JOIN margini_progetto m ON m.progetto_id = p.id AND m.risorsa_id = u.id
      ${whereClause}
      GROUP BY p.id, p.nome, p.budget_assegnato, c.id, c.nome
      ORDER BY p.nome
    `, params);

    res.json({ progetti: result.rows });

  } catch (error) {
    console.error('Budget control progetti error:', error);
    res.status(500).json({ error: 'Errore nel caricamento performance progetti', details: error.message });
  }
});

// POST /api/budget-control-advanced/redistribuisci - Redistribuisci ore
router.post('/redistribuisci', authenticateToken, requireManager, async (req, res) => {
  try {
    const { 
      da_risorsa_id,
      a_risorsa_id,
      da_progetto_id,
      a_progetto_id,
      da_area_id,
      a_area_id,
      ore_da_spostare, // in minuti
      commento
    } = req.body;

    if (!commento) {
      return res.status(400).json({ error: 'Commento obbligatorio' });
    }

    if (!ore_da_spostare || ore_da_spostare <= 0) {
      return res.status(400).json({ error: 'Ore da spostare deve essere > 0' });
    }

    // Log redistribuzione
    const result = await query(`
      INSERT INTO log_redistribuzione_ore (
        manager_id,
        tipo_azione,
        da_risorsa_id,
        a_risorsa_id,
        da_progetto_id,
        a_progetto_id,
        da_area_id,
        a_area_id,
        ore_spostate,
        commento
      )
      VALUES ($1, 'redistribuzione_ore', $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      req.user.id,
      da_risorsa_id,
      a_risorsa_id,
      da_progetto_id,
      a_progetto_id,
      da_area_id,
      a_area_id,
      ore_da_spostare,
      commento
    ]);

    res.status(201).json({ 
      message: 'Ore redistribuite con successo',
      log: result.rows[0]
    });

  } catch (error) {
    console.error('Redistribuisci ore error:', error);
    res.status(500).json({ error: 'Errore nella redistribuzione ore', details: error.message });
  }
});

// GET /api/budget-control-advanced/log - Storico azioni manager
router.get('/log', authenticateToken, requireManager, async (req, res) => {
  try {
    const { data_da, data_a, tipo_azione, manager_id } = req.query;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (data_da) {
      whereClause += ' AND l.data_creazione >= $' + (params.length + 1);
      params.push(data_da);
    }

    if (data_a) {
      whereClause += ' AND l.data_creazione <= $' + (params.length + 1);
      params.push(data_a);
    }

    if (tipo_azione) {
      whereClause += ' AND l.tipo_azione = $' + (params.length + 1);
      params.push(tipo_azione);
    }

    if (manager_id) {
      whereClause += ' AND l.manager_id = $' + (params.length + 1);
      params.push(manager_id);
    }

    const result = await query(`
      SELECT 
        l.*,
        m.nome as manager_nome,
        u1.nome as da_risorsa_nome,
        u2.nome as a_risorsa_nome,
        p1.nome as da_progetto_nome,
        p2.nome as a_progetto_nome,
        ar1.nome as da_area_nome,
        ar2.nome as a_area_nome
      FROM log_redistribuzione_ore l
      JOIN utenti m ON l.manager_id = m.id
      LEFT JOIN utenti u1 ON l.da_risorsa_id = u1.id
      LEFT JOIN utenti u2 ON l.a_risorsa_id = u2.id
      LEFT JOIN progetti p1 ON l.da_progetto_id = p1.id
      LEFT JOIN progetti p2 ON l.a_progetto_id = p2.id
      LEFT JOIN aree ar1 ON l.da_area_id = ar1.id
      LEFT JOIN aree ar2 ON l.a_area_id = ar2.id
      ${whereClause}
      ORDER BY l.data_creazione DESC
      LIMIT 100
    `, params);

    res.json({ log: result.rows });

  } catch (error) {
    console.error('Get log error:', error);
    res.status(500).json({ error: 'Errore nel caricamento log', details: error.message });
  }
});

// GET /api/budget-control-advanced/disponibilita/:risorsa_id - Disponibilità ore risorsa
router.get('/disponibilita/:risorsa_id', authenticateToken, async (req, res) => {
  try {
    const { risorsa_id } = req.params;
    const { anno } = req.query;

    const annoFiltro = anno || new Date().getFullYear();

    // Ore disponibili per giorno
    const result = await query(`
      SELECT 
        DATE(t.scadenza) as giorno,
        COALESCE(SUM(t.ore_stimate), 0) as minuti_assegnati,
        480 - COALESCE(SUM(t.ore_stimate), 0) as minuti_disponibili
      FROM task t
      WHERE t.utente_assegnato = $1
        AND t.stato IN ('programmata', 'in_esecuzione')
        AND EXTRACT(YEAR FROM t.scadenza) = $2
      GROUP BY DATE(t.scadenza)
      ORDER BY giorno
    `, [risorsa_id, annoFiltro]);

    // Info risorsa
    const risorsaInfo = await query(`
      SELECT 
        id, nome, email,
        ore_annue_totali,
        ore_annue_normali,
        ore_annue_tesoretto
      FROM utenti
      WHERE id = $1
    `, [risorsa_id]);

    res.json({ 
      risorsa: risorsaInfo.rows[0],
      disponibilita_giornaliera: result.rows
    });

  } catch (error) {
    console.error('Get disponibilita error:', error);
    res.status(500).json({ error: 'Errore nel caricamento disponibilità', details: error.message });
  }
});

module.exports = router;