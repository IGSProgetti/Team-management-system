// API ROUTES PER SISTEMA RIASSEGNAZIONI ORE
// File: server/routes/riassegnazioni.js

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken, requireManager } = require('../middleware/auth');

// GET /api/riassegnazioni/crediti-disponibili - Crediti disponibili per riassegnazione
router.get('/crediti-disponibili', authenticateToken, requireManager, async (req, res) => {
  try {
    console.log('[RIASSEGNAZIONI] Fetching crediti disponibili...');
    
    const creditiQuery = `
      SELECT 
        task_id,
        task_nome,
        ore_stimate,
        ore_effettive,
        utente_assegnato,
        risorsa_nome,
        progetto_id,
        progetto_nome,
        cliente_id,
        cliente_nome,
        attivita_nome,
        credito_originale_minuti,
        credito_utilizzato_minuti,
        credito_disponibile_minuti,
        credito_disponibile_ore
      FROM crediti_task_disponibili
      ORDER BY cliente_nome, progetto_nome, task_nome
    `;

    const result = await query(creditiQuery);
    console.log(`[RIASSEGNAZIONI] Found ${result.rows.length} crediti disponibili`);

    // Raggruppa per risorsa per facilitare la UI
    const creditiPerRisorsa = {};
    result.rows.forEach(credito => {
      const risorsaKey = credito.risorsa_nome;
      if (!creditiPerRisorsa[risorsaKey]) {
        creditiPerRisorsa[risorsaKey] = [];
      }
      creditiPerRisorsa[risorsaKey].push(credito);
    });

    res.json({
      success: true,
      crediti: result.rows,
      crediti_per_risorsa: creditiPerRisorsa,
      total_crediti: result.rows.length,
      total_minuti_disponibili: result.rows.reduce((acc, c) => acc + c.credito_disponibile_minuti, 0)
    });

  } catch (error) {
    console.error('[RIASSEGNAZIONI] Error fetching crediti:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server Error', 
      details: error.message 
    });
  }
});

// GET /api/riassegnazioni/debiti - Debiti task compensabili
router.get('/debiti', authenticateToken, requireManager, async (req, res) => {
  try {
    console.log('[RIASSEGNAZIONI] Fetching debiti compensabili...');
    
    const debitiQuery = `
      SELECT 
        task_id,
        task_nome,
        ore_stimate,
        ore_effettive,
        utente_assegnato,
        risorsa_nome,
        progetto_id,
        progetto_nome,
        cliente_id,
        cliente_nome,
        attivita_nome,
        debito_minuti,
        debito_ore,
        compensato_minuti,
        debito_residuo_minuti,
        ROUND(debito_residuo_minuti::decimal / 60, 2) as debito_residuo_ore
      FROM debiti_task
      ORDER BY debito_residuo_minuti DESC, cliente_nome, progetto_nome, task_nome
    `;

    const result = await query(debitiQuery);
    console.log(`[RIASSEGNAZIONI] Found ${result.rows.length} debiti compensabili`);

    // Raggruppa per risorsa
    const debitiPerRisorsa = {};
    result.rows.forEach(debito => {
      const risorsaKey = debito.risorsa_nome;
      if (!debitiPerRisorsa[risorsaKey]) {
        debitiPerRisorsa[risorsaKey] = [];
      }
      debitiPerRisorsa[risorsaKey].push(debito);
    });

    res.json({
      success: true,
      debiti: result.rows,
      debiti_per_risorsa: debitiPerRisorsa,
      total_debiti: result.rows.length,
      total_minuti_da_compensare: result.rows.reduce((acc, d) => acc + d.debito_residuo_minuti, 0)
    });

  } catch (error) {
    console.error('[RIASSEGNAZIONI] Error fetching debiti:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server Error', 
      details: error.message 
    });
  }
});

// GET /api/riassegnazioni/progetti - Lista progetti per nuove task
router.get('/progetti', authenticateToken, requireManager, async (req, res) => {
  try {
    console.log('[RIASSEGNAZIONI] Fetching progetti attivi...');
    
    const progettiQuery = `
      SELECT 
        p.id,
        p.nome as progetto_nome,
        p.descrizione,
        c.id as cliente_id,
        c.nome as cliente_nome,
        p.stato_approvazione
      FROM progetti p
      JOIN clienti c ON p.cliente_id = c.id
      WHERE p.stato_approvazione = 'approvata'
        AND p.attivo = true
      ORDER BY c.nome, p.nome
    `;

    const result = await query(progettiQuery);
    console.log(`[RIASSEGNAZIONI] Found ${result.rows.length} progetti attivi`);

    res.json({
      success: true,
      progetti: result.rows
    });

  } catch (error) {
    console.error('[RIASSEGNAZIONI] Error fetching progetti:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server Error', 
      details: error.message 
    });
  }
});

// POST /api/riassegnazioni/create - Crea nuova riassegnazione
router.post('/create', authenticateToken, requireManager, async (req, res) => {
  try {
    const {
      task_sorgente_id,
      minuti_prelevati,
      minuti_assegnati,
      motivo,
      tipo_destinazione, // 'task_esistente' | 'nuova_task'
      task_destinazione_id, // per task esistente
      progetto_destinazione_id, // per nuova task
      nome_nuova_task, // per nuova task
      attivita_id_nuova_task // opzionale, per nuova task
    } = req.body;

    const manager_id = req.user.id;
    
    console.log('[RIASSEGNAZIONI] Creating new riassegnazione:', {
      task_sorgente_id,
      minuti_prelevati,
      tipo_destinazione,
      manager_id
    });

    // Validazioni
    if (!task_sorgente_id || !minuti_prelevati || !minuti_assegnati || !motivo) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    if (minuti_prelevati <= 0 || minuti_assegnati <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Minutes must be positive'
      });
    }

    // 1. Verifica che ci siano crediti sufficienti
    const validazioneQuery = `SELECT valida_riassegnazione($1, $2) as valida`;
    const validazioneResult = await query(validazioneQuery, [task_sorgente_id, minuti_prelevati]);
    
    if (!validazioneResult.rows[0].valida) {
      return res.status(400).json({
        success: false,
        error: 'Crediti insufficienti per questa task'
      });
    }

    // 2. Se nuova task, prima crea la task
    let final_task_destinazione_id = task_destinazione_id;
    
    if (tipo_destinazione === 'nuova_task') {
      if (!progetto_destinazione_id || !nome_nuova_task) {
        return res.status(400).json({
          success: false,
          error: 'Progetto e nome task richiesti per nuova task'
        });
      }

      // Crea nuova task
      // Prima trova o crea un'attività nel progetto
      let attivita_target_id = attivita_id_nuova_task;
      
      if (!attivita_target_id) {
        // Crea attività generica "Riassegnazioni Ore"
        const nuovaAttivitaQuery = `
          INSERT INTO attivita (nome, descrizione, progetto_id, creata_da, ore_stimate)
          VALUES ('Riassegnazioni Ore', 'Attività per task create da riassegnazioni ore', $1, $2, 0)
          RETURNING id
        `;
        const nuovaAttivitaResult = await query(nuovaAttivitaQuery, [progetto_destinazione_id, manager_id]);
        attivita_target_id = nuovaAttivitaResult.rows[0].id;
      }

      // Ora crea la nuova task
      // Per la nuova task, prendiamo la risorsa dalla task sorgente (stesso utente)
      const taskSorgenteQuery = `SELECT utente_assegnato FROM task WHERE id = $1`;
      const taskSorgenteResult = await query(taskSorgenteQuery, [task_sorgente_id]);
      const utente_assegnato = taskSorgenteResult.rows[0].utente_assegnato;

      const nuovaTaskQuery = `
        INSERT INTO task (nome, descrizione, attivita_id, utente_assegnato, ore_stimate, stato, creata_da)
        VALUES ($1, $2, $3, $4, $5, 'programmata', $6)
        RETURNING id
      `;
      const nuovaTaskResult = await query(nuovaTaskQuery, [
        nome_nuova_task,
        `Task creata da riassegnazione ore: ${motivo}`,
        attivita_target_id,
        utente_assegnato,
        minuti_assegnati, // ore stimate = minuti assegnati
        manager_id
      ]);
      
      final_task_destinazione_id = nuovaTaskResult.rows[0].id;
    }

    // 3. Se task esistente, ricava il progetto dalla task destinazione
    let final_progetto_destinazione_id = progetto_destinazione_id;
    
    if (tipo_destinazione === 'task_esistente' && final_task_destinazione_id) {
      const getProgettoQuery = `
        SELECT p.id as progetto_id 
        FROM task t
        JOIN attivita a ON t.attivita_id = a.id
        JOIN progetti p ON a.progetto_id = p.id
        WHERE t.id = $1
      `;
      const progettoResult = await query(getProgettoQuery, [final_task_destinazione_id]);
      if (progettoResult.rows.length > 0) {
        final_progetto_destinazione_id = progettoResult.rows[0].progetto_id;
      }
    }

    // 4. Crea la riassegnazione
    const riassegnazioneQuery = `
      INSERT INTO riassegnazioni_ore (
        task_sorgente_id,
        minuti_prelevati,
        task_destinazione_id,
        progetto_destinazione_id,
        minuti_assegnati,
        creato_da,
        motivo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, data_riassegnazione
    `;
    
    const riassegnazioneResult = await query(riassegnazioneQuery, [
      task_sorgente_id,
      minuti_prelevati,
      final_task_destinazione_id,
      final_progetto_destinazione_id,
      minuti_assegnati,
      manager_id,
      motivo
    ]);

    const riassegnazione_id = riassegnazioneResult.rows[0].id;
    
    console.log(`[RIASSEGNAZIONI] Created riassegnazione ${riassegnazione_id}`);

    // 4. Fetch dettagli completi per response
    const dettagliQuery = `
      SELECT * FROM riassegnazioni_dettagliate 
      WHERE riassegnazione_id = $1
    `;
    const dettagliResult = await query(dettagliQuery, [riassegnazione_id]);

    res.status(201).json({
      success: true,
      riassegnazione_id: riassegnazione_id,
      riassegnazione: dettagliResult.rows[0],
      message: tipo_destinazione === 'nuova_task' 
        ? 'Riassegnazione creata con nuova task' 
        : 'Riassegnazione creata per compensazione task esistente'
    });

  } catch (error) {
    console.error('[RIASSEGNAZIONI] Error creating riassegnazione:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server Error', 
      details: error.message 
    });
  }
});

// GET /api/riassegnazioni/storico - Storico riassegnazioni con filtri
router.get('/storico', authenticateToken, requireManager, async (req, res) => {
  try {
    const { 
      stato = null, 
      risorsa_id = null, 
      progetto_id = null,
      data_inizio = null,
      data_fine = null,
      limit = 50,
      offset = 0
    } = req.query;

    console.log('[RIASSEGNAZIONI] Fetching storico with filters:', req.query);

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    // Filtri dinamici
    if (stato) {
      whereConditions.push(`r.stato = $${paramIndex}`);
      params.push(stato);
      paramIndex++;
    }

    if (risorsa_id) {
      whereConditions.push(`(ts.utente_assegnato = $${paramIndex} OR td.utente_assegnato = $${paramIndex})`);
      params.push(risorsa_id);
      paramIndex++;
    }

    if (progetto_id) {
      whereConditions.push(`(ps.id = $${paramIndex} OR pd.id = $${paramIndex})`);
      params.push(progetto_id);
      paramIndex++;
    }

    if (data_inizio) {
      whereConditions.push(`r.data_riassegnazione >= $${paramIndex}`);
      params.push(data_inizio);
      paramIndex++;
    }

    if (data_fine) {
      whereConditions.push(`r.data_riassegnazione <= $${paramIndex}`);
      params.push(data_fine);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Query principale
    const storicoQuery = `
      SELECT 
        r.*,
        -- Aggiungi calcolo costo se necessario
        ROUND((r.minuti_prelevati::decimal / 60) * us.costo_orario, 2) as valore_riassegnazione
      FROM riassegnazioni_dettagliate r
      JOIN task ts ON r.riassegnazione_id IN (
        SELECT id FROM riassegnazioni_ore WHERE task_sorgente_id = ts.id
      )
      JOIN utenti us ON ts.utente_assegnato = us.id
      ${whereClause}
      ORDER BY r.data_riassegnazione DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(parseInt(limit));
    params.push(parseInt(offset));

    const result = await query(storicoQuery, params);
    
    // Count totale per paginazione
    const countQuery = `
      SELECT COUNT(*) as total
      FROM riassegnazioni_dettagliate r
      JOIN task ts ON r.riassegnazione_id IN (
        SELECT id FROM riassegnazioni_ore WHERE task_sorgente_id = ts.id
      )
      ${whereClause}
    `;
    
    const countResult = await query(countQuery, params.slice(0, -2)); // Rimuovi limit/offset
    
    console.log(`[RIASSEGNAZIONI] Found ${result.rows.length} riassegnazioni in storico`);

    res.json({
      success: true,
      riassegnazioni: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset),
      has_more: (parseInt(offset) + result.rows.length) < parseInt(countResult.rows[0].total)
    });

  } catch (error) {
    console.error('[RIASSEGNAZIONI] Error fetching storico:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server Error', 
      details: error.message 
    });
  }
});

// PUT /api/riassegnazioni/:id/annulla - Annulla riassegnazione
router.put('/:id/annulla', authenticateToken, requireManager, async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo_annullamento } = req.body;
    const manager_id = req.user.id;

    console.log(`[RIASSEGNAZIONI] Annulling riassegnazione ${id}`);

    if (!motivo_annullamento) {
      return res.status(400).json({
        success: false,
        error: 'Motivo annullamento richiesto'
      });
    }

    const annullaQuery = `
      UPDATE riassegnazioni_ore 
      SET 
        stato = 'annullata',
        data_annullamento = CURRENT_TIMESTAMP,
        annullato_da = $1,
        motivo_annullamento = $2
      WHERE id = $3 AND stato = 'attiva'
      RETURNING id
    `;

    const result = await query(annullaQuery, [manager_id, motivo_annullamento, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Riassegnazione non trovata o già annullata'
      });
    }

    console.log(`[RIASSEGNAZIONI] Annulled riassegnazione ${id}`);

    res.json({
      success: true,
      message: 'Riassegnazione annullata con successo'
    });

  } catch (error) {
    console.error('[RIASSEGNAZIONI] Error annulling riassegnazione:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server Error', 
      details: error.message 
    });
  }
});

// GET /api/riassegnazioni/statistiche - Statistiche generali riassegnazioni
router.get('/statistiche', authenticateToken, requireManager, async (req, res) => {
  try {
    console.log('[RIASSEGNAZIONI] Fetching statistiche...');

    const statsQuery = `
      WITH stats AS (
        SELECT 
          COUNT(*) FILTER (WHERE stato = 'attiva') as riassegnazioni_attive,
          COUNT(*) FILTER (WHERE stato = 'annullata') as riassegnazioni_annullate,
          COUNT(*) as riassegnazioni_totali,
          SUM(minuti_assegnati) FILTER (WHERE stato = 'attiva') as minuti_riassegnati_attivi,
          SUM(minuti_assegnati) as minuti_riassegnati_totali
        FROM riassegnazioni_ore
        WHERE data_riassegnazione >= CURRENT_DATE - INTERVAL '30 days'
      ),
      crediti_stats AS (
        SELECT 
          COUNT(*) as task_con_crediti,
          SUM(credito_disponibile_minuti) as crediti_totali_disponibili
        FROM crediti_task_disponibili
      ),
      debiti_stats AS (
        SELECT 
          COUNT(*) as task_con_debiti,
          SUM(debito_residuo_minuti) as debiti_totali_residui
        FROM debiti_task
      )
      SELECT 
        s.*,
        cs.task_con_crediti,
        cs.crediti_totali_disponibili,
        ds.task_con_debiti,
        ds.debiti_totali_residui,
        -- Percentuale compensazione
        CASE 
          WHEN ds.debiti_totali_residui > 0 
          THEN ROUND((cs.crediti_totali_disponibili::decimal / ds.debiti_totali_residui) * 100, 1)
          ELSE 0 
        END as percentuale_compensazione_possibile
      FROM stats s
      CROSS JOIN crediti_stats cs
      CROSS JOIN debiti_stats ds
    `;

    const result = await query(statsQuery);
    const stats = result.rows[0];

    console.log('[RIASSEGNAZIONI] Generated statistiche');

    res.json({
      success: true,
      statistiche: {
        riassegnazioni: {
          attive: parseInt(stats.riassegnazioni_attive) || 0,
          annullate: parseInt(stats.riassegnazioni_annullate) || 0,
          totali: parseInt(stats.riassegnazioni_totali) || 0
        },
        minuti: {
          riassegnati_attivi: parseInt(stats.minuti_riassegnati_attivi) || 0,
          riassegnati_totali: parseInt(stats.minuti_riassegnati_totali) || 0,
          ore_riassegnate_attive: Math.round((parseInt(stats.minuti_riassegnati_attivi) || 0) / 60 * 100) / 100
        },
        crediti: {
          task_con_crediti: parseInt(stats.task_con_crediti) || 0,
          minuti_disponibili: parseInt(stats.crediti_totali_disponibili) || 0,
          ore_disponibili: Math.round((parseInt(stats.crediti_totali_disponibili) || 0) / 60 * 100) / 100
        },
        debiti: {
          task_con_debiti: parseInt(stats.task_con_debiti) || 0,
          minuti_residui: parseInt(stats.debiti_totali_residui) || 0,
          ore_residue: Math.round((parseInt(stats.debiti_totali_residui) || 0) / 60 * 100) / 100
        },
        compensazione: {
          percentuale_possibile: parseFloat(stats.percentuale_compensazione_possibile) || 0
        }
      }
    });

  } catch (error) {
    console.error('[RIASSEGNAZIONI] Error fetching statistiche:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server Error', 
      details: error.message 
    });
  }
});

module.exports = router;